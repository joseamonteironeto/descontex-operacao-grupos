import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  if (!env.DB) return NextResponse.json({ history: [], summary: [] });
  try {
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") || "").trim().slice(0, 100);
    const monitorId = (url.searchParams.get("monitorId") || "").trim().slice(0, 100);
    const from = (url.searchParams.get("from") || "").trim().slice(0, 40);
    const to = (url.searchParams.get("to") || "").trim().slice(0, 40);
    const pattern = `%${search}%`;
    const where = search ? "WHERE product_id LIKE ? OR product_title LIKE ? OR destination_name LIKE ?" : "";
    const bindings = search ? [pattern, pattern, pattern] : [];
    const dailyCountQuery = monitorId && from && to
      ? env.DB.prepare("SELECT COUNT(*) AS total FROM offer_sends WHERE monitor_id = ? AND sent_at >= ? AND sent_at < ?").bind(monitorId, from, to).first<{ total: number }>()
      : Promise.resolve({ total: 0 });
    const [history, summary, dailyCount] = await Promise.all([
      env.DB.prepare(`SELECT id, product_id AS productId, product_title AS productTitle, product_url AS productUrl,
        destination_jid AS destinationJid, destination_name AS destinationName, monitor_id AS monitorId,
        send_mode AS sendMode, sent_at AS sentAt FROM offer_sends ${where} ORDER BY sent_at DESC LIMIT 300`)
        .bind(...bindings).all(),
      env.DB.prepare(`SELECT product_id AS productId, MAX(product_title) AS productTitle,
        COUNT(*) AS sendCount, COUNT(DISTINCT destination_jid) AS groupCount, MAX(sent_at) AS lastSentAt
        FROM offer_sends ${where} GROUP BY product_id ORDER BY lastSentAt DESC LIMIT 200`)
        .bind(...bindings).all(),
      dailyCountQuery,
    ]);
    return NextResponse.json({ history: history.results, summary: summary.results, dailyCount: Number(dailyCount?.total) || 0 });
  } catch (error) {
    console.error("sends.list", error);
    return NextResponse.json({ error: "O histórico de envios não pôde ser carregado." }, { status: 500 });
  }
}
