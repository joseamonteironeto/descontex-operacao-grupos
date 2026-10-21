import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { automationLog } from "@/lib/automation-log";
import { extractUrls } from "@/lib/link-resolver";
import { markProductsSent, processProductInput } from "@/lib/product-pipeline";

type UnknownRecord = Record<string, unknown>;

type PrivateAssistantSettings = {
  enabled: boolean;
  model: string;
  typingDelayMs: number;
};

type RecentOffer = {
  productId: string;
  title: string;
  url: string;
  sentAt: string;
  currentPrice?: number | null;
  previousPrice?: number | null;
  discountPercentage?: number | null;
  freeShipping?: boolean;
  rating?: number | null;
  soldText?: string | null;
  category?: string | null;
  catalogFacts?: string | null;
};

type ConversationMessage = { role: "user" | "assistant"; content: string };
type ConversationRow = {
  historyJson: string;
  activeProductId: string | null;
  activeProductTitle: string | null;
  activeProductUrl: string | null;
  optedOut: number;
};

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function recordLike(value: unknown): UnknownRecord {
  if (typeof value !== "string") return record(value);
  try { return record(JSON.parse(value)); } catch { return {}; }
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() || "";
}

function extractOutputText(payload: UnknownRecord) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(record(item).content) ? record(item).content as unknown[] : [];
    for (const part of content) {
      const text = record(part).text;
      if (typeof text === "string" && text.trim()) return text.trim();
    }
  }
  return "";
}

function compactCatalogFacts(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    const compact = (input: unknown, depth = 0): unknown => {
      if (depth > 4 || input == null || typeof input === "boolean" || typeof input === "number") return input;
      if (typeof input === "string") return input.length > 600 ? `${input.slice(0, 600)}…` : input;
      if (Array.isArray(input)) return input.slice(0, 24).map((item) => compact(item, depth + 1));
      if (typeof input !== "object") return undefined;
      return Object.fromEntries(Object.entries(input as UnknownRecord)
        .filter(([key]) => !/image|picture|thumbnail|review|media|video|html|raw|script/i.test(key))
        .slice(0, 60)
        .map(([key, item]) => [key, compact(item, depth + 1)]));
    };
    return JSON.stringify(compact(parsed)).slice(0, 12_000);
  } catch { return null; }
}

function sanitizeAssistantReply(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 1100);
}

function parseHistory(value: string): ConversationMessage[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const candidate = record(item);
      const role = candidate.role === "user" || candidate.role === "assistant" ? candidate.role : null;
      const content = typeof candidate.content === "string" ? candidate.content.trim().slice(0, 1200) : "";
      return role && content ? [{ role, content }] : [];
    }).slice(-8);
  } catch { return []; }
}

async function loadPrivateAssistantSettings(): Promise<PrivateAssistantSettings> {
  const row = await env.DB.prepare(`SELECT enabled, model, typing_delay_ms AS typingDelayMs
    FROM private_assistant_settings WHERE id = 1`)
    .first<{ enabled: number; model: string; typingDelayMs: number }>().catch(() => null);
  return {
    enabled: Boolean(row?.enabled),
    model: ["gpt-6-luna", "gpt-6.1-sol", "gpt-6-astra"].includes(row?.model || "") ? row!.model : "gpt-6-luna",
    typingDelayMs: Math.max(800, Math.min(6000, Number(row?.typingDelayMs) || 2400)),
  };
}

