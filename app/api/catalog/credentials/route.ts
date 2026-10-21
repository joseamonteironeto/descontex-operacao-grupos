import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { deleteIntegrationSecret, saveIntegrationSecret } from "@/lib/integration-secret";
import { disconnectMercadoLivreOAuth, mercadoLivreOAuthStatus } from "@/lib/mercadolivre-oauth";

function authorized(request: Request) {
  const runtime = env as unknown as { UAZAPI_INSTANCE_TOKEN?: string };
  return Boolean(runtime.UAZAPI_INSTANCE_TOKEN && request.headers.get("x-promozap-admin-token") === runtime.UAZAPI_INSTANCE_TOKEN);
}

export async function GET() {
  const mercadoLivre = await mercadoLivreOAuthStatus();
  return NextResponse.json({ mercadoLivreConfigured: mercadoLivre.connected, mercadoLivreAppConfigured: mercadoLivre.appConfigured, mercadoLivreExpiresAt: mercadoLivre.expiresAt, mercadoLivreUserId: mercadoLivre.userId });
}

export async function PUT(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Token administrativo inválido." }, { status: 401 });
  const body = await request.json() as { mercadoLivreClientId?: string; mercadoLivreClientSecret?: string; mercadoLivreAccessToken?: string };
  if (body.mercadoLivreAccessToken?.trim()) await saveIntegrationSecret("mercadolivre_access_token", body.mercadoLivreAccessToken.trim());
  if (body.mercadoLivreClientId?.trim()) await saveIntegrationSecret("mercadolivre_client_id", body.mercadoLivreClientId.trim());
  if (body.mercadoLivreClientSecret?.trim()) await saveIntegrationSecret("mercadolivre_client_secret", body.mercadoLivreClientSecret.trim());
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Token administrativo inválido." }, { status: 401 });
  const store = new URL(request.url).searchParams.get("store");
  if (store === "amazon") {
    return NextResponse.json({ error: "A Amazon está desativada." }, { status: 410 });
  }
  if (store === "mercadolivre") {
    await disconnectMercadoLivreOAuth();
    if (new URL(request.url).searchParams.get("app") === "true") {
      await Promise.all([deleteIntegrationSecret("mercadolivre_client_id"), deleteIntegrationSecret("mercadolivre_client_secret")]);
    }
  }
  return NextResponse.json({ ok: true });
}
