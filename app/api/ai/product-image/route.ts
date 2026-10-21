import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";

type RuntimeEnv = {
  OPENAI_API_KEY?: string;
  UAZAPI_INSTANCE_TOKEN?: string;
};

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function trustedProductImage(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname.endsWith("mlstatic.com") || url.hostname.endsWith("mercadolivre.com.br"));
  } catch {
    return false;
  }
}

function upstreamMessage(payload: Record<string, unknown>, status: number) {
  const error = payload.error && typeof payload.error === "object" ? payload.error as Record<string, unknown> : {};
  return clean(error.message, 300) || `A OpenAI respondeu HTTP ${status}.`;
}

export async function POST(request: Request) {
  const runtime = env as unknown as RuntimeEnv;
  const adminToken = request.headers.get("x-promozap-admin-token") || "";
  if (!runtime.UAZAPI_INSTANCE_TOKEN || adminToken !== runtime.UAZAPI_INSTANCE_TOKEN) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (!runtime.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI ainda não foi configurada no servidor." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const title = clean(body.title, 300);
  const imageUrl = clean(body.imageUrl, 4_000);
  if (!title || !trustedProductImage(imageUrl)) {
    return NextResponse.json({ error: "O produto precisa ter nome e uma imagem oficial válida do Mercado Livre." }, { status: 400 });
  }

  const prompt = `Crie somente o cenário fotográfico horizontal de uma arte publicitária brasileira para Casa e Decoração usando exatamente o produto da imagem de referência.
Preserve rigorosamente formato, proporções, cor, acabamento e detalhes visuais do produto. Não invente acessórios incluídos e não duplique o produto.
Monte uma cena doméstica premium, iluminada, realista e convidativa, coerente com o uso deste produto: ${title}.
Deixe o produto grande no centro-esquerda e reserve cerca de 38% de espaço visual mais limpo no lado direito para o sistema aplicar título e preço depois.
Use luz natural quente com pequenos acentos azul e ciano da marca DesconteX. Composição comercial forte, acabamento de e-commerce profissional, alta nitidez.
Não escreva absolutamente nenhum texto, número, preço, desconto, logotipo, selo ou marca adicional. Não inclua pessoas, mãos, molduras ou elementos de interface.`;

  let lastError = "A IA não conseguiu gerar a arte.";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${runtime.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-image-2",
          images: [{ image_url: imageUrl }],
          prompt,
          n: 1,
          size: "1536x1024",
          quality: "low",
          background: "opaque",
          output_format: "jpeg",
          output_compression: 78,
        }),
        signal: AbortSignal.timeout(110_000),
      });
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      const data = Array.isArray(payload.data) ? payload.data : [];
      const first = data[0] && typeof data[0] === "object" ? data[0] as Record<string, unknown> : {};
      const rawBase64 = typeof first.b64_json === "string" ? first.b64_json.trim() : "";
      const base64 = rawBase64.length <= 7_000_000 ? rawBase64 : "";
      if (response.ok && base64) {
        return NextResponse.json({ ok: true, image: `data:image/jpeg;base64,${base64}`, model: "gpt-image-2", quality: "low" });
      }
      if (response.ok && rawBase64) {
        lastError = "A imagem gerada ficou grande demais para ser enviada com segurança. Tente novamente.";
        continue;
      }
      lastError = upstreamMessage(payload, response.status);
      if (response.status >= 400 && response.status < 500 && response.status !== 429) break;
    } catch (caught) {
      lastError = caught instanceof Error ? caught.message : "A geração de imagem foi interrompida.";
    }
  }
  return NextResponse.json({ error: lastError }, { status: 502 });
}