async function loadRecentOffers(): Promise<RecentOffer[]> {
  const rows = await env.DB.prepare(`SELECT product_id AS productId, product_title AS title,
    product_url AS url, sent_at AS sentAt
    FROM offer_sends WHERE product_url IS NOT NULL AND product_url <> ''
    ORDER BY sent_at DESC LIMIT 30`).all<{ productId: string; title: string | null; url: string; sentAt: string }>();
  const unique = Array.from(new Map((rows.results || []).map((item) => [item.productId || item.url, item])).values()).slice(0, 6);
  return Promise.all(unique.map(async (item) => {
    const catalog = await env.DB.prepare(`SELECT title, current_price AS currentPrice,
      COALESCE(previous_price, original_price) AS previousPrice,
      discount_percentage AS discountPercentage, free_shipping AS freeShipping,
      rating, sold_text AS soldText, category, payload_json AS payloadJson
      FROM catalog_products
      WHERE id = ? OR product_code = ? OR product_url = ?
      ORDER BY last_seen_at DESC LIMIT 1`)
      .bind(item.productId, item.productId, item.url)
      .first<{ title: string; currentPrice: number | null; previousPrice: number | null; discountPercentage: number; freeShipping: number; rating: number | null; soldText: string | null; category: string | null; payloadJson: string | null }>()
      .catch(() => null);
    return {
      productId: item.productId,
      title: catalog?.title || item.title || item.productId,
      url: item.url,
      sentAt: item.sentAt,
      currentPrice: catalog?.currentPrice,
      previousPrice: catalog?.previousPrice,
      discountPercentage: catalog?.discountPercentage,
      freeShipping: Boolean(catalog?.freeShipping),
      rating: catalog?.rating,
      soldText: catalog?.soldText,
      category: catalog?.category,
      catalogFacts: compactCatalogFacts(catalog?.payloadJson),
    };
  }));
}

function chooseRelevantOffer(text: string, offers: RecentOffer[], conversation: ConversationRow | null) {
  const normalized = text.toLocaleLowerCase("pt-BR");
  const explicit = offers.find((offer) => normalized.includes(offer.productId.toLocaleLowerCase("pt-BR")) || normalized.includes(offer.url.toLocaleLowerCase("pt-BR")));
  if (explicit) return { offer: explicit, needsConfirmation: false };
  const scored = offers.map((offer) => {
    const words = offer.title.toLocaleLowerCase("pt-BR").split(/[^a-zà-ú0-9]+/i).filter((word) => word.length >= 4);
    return { offer, score: words.filter((word) => normalized.includes(word)).length };
  }).sort((a, b) => b.score - a.score)[0];
  if (scored?.score >= 1) return { offer: scored.offer, needsConfirmation: false };
  const active = offers.find((offer) => offer.productId === conversation?.activeProductId || offer.url === conversation?.activeProductUrl);
  if (active) return { offer: active, needsConfirmation: false };
  if (conversation?.activeProductUrl) return { offer: {
    productId: conversation.activeProductId || conversation.activeProductUrl,
    title: conversation.activeProductTitle || "produto da oferta",
    url: conversation.activeProductUrl,
    sentAt: "",
  }, needsConfirmation: false };
  return { offer: null, needsConfirmation: false };
}

function greetingForBrazil() {
  const hourText = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(new Date());
  const hour = Number(hourText.replace(/\D/g, "")) % 24;
  if (hour < 12) return "bom dia";
  if (hour < 18) return "boa tarde";
  return "boa noite";
}

function isGreetingOnly(value: string) {
  return /^(oi+|ol[aá]|opa|e a[ií]|hey|hello|bom dia|boa tarde|boa noite)[\s!?.]*$/i.test(value);
}

function isAffirmativeOnly(value: string) {
  return /^(sim|sim por favor|quero|claro|isso|pode ser|tenho)[\s!?.]*$/i.test(value);
}

function isSafetyQuestion(value: string) {
  return /\b(segur[oa]|seguran[cç]a|confi[aá]vel|confian[cç]a|golpe|fraude|pagamento|pagar|pix|cart[aã]o|link oficial|site oficial)\b/i.test(value);
}

function variedReply(history: ConversationMessage[], options: string[]) {
  const recent = history.filter((item) => item.role === "assistant").slice(-4).map((item) => item.content.toLocaleLowerCase("pt-BR"));
  return options.find((option) => !recent.includes(option.toLocaleLowerCase("pt-BR"))) || options[Math.floor(Math.random() * options.length)];
}

