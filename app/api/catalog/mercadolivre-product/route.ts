import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { getMercadoLivreOffer } from "@/lib/mercadolivre-api";
import { mercadoLivreOAuthStatus } from "@/lib/mercadolivre-oauth";

function authorized(request: Request) {
  const runtime = env as unknown as { UAZAPI_INSTANCE_TOKEN?: string };
  return Boolean(runtime.UAZAPI_INSTANCE_TOKEN && request.headers.get("x-promozap-admin-token") === runtime.UAZAPI_INSTANCE_TOKEN);
}

function availability(raw: Record<string, unknown> | undefined) {
  const entries = [
    ["item", "Anúncio e estoque"],
    ["salePrice", "Preço de venda atual"],
    ["prices", "Preços padrão e promocionais"],
    ["promotions", "Promoções e cupons"],
    ["seller", "Vendedor e reputação"],
    ["category", "Categoria"],
    ["product", "Produto de catálogo"],
  ] as const;
  return entries.map(([key, label]) => ({ key, label, available: raw?.[key] != null }));
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Não autorizado. Informe o token da UAZAPI em Credenciais." }, { status: 401 });
  const input = new URL(request.url).searchParams.get("id")?.trim().slice(0, 500) || "";
  if (!input) return NextResponse.json({ error: "Informe o ID MLB ou o link do produto." }, { status: 400 });

  try {
    const [product, oauth] = await Promise.all([
      getMercadoLivreOffer(input),
      mercadoLivreOAuthStatus(),
    ]);
    return NextResponse.json({
      ok: true,
      checkedAt: new Date().toISOString(),
      connection: {
        connected: oauth.connected,
        expiresAt: oauth.expiresAt,
        userId: oauth.userId,
        scope: oauth.scope,
      },
      endpoints: availability(product.raw),
      product,
      notes: [
        "Os dados de preço usam sale_price e prices quando o Mercado Livre autoriza o item.",
        "Metadados privados de promoção podem ser ocultados quando o anúncio pertence a outro vendedor.",
        "Cupons públicos nem sempre são expostos pela API oficial; o coletor da página continua sendo o complemento.",
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível consultar o produto.";
    const status = /conecte|token|oauth|autoriz/i.test(message) ? 412 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
