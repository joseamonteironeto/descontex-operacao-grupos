import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function finite(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function productCode(value: Record<string, unknown>) {
  const direct = clean(value.itemId || value.productId || value.id, 100).toUpperCase().match(/\bMLBU?-?\d{7,}\b/)?.[0];
  if (direct) return direct.replace(/^MLB-/, "MLB");
  const url = clean(value.url, 4000);
  return url.match(/\/(?:p|up)\/(MLBU?\d{7,})(?:[/?#]|$)/i)?.[1]?.toUpperCase()
    || url.match(/\b(MLB-?\d{7,})\b/i)?.[1]?.toUpperCase().replace("MLB-", "MLB")
    || "";
}

function fallbackId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `ml-${(hash >>> 0).toString(16)}`;
}

export async function GET(request: Request) {
  if (!env.DB) return NextResponse.json({ products: [], categories: [] });
  try {
    const url = new URL(request.url);
    const id = clean(url.searchParams.get("id"), 120);
    if (id) {
      const [product, history] = await Promise.all([
        env.DB.prepare(`SELECT id, store, category, product_code AS productCode, title, image_url AS imageUrl,
          product_url AS productUrl, current_price AS currentPrice, previous_price AS previousPrice,
          original_price AS originalPrice,
          CASE WHEN discount_percentage BETWEEN 1 AND 90 THEN discount_percentage ELSE 0 END AS discountPercentage,
          free_shipping AS freeShipping, rating, sold_text AS soldText, payload_json AS payloadJson,
          first_seen_at AS firstSeenAt, last_seen_at AS lastSeenAt, updated_at AS updatedAt
          FROM catalog_products WHERE id = ?`).bind(id).first(),
        env.DB.prepare(`SELECT price, original_price AS originalPrice, observed_at AS observedAt
          FROM catalog_price_history WHERE product_id = ? ORDER BY observed_at ASC LIMIT 500`).bind(id).all(),
      ]);
      return NextResponse.json({ product, history: history.results });
    }
    const mode = clean(url.searchParams.get("mode"), 30);
    if (mode === "verification") {
      const products = await env.DB.prepare(`SELECT id, category, title, product_url AS productUrl
        FROM catalog_products WHERE product_url IS NOT NULL AND product_url <> ''
        ORDER BY last_seen_at ASC LIMIT 5000`).all();
      return NextResponse.json({ products: products.results, total: products.results.length });
    }
    if (mode === "ranking") {
      const category = clean(url.searchParams.get("category"), 100);
      const search = clean(url.searchParams.get("search"), 100);
      const dayStart = clean(url.searchParams.get("dayStart"), 40) || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.parse(dayStart) - 6 * 24 * 60 * 60 * 1000).toISOString();
      const clauses = ["p.current_price IS NOT NULL", "p.current_price > 0"];
      const bindings: Array<string> = [dayStart, sevenDaysAgo];
      if (search) { clauses.push("(p.title LIKE ? OR p.product_code LIKE ?)"); bindings.push(`%${search}%`, `%${search}%`); }
      if (category && category !== "Todas") { clauses.push("p.category = ?"); bindings.push(category); }
      const rows = await env.DB.prepare(`SELECT p.id, p.store, p.category, p.product_code AS productCode,
        p.title, p.image_url AS imageUrl, p.product_url AS productUrl,
        p.current_price AS currentPrice, p.previous_price AS previousPrice,
        p.original_price AS originalPrice,
        CASE WHEN p.discount_percentage BETWEEN 1 AND 90 THEN p.discount_percentage ELSE 0 END AS discountPercentage,
        p.free_shipping AS freeShipping, p.rating, p.sold_text AS soldText,
        p.first_seen_at AS firstSeenAt, p.last_seen_at AS lastSeenAt, p.updated_at AS updatedAt,
        COALESCE(
          (SELECT h.price FROM catalog_price_history h
            WHERE h.product_id = p.id AND h.price > 0 AND h.observed_at < ?
            ORDER BY h.observed_at DESC LIMIT 1),
          p.previous_price
        ) AS referencePrice,
        (SELECT AVG(h.price) FROM catalog_price_history h
          WHERE h.product_id = p.id AND h.price > 0 AND h.observed_at >= ?) AS average7d,
        (SELECT MIN(h.price) FROM catalog_price_history h
          WHERE h.product_id = p.id AND h.price > 0 AND h.observed_at < p.updated_at) AS previousLow,
        (SELECT COUNT(*) FROM catalog_price_history h WHERE h.product_id = p.id AND h.price > 0) AS historyCount,
        (SELECT MAX(h.observed_at) FROM catalog_price_history h WHERE h.product_id = p.id) AS lastObservedAt
        FROM catalog_products p
        WHERE ${clauses.join(" AND ")}
        ORDER BY p.updated_at DESC LIMIT 2000`).bind(...bindings).all();
      const ranked = rows.results.map((raw) => {
        const item = raw as Record<string, unknown>;
        const currentPrice = Number(item.currentPrice) || 0;
        const referencePrice = Number(item.referencePrice) || 0;
        const dropPercent = referencePrice > currentPrice ? Math.round((1 - currentPrice / referencePrice) * 1000) / 10 : 0;
        const saving = referencePrice > currentPrice ? Math.round((referencePrice - currentPrice) * 100) / 100 : 0;
        const previousLow = Number(item.previousLow) || 0;
        const historyCount = Number(item.historyCount) || 0;
        const historicalLow = historyCount >= 2 && previousLow > 0 && currentPrice <= previousLow;
        const score = Math.round(dropPercent * 3 + Math.min(25, saving / 20) + (historicalLow ? 20 : 0)
          + Math.min(10, historyCount) + (Number(item.rating) >= 4.7 ? 5 : 0) + (item.freeShipping ? 3 : 0));
        return { ...item, referencePrice, dropPercent, saving, previousLow, historyCount, historicalLow, score };
      }).filter((item) => item.dropPercent > 0 && item.historyCount >= 2)
        .sort((a, b) => b.score - a.score || b.dropPercent - a.dropPercent)
        .slice(0, 500);
      return NextResponse.json({
        products: ranked,
        stats: {
          totalDrops: ranked.length,
          historicalLows: ranked.filter((item) => item.historicalLow).length,
          averageDrop: ranked.length ? ranked.reduce((sum, item) => sum + item.dropPercent, 0) / ranked.length : 0,
          biggestDrop: ranked.reduce((biggest, item) => Math.max(biggest, item.dropPercent), 0),
        },
      });
    }
    const search = clean(url.searchParams.get("search"), 100);
    const category = clean(url.searchParams.get("category"), 100);
    const clauses: string[] = [];
    const bindings: string[] = [];
    if (search) { clauses.push("(title LIKE ? OR product_code LIKE ?)"); bindings.push(`%${search}%`, `%${search}%`); }
    if (category && category !== "Todas") { clauses.push("category = ?"); bindings.push(category); }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const [products, categories, stats] = await Promise.all([
      env.DB.prepare(`SELECT id, store, category, product_code AS productCode, title, image_url AS imageUrl,
        product_url AS productUrl, current_price AS currentPrice, previous_price AS previousPrice,
        original_price AS originalPrice,
        CASE WHEN discount_percentage BETWEEN 1 AND 90 THEN discount_percentage ELSE 0 END AS discountPercentage,
        free_shipping AS freeShipping, rating, sold_text AS soldText,
        first_seen_at AS firstSeenAt, last_seen_at AS lastSeenAt, updated_at AS updatedAt
        FROM catalog_products ${where} ORDER BY last_seen_at DESC LIMIT 500`).bind(...bindings).all(),
      env.DB.prepare(`SELECT category, COUNT(*) AS total FROM catalog_products GROUP BY category ORDER BY category`).all(),
      env.DB.prepare(`SELECT COUNT(*) AS total,
        COUNT(DISTINCT category) AS categoryCount,
        SUM(CASE WHEN current_price IS NOT NULL AND current_price > 0 THEN 1 ELSE 0 END) AS withPrice,
        SUM(CASE WHEN discount_percentage BETWEEN 1 AND 90 THEN 1 ELSE 0 END) AS withDiscount,
        SUM(CASE WHEN free_shipping = 1 THEN 1 ELSE 0 END) AS withFreeShipping,
        (SELECT COUNT(*) FROM catalog_price_history) AS historyPoints
        FROM catalog_products`).first(),
    ]);
    return NextResponse.json({ products: products.results, categories: categories.results, stats });
  } catch (error) {
    console.error("catalog.products.list", error);
    return NextResponse.json({ error: "Não foi possível carregar os produtos catalogados." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const runtime = env as unknown as { UAZAPI_INSTANCE_TOKEN?: string };
  const adminToken = request.headers.get("x-promozap-admin-token") || "";
  if (!runtime.UAZAPI_INSTANCE_TOKEN || adminToken !== runtime.UAZAPI_INSTANCE_TOKEN) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const db = env.DB;
  if (!db) return NextResponse.json({ error: "Banco de dados indisponível." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { category?: unknown; products?: unknown };
  const category = clean(body.category, 100) || "Geral";
  const products = Array.isArray(body.products) ? body.products.slice(0, 1000) : [];
  const now = new Date().toISOString();
  let saved = 0;
  for (let start = 0; start < products.length; start += 40) {
    const statements = products.slice(start, start + 40).flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const value = raw as Record<string, unknown>;
      const title = clean(value.title, 300);
      const productUrl = clean(value.url, 4000);
      if (!title || !productUrl) return [];
      const code = productCode(value);
      const id = code || fallbackId(`${title.toLocaleLowerCase("pt-BR")}|${productUrl.split("?")[0]}`);
      const price = finite(value.effectivePrice ?? value.price);
      const originalPrice = finite(value.originalPrice);
      const imageUrl = clean(value.imageUrl, 4000) || null;
      const claimedDiscount = Number(value.discountPercentage) || 0;
      const calculatedDiscount = price != null && originalPrice != null && originalPrice > price
        ? Math.round((1 - price / originalPrice) * 100)
        : 0;
      const discount = calculatedDiscount > 0 && calculatedDiscount < 100
        ? calculatedDiscount
        : claimedDiscount > 0 && claimedDiscount <= 90 ? Math.round(claimedDiscount) : 0;
      const rating = finite(value.rating);
      const soldText = clean(value.soldText, 120) || null;
      const payload = JSON.stringify(value).slice(0, 60_000);
      saved += 1;
      return [
        db.prepare(`INSERT INTO catalog_price_history (id, product_id, price, original_price, observed_at)
          SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (
            SELECT 1 FROM catalog_products WHERE id = ? AND current_price IS ? AND original_price IS ?
          )`).bind(crypto.randomUUID(), id, price, originalPrice, now, id, price, originalPrice),
        db.prepare(`INSERT INTO catalog_products
          (id, store, category, product_code, title, image_url, product_url, current_price, previous_price,
           original_price, discount_percentage, free_shipping, rating, sold_text, payload_json, first_seen_at, last_seen_at, updated_at)
          VALUES (?, 'mercadolivre', ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            category = excluded.category, product_code = COALESCE(excluded.product_code, catalog_products.product_code),
            title = excluded.title, image_url = COALESCE(excluded.image_url, catalog_products.image_url),
            product_url = excluded.product_url,
            previous_price = CASE WHEN excluded.current_price IS NOT catalog_products.current_price THEN catalog_products.current_price ELSE catalog_products.previous_price END,
            current_price = excluded.current_price, original_price = excluded.original_price,
            discount_percentage = excluded.discount_percentage, free_shipping = excluded.free_shipping,
            rating = excluded.rating, sold_text = excluded.sold_text, payload_json = excluded.payload_json,
            last_seen_at = excluded.last_seen_at, updated_at = excluded.updated_at`)
          .bind(id, category, code || null, title, imageUrl, productUrl, price, originalPrice, discount,
            value.freeShipping ? 1 : 0, rating, soldText, payload, now, now, now),
      ];
    });
    if (statements.length) await db.batch(statements);
  }
  return NextResponse.json({ ok: true, saved });
}
