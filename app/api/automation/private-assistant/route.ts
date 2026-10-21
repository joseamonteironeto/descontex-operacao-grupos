import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { automationLog } from "@/lib/automation-log";

const allowedModels = new Set(["gpt-6-luna", "gpt-6.1-sol", "gpt-6-astra"]);

type AssistantSettings = {
  enabled: boolean;
  model: string;
  typingDelayMs: number;
};

const defaults: AssistantSettings = {
  enabled: false,
  model: "gpt-6-luna",
  typingDelayMs: 2400,
};

async function readSettings(): Promise<AssistantSettings> {
  if (!env.DB) return defaults;
  const row = await env.DB.prepare(`SELECT enabled, model, typing_delay_ms AS typingDelayMs
    FROM private_assistant_settings WHERE id = 1`).first<{ enabled: number; model: string; typingDelayMs: number }>().catch(() => null);
  return row ? {
    enabled: Boolean(row.enabled),
    model: allowedModels.has(row.model) ? row.model : defaults.model,
    typingDelayMs: Math.max(800, Math.min(6000, Number(row.typingDelayMs) || defaults.typingDelayMs)),
  } : defaults;
}

export async function GET() {
  const runtime = env as unknown as { OPENAI_API_KEY?: string };
  return NextResponse.json({ settings: await readSettings(), configured: Boolean(runtime.OPENAI_API_KEY) });
}

export async function POST(request: Request) {
  const runtime = env as unknown as { UAZAPI_INSTANCE_TOKEN?: string; OPENAI_API_KEY?: string };
  const adminToken = request.headers.get("x-promozap-admin-token") || "";
  if (!runtime.UAZAPI_INSTANCE_TOKEN || adminToken !== runtime.UAZAPI_INSTANCE_TOKEN) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (!env.DB) return NextResponse.json({ error: "Banco de dados indisponível." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const model = typeof body.model === "string" && allowedModels.has(body.model) ? body.model : defaults.model;
  const typingDelayMs = Math.max(800, Math.min(6000, Math.round(Number(body.typingDelayMs) || defaults.typingDelayMs)));
  const settings = { enabled: body.enabled === true, model, typingDelayMs };
  if (settings.enabled && !runtime.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Configure a OpenAI no servidor antes de ativar o atendimento privado." }, { status: 422 });
  }
  await env.DB.prepare(`INSERT INTO private_assistant_settings (id, enabled, model, typing_delay_ms, updated_at)
    VALUES (1, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET enabled = excluded.enabled, model = excluded.model,
      typing_delay_ms = excluded.typing_delay_ms, updated_at = excluded.updated_at`)
    .bind(settings.enabled ? 1 : 0, settings.model, settings.typingDelayMs, new Date().toISOString()).run();
  await automationLog({
    level: "success",
    stage: "private_assistant_settings",
    message: settings.enabled ? "Atendimento privado por IA ativado." : "Atendimento privado por IA desativado.",
    details: { model: settings.model, typingDelayMs: settings.typingDelayMs },
  });
  return NextResponse.json({ ok: true, configured: Boolean(runtime.OPENAI_API_KEY), settings });
}
