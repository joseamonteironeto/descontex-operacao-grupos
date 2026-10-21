import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { getMercadoLivreAccessToken, mercadoLivreOAuthStatus } from "@/lib/mercadolivre-oauth";
import { readIntegrationSecret } from "@/lib/integration-secret";

type ApiResult = {
  ok: boolean;
  status: number;
  code: string | null;
  message: string | null;
  scopes?: string[];
};

async function probe(path: string, token: string): Promise<ApiResult> {
  try {
    const response = await fetch(`https://api.mercadolibre.com${path}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    const scopes = Array.isArray(payload.scopes)
      ? payload.scopes.filter((value): value is string => typeof value === "string")
      : undefined;
    return {
      ok: response.ok,
      status: response.status,
      code: typeof payload.code === "string" ? payload.code : typeof payload.error === "string" ? payload.error : null,
      message: typeof payload.message === "string" ? payload.message : null,
      ...(scopes ? { scopes } : {}),
    };
  } catch (error) {
    return { ok: false, status: 0, code: "NETWORK_ERROR", message: error instanceof Error ? error.message : "Falha de rede" };
  }
}

export async function GET(request: Request) {
  const token = await getMercadoLivreAccessToken();
  const runtime = env as unknown as { MERCADOLIVRE_CLIENT_ID?: string };
  const clientId = runtime.MERCADOLIVRE_CLIENT_ID?.trim() || await readIntegrationSecret("mercadolivre_client_id");
  const oauth = await mercadoLivreOAuthStatus();
  if (!token || !clientId) return NextResponse.json({ error: "Mercado Livre não conectado." }, { status: 412 });
  const itemId = new URL(request.url).searchParams.get("itemId")?.trim().toUpperCase() || "MLB4960342105";
  if (!/^MLB\d{7,}$/.test(itemId)) return NextResponse.json({ error: "Item ID inválido." }, { status: 400 });

  const [application, grants, me, item, batch, salePrice] = await Promise.all([
    probe(`/applications/${encodeURIComponent(clientId)}`, token),
    probe(`/applications/${encodeURIComponent(clientId)}/grants`, token),
    probe("/users/me", token),
    probe(`/items/${encodeURIComponent(itemId)}`, token),
    probe(`/items?ids=${encodeURIComponent(itemId)}`, token),
    probe(`/items/${encodeURIComponent(itemId)}/sale_price?context=channel_marketplace`, token),
  ]);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    itemId,
    oauth: { connected: oauth.connected, expiresAt: oauth.expiresAt, userId: oauth.userId, tokenScope: oauth.scope },
    probes: { application, grants, me, item, batch, salePrice },
  });
}
