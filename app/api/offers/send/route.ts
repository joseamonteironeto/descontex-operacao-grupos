import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { automationLog } from "@/lib/automation-log";

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function trustedMercadoLivreMedia(value: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    const allowed = host === "mlstatic.com" || host.endsWith(".mlstatic.com");
    return allowed ? url.href : null;
  } catch { return null; }
}

function trustedLink(value: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch { return null; }
}

function trustedPreviewImage(value: string) {
  if (/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/=]+$/i.test(value) && value.length <= 2_500_000) return value;
  return trustedMercadoLivreMedia(value);
}

export async function POST(request: Request) {
  const runtime = env as unknown as { UAZAPI_SERVER_URL?: string; UAZAPI_INSTANCE_TOKEN?: string };
  const adminToken = request.headers.get("x-promozap-admin-token") || "";
  if (!runtime.UAZAPI_INSTANCE_TOKEN || adminToken !== runtime.UAZAPI_INSTANCE_TOKEN) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (!env.DB) return NextResponse.json({ error: "Banco de dados indisponível." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const destinationJid = clean(body.destinationJid, 160);
  const text = clean(body.text, 4096);
  const imageUrl = body.includeImage === false ? null : trustedMercadoLivreMedia(clean(body.imageUrl, 4000));
  const reviewCards = Array.isArray(body.reviewCards)
    ? body.reviewCards.flatMap((value) => {
        if (!value || typeof value !== "object") return [];
        const record = value as Record<string, unknown>;
        const video = trustedMercadoLivreMedia(clean(record.videoUrl, 4000));
        const image = video ? null : trustedMercadoLivreMedia(clean(record.imageUrl, 4000));
        if (!video && !image) return [];
        return [{ text: clean(record.text, 1024) || "Avaliação publicada com mídia.", image, video }];
      }).slice(0, 4)
    : [];
  const productUrl = trustedLink(clean(body.productUrl, 4000));
  const productId = clean(body.productId, 100);
  const productKey = clean(body.productKey, 160) || productId || productUrl || "";
  const productTitle = clean(body.productTitle, 300);
  const brandedPreviewEnabled = body.brandedPreviewEnabled === true;
  const brandedPreviewImage = trustedPreviewImage(clean(body.brandedPreviewImage, 2_500_000));
  const discountPercentage = Math.max(0, Math.min(95, Math.round(Number(body.discountPercentage) || 0)));
  const rating = Math.max(0, Math.min(5, Number(body.rating) || 0));
  const monitorId = clean(body.monitorId, 100);
  const sendMode = monitorId ? "monitor" : "manual";
  const carouselEnabled = body.carouselEnabled !== false;
  const carouselButtonLabel = clean(body.carouselButtonLabel, 25) || "VER OFERTA";
  if (!destinationJid || !text) return NextResponse.json({ error: "Escolha o grupo e escreva a mensagem." }, { status: 400 });
  const destination = await env.DB.prepare("SELECT jid, name FROM group_configs WHERE jid = ? AND role = 'destination' AND enabled = 1")
    .bind(destinationJid).first<{ jid: string; name: string }>();
  if (!destination) return NextResponse.json({ error: "O grupo escolhido não está configurado como destino ativo." }, { status: 422 });
  const serverUrl = (runtime.UAZAPI_SERVER_URL || "").replace(/\/$/, "");
  if (!serverUrl) return NextResponse.json({ error: "Servidor UAZAPI não configurado." }, { status: 503 });
  let lockAcquired = false;
  if (monitorId && productKey) {
    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    await env.DB.prepare("DELETE FROM offer_send_locks WHERE expires_at <= ?").bind(nowIso).run();
    const last = await env.DB.prepare(`SELECT product_key AS productKey, product_id AS productId
      FROM offer_sends WHERE monitor_id = ? ORDER BY sent_at DESC LIMIT 1`)
      .bind(monitorId).first<{ productKey: string | null; productId: string | null }>();
    if ((last?.productKey && last.productKey === productKey) || (!last?.productKey && last?.productId === productId)) {
      return NextResponse.json({ error: "Este produto foi o último enviado por esta operação. Outro produto será escolhido." }, { status: 409 });
    }
    const lock = await env.DB.prepare(`INSERT OR IGNORE INTO offer_send_locks
      (monitor_id, product_key, locked_at, expires_at) VALUES (?, ?, ?, ?)`)
      .bind(monitorId, productKey, nowIso, expiresAt).run();
    if (!lock.meta.changes) {
      return NextResponse.json({ error: "Este produto já foi enviado nas últimas 24 horas. Outro produto será escolhido." }, { status: 409 });
    }
    lockAcquired = true;
  }
  // O texto deve respeitar exatamente o modelo escolhido. O link continua
  // disponível para os botões, mas só aparece no corpo quando o modelo usa
  // {{link}} (já substituído pelo cliente antes desta chamada).
  const useBrandedPreview = brandedPreviewEnabled && Boolean(productUrl) && Boolean(brandedPreviewImage || imageUrl) && !carouselEnabled;
  const messageText = useBrandedPreview && productUrl && !text.includes(productUrl) ? `${text}\n\n🔗 ${productUrl}` : text;
  const useCarousel = carouselEnabled && Boolean(imageUrl) && reviewCards.length > 0;
  const carouselButtons = productUrl ? [{ id: productUrl, text: carouselButtonLabel, type: "URL" }] : [];
  const endpoint = useCarousel ? "/send/carousel" : useBrandedPreview ? "/send/text" : imageUrl ? "/send/media" : "/send/text";
  const payload = useCarousel ? {
    number: destinationJid,
    carousel: [
      {
        text: messageText,
        image: imageUrl,
        buttons: carouselButtons,
      },
      ...reviewCards.map((review) => ({
        text: review.text,
        ...(review.video ? { video: review.video } : { image: review.image }),
        buttons: carouselButtons,
      })),
    ],
    // O envio assíncrono da UAZAPI cria um envelope vazio antes do carrossel
    // em alguns clientes móveis do WhatsApp. Aguardar o envio evita essa bolha.
    async: false,
    track_source: "promozap_manual",
    track_id: productId || crypto.randomUUID(),
  } : useBrandedPreview ? {
    number: destinationJid,
    text: messageText,
    linkPreview: true,
    linkPreviewTitle: productTitle || "Oferta DesconteX",
    linkPreviewDescription: [discountPercentage ? `${discountPercentage}% OFF` : "", rating ? `★ ${rating.toFixed(1)}` : ""].filter(Boolean).join(" · ") || "Oferta selecionada pela DesconteX",
    linkPreviewImage: brandedPreviewImage || imageUrl,
    linkPreviewLarge: true,
    async: true,
    track_source: "descontex_preview",
    track_id: productId || crypto.randomUUID(),
  } : imageUrl ? {
    number: destinationJid,
    type: "image",
    file: imageUrl,
    text: messageText,
    mimetype: imageUrl.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
    async: true,
    track_source: "promozap_manual",
    track_id: productId || crypto.randomUUID(),
  } : {
    number: destinationJid,
    text: messageText,
    linkPreview: true,
    async: true,
    track_source: "promozap_manual",
    track_id: productId || crypto.randomUUID(),
  };
  try {
    const response = await fetch(`${serverUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: runtime.UAZAPI_INSTANCE_TOKEN },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(useCarousel ? 30_000 : 20_000),
    });
    const providerResponse = await response.text();
    if (!response.ok) throw new Error(`UAZAPI respondeu HTTP ${response.status}: ${providerResponse.slice(0, 240)}`);
    const sentAt = new Date().toISOString();
    await env.DB.prepare(`INSERT INTO offer_sends
      (id, product_id, product_key, product_title, product_url, destination_jid, destination_name, monitor_id, send_mode, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), productId || productUrl || crypto.randomUUID(), productKey || null, productTitle || null, productUrl, destination.jid, destination.name || null, monitorId || null, sendMode, sentAt).run();
    await automationLog({ level: "success", stage: "manual_send", message: `Oferta enviada manualmente para ${destination.name || destination.jid}.`, groupJid: destination.jid, productId: productId || undefined, details: { withImage: Boolean(imageUrl) && !useBrandedPreview, brandedPreview: useBrandedPreview, carouselCards: useCarousel ? reviewCards.length + 1 : 0, reviewMediaCards: useCarousel ? reviewCards.length : 0, providerStatus: response.status } });
    return NextResponse.json({ ok: true, destination: destination.name || destination.jid, withImage: Boolean(imageUrl) && !useBrandedPreview, brandedPreview: useBrandedPreview, carouselCards: useCarousel ? reviewCards.length + 1 : 0, reviewMediaCards: useCarousel ? reviewCards.length : 0 });
  } catch (error) {
    if (lockAcquired && monitorId && productKey) {
      await env.DB.prepare("DELETE FROM offer_send_locks WHERE monitor_id = ? AND product_key = ?").bind(monitorId, productKey).run().catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : "Falha ao enviar a oferta.";
    await automationLog({ level: "error", stage: "manual_send", message, groupJid: destinationJid, productId: productId || undefined });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
