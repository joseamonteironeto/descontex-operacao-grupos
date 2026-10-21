import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";

type RuntimeEnv = {
  OPENAI_API_KEY?: string;
  OPENAI_CTA_MODEL?: string;
  UAZAPI_INSTANCE_TOKEN?: string;
  DB?: D1Database;
};

const allowedModels = new Set(["gpt-6-luna", "gpt-6.1-sol", "gpt-6-astra"]);
const allowedStyles = new Set(["direto", "urgencia", "bem-humorado", "elegante"]);

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function extractOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown[] }).content) ? (item as { content: unknown[] }).content : [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string" && text.trim()) return text;
    }
  }
  return "";
}

function sanitizeCta(value: string, maxWords: number) {
  const firstLine = value.replace(/```[\s\S]*?```/g, " ").split(/\r?\n/).find((line) => line.trim()) || "";
  const safe = firstLine
    .replace(/^[\s"'`*_~-]+|[\s"'`*_~-]+$/g, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\bR\$\s*[\d.,]+/gi, "")
    .replace(/\b\d+[,.]?\d*\s*%/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const words = safe.split(/\s+/).filter(Boolean);
  if (words.length > maxWords || safe.length > 140) return "";
  const incompleteEndings = new Set(["a", "ao", "aos", "as", "com", "da", "das", "de", "do", "dos", "e", "em", "na", "nas", "no", "nos", "o", "os", "para", "por", "que", "se", "um", "uma"]);
  const lastWord = (words.at(-1) || "").toLocaleLowerCase("pt-BR").replace(/[^a-záàâãéêíóôõúç]/gi, "");
  if (!words.length || incompleteEndings.has(lastWord)) return "";
  return safe;
}

function sanitizeFullCopy(value: string, link: string) {
  const safe = value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 1200);
  if (!safe || safe.split(/\s+/).length > 100) return "";
  return `${safe}\n\n🔗 *GARANTA AQUI:* ${link}`.trim();
}

async function hash(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function GET() {
  const runtime = env as unknown as RuntimeEnv;
  const cacheEntries = runtime.DB
    ? await runtime.DB.prepare("SELECT COUNT(*) AS total FROM ai_cta_cache").first<{ total: number }>().then((row) => Number(row?.total) || 0).catch(() => 0)
    : 0;
  return NextResponse.json({
    configured: Boolean(runtime.OPENAI_API_KEY),
    defaultModel: allowedModels.has(runtime.OPENAI_CTA_MODEL || "") ? runtime.OPENAI_CTA_MODEL : "gpt-6-luna",
    cacheEntries,
  });
}

export async function DELETE(request: Request) {
  const runtime = env as unknown as RuntimeEnv;
  const adminToken = request.headers.get("x-promozap-admin-token") || "";
  if (!runtime.UAZAPI_INSTANCE_TOKEN || adminToken !== runtime.UAZAPI_INSTANCE_TOKEN) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (!runtime.DB) return NextResponse.json({ error: "Banco de dados indisponível." }, { status: 503 });
  const result = await runtime.DB.prepare("DELETE FROM ai_cta_cache").run();
  return NextResponse.json({ ok: true, deleted: Number(result.meta.changes) || 0 });
}

export async function POST(request: Request) {
  const runtime = env as unknown as RuntimeEnv;
  const adminToken = request.headers.get("x-promozap-admin-token") || "";
  if (!runtime.UAZAPI_INSTANCE_TOKEN || adminToken !== runtime.UAZAPI_INSTANCE_TOKEN) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (!runtime.OPENAI_API_KEY) return NextResponse.json({ error: "OpenAI ainda não foi configurada no servidor." }, { status: 503 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const product = body.product && typeof body.product === "object" ? body.product as Record<string, unknown> : {};
  const title = clean(product.title, 300);
  if (!title) return NextResponse.json({ error: "Informe o nome do produto." }, { status: 400 });
  const productId = clean(product.id, 120) || title;
  const requestedModel = clean(body.model, 40);
  const model = allowedModels.has(requestedModel) ? requestedModel : allowedModels.has(runtime.OPENAI_CTA_MODEL || "") ? runtime.OPENAI_CTA_MODEL! : "gpt-6-luna";
  const requestedStyle = clean(body.style, 30);
  const style = allowedStyles.has(requestedStyle) ? requestedStyle : "direto";
  const mode = body.mode === "full-copy" ? "full-copy" : "cta";
  const maxWords = Math.max(4, Math.min(15, Math.floor(Number(body.maxWords) || 9)));
  const emoji = body.emoji !== false;
  const price = typeof product.price === "number" ? product.price : null;
  const originalPrice = typeof product.originalPrice === "number" ? product.originalPrice : null;
  const discountPercentage = typeof product.discountPercentage === "number" ? product.discountPercentage : null;
  const freeShipping = product.freeShipping === true;
  const full = product.full === true;
  const seller = clean(product.seller, 140);
  const link = clean(product.link, 500);
  if (mode === "full-copy" && !/^https:\/\/meli\.la\/[A-Za-z0-9_-]+/i.test(link)) {
    return NextResponse.json({ error: "A mensagem completa só é gerada depois que o link curto meli.la é confirmado." }, { status: 400 });
  }
  const category = clean(product.category, 120);
  const brand = clean(product.brand, 100);
  const cacheKey = await hash(JSON.stringify({ promptVersion: mode === "cta" ? 4 : 1, mode, productId, title, category, brand, price, originalPrice, discountPercentage, freeShipping, full, seller, link, model, style, maxWords, emoji }));

  if (runtime.DB) {
    const cached = await runtime.DB.prepare("SELECT cta FROM ai_cta_cache WHERE cache_key = ?").bind(cacheKey).first<{ cta: string }>().catch(() => null);
    if (cached?.cta) return NextResponse.json({ ok: true, cta: cached.cta, model, cached: true });
  }

  const styleGuide: Record<string, string> = {
    direto: "direta, popular e convincente",
    urgencia: "com urgência moderada, sem alegar escassez",
    "bem-humorado": "bem-humorada e natural",
    elegante: "elegante e aspiracional",
  };
  const input = JSON.stringify({ title, category: category || undefined, brand: brand || undefined, price, originalPrice, discountPercentage, freeShipping, full, seller: seller || undefined });
  const ctaInstructions = `Crie um único gancho de compra em português do Brasil para aparecer acima de uma oferta. Seja ${styleGuide[style]} e conecte a frase ao uso ou desejo despertado pelo produto. O tom pode lembrar frases como "ADULTO DE VERDADE TEM QUE TER", mas não copie o exemplo. Escreva uma frase gramaticalmente completa com no máximo ${maxWords} palavras; termine em substantivo, adjetivo ou verbo, nunca em artigo, preposição ou conjunção. ${emoji ? "Comece com exatamente um emoji realmente relacionado ao produto ou ao sentimento da frase." : "Não use emojis."} Não use chamadas genéricas como "clique", "confira", "compre agora", "chame no WhatsApp" ou "aproveite". Não inclua preço, desconto, números, link, hashtags, aspas, markdown, promessa falsa, escassez ou informação que não esteja no nome do produto. Responda somente com a frase.`;
  const fullCopyInstructions = `Escreva uma mensagem promocional humanizada em português do Brasil para WhatsApp, com tom ${styleGuide[style]}. Use somente os fatos fornecidos, sem inventar benefício, cupom, estoque, garantia ou urgência. Faça de 4 a 7 linhas curtas e no máximo 80 palavras. Use formatação nativa do WhatsApp em toda a mensagem: *negrito* para o gancho, título e preço; _itálico_ apenas para um benefício verdadeiro; ~riscado~ somente no preço anterior quando ele existir. ${emoji ? "Use de 2 a 4 emojis relevantes, sem exagero." : "Não use emojis."} Destaque a economia e o frete apenas quando fornecidos. Não inclua URL nem chamada de link: o sistema anexará o link curto exato depois. Não use hashtags, blocos de código, aspas ou afirmações não comprovadas. Responda somente com a mensagem pronta.`;
  const instructions = mode === "full-copy" ? fullCopyInstructions : ctaInstructions;
  let cta = "";
  let upstreamError = "";
  for (let attempt = 0; attempt < 2 && !cta; attempt += 1) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${runtime.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model,
        reasoning: { effort: model === "gpt-6-luna" ? "none" : "low" },
        max_output_tokens: mode === "full-copy" ? 220 : 60,
        instructions: `${instructions}${attempt ? mode === "full-copy" ? " A resposta anterior foi descartada. Reescreva mais curta, fiel aos dados e com a formatação solicitada." : " A resposta anterior foi descartada porque excedeu o limite ou terminou incompleta. Reescreva mais curta e completa." : ""}`,
        input,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      upstreamError = payload.error && typeof payload.error === "object" ? clean((payload.error as Record<string, unknown>).message, 240) : `A OpenAI respondeu HTTP ${response.status}.`;
      break;
    }
    cta = mode === "full-copy" ? sanitizeFullCopy(extractOutputText(payload), link) : sanitizeCta(extractOutputText(payload), maxWords);
  }
  if (!cta) return NextResponse.json({ error: upstreamError || "A IA não devolveu uma frase curta e completa após duas tentativas." }, { status: 502 });

  if (runtime.DB) {
    await runtime.DB.prepare(`INSERT INTO ai_cta_cache (cache_key, product_id, model, style, cta, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET cta = excluded.cta, created_at = excluded.created_at`)
      .bind(cacheKey, productId, model, style, cta, new Date().toISOString()).run().catch(() => undefined);
  }
  return NextResponse.json({ ok: true, cta, model, cached: false });
}