async function sendPrivateText(serverUrl: string, token: string, chatJid: string, text: string, delay: number, messageId: string) {
  const response = await fetch(`${serverUrl}/send/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify({
      number: chatJid,
      text,
      delay,
      readchat: true,
      readmessages: true,
      linkPreview: true,
      async: false,
      track_source: "descontex_private_assistant",
      track_id: messageId,
    }),
    signal: AbortSignal.timeout(25_000),
  });
  const providerText = await response.text();
  if (!response.ok) throw new Error(`UAZAPI respondeu HTTP ${response.status}: ${providerText.slice(0, 240)}`);
}

async function savePrivateConversation(chatJid: string, history: ConversationMessage[], offer: RecentOffer | null, optedOut = false) {
  await env.DB.prepare(`INSERT INTO private_assistant_conversations
    (chat_jid, history_json, active_product_id, active_product_title, active_product_url, opted_out, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(chat_jid) DO UPDATE SET history_json = excluded.history_json,
      active_product_id = excluded.active_product_id, active_product_title = excluded.active_product_title,
      active_product_url = excluded.active_product_url, opted_out = excluded.opted_out, updated_at = excluded.updated_at`)
    .bind(chatJid, JSON.stringify(history.slice(-8)), offer?.productId || null, offer?.title || null, offer?.url || null, optedOut ? 1 : 0, new Date().toISOString()).run();
}

async function handlePrivateAssistant(
  extracted: ReturnType<typeof extractMessage>,
  runtime: { UAZAPI_SERVER_URL?: string; UAZAPI_INSTANCE_TOKEN?: string; OPENAI_API_KEY?: string },
) {
  const settings = await loadPrivateAssistantSettings();
  if (!settings.enabled) {
    await automationLog({ level: "warning", stage: "private_assistant_disabled", message: "Mensagem privada recebida, mas o atendimento por IA está desativado no painel.", groupJid: extracted.chatJid });
    return NextResponse.json({ ok: true, ignored: "private_assistant_disabled" });
  }
  if (!extracted.text) return NextResponse.json({ ok: true, ignored: "private_non_text" });
  if (!(await claimMessage(extracted.messageId, extracted.chatJid))) return NextResponse.json({ ok: true, ignored: "duplicate" });
  try {
    const serverUrl = runtime.UAZAPI_SERVER_URL?.replace(/\/$/, "") || "";
    const token = runtime.UAZAPI_INSTANCE_TOKEN || "";
    if (!serverUrl || !token || !runtime.OPENAI_API_KEY) throw new Error("Atendimento privado sem credenciais completas.");
    const conversation = await env.DB.prepare(`SELECT history_json AS historyJson,
      active_product_id AS activeProductId, active_product_title AS activeProductTitle,
      active_product_url AS activeProductUrl, opted_out AS optedOut
      FROM private_assistant_conversations WHERE chat_jid = ?`).bind(extracted.chatJid).first<ConversationRow>().catch(() => null);
    const normalized = extracted.text.trim().toLocaleLowerCase("pt-BR");
    if (/^(parar|sair|cancelar|não quero|nao quero)$/i.test(normalized)) {
      const reply = "Tudo certo, parei o atendimento automático por aqui. Se quiser voltar depois, é só escrever *ativar atendimento*.";
      await savePrivateConversation(extracted.chatJid, [], null, true);
      await sendPrivateText(serverUrl, token, extracted.chatJid, reply, 1200, extracted.messageId);
      await finishMessage(extracted.messageId, "sent");
      return NextResponse.json({ ok: true, sent: true, optedOut: true });
    }
    if (conversation?.optedOut && !/^ativar atendimento$/i.test(normalized)) {
      await finishMessage(extracted.messageId, "ignored", "Contato optou por não receber respostas automáticas.");
      return NextResponse.json({ ok: true, ignored: "contact_opted_out" });
    }
    const history = /^ativar atendimento$/i.test(normalized) ? [] : parseHistory(conversation?.historyJson || "[]");
    const sendGeneralReply = async (reply: string, reason: string) => {
      await sendPrivateText(serverUrl, token, extracted.chatJid, reply, settings.typingDelayMs, extracted.messageId);
      await savePrivateConversation(extracted.chatJid, [...history, { role: "user", content: extracted.text }, { role: "assistant", content: reply }], null);
      await finishMessage(extracted.messageId, "sent");
      await automationLog({ level: "success", stage: "private_assistant_reply", message: `Atendimento privado respondeu sem associar um produto (${reason}).`, groupJid: extracted.chatJid });
      return NextResponse.json({ ok: true, sent: true, general: reason });
    };
    if (isGreetingOnly(normalized)) {
      return sendGeneralReply(variedReply(history, [
        `Oi, ${greetingForBrazil()}! Tudo bem? 😊 Quer saber alguma coisa sobre uma das ofertas?`,
        `${greetingForBrazil().replace(/^./, (letter) => letter.toUpperCase())}! 😊 Como posso te ajudar hoje?`,
        `Oi! Tudo certo por aí? Me conta qual produto ou oferta chamou sua atenção.`,
      ]), "greeting");
    }
    if (isSafetyQuestion(normalized)) {
      return sendGeneralReply(variedReply(history, [
        "Pode ficar tranquilo: nossos links abrem no *meli.la* ou no *mercadolivre.com.br*. Faça a compra e o pagamento sempre dentro do Mercado Livre e nunca envie Pix por fora da plataforma. 🔒",
        "A compra é concluída dentro do Mercado Livre. Confira se o endereço termina em *meli.la* ou *mercadolivre.com.br* e não faça pagamentos por fora da plataforma. 🔒",
      ]), "safety");
    }
    if (isAffirmativeOnly(normalized) && !conversation?.activeProductUrl) {
      return sendGeneralReply(variedReply(history, [
        "Claro 😊 Qual produto você quer consultar? Pode mandar o nome ou o link da oferta.",
        "Perfeito! Me diga qual produto você viu ou envie o link para eu conferir.",
      ]), "awaiting_product");
    }
    const offers = await loadRecentOffers();
    const selected = chooseRelevantOffer(extracted.text, offers, conversation);
    if (!selected.offer) {
      return sendGeneralReply(variedReply(history, [
        "Me diga o nome do produto ou mande o link da oferta para eu conferir direitinho 😊",
        "Qual oferta você está olhando? Pode me passar o nome ou o link do produto.",
        "Só preciso saber qual é o produto. Se preferir, envie o link da oferta aqui.",
      ]), "no_product");
    }
    const productFacts = JSON.stringify({
      produtoEmFoco: selected.offer,
      ultimasOfertasEnviadas: offers,
      precisaConfirmarProduto: selected.needsConfirmation,
    });
    const instructions = `Você atende clientes da DesconteX pelo WhatsApp em português brasileiro. Sua fala é natural, calorosa, prestativa e comercial, sem parecer um roteiro. Não diga que é humano nem fale sobre ser IA. Entenda referências como "esse", "ele", "o celular" e "a oferta" usando o histórico e o produto em foco. Antes de responder, pesquise silenciosamente na web o produto e o modelo exatos e cruze com os dados completos do catálogo. Use somente informações confirmadas para o modelo correto. Não mostre fontes, nomes de sites, bastidores da pesquisa, ressalvas técnicas ou frases como "não consigo confirmar", "não encontrei" e "as informações disponíveis". Se uma parte não estiver confirmada, simplesmente omita essa parte; aproveite apenas os fatos úteis confirmados que respondem ou ajudam a compra. Se nenhum fato útil estiver confirmado, faça uma única pergunta curta que esclareça a necessidade do cliente. Nunca invente especificação, compatibilidade, preço, cupom, estoque, garantia, prazo ou urgência. Responda em 1 a 3 frases curtas, varie abertura, estrutura e encerramento em relação às respostas recentes, use até 2 emojis pertinentes e *negrito* do WhatsApp com moderação. Quando couber, termine com um convite de compra curto e diferente, sem pressão. Não inclua URLs: o sistema acrescentará somente o link da oferta. FATOS: ${productFacts}`;
    const requestResearch = (model: string) => fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${runtime.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model,
        reasoning: { effort: model === "gpt-6-luna" ? "none" : "low" },
        max_output_tokens: 320,
        instructions,
        input: [...history, { role: "user", content: extracted.text }],
        tools: [{ type: "web_search", search_context_size: "low" }],
        tool_choice: "required",
      }),
      signal: AbortSignal.timeout(28_000),
    });
    let researchModel = settings.model;
    let response = await requestResearch(researchModel);
    if (!response.ok && response.status === 400 && researchModel !== "gpt-6-astra") {
      researchModel = "gpt-6-astra";
      response = await requestResearch(researchModel);
    }
    const openAiPayload = await response.json().catch(() => ({})) as UnknownRecord;
    if (!response.ok) throw new Error(`OpenAI respondeu HTTP ${response.status}.`);
    const answer = sanitizeAssistantReply(extractOutputText(openAiPayload));
    if (!answer) throw new Error("A IA não devolveu uma resposta utilizável.");
    const reply = `${answer}\n\n🔗 *Link da oferta:* ${selected.offer.url}`;
    const naturalDelay = Math.max(settings.typingDelayMs, Math.min(6000, 900 + answer.length * 12));
    await sendPrivateText(serverUrl, token, extracted.chatJid, reply, naturalDelay, extracted.messageId);
    await savePrivateConversation(extracted.chatJid, [...history, { role: "user", content: extracted.text }, { role: "assistant", content: answer }], selected.offer);
    await finishMessage(extracted.messageId, "sent");
    await automationLog({
      level: "success",
      stage: "private_assistant_reply",
      message: `Dúvida privada respondida sobre “${selected.offer.title}”.`,
      groupJid: extracted.chatJid,
      productId: selected.offer.productId,
      details: { model: researchModel, typingDelayMs: naturalDelay, productConfirmed: !selected.needsConfirmation, webSearch: true, sourcesHiddenFromCustomer: true },
    });
    return NextResponse.json({ ok: true, sent: true, productId: selected.offer.productId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha no atendimento privado.";
    await finishMessage(extracted.messageId, "error", message);
    await automationLog({ level: "error", stage: "private_assistant_reply", message, groupJid: extracted.chatJid });
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

function extractMessage(payload: UnknownRecord) {
  const data = record(payload.data);
  const message = record(data.message || payload.message || data);
  const key = record(message.key);
  const chat = record(data.chat || message.chat || payload.chat);
  const content = recordLike(message.message || message.content);
  const extended = record(content.extendedTextMessage);
  const image = record(content.imageMessage);
  const video = record(content.videoMessage);
  const document = record(content.documentMessage);
  const text = firstString(
    message.text, message.body, message.caption, content.conversation, extended.text,
    image.caption, video.caption, document.caption, data.text, payload.text,
  );
  const chatJid = firstString(
    message.chatid, message.chatId, message.remoteJid, key.remoteJid,
    data.chatid, data.chatId, data.remoteJid, chat.wa_chatid, chat.JID, payload.chatid,
  );
  const messageType = firstString(message.messageType, message.type, data.messageType);
  const mimetype = firstString(message.mimetype, image.mimetype, content.mimetype);
  const isImage = /image/i.test(messageType) || mimetype.toLowerCase().startsWith("image/") || Object.keys(image).length > 0;
  const thumbnail = firstString(image.JPEGThumbnail, image.jpegThumbnail, content.JPEGThumbnail, content.jpegThumbnail);
  return {
    text,
    chatJid,
    messageId: firstString(message.messageid, message.messageId, message.id, key.id, data.messageid, data.id, payload.id) || crypto.randomUUID(),
    downloadId: firstString(message.id, message.messageid, message.messageId, key.id, data.id, data.messageid),
    alternateDownloadId: firstString(message.messageid, message.messageId, message.id, key.id),
    messageType,
    mimetype,
    isImage,
    mediaUrl: firstString(message.fileURL, message.fileUrl, data.fileURL, data.fileUrl, content.fileURL, content.fileUrl, image.url),
    thumbnail,
    fromMe: Boolean(message.fromMe ?? key.fromMe ?? data.fromMe),
    wasSentByApi: Boolean(message.wasSentByApi ?? data.wasSentByApi),
  };
}

async function claimMessage(messageId: string, groupJid: string) {
  if (!env.DB) return false;
  const existing = await env.DB.prepare("SELECT status FROM processed_messages WHERE message_id = ?").bind(messageId).first<{ status: string }>();
  if (existing?.status === "sent" || existing?.status === "processing") return false;
  const now = new Date().toISOString();
  if (existing) {
    await env.DB.prepare("UPDATE processed_messages SET status = 'processing', error_message = NULL, group_jid = ?, updated_at = ? WHERE message_id = ?")
      .bind(groupJid || null, now, messageId).run();
    return true;
  }
  await env.DB.prepare(`
    INSERT INTO processed_messages (message_id, group_jid, status, error_message, created_at, updated_at)
    VALUES (?, ?, 'processing', NULL, ?, ?)
  `).bind(messageId, groupJid || null, now, now).run();
  return true;
}

async function finishMessage(messageId: string, status: string, errorMessage?: string) {
  if (!env.DB) return;
  await env.DB.prepare("UPDATE processed_messages SET status = ?, error_message = ?, updated_at = ? WHERE message_id = ?")
    .bind(status, errorMessage || null, new Date().toISOString(), messageId).run();
}

function replaceConvertedLinks(message: string, products: Awaited<ReturnType<typeof processProductInput>>) {
  let output = message;
  for (const product of products) {
    if (product.affiliateUrl) output = output.split(product.sourceUrl).join(product.affiliateUrl);
  }
  return output;
}

function trustedCatalogImage(store: string | undefined, imageUrl: string | null | undefined) {
  if (!imageUrl) return null;
  try {
    const url = new URL(imageUrl);
    if (url.protocol !== "https:") return null;
    const hostname = url.hostname.toLowerCase();
    const trusted = store === "mercadolivre"
      && (hostname === "mlstatic.com" || hostname.endsWith(".mlstatic.com") || hostname === "mercadolivre.com.br" || hostname.endsWith(".mercadolivre.com.br"));
    if (!trusted) return null;
    if (store === "mercadolivre" && url.pathname.toLowerCase().endsWith(".webp")) {
      url.pathname = url.pathname.replace(/\.webp$/i, ".jpg");
    }
    const extension = url.pathname.toLowerCase();
    return {
      file: url.toString(),
      mimetype: extension.endsWith(".webp") ? "image/webp" : extension.endsWith(".png") ? "image/png" : "image/jpeg",
      source: "mercadolivre_catalog_cache",
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const runtime = env as unknown as {
    PROMOZAP_WEBHOOK_SECRET?: string;
    UAZAPI_SERVER_URL?: string;
    UAZAPI_INSTANCE_TOKEN?: string;
    OPENAI_API_KEY?: string;
  };
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!runtime.PROMOZAP_WEBHOOK_SECRET || key !== runtime.PROMOZAP_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!env.DB) return NextResponse.json({ ok: false, message: "Banco indisponível." }, { status: 503 });

  const payload = await request.json().catch(() => ({})) as UnknownRecord;
  const event = firstString(payload.EventType, payload.event, new URL(request.url).searchParams.get("event"));
  const extracted = extractMessage(payload);
  await automationLog({
    stage: "webhook_received",
    message: `Evento ${event || "sem nome"} recebido da UAZAPI.`,
    groupJid: extracted.chatJid,
    details: {
      event,
      messageId: extracted.messageId,
      messageType: extracted.messageType,
      hasText: Boolean(extracted.text),
      hasImage: extracted.isImage,
      hasLinkPreview: !extracted.isImage && extracted.thumbnail.length > 100,
      imageKind: extracted.isImage ? "attachment" : null,
      hasMediaUrl: Boolean(extracted.mediaUrl),
      urlCount: extractUrls(extracted.text).length,
    },
  });

  if (event && event !== "messages") return NextResponse.json({ ok: true, ignored: "event" });
  if (extracted.fromMe || extracted.wasSentByApi) {
    await automationLog({ stage: "ignored", message: "Mensagem enviada pela própria instância; loop evitado.", groupJid: extracted.chatJid });
    return NextResponse.json({ ok: true, ignored: "own_message" });
  }
  if (!extracted.chatJid) {
    await automationLog({ stage: "ignored", message: "Mensagem sem identificador de conversa; evento ignorado." });
    return NextResponse.json({ ok: true, ignored: "missing_chat" });
  }
  if (!extracted.chatJid.endsWith("@g.us")) {
    return handlePrivateAssistant(extracted, runtime);
  }
  if (!extracted.text || !extractUrls(extracted.text).length) {
    await automationLog({ stage: "ignored", message: "Mensagem sem links; nenhuma ação necessária.", groupJid: extracted.chatJid });
    return NextResponse.json({ ok: true, ignored: "no_links" });
  }
  if (!(await claimMessage(extracted.messageId, extracted.chatJid))) {
    await automationLog({ stage: "deduplicated", message: "Evento repetido ignorado.", groupJid: extracted.chatJid, details: { messageId: extracted.messageId } });
    return NextResponse.json({ ok: true, ignored: "duplicate" });
  }

  try {
    const route = await env.DB.prepare(`
      SELECT jid, name, category, destination_jid AS destinationJid
      FROM group_configs WHERE jid = ? AND role = 'source' AND enabled = 1
    `).bind(extracted.chatJid).first<{ jid: string; name: string; category: string; destinationJid: string | null }>();
    if (!route) {
      await finishMessage(extracted.messageId, "ignored", "Grupo não configurado como fonte.");
      await automationLog({ level: "warning", stage: "route", message: "Grupo recebido não está ativo como fonte.", groupJid: extracted.chatJid });
      return NextResponse.json({ ok: true, ignored: "source_not_configured" });
    }
    if (!route.destinationJid) {
      await finishMessage(extracted.messageId, "error", "Grupo de destino não configurado.");
      await automationLog({ level: "error", stage: "route", message: "A fonte não possui grupo de destino configurado.", groupJid: extracted.chatJid });
      return NextResponse.json({ ok: false, message: "Destino não configurado." }, { status: 422 });
    }

    const serverUrl = runtime.UAZAPI_SERVER_URL?.replace(/\/$/, "") || "";
    const token = runtime.UAZAPI_INSTANCE_TOKEN || "";
    if (!serverUrl || !token) throw new Error("Credenciais UAZAPI não configuradas no servidor.");
    if (extracted.isImage) {
      await automationLog({
        stage: "media_ignored",
        message: "A imagem recebida do grupo foi ignorada; será usada somente a imagem oficial do produto.",
        groupJid: extracted.chatJid,
        details: { messageId: extracted.messageId, messageType: extracted.messageType },
      });
    }
    const products = await processProductInput({
      message: extracted.text,
      sourceGroup: route.name || route.jid,
      destinationGroup: route.destinationJid,
    });
    const converted = products.filter((product) => product.status === "converted" && product.affiliateUrl);
    await automationLog({
      level: converted.length ? "success" : "warning",
      stage: "conversion",
      message: converted.length ? `${converted.length} link(s) convertido(s).` : "Nenhum link pôde ser convertido.",
      groupJid: extracted.chatJid,
      details: { products: products.map((item) => ({ id: item.id, store: item.store, status: item.status, code: item.productCode })) },
    });
    if (!converted.length) {
      await finishMessage(extracted.messageId, "not_converted", products.map((item) => item.errorMessage).filter(Boolean).join(" | "));
      return NextResponse.json({ ok: true, converted: 0, sent: false });
    }

    const outgoingText = replaceConvertedLinks(extracted.text, products).slice(0, 4096);
    const primaryProduct = converted[0];
    const officialProductImage = trustedCatalogImage(primaryProduct?.store, primaryProduct?.imageUrl);
    const outgoingImage = officialProductImage;
    if (officialProductImage) {
      await automationLog({
        level: "success",
        stage: "product_image",
        message: `Imagem oficial do Mercado Livre encontrada para ${primaryProduct.productCode}.`,
        groupJid: extracted.chatJid,
        productId: primaryProduct.id,
        details: { productCode: primaryProduct.productCode, imageUrl: primaryProduct.imageUrl, mediaSource: officialProductImage.source, ignoredIncomingImage: extracted.isImage },
      });
    }
    if (!officialProductImage) {
      await automationLog({
        level: "warning",
        stage: "media",
        message: "A loja não disponibilizou uma imagem oficial; a oferta será enviada apenas como texto.",
        groupJid: extracted.chatJid,
        details: { messageId: extracted.messageId, productCode: primaryProduct.productCode },
      });
    }
    const fallbackEndpoint = outgoingImage ? "/send/media" : "/send/text";
    const fallbackBody = outgoingImage ? {
      number: route.destinationJid,
      type: "image",
      file: outgoingImage.file,
      text: outgoingText,
      mimetype: outgoingImage.mimetype,
      async: true,
      track_source: "promozap",
      track_id: extracted.messageId,
    } : {
      number: route.destinationJid,
      text: outgoingText,
      linkPreview: true,
      async: true,
      track_source: "promozap",
      track_id: extracted.messageId,
    };
    const response = await fetch(`${serverUrl}${fallbackEndpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify(fallbackBody),
      signal: AbortSignal.timeout(20_000),
    });
    const providerResponse = await response.text();
    if (!response.ok) throw new Error(`UAZAPI respondeu HTTP ${response.status}: ${providerResponse.slice(0, 300)}`);

    await markProductsSent(converted.map((product) => product.id), route.destinationJid);
    await finishMessage(extracted.messageId, "sent");
    await automationLog({
      level: "success",
      stage: "sent",
      message: `Oferta enviada ao grupo de destino (${converted.length} produto(s))${officialProductImage ? " com a foto oficial do Mercado Livre" : " sem foto"}.`,
      groupJid: route.destinationJid,
      details: {
        sourceGroup: extracted.chatJid,
        destinationGroup: route.destinationJid,
        providerStatus: response.status,
        messageId: extracted.messageId,
        imageForwarded: Boolean(outgoingImage),
        mediaSource: outgoingImage?.source || null,
        incomingImageIgnored: extracted.isImage,
        buttonSent: false,
        messageFormat: outgoingImage ? "normal_image_with_caption" : "normal_text",
      },
    });
    return NextResponse.json({ ok: true, converted: converted.length, sent: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido no processamento.";
    await finishMessage(extracted.messageId, "error", message);
    await automationLog({ level: "error", stage: "processing", message, groupJid: extracted.chatJid, details: { messageId: extracted.messageId } });
    return NextResponse.json({ ok: false, message: "A mensagem foi registrada, mas o envio falhou." }, { status: 500 });
  }
}
