import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const stateDir = join(here, "state");
const profileDir = join(stateDir, "chrome-profile");
const tokenFile = join(stateDir, "token.txt");
const priceHistoryFile = join(stateDir, "price-history.json");
const dealSnapshotsFile = join(stateDir, "deal-snapshots.json");
const collectorPort = Number(process.env.PROMOZAP_COLLECTOR_PORT || 8765);
const debugPort = Number(process.env.PROMOZAP_CHROME_DEBUG_PORT || 9223);
const chromeHeadless = process.env.PROMOZAP_CHROME_HEADLESS === "1";
const panelUrl = (process.env.PROMOZAP_PANEL_URL || "http://localhost:3000").replace(/\/$/, "");
const allowedOrigins = new Set([
  panelUrl,
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  `http://127.0.0.1:${collectorPort}`,
  `http://localhost:${collectorPort}`,
]);

mkdirSync(stateDir, { recursive: true });
mkdirSync(profileDir, { recursive: true });
const localToken = process.env.PROMOZAP_LOCAL_TOKEN || (existsSync(tokenFile)
  ? readFileSync(tokenFile, "utf8").trim()
  : randomBytes(24).toString("hex"));
if (!existsSync(tokenFile)) writeFileSync(tokenFile, `${localToken}\n`, { mode: 0o600 });

function readPriceHistory() {
  try { return JSON.parse(readFileSync(priceHistoryFile, "utf8")); } catch { return {}; }
}

function priceHistoryKey(product) {
  const explicit = product.itemId || product.userProductId || product.productId;
  if (explicit) return String(explicit).replace(/^MLB-/, "MLB");
  const match = String(product.canonicalUrl || product.url || "").match(/\b(MLBU?[-]?\d+)\b/i);
  if (match) return match[1].toUpperCase().replace("MLB-", "MLB");
  const titleKey = normalizeDealTitle(product.title);
  return titleKey ? `TITLE:${titleKey.slice(0, 220)}` : null;
}

function recordPriceHistories(products) {
  const database = readPriceHistory();
  const sixHours = 6 * 60 * 60 * 1000;
  const histories = new Map();
  for (const product of products) {
    const key = priceHistoryKey(product);
    const price = product.coupon?.price || product.effectivePrice || product.pixPrice || product.standardPrice || product.price;
    if (!key || !Number.isFinite(price)) continue;
    const rows = Array.isArray(database[key]) ? database[key] : [];
    const point = {
      capturedAt: product.capturedAt || new Date().toISOString(),
      price,
      pixPrice: product.pixPrice || null,
      standardPrice: product.standardPrice || product.price || null,
      originalPrice: product.originalPrice || null,
      couponPrice: product.coupon?.price || null,
      title: product.title || null,
      url: product.canonicalUrl || product.url || null,
      source: product.catalogSource || "product",
    };
    const last = rows.at(-1);
    if (!last || last.price !== point.price || Date.parse(point.capturedAt) - Date.parse(last.capturedAt) >= sixHours) rows.push(point);
    database[key] = rows.filter((row) => Date.now() - Date.parse(row.capturedAt) <= 180 * 24 * 60 * 60 * 1000).slice(-200);
    histories.set(key, database[key]);
  }
  writeFileSync(priceHistoryFile, JSON.stringify(database, null, 2), "utf8");
  return histories;
}

function recordPriceHistory(product) {
  return recordPriceHistories([product]).get(priceHistoryKey(product)) || [];
}

function updateDealSnapshot(key, products) {
  let database = {};
  try { database = JSON.parse(readFileSync(dealSnapshotsFile, "utf8")); } catch {}
  const previous = database[key]?.products || {};
  const hasBaseline = Object.keys(previous).length > 0;
  const now = new Date().toISOString();
  const current = {};
  const newUrls = new Set();
  const drops = new Map();
  for (const product of products) {
    const id = priceHistoryKey(product);
    if (!id) continue;
    const oldPrice = previous[id]?.price;
    if (hasBaseline && !previous[id]) newUrls.add(id);
    if (Number.isFinite(oldPrice) && Number.isFinite(product.effectivePrice) && oldPrice > product.effectivePrice) {
      drops.set(id, Math.round((1 - product.effectivePrice / oldPrice) * 1000) / 10);
    }
    current[id] = { title: product.title, price: product.effectivePrice, firstSeenAt: previous[id]?.firstSeenAt || now, lastSeenAt: now };
  }
  database[key] = { capturedAt: now, products: current };
  writeFileSync(dealSnapshotsFile, JSON.stringify(database, null, 2), "utf8");
  return { hasBaseline, newUrls, drops };
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe") : "",
  ].filter(Boolean);
  return candidates.find(existsSync) || null;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureChrome() {
  try {
    const current = await fetch(`http://127.0.0.1:${debugPort}/json/version`, { signal: AbortSignal.timeout(800) });
    if (current.ok) return;
  } catch {}

  const chrome = findChrome();
  if (!chrome) throw new Error("Google Chrome não foi encontrado neste computador.");
  const chromeArgs = [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "about:blank",
  ];
  if (chromeHeadless) chromeArgs.splice(2, 0, "--headless=new", "--disable-gpu", "--hide-scrollbars");
  const child = spawn(chrome, chromeArgs, { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();

  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`, { signal: AbortSignal.timeout(800) });
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error("O Chrome foi aberto, mas o coletor não conseguiu se conectar a ele.");
}

class CdpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Tempo excedido ao conectar ao Chrome.")), 5000);
      this.ws.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      this.ws.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Falha ao conectar ao Chrome.")); }, { once: true });
    });
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) || []) listener(message.params || {});
    });
  }

  call(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  waitFor(method, timeout = 20000) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), timeout);
      const listener = (params) => {
        clearTimeout(timer);
        this.listeners.set(method, (this.listeners.get(method) || []).filter((item) => item !== listener));
        resolve(params);
      };
      this.listeners.set(method, [...(this.listeners.get(method) || []), listener]);
    });
  }

  close() {
    this.ws?.close();
  }
}

function normalizeInput(input) {
  const value = String(input || "").trim();
  if (!value) throw new Error("Cole uma URL ou um código MLB.");
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    const allowed = url.hostname === "mercadolivre.com.br" || url.hostname.endsWith(".mercadolivre.com.br");
    if (url.protocol !== "https:" || !allowed) throw new Error("Use uma URL HTTPS do Mercado Livre Brasil.");
    url.hash = "";
    return url.toString();
  }
  const item = value.match(/\bMLB-?(\d{7,})\b/i);
  if (item) return `https://produto.mercadolivre.com.br/MLB-${item[1]}`;
  if (/\bMLBU\d{7,}\b/i.test(value)) {
    throw new Error("O código MLBU isolado não informa o endereço completo. Cole a URL /up/MLBU...; depois da primeira coleta o painel também exibirá o MLB real do anúncio.");
  }
  throw new Error("Não reconheci esse valor. Cole a URL completa, MLB123... ou MLB-123....");
}

function parseBrazilianMoney(value) {
  const match = String(value || "").match(/[\d.]+(?:,\d{1,2})?/);
  if (!match) return null;
  const raw = match[0];
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function normalizeCouponText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function parseCouponCardText(rawValue, fallbackCode = "") {
  const couponState = rawValue && typeof rawValue === "object" ? rawValue : {};
  const rawText = typeof rawValue === "string" ? rawValue : couponState.text;
  const text = String(rawText || "").replace(/\s+/g, " ").trim();
  if (!text || !/cupom|off|desconto/i.test(text)) return null;
  const standaloneCode = text.match(/(?:^|\s)([A-Z0-9]{4,30})(?=\s+(?:(?:\d+(?:[.,]\d+)?)\s*%|R\$\s*[\d.,]+)\s*OFF\b)/)?.[1] || "";
  let code = (text.match(/\bCom\s+([A-Z0-9]{4,30})\b/i)?.[1] || text.match(/(?:cupom|c[oó]digo)\s*[:\-]?\s*([A-Z0-9]{4,30})\b/i)?.[1] || standaloneCode || fallbackCode).toUpperCase();
  if (["ATIVADO", "APLICADO", "DISPONIVEL", "OFF"].includes(normalizeCouponText(code).toUpperCase())) code = fallbackCode.toUpperCase();
  const percentOff = Number(text.match(/(\d+(?:[.,]\d+)?)\s*%\s*OFF/i)?.[1]?.replace(",", ".")) || null;
  const fixedMatch = text.match(/R\$\s*([\d.,]+)\s*OFF/i);
  const amountOff = fixedMatch ? parseBrazilianMoney(fixedMatch[1]) : null;
  const minimumPurchase = parseBrazilianMoney(text.match(/Compra\s+m[ií]nima\s*R\$\s*([\d.,]+)/i)?.[1]);
  const maxDiscount = parseBrazilianMoney(text.match(/Limite\s+de\s*R\$\s*([\d.,]+)/i)?.[1]);
  const expiry = text.match(/Venc\.?\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1] || null;
  const title = text.match(/(?:Com\s+[A-Z0-9]{4,30}\s+)?((?:\d+(?:[.,]\d+)?%|R\$\s*[\d.,]+)\s*OFF(?:\s+[^|]{0,80})?)/i)?.[1]?.trim()
    || text.split(/Compra\s+m[ií]nima/i)[0].trim().slice(0, 120);
  return {
    id: code || `coupon-${Buffer.from(text).toString("base64url").slice(0, 18)}`,
    code,
    title,
    discountType: percentOff ? "percent" : amountOff ? "fixed" : null,
    discountValue: percentOff || amountOff || null,
    percentOff,
    amountOff,
    minimumPurchase,
    maxDiscount,
    expiresAt: expiry,
    rawText: text,
    actionLabel: String(couponState.actionLabel || "").replace(/\s+/g, " ").trim() || null,
    actionRequired: couponState.actionRequired === true,
    alreadyApplied: couponState.alreadyApplied === true,
    active: true,
    appliedAt: new Date().toISOString(),
    lastVerifiedAt: new Date().toISOString(),
  };
}

const couponCardsExtractor = String.raw`(() => {
  const visible = (node) => { const style=getComputedStyle(node); const rect=node.getBoundingClientRect(); return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0; };
  const hasRule=(value)=>/(?:Compra\s+m[ií]nima|Sem\s+compra\s+m[ií]nima)/i.test(value||'')&&/(?:%|R\$)\s*OFF/i.test(value||'');
  const candidates=[...document.querySelectorAll('article,li,section,div')].filter((node)=>visible(node)&&hasRule(node.innerText));
  const leaves=candidates.filter((node)=>![...node.children].some((child)=>visible(child)&&hasRule(child.innerText)));
  const panelText=(document.body?.innerText||'').replace(/\s+/g,' ').trim();
  const hasAppliedSummary=/voc[eê]\s+est[aá]\s+economizando\s+R\$\s*[\d.,]+\s+com\s+\d+\s+cupons?/i.test(panelText);
  const rows=leaves.map((node)=>{
    const text=(node.innerText||'').replace(/\s+/g,' ').trim();
    const controls=[...node.querySelectorAll('button,[role="button"],[role="checkbox"],input[type="checkbox"]')].filter(visible);
    const actionLabel=controls.map((control)=>(control.innerText||control.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim()).find((label)=>/aplicar|ativar|selecionar|marcar|seguir|usar/i.test(label))||'';
    const selected=controls.some((control)=>control.checked===true||control.getAttribute('aria-checked')==='true'||control.getAttribute('aria-pressed')==='true');
    const hasUncheckedChoice=controls.some((control)=>(control.matches('[role="checkbox"],input[type="checkbox"]')&&control.checked!==true&&control.getAttribute('aria-checked')!=='true'));
    return {text,actionLabel,actionRequired:(Boolean(actionLabel)||hasUncheckedChoice)&&!selected,alreadyApplied:selected};
  }).filter((row)=>row.text);
  if(hasAppliedSummary&&!rows.some((row)=>row.alreadyApplied)){
    const applied=rows.find((row)=>!row.actionRequired);
    if(applied)applied.alreadyApplied=true;
  }
  return rows;
})()`;

const extractor = String.raw`(() => {
  const text = (selector) => document.querySelector(selector)?.textContent?.trim() || null;
  const allText = (selector) => [...document.querySelectorAll(selector)].map((node) => node.textContent?.trim()).filter(Boolean);
  const money = (value) => {
    const match = String(value || '').match(/(?:R\$\s*)?([\d.]+(?:,\d{1,2})?)/);
    if (!match) return null;
    const raw = match[1];
    const normalized = raw.includes(',')
      ? raw.replace(/\./g, '').replace(',', '.')
      : /^\d{1,3}\.\d{2}$/.test(raw) ? raw : raw.replace(/\./g, '');
    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : null;
  };
  const moneyAll = (value) => [...String(value || '').matchAll(/R\$\s*([\d.]+(?:,\d{1,2})?)/g)]
    .map((match) => money(match[0])).filter(Number.isFinite);
  const number = (value) => {
    const match = String(value || '').match(/([\d.,]+)/);
    if (!match) return null;
    const amount = Number(match[1].replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(amount) ? amount : null;
  };
  const meta = (name) => document.querySelector('meta[property="' + name + '"],meta[name="' + name + '"]')?.content || null;
  const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map((node) => {
    try { return JSON.parse(node.textContent || 'null'); } catch { return null; }
  }).filter(Boolean);
  const productJson = jsonLd.find((entry) => entry && entry['@type'] === 'Product') || {};
  const nordicScript = [...document.scripts].find((node) => (node.textContent || '').startsWith('_n.ctx.r='));
  const parseNordicState = () => {
    if (!nordicScript) return null;
    const raw = nordicScript.textContent.slice('_n.ctx.r='.length);
    let depth = 0, inString = false, escaped = false, end = -1;
    for (let index = 0; index < raw.length; index += 1) {
      const char = raw[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === '{') depth += 1;
      else if (char === '}' && --depth === 0) { end = index + 1; break; }
    }
    try { return end > 0 ? JSON.parse(raw.slice(0, end)) : null; } catch { return null; }
  };
  const nordicState = parseNordicState();
  const trackedProduct = nordicState?.appProps?.pageProps?.initialState?.components?.track?.melidata_event?.event_data || {};
  const trackedPricing = trackedProduct?.credit_view_components?.pricing || {};
  const pageText = document.body?.innerText || '';
  const priceContainer = document.querySelector('.ui-pdp-container__row--price, .ui-pdp-price');
  const priceText = priceContainer?.textContent || '';
  let originalPrice = money(text('.ui-pdp-price__original-value')) || trackedPricing.original_price || trackedProduct.original_price || null;
  let pixPrice = money(text('.ui-pdp-price__price-breakdown-inline .andes-money-amount')) || money(productJson?.offers?.price);
  const subtitlePrices = allText('[class*="pricing_price_subtitle"] .andes-money-amount').map(money).filter((value) => value != null);
  const standardPrice = subtitlePrices[0] || money(priceText.match(/ou\s*(R\$\s*[\d.,]+)/i)?.[1]) || trackedPricing.actual_price || trackedProduct.price || null;
  if (pixPrice && standardPrice && pixPrice > standardPrice * 5) {
    const normalized = [pixPrice / 10, pixPrice / 100].find((candidate) => Math.abs(candidate - standardPrice) / standardPrice < 0.08);
    if (normalized) pixPrice = Math.round(normalized * 100) / 100;
  }
  const installmentMatch = priceText.match(/(\d{1,2})x\s*(?:de\s*)?(R\$\s*[\d.,]+)(?:\s*sem juros)?/i)
    || pageText.match(/(\d{1,2})x\s*(?:de\s*)?(R\$\s*[\d.,]+)(?:\s*sem juros)?/i);
  const installmentText = installmentMatch?.[0] || null;
  const installmentCount = installmentMatch ? number(installmentMatch[1]) : null;
  const installmentAmount = installmentMatch ? money(installmentMatch[2]) : (subtitlePrices[1] || null);
  const promotionTexts = (trackedPricing.promotions || []).map((item) => item?.payment_method || item?.text).filter(Boolean);
  const couponCondition = promotionTexts.find((value) => /cupom|ganhe\s+R\$/i.test(value)) || null;
  const couponText = allText('button, a, [class*="coupon"], [class*="rebate"]').find((value) => /cupom/i.test(value))
    || pageText.match(/(?:R\$\s*[\d.,]+\s+OFF\s+com\s+Cupom|R\$\s*[\d.,]+\s+com\s+cupom)/i)?.[0]
    || couponCondition;
  const couponAmounts = moneyAll(couponText);
  const explicitCouponPrice = /com\s+cupom/i.test(couponText || '') && !/OFF\s+com\s+cupom/i.test(couponText || '') ? couponAmounts.at(-1) : null;
  const amountOff = money((couponText || '').match(/(?:ganhe\s+)?R\$\s*[\d.,]+\s+OFF/i)?.[0]);
  const minimumPurchase = money((couponText || '').match(/(?:compre|acima de)\s+R\$\s*[\d.,]+/i)?.[0]);
  const couponAppliesToSingleItem = !minimumPurchase || (standardPrice && standardPrice >= minimumPurchase);
  const couponPrice = explicitCouponPrice || (amountOff && standardPrice && couponAppliesToSingleItem ? Math.max(0, standardPrice - amountOff) : null);
  const couponCode = pageText.match(/(?:cupom|código)\s*[:\-]?\s*([A-Z0-9]{4,20})/i)?.[1] || null;
  // Algumas páginas reutilizam a classe de desconto em textos como
  // "+1000 vendidos". Só aceite o campo quando houver, de fato, "% OFF".
  const discountCandidate = text('.andes-money-amount__discount');
  const discountText = discountCandidate?.match(/\d{1,2}(?:[.,]\d+)?\s*%\s*OFF/i)?.[0]
    || priceContainer?.textContent?.match(/\d{1,2}(?:[.,]\d+)?\s*%\s*OFF/i)?.[0]
    || null;
  const parsedDiscount = number(discountText);
  const discountPercentage = parsedDiscount > 0 && parsedDiscount < 100 ? parsedDiscount : 0;
  if (!originalPrice && standardPrice && discountPercentage > 0 && discountPercentage < 90) {
    originalPrice = Math.round((standardPrice / (1 - discountPercentage / 100)) * 100) / 100;
  }
  const headerTop = text('.ui-pdp-header__subtitle, .ui-pdp-header__subtitle-container') || '';
  const soldText = headerTop.match(/(?:\+|mais de\s+)?[\d.,]+\s*(?:mil\s+)?vendidos?/i)?.[0] || null;
  const condition = headerTop.split('|')[0]?.trim() || null;
  const itemId = (meta('twitter:app:url:iphone') || meta('twitter:app:url:googleplay') || pageText).match(/MLB\d{7,}/i)?.[0]?.toUpperCase() || null;
  const userProductId = location.pathname.match(/\/up\/(MLBU\d+)/i)?.[1]?.toUpperCase() || productJson.sku || null;
  const canonicalUrl = document.querySelector('link[rel="canonical"]')?.href || location.href.split('#')[0];
  const images = [...new Set([
    productJson.image,
    meta('og:image'),
    ...[...document.querySelectorAll('.ui-pdp-gallery img, img.ui-pdp-image')].flatMap((img) => [img.currentSrc, img.src]),
  ].filter(Boolean))];
  const attributes = [...document.querySelectorAll('.ui-vpp-highlighted-specs table tr, .andes-table tbody tr')].map((row) => {
    const cells = [...row.querySelectorAll('th,td')].map((cell) => cell.textContent?.trim()).filter(Boolean);
    return cells.length >= 2 ? { name: cells[0], value_name: cells.slice(1).join(' ') } : null;
  }).filter(Boolean);
  const highlighted = allText('.ui-vpp-highlighted-specs__features-list-item');
  const sellerBox = document.querySelector('.ui-pdp-seller-summary');
  const sellerName = text('.ui-pdp-seller-summary__link, .ui-pdp-seller-summary__link-trigger-button');
  const sellerSales = text('.ui-pdp-seller-summary__header__subtitle');
  const officialStore = /loja oficial/i.test(sellerBox?.textContent || '') ? sellerName : null;
  const stockText = document.querySelector('#quantity-selector')?.textContent?.trim() || allText('*').find((value) => /^Estoque disponível$/i.test(value)) || null;
  const availableQuantity = number(stockText?.match(/\+?[\d.,]+\s+dispon/i)?.[0]);
  const deliveryText = [...document.querySelectorAll('[class*="shipping"], [class*="delivery"], [id*="shipping"]')]
    .map((node) => node.textContent?.trim()).find((value) => /chegar|frete|entrega/i.test(value || '') && (value || '').length < 300) || null;
  const ratingLabel = [...document.querySelectorAll('a[aria-label], button[aria-label]')].map((node) => node.getAttribute('aria-label')).find((value) => /avaliação/i.test(value || '')) || null;
  const categories = [...document.querySelectorAll('nav a, .ui-pdp-breadcrumb a')].filter((a) => /mercadolivre\.com\.br\/(?:c|.*categoria|.*beleza|.*perfume)/i.test(a.href || '')).slice(0, 8).map((a) => a.textContent?.trim()).filter(Boolean);
  const description = text('.ui-pdp-description__content') || productJson.description || meta('og:description');
  const title = text('h1') || productJson.name || meta('og:title')?.replace(/\s+-\s+R\$.*$/, '') || document.title;
  const captcha = /confirme que você é humano|valide sua identidade|não sou um robô|captcha/i.test(pageText);
  const login = /\/login\//i.test(location.pathname);
  return {
    ok: !captcha && !login,
    needsUserAction: captcha || login,
    userActionMessage: captcha ? 'O Mercado Livre pediu uma validação. Resolva-a na janela do Chrome e tente novamente.' : login ? 'Entre na sua conta na janela do Chrome e tente novamente.' : null,
    capturedAt: new Date().toISOString(),
    source: 'mercadolivre_browser_page',
    url: location.href,
    canonicalUrl,
    title,
    itemId,
    userProductId,
    brand: productJson.brand || attributes.find((item) => /marca/i.test(item.name))?.value_name || null,
    currency: productJson?.offers?.priceCurrency || 'BRL',
    price: pixPrice || standardPrice,
    pixPrice,
    standardPrice,
    originalPrice,
    discountPercentage,
    discountText,
    coupon: couponText ? { text: couponText, code: couponCode, price: couponPrice, amountOff, minimumPurchase, automatic: !couponCode } : null,
    installments: installmentText ? { text: installmentText, quantity: installmentCount, amount: installmentAmount, noInterest: /sem juros/i.test(installmentText) } : null,
    availability: productJson?.offers?.availability || null,
    priceValidUntil: productJson?.offers?.priceValidUntil || null,
    condition,
    soldText,
    availableQuantity: availableQuantity || trackedProduct.quantity || null,
    stockText,
    seller: sellerName || trackedProduct.seller_name || null,
    sellerSales,
    officialStore,
    deliveryText,
    freeShipping: /grátis|gratis/i.test(deliveryText || '') || productJson?.offers?.shippingDetails?.shippingRate?.value === 0,
    ratingText: ratingLabel,
    images,
    imageUrl: images[0] || null,
    categories: [...new Set(categories)],
    highlighted,
    attributes,
    description,
    personalizedContext: {
      loggedIn: Boolean(document.querySelector('[class*="user-menu"]')),
      postalCode: document.body?.innerText.match(/\b\d{5}-?\d{3}\b/)?.[0] || null,
      firstPurchaseBenefit: /primeira compra/i.test(pageText),
      meliPlus: /meli\+/i.test(pageText),
    },
    promotions: trackedProduct.available_promotions || [],
    structuredData: productJson,
  };
})()`;

const reviewExtractor = String.raw`(() => {
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const comments = [...document.querySelectorAll('.ui-review-capability-comments__comment, article')]
    .filter((node) => node.querySelector('[class*="comment__content"], [data-testid*="comment"]'))
    .slice(0, 10);
  const reviews = comments.map((comment, index) => {
    const ratingLabel = comment.querySelector('[aria-label*="Avaliação" i]')?.getAttribute('aria-label')
      || comment.querySelector('.ui-review-capability-comments__comment__rating')?.textContent || '';
    const rating = Number(ratingLabel.match(/([1-5](?:[.,]\d)?)\s*(?:de\s*5)?/i)?.[1]?.replace(',', '.')) || null;
    const date = clean(comment.querySelector('.ui-review-capability-comments__comment__date, time')?.textContent);
    const contentNode = comment.querySelector('.ui-review-capability-comments__comment__content, [class*="comment__content"]');
    const text = clean(contentNode?.textContent?.replace(/Traduzido|Ver original/gi, ' '));
    const headerLines = (comment.querySelector('.ui-review-capability-comments__comment__header')?.innerText || '')
      .split('\n').map(clean).filter(Boolean);
    const country = headerLines.find((line) => !/avaliação|há\s+\d|ontem|hoje|traduzido/i.test(line) && !/^\d(?:[.,]\d)?$/.test(line)) || null;
    const images = [...new Set([...comment.querySelectorAll('img[alt*="Foto do produto compartilhada" i], img[src*="mlstatic.com"]')]
      .map((img) => img.currentSrc || img.src).filter(Boolean))].slice(0, 12);
    const videos = [...new Set([...comment.querySelectorAll('video[src], video source[src], [data-video-url], [data-video-src]')]
      .map((node) => node.currentSrc || node.src || node.getAttribute('data-video-url') || node.getAttribute('data-video-src'))
      .filter((url) => url && /^https:\/\//i.test(url)))].slice(0, 4);
    const media = [];
    const seenMedia = new Set();
    for (const node of comment.querySelectorAll('img[alt*="Foto do produto compartilhada" i], img[src*="mlstatic.com"], video[src], video source[src], [data-video-url], [data-video-src]')) {
      const isVideo = node.matches('video, video source, [data-video-url], [data-video-src]');
      const url = isVideo
        ? node.currentSrc || node.src || node.getAttribute('data-video-url') || node.getAttribute('data-video-src')
        : node.currentSrc || node.src;
      if (!url || !/^https:\/\//i.test(url) || seenMedia.has(url)) continue;
      seenMedia.add(url);
      media.push({ type: isVideo ? 'video' : 'image', url });
    }
    const usefulLabel = [...comment.querySelectorAll('[aria-label]')].map((node) => node.getAttribute('aria-label'))
      .find((value) => /pessoa.*achou|útil/i.test(value || '')) || '';
    const usefulCount = Number(usefulLabel.match(/(\d+)/)?.[1]) || 0;
    return { position: index + 1, rating, country, date, text, images, videos, media, usefulCount };
  }).filter((review) => review.text || review.images.length || review.videos.length);
  const pageText = document.body?.innerText || '';
  const total = Number(pageText.match(/Todas as opiniões\s*\(([\d.]+)\)/i)?.[1]?.replace(/\./g, ''))
    || Number(pageText.match(/([\d.]+)\s+opiniões/i)?.[1]?.replace(/\./g, '')) || null;
  return { reviews, total, sourceUrl: location.href, capturedAt: new Date().toISOString() };
})()`;

const dealsExtractor = String.raw`(() => {
  const amount = (root) => {
    if (!root) return null;
    const label = root.getAttribute?.('aria-label');
    if (label) {
      const reais = label.match(/([\d.]+)\s+reais?/i)?.[1];
      const cents = label.match(/(\d+)\s+centavos?/i)?.[1];
      if (reais) return Number(reais.replace(/\./g, '')) + (cents ? Number(cents) / 100 : 0);
    }
    const fraction = root.querySelector?.('.andes-money-amount__fraction')?.textContent || root.textContent || '';
    const cents = root.querySelector?.('.andes-money-amount__cents')?.textContent || '';
    const value = Number(fraction.replace(/[^\d]/g, '')) + (cents ? Number(cents.replace(/\D/g, '')) / 100 : 0);
    return Number.isFinite(value) && value > 0 ? value : null;
  };
  const categories = [...document.querySelectorAll('.list-filter__list-element')].map((node) => {
    const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
    const count = Number(text.match(/\((\d+)\)/)?.[1] || 0);
    return { name: text.replace(/\s*\(\d+\)\s*$/, ''), count };
  }).filter((item) => item.name && !/R\$|Parcelamento|Grátis/i.test(item.name));
  const cards = [...document.querySelectorAll('.poly-card')].map((card, index) => {
    const link = card.querySelector('a.poly-component__title, h2 a, h3 a');
    const title = link?.textContent?.trim();
    if (!title || !link?.href) return null;
    const previous = amount(card.querySelector('.andes-money-amount--previous'));
    const current = amount(card.querySelector('.poly-price__current .poly-price__amount, .poly-price__current .andes-money-amount'));
    const discountText = card.querySelector('.poly-price__discount-polylabel, [class*="discount"]')?.textContent?.trim() || '';
    const discountPercentage = Number(discountText.match(/(\d+)\s*%\s*OFF/i)?.[1] || 0) || null;
    const text = (card.innerText || '').replace(/\s+/g, ' ').trim();
    const couponMatch = text.match(/R\$\s*([\d.,]+)\s*OFF\s+com\s+Cupom/i);
    const couponAmount = couponMatch ? Number(couponMatch[1].replace(/\./g, '').replace(',', '.')) : null;
    const couponPriceMatch = text.match(/R\$\s*([\d.,]+)\s*com\s+Cupom/i);
    const explicitCouponPrice = couponPriceMatch ? Number(couponPriceMatch[1].replace(/\./g, '').replace(',', '.')) : null;
    const coupon = /com\s+Cupom/i.test(text) ? {
      available: true,
      text: couponMatch?.[0] || couponPriceMatch?.[0] || 'Preço promocional com cupom',
      amountOff: couponAmount || (explicitCouponPrice && current && current > explicitCouponPrice ? Math.round((current - explicitCouponPrice) * 100) / 100 : null),
      price: explicitCouponPrice || (couponAmount && current ? Math.max(0, current - couponAmount) : null),
      automatic: true,
    } : null;
    const ratingText = card.querySelector('[aria-label*="Classificação"]')?.getAttribute('aria-label') || '';
    const seller = card.querySelector('.poly-component__seller')?.textContent?.replace(/\s+/g, ' ').trim() || null;
    const image = card.querySelector('img');
    return {
      position: index + 1,
      title,
      url: link.href.split('#')[0],
      imageUrl: image?.currentSrc || image?.src || null,
      originalPrice: previous,
      price: current,
      pixPrice: /no Pix/i.test(text) ? current : null,
      discountPercentage,
      discountText,
      coupon,
      seller,
      officialStore: /Loja oficial/i.test(text) || Boolean(card.querySelector('img[alt*="Loja oficial" i], [aria-label*="Loja oficial" i]')),
      rating: Number(ratingText.match(/([\d.,]+)\s+de\s+5/i)?.[1]?.replace(',', '.') || text.match(/\b([1-5][.,]\d)\s*\|/)?.[1]?.replace(',', '.')) || null,
      soldText: text.match(/\+?[\d.,]+\s*(?:mil\s+)?vendidos/i)?.[0] || null,
      freeShipping: /frete grátis|chegará grátis/i.test(text),
      dealOfDay: /OFERTA DO DIA/i.test(text),
      isInternational: /(?:compra|envio|produto)\s+internacional|internacional/i.test(text),
      sourceText: text,
    };
  }).filter(Boolean);
  const paginationLinks = [...document.querySelectorAll('a[href]')].map((node)=>({text:(node.textContent||'').replace(/\s+/g,' ').trim(),aria:node.getAttribute('aria-label')||'',title:node.getAttribute('title')||'',href:node.href})).filter((item)=>/seguinte|pr[oó]xima|p[aá]gina|desde_|offset=/i.test([item.text,item.aria,item.title,item.href].join(' '))).slice(-30);
  const nextLink = [...document.querySelectorAll('.andes-pagination__button--next a, a[aria-label*="Seguinte"], a[title*="Seguinte"], a[aria-label*="Próxima"], a[title*="Próxima"]')].find((node)=>node.href && node.href !== location.href);
  const nextUrl = nextLink?.href || paginationLinks.find((item)=>/seguinte|pr[oó]xima/i.test(item.text+' '+item.aria+' '+item.title) && item.href !== location.href)?.href || null;
  return { url: location.href, categories, cards, nextUrl, paginationLinks, totalText: document.querySelector('.results-quantity')?.textContent?.trim() || null };
})()`;

let scrapeQueue = Promise.resolve();
let automationLease = { ownerId: "", expiresAt: 0 };
const automationLeaseTtlMs = 15_000;

function updateAutomationLease(ownerId, action = "acquire") {
  const now = Date.now();
  const normalizedOwner = String(ownerId || "").trim().slice(0, 120);
  if (!normalizedOwner) return { ok: false, leader: false, error: "Identificador da aba ausente." };
  if (action === "release") {
    if (automationLease.ownerId === normalizedOwner) automationLease = { ownerId: "", expiresAt: 0 };
    return { ok: true, leader: false, expiresAt: null };
  }
  const available = !automationLease.ownerId || automationLease.expiresAt <= now || automationLease.ownerId === normalizedOwner;
  if (available) automationLease = { ownerId: normalizedOwner, expiresAt: now + automationLeaseTtlMs };
  return {
    ok: true,
    leader: automationLease.ownerId === normalizedOwner,
    expiresAt: new Date(automationLease.expiresAt).toISOString(),
  };
}
const activeDealsRuns = new Map();
const dealsCache = new Map();

const affiliateHubExtractor = `(() => {
  const money = (value) => {
    if (!value) return null;
    const match = String(value).match(/R\\$\\s*([\\d.]+(?:,\\s*\\d{1,2})?)/i);
    if (!match) return null;
    const raw = match[1].replace(/\\s/g, '');
    const normalized = raw.includes(',')
      ? raw.replace(/\\./g, '').replace(',', '.')
      : /^\\d{1,3}\\.\\d{2}$/.test(raw) ? raw : raw.replace(/\\./g, '');
    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : null;
  };
  const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
  const imageUrl = (root) => {
    if (!root) return null;
    const candidates = [];
    for (const image of root.querySelectorAll('img,source')) {
      const srcset = image.getAttribute('srcset') || image.getAttribute('data-srcset') || '';
      candidates.push(
        image.currentSrc,
        image.getAttribute('data-src'),
        image.getAttribute('data-lazy-src'),
        image.getAttribute('data-original'),
        ...srcset.split(',').map((candidate) => candidate.trim().split(/\\s+/)[0]).filter(Boolean).reverse(),
        image.getAttribute('src'),
        image.src,
      );
    }
    for (const node of root.querySelectorAll('[style*="background-image"]')) {
      const background = getComputedStyle(node).backgroundImage || node.style.backgroundImage || '';
      const match = background.match(/url\\(["']?([^"')]+)["']?\\)/i);
      if (match?.[1]) candidates.push(match[1]);
    }
    const valid = [];
    for (const candidate of candidates) {
      if (!candidate || /^data:|^blob:/i.test(candidate)) continue;
      try { valid.push(new URL(candidate, location.href).href); } catch {}
    }
    return valid.find((candidate) => /mlstatic\\.com/i.test(candidate)) || valid[0] || null;
  };
  const links = [...document.querySelectorAll('a[href]')].filter((link) => {
    const href = link.href || '';
    return /mercadolivre\\.com\\.br\\/(?:[^?#]+\\/)*(?:p|up)\\/MLBU?\\d+/i.test(href)
      || /[?&](?:wid|item_id)=MLB-?\\d+/i.test(href)
      || /item_id(?:%3A|:)MLB-?\\d+/i.test(href);
  });
  const seen = new Set();
  const products = [];
  for (const link of links) {
    const href = link.href.split('#')[0];
    const itemMatch = href.match(/[?&](?:wid|item_id)=MLB-?(\\d+)/i)
      || decodeURIComponent(href).match(/item_id:MLB-?(\\d+)/i)
      || href.match(/\\/(?:p|up)\\/(MLBU?\\d+)/i);
    const itemId = itemMatch ? (String(itemMatch[1]).startsWith('MLB') ? itemMatch[1] : 'MLB' + itemMatch[1]) : href;
    if (seen.has(itemId)) continue;
    let card = null;
    let textualCard = null;
    let ancestor = link;
    for (let depth = 0; ancestor && depth < 10; depth += 1, ancestor = ancestor.parentElement) {
      const ancestorText = clean(ancestor.innerText);
      if (ancestorText.length < 30 || !/R\\$|GANHOS|vendidos|Classifica/i.test(ancestorText)) continue;
      textualCard ||= ancestor;
      if (imageUrl(ancestor)) { card = ancestor; break; }
    }
    card ||= textualCard || link.closest('li, article, [class*="card"]') || link.parentElement;
    const text = clean(card?.innerText || link.innerText);
    if (!text || !/R\\$|GANHOS|vendidos|Classifica/i.test(text)) continue;
    const heading = card?.querySelector('h1,h2,h3,h4,[class*="title"]');
    const title = clean(heading?.textContent || link.getAttribute('aria-label') || link.textContent).replace(/^Ir para /i, '');
    const priceMatches = [...text.matchAll(/R\\$\\s*[\\d.]+\\s*(?:,\\s*\\d{1,2})?/gi)]
      .filter((match) => !/\\d+x\\s*$/i.test(text.slice(Math.max(0, match.index - 10), match.index)));
    const prices = priceMatches.map((match) => money(match[0])).filter(Number.isFinite);
    const discountMatch = text.match(/(\\d{1,2})\\s*%\\s*(?:OFF|de desconto)/i);
    const priceBeforeDiscount = discountMatch
      ? money(text.slice(0, discountMatch.index).match(/R\\$\\s*[\\d.]+\\s*(?:,\\s*\\d{1,2})?\\s*$/i)?.[0])
      : null;
    const discount = Number(discountMatch?.[1] || 0);
    const current = priceBeforeDiscount || (discount && prices.length > 1 ? prices[1] : prices[0]) || null;
    const previous = discount && prices.length > 1 && prices[0] > current ? prices[0] : null;
    const calculatedDiscount = discount
      || (previous && current && previous > current ? Math.round((1 - current / previous) * 100) : 0);
    const earnings = Number(text.match(/GANHOS(?:\\s+EXTRAS)?\\s*(\\d+(?:[.,]\\d+)?)\\s*%/i)?.[1]?.replace(',', '.') || 0) || null;
    const rating = Number(text.match(/Classifica(?:ção|cao)[^\\d]*([1-5](?:[.,]\\d)?)/i)?.[1]?.replace(',', '.') || 0) || null;
    const soldText = text.match(/(?:Mais de\\s+)?[\\d.,]+\\s*(?:mil\\s+)?vendidos/i)?.[0] || null;
    const badge = text.match(/(?:MAIS BUSCADO|MAIS VENDIDO|OFERTA IMPERD[IÍ]VEL|GANHOS EXTRAS|OFERTA DO DIA)/i)?.[0] || null;
    products.push({ itemId, title: title || 'Oferta Mercado Livre', url: href, imageUrl: imageUrl(card),
      price: current, effectivePrice: current, originalPrice: previous, discountPercentage: calculatedDiscount,
      affiliateEarningsPercentage: earnings, rating, soldText, badge, coupon: null,
      freeShipping: /frete gr[aá]tis/i.test(text), sourceText: text });
    seen.add(itemId);
  }
  return { url: location.href, title: document.title, products };
})()`;

async function scanAffiliateHub() {
  const hubUrl = "https://www.mercadolivre.com.br/afiliados/hub";
  const { target, client } = await createChromeTarget(hubUrl);
  try {
    await client.call("Page.enable");
    await client.call("Runtime.enable");
    await waitForPage(client, "document.readyState === 'complete'", 30000);
    await sleep(1200);
    const authState = await client.call("Runtime.evaluate", { expression: `(() => ({url:location.href,text:(document.body?.innerText||'').slice(0,4000)}))()`, returnByValue: true });
    const pageState = authState?.result?.value || {};
    if (/\/login\/|identification|authentication/i.test(pageState.url || "")) {
      throw new Error("O Chrome do coletor ainda não está conectado ao Mercado Livre. Entre na sua conta nessa janela e pesquise novamente.");
    }
    const collected = new Map();
    let stablePasses = 0;
    let previousTotal = 0;
    let previousHeight = 0;
    await client.call("Runtime.evaluate", { expression: "window.scrollTo({top:0,behavior:'instant'}); true", returnByValue: true });
    await sleep(500);
    for (let pass = 0; pass < 500 && stablePasses < 8; pass += 1) {
      const result = await client.call("Runtime.evaluate", { expression: affiliateHubExtractor, returnByValue: true });
      for (const product of result?.result?.value?.products || []) {
        const key = product.itemId || product.url;
        if (key) {
          const previous = collected.get(key) || {};
          collected.set(key, { ...previous, ...product, imageUrl: product.imageUrl || previous.imageUrl || null });
        }
      }
      const movement = await client.call("Runtime.evaluate", { expression: `(() => {
        const visible = (element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        };
        const more = [...document.querySelectorAll('button,a')].find((element) =>
          visible(element) && /^(?:ver|mostrar|carregar) mais|mais produtos|pr[oó]xim[ao]/i.test((element.innerText || element.getAttribute('aria-label') || '').trim())
        );
        if (more) more.click();
        const scrollables = [...document.querySelectorAll('*')].filter((element) => {
          const style = getComputedStyle(element);
          return /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 300;
        });
        for (const element of scrollables) element.scrollTop = Math.min(element.scrollHeight, element.scrollTop + Math.max(500, element.clientHeight * .85));
        const height = document.documentElement.scrollHeight;
        const nextY = Math.min(height, window.scrollY + Math.max(650, window.innerHeight * .85));
        window.scrollTo({top: nextY, behavior: 'instant'});
        return { clickedMore: Boolean(more), height, y: nextY, atBottom: nextY + window.innerHeight >= height - 20 };
      })()`, returnByValue: true });
      const pageMovement = movement?.result?.value || {};
      const grew = collected.size > previousTotal || Number(pageMovement.height || 0) > previousHeight;
      stablePasses = pageMovement.atBottom && !grew && !pageMovement.clickedMore ? stablePasses + 1 : 0;
      previousTotal = collected.size;
      previousHeight = Math.max(previousHeight, Number(pageMovement.height || 0));
      await sleep(pageMovement.clickedMore ? 1000 : 280);
    }
    const evaluation = await client.call("Runtime.evaluate", { expression: affiliateHubExtractor, returnByValue: true });
    if (evaluation?.exceptionDetails) throw new Error("Não foi possível ler os cartões do Hub de Afiliados.");
    for (const product of evaluation?.result?.value?.products || []) {
      const key = product.itemId || product.url;
      if (key) {
        const previous = collected.get(key) || {};
        collected.set(key, { ...previous, ...product, imageUrl: product.imageUrl || previous.imageUrl || null });
      }
    }
    const raw = [...collected.values()];
    if (!raw.length) throw new Error("Nenhuma oferta foi encontrada no Hub. Confirme se a seção ‘Produtos selecionados para você’ está visível na janela do coletor.");
    const capturedAt = new Date().toISOString();
    const scored = raw.map((product) => {
      const base = scoreDeal({ ...product, capturedAt, dealOfDay: /oferta/i.test(product.badge || "") });
      const commissionBonus = Math.min(18, Number(product.affiliateEarningsPercentage) || 0);
      const popularityBonus = /mil vendidos/i.test(product.soldText || "") ? 6 : product.soldText ? 3 : 0;
      return { ...base, catalogSource: "affiliate_hub", capturedAt, dealScore: Math.min(100, base.dealScore + commissionBonus + popularityBonus) };
    });
    recordPriceHistories(scored);
    const changes = updateDealSnapshot("affiliate-hub", scored);
    const products = scored.map((product) => ({ ...product, isNew: changes.newUrls.has(priceHistoryKey(product)) }))
      .sort((a, b) => b.dealScore - a.dealScore || (b.affiliateEarningsPercentage || 0) - (a.affiliateEarningsPercentage || 0));
    return { ok: true, source: "affiliate_hub", capturedAt, total: products.length, changes: { baselineCreated: !changes.hasBaseline, newCount: changes.newUrls.size }, products };
  } finally {
    await closeChromeTarget(target, client);
  }
}

function decodeAffiliateResponse(value) {
  try { return JSON.parse(value); } catch {
    try { return JSON.parse(Buffer.from(value, "base64").toString("utf8")); } catch { return null; }
  }
}

function findAffiliateShortUrl(value, depth = 0, visited = new Set()) {
  if (value == null || depth > 5 || visited.has(value)) return "";
  if (typeof value === "string") {
    const match = value.match(/(?:https?:\/\/)?(?:www\.)?meli\.la\/[a-z0-9_-]+/i);
    if (match) return match[0].startsWith("http") ? match[0] : "https://" + match[0];
    return "";
  }
  if (typeof value !== "object") return "";
  visited.add(value);
  for (const [key, candidate] of Object.entries(value)) {
    if (/^(?:id|short_id|shortId)$/i.test(key) && typeof candidate === "string" && /^[a-z0-9_-]{4,40}$/i.test(candidate)) {
      return "https://meli.la/" + candidate;
    }
  }
  for (const candidate of Object.values(value)) {
    const found = findAffiliateShortUrl(candidate, depth + 1, visited);
    if (found) return found;
  }
  return "";
}

async function generateAffiliateLinkLocal(input, tag) {
  const targetUrl = normalizeInput(input);
  if (!/^[a-z0-9_-]{2,50}$/i.test(String(tag || ""))) throw new Error("A etiqueta de afiliado não é válida.");
  const { target, client } = await createChromeTarget();
  try {
    await client.call("Page.enable");
    await client.call("Runtime.enable");
    const loaded = client.waitFor("Page.loadEventFired", 30000);
    await client.call("Page.navigate", { url: "https://www.mercadolivre.com.br/afiliados/linkbuilder" });
    await loaded;
    await waitForPage(client, "document.readyState === 'complete'", 30000);
    const authState = await client.call("Runtime.evaluate", { expression: "location.href", returnByValue: true });
    if (/\/login\/|identification|authentication/i.test(authState?.result?.value || "")) {
      throw new Error("Entre no Mercado Livre na janela do coletor antes de gerar o link.");
    }
    const expression = "(async()=>{const response=await fetch('/affiliate-program/api/v2/affiliates/createLink',{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json','X-CSRF-Token':Date.now().toString(36)+Math.random().toString(36).slice(2)},body:JSON.stringify({urls:[" + JSON.stringify(targetUrl) + "],tag:" + JSON.stringify(String(tag || "")) + "})});return {status:response.status,text:await response.text()};})()";
    const evaluation = await client.call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (evaluation?.exceptionDetails) {
      const detail = evaluation.exceptionDetails.exception?.description || evaluation.exceptionDetails.text || "erro desconhecido";
      throw new Error(`O Chrome não conseguiu chamar o gerador do Mercado Livre: ${detail}`);
    }
    const upstream = evaluation?.result?.value || {};
    const decoded = decodeAffiliateResponse(upstream.text || "");
    const shortUrl = findAffiliateShortUrl(decoded);
    const first = Array.isArray(decoded?.urls) ? decoded.urls[0] : null;
    if (!shortUrl) {
      const message = decoded?.message || (upstream.status === 401 || upstream.status === 403
        ? "A sessão do Mercado Livre foi recusada."
        : "O Mercado Livre não devolveu o link curto nesta tentativa.");
      throw new Error(message);
    }
    return { ok: true, shortUrl, longUrl: first?.long_url || "", originUrl: first?.origin_url || targetUrl, upstreamStatus: upstream.status };
  } finally {
    await closeChromeTarget(target, client);
  }
}

function normalizeDealsUrl(input) {
  const value = String(input || "https://www.mercadolivre.com.br/ofertas?promotion_type=deal_of_the_day").trim();
  const url = new URL(value);
  const allowed = url.hostname === "mercadolivre.com.br" || url.hostname.endsWith(".mercadolivre.com.br");
  if (url.protocol !== "https:" || !allowed || !url.pathname.startsWith("/ofertas")) {
    throw new Error("Use uma URL HTTPS da área /ofertas do Mercado Livre Brasil.");
  }
  url.hash = "";
  return url.toString();
}

function normalizeMarketplaceUrl(input) {
  const url = new URL(String(input || "").trim());
  const allowed = url.hostname === "lista.mercadolivre.com.br" || url.hostname === "www.mercadolivre.com.br";
  if (url.protocol !== "https:" || !allowed) {
    throw new Error("Use uma URL HTTPS de listagem do Mercado Livre Brasil.");
  }
  url.hash = "";
  return url.toString();
}

const smartphoneSources = {
  offers: "https://www.mercadolivre.com.br/ofertas?category=MLB1055",
  showcase: "https://lista.mercadolivre.com.br/_Container_lp-smfs-geral-26",
  all: "https://lista.mercadolivre.com.br/celulares-telefones/celulares-smartphones/novo/",
};

function marketplaceSearchUrl(query, category) {
  const terms = [category && !/^geral$/i.test(category) ? category : "", query].filter(Boolean).join(" ").trim();
  if (!terms) throw new Error("No modo Mercado inteiro, escolha uma categoria ou digite o produto que deseja pesquisar.");
  const slug = terms.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return `https://lista.mercadolivre.com.br/${slug}`;
}

async function createChromeTarget(url = "about:blank") {
  await ensureChrome();
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  if (!response.ok) throw new Error("Não foi possível abrir uma aba controlada no Chrome.");
  const target = await response.json();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  return { target, client };
}

async function closeChromeTarget(target, client) {
  client?.close();
  if (!target?.id) return;
  try { await fetch(`http://127.0.0.1:${debugPort}/json/close/${target.id}`); } catch {}
}

async function waitForPage(client, selectorExpression, timeout = 30000) {
  for (let elapsed = 0; elapsed < timeout; elapsed += 300) {
    try {
      const state = await client.call("Runtime.evaluate", { expression: selectorExpression, returnByValue: true });
      if (state?.result?.value) return true;
    } catch {
      // Durante uma navegação o contexto JavaScript anterior pode desaparecer.
      // Continue tentando no novo documento em vez de tratar isso como falha.
    }
    await sleep(300);
  }
  return false;
}

function scoreDeal(product) {
  const effectivePrice = product.coupon?.price || product.pixPrice || product.price;
  const referencePrice = product.originalPrice;
  const realDiscount = referencePrice && effectivePrice && referencePrice > effectivePrice
    ? Math.round(((referencePrice - effectivePrice) / referencePrice) * 1000) / 10
    : product.discountPercentage || 0;
  let score = Math.min(60, realDiscount * 1.15);
  if (product.dealOfDay) score += 8;
  if (product.freeShipping) score += 6;
  if (product.officialStore) score += 5;
  if ((product.rating || 0) >= 4.7) score += 4;
  if (/mil vendidos/i.test(product.soldText || "")) score += 3;
  const reasons = [];
  if (realDiscount) reasons.push(`${realDiscount}% abaixo do preço anterior`);
  if (product.freeShipping) reasons.push("frete grátis");
  if (product.officialStore) reasons.push("loja oficial");
  return {
    ...product,
    effectivePrice,
    discountPercentage: realDiscount || product.discountPercentage || 0,
    realDiscountPercentage: realDiscount || null,
    isRealDeal: Boolean(referencePrice && effectivePrice && referencePrice > effectivePrice && realDiscount >= 5),
    dealScore: Math.max(0, Math.min(100, Math.round(score))),
    scoreReasons: reasons,
  };
}

function normalizeDealTitle(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(?:patrocinado|oferta imperdivel|mais vendido|ultima)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function productIdFromUrl(value) {
  const match = String(value || "").match(/\b(MLBU?[-]?\d+)\b/i);
  return match ? match[1].toUpperCase().replace("MLB-", "MLB") : null;
}

function isTrackingUrl(value) {
  try {
    const host = new URL(String(value || "")).hostname;
    return host === "click1.mercadolivre.com.br" || host.endsWith(".click1.mercadolivre.com.br");
  } catch {
    return true;
  }
}

function dealFingerprint(product) {
  const title = normalizeDealTitle(product.title);
  return title || productIdFromUrl(product.url) || String(product.url || "");
}

function mergeDuplicateDeal(existing, candidate) {
  const existingDirect = !isTrackingUrl(existing.url);
  const candidateDirect = !isTrackingUrl(candidate.url);
  const existingPrice = Number(existing.effectivePrice);
  const candidatePrice = Number(candidate.effectivePrice);
  const useCandidate = (!existingDirect && candidateDirect)
    || (existingDirect === candidateDirect && Number.isFinite(candidatePrice) && (!Number.isFinite(existingPrice) || candidatePrice < existingPrice));
  const winner = useCandidate ? candidate : existing;
  const other = useCandidate ? existing : candidate;
  const coupons = [winner.coupon, other.coupon].filter(Boolean).sort((a, b) => {
    const aPrice = Number(a?.price);
    const bPrice = Number(b?.price);
    if (Number.isFinite(aPrice) && Number.isFinite(bPrice)) return aPrice - bPrice;
    return Number.isFinite(aPrice) ? -1 : Number.isFinite(bPrice) ? 1 : 0;
  });
  const coupon = coupons[0] || null;
  return {
    ...other,
    ...winner,
    productId: productIdFromUrl(winner.url) || productIdFromUrl(other.url) || existing.productId || candidate.productId || null,
    coupon,
    effectivePrice: coupon?.price || winner.effectivePrice || other.effectivePrice || null,
    officialStore: Boolean(winner.officialStore || other.officialStore),
    freeShipping: Boolean(winner.freeShipping || other.freeShipping),
    rating: Math.max(Number(winner.rating) || 0, Number(other.rating) || 0) || null,
    duplicateCount: (existing.duplicateCount || 1) + 1,
  };
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function validateRealOffer(product, historyRows, { smartphoneFocus = false } = {}) {
  const current = product.effectivePrice;
  const historicalPrices = historyRows.map((row) => row.price).filter(Number.isFinite);
  const baselinePrices = historicalPrices.length > 1 ? historicalPrices.slice(0, -1) : [];
  const historicalMedian = median(baselinePrices);
  const historicalMinimum = baselinePrices.length ? Math.min(...baselinePrices) : null;
  const discountVsMedian = historicalMedian && current < historicalMedian
    ? Math.round((1 - current / historicalMedian) * 1000) / 10
    : 0;
  const normalizedTitle = String(product.title || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const looksLikePhone = /\b(smartphone|celular|iphone|galaxy|motorola|moto\s*[ge]|redmi|xiaomi|poco|realme|zenfone)\b/.test(normalizedTitle);
  const looksLikeAccessory = /\b(capa|capinha|pelicula|carregador|cabo|suporte|fone|bateria|display|tela|conector|case)\b/.test(normalizedTitle);
  const matchesNiche = !smartphoneFocus || (looksLikePhone && !looksLikeAccessory);
  const trustSignals = [
    product.officialStore ? "loja oficial" : null,
    (product.rating || 0) >= 4.5 ? `avaliação ${product.rating}` : null,
    product.freeShipping ? "frete grátis" : null,
    /mil vendidos/i.test(product.soldText || "") ? "alto volume vendido" : null,
  ].filter(Boolean);
  const commercialSignals = [
    product.coupon ? "cupom disponível" : null,
    product.dealOfDay ? "oferta do dia" : null,
    (product.realDiscountPercentage || 0) >= 20 ? `${product.realDiscountPercentage}% abaixo da referência` : null,
  ].filter(Boolean);
  const hasHistoryEvidence = baselinePrices.length >= 2 && (discountVsMedian >= 8 || (historicalMinimum && current < historicalMinimum));
  const hasStrongFallback = (product.realDiscountPercentage || 0) >= 20 && trustSignals.length >= 1 && commercialSignals.length >= 2;
  let confidence = "Baixa";
  if (matchesNiche && hasHistoryEvidence && trustSignals.length >= 1) confidence = "Alta";
  else if (matchesNiche && (hasHistoryEvidence || hasStrongFallback)) confidence = "Média";
  const validationReasons = [
    discountVsMedian >= 1 ? `${discountVsMedian}% abaixo da mediana observada` : null,
    historicalMinimum && current < historicalMinimum ? "novo menor preço observado" : null,
    ...trustSignals,
    ...commercialSignals,
  ].filter(Boolean);
  const historyBonus = Math.min(24, Math.max(0, discountVsMedian) * 1.6);
  const trustBonus = Math.min(10, trustSignals.length * 2.5);
  return {
    historicalMedian,
    historicalMinimum,
    discountVsMedian: discountVsMedian || null,
    confidence,
    isValidatedOffer: confidence !== "Baixa",
    validationReasons,
    matchesNiche,
    dealScore: Math.min(100, Math.round(product.dealScore * 0.7 + historyBonus + trustBonus)),
  };
}

const mercadoLivreCategoryIds = {
  "Acessórios para Veículos": "MLB5672", "Agro": "MLB271599", "Alimentos e Bebidas": "MLB1403",
  "Antiguidades e Coleções": "MLB1367", "Arte, Papelaria e Armarinho": "MLB1368", "Bebês": "MLB1384",
  "Beleza e Cuidado Pessoal": "MLB1246", "Brinquedos e Hobbies": "MLB1132", "Calçados, Roupas e Bolsas": "MLB1430",
  "Casa, Móveis e Decoração": "MLB1574", "Celulares e Telefones": "MLB1051", "Construção": "MLB1500",
  "Câmeras e Acessórios": "MLB1039", "Eletrodomésticos": "MLB5726", "Eletrônicos, Áudio e Vídeo": "MLB1000",
  "Esportes e Fitness": "MLB1276", "Ferramentas": "MLB263532", "Games": "MLB1144", "Informática": "MLB1648",
  "Ingressos": "MLB1640", "Instrumentos Musicais": "MLB1182", "Joias e Relógios": "MLB3937",
  "Livros, Revistas e Comics": "MLB1196", "Música, Filmes e Seriados": "MLB1168", "Pet Shop": "MLB1071",
  "Animais": "MLB1071", "Festas e Lembrancinhas": "MLB12404", "Indústria e Comércio": "MLB1499",
  "Saúde": "MLB264586", "Serviços": "MLB1540",
};

async function navigateToDealCards(client, url, label = "A página de ofertas") {
  const readinessExpression = "Boolean(document.querySelector('.poly-card') || /captcha|confirme que você é humano|valide sua identidade/i.test(document.body?.innerText || ''))";
  let lastFailure = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await client.call("Page.navigate", { url });
      // O Mercado Livre mantém recursos e conexões carregando mesmo depois de os
      // cartões aparecerem. Esperar Page.loadEventFired prendia cada página por
      // até 40 segundos. Os cartões (ou a tela de validação) são o sinal real.
      const ready = await waitForPage(client, readinessExpression, 20000);
      const blocked = await client.call("Runtime.evaluate", {
        expression: "/captcha|confirme que você é humano|valide sua identidade/i.test(document.body?.innerText || '')",
        returnByValue: true,
      });
      if (blocked?.result?.value) {
        throw new Error("O Mercado Livre pediu validação. Resolva o CAPTCHA na janela do Chrome e tente novamente.");
      }
      if (ready) return;
      lastFailure = new Error(`${label} demorou demais para carregar.`);
    } catch (error) {
      lastFailure = error instanceof Error ? error : new Error(`${label} demorou demais para carregar.`);
      if (/captcha|valida[cç][aã]o/i.test(lastFailure.message)) throw lastFailure;
    }
    if (attempt < 2) {
      await client.call("Network.enable").catch(() => undefined);
      await client.call("Network.clearBrowserCache").catch(() => undefined);
      await sleep(1200);
    }
  }
  throw lastFailure || new Error(`${label} demorou demais para carregar.`);
}

async function loadEveryDealCard(client) {
  let stablePasses = 0;
  let previousCount = -1;
  for (let pass = 0; pass < 24 && stablePasses < 3; pass += 1) {
    const result = await client.call("Runtime.evaluate", {
      expression: `(() => {
        const count = document.querySelectorAll('.poly-card').length;
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
        return { count, height: document.documentElement.scrollHeight };
      })()`,
      returnByValue: true,
    });
    const count = Number(result?.result?.value?.count) || 0;
    stablePasses = count === previousCount ? stablePasses + 1 : 0;
    previousCount = count;
    await sleep(450);
  }
  await client.call("Runtime.evaluate", { expression: "window.scrollTo({ top: 0, behavior: 'instant' })", returnByValue: true }).catch(() => undefined);
}

async function clickMarketplacePage(client, pageNumber, previousFingerprint) {
  const clicked = await client.call("Runtime.evaluate", {
    expression: `(() => {
      const wanted=${JSON.stringify(String(pageNumber))};
      const visible=(node)=>{const style=getComputedStyle(node),rect=node.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0};
      const controls=[...document.querySelectorAll('a,button,[role="button"]')].filter(visible);
      const exact=controls.find((node)=>new RegExp('p[aá]gina\\s*'+wanted+'(?:\\D|$)','i').test(node.getAttribute('aria-label')||node.getAttribute('title')||''));
      const target=exact||controls.find((node)=>(node.textContent||'').trim()===wanted);
      if(!target)return false; target.click(); return true;
    })()`, returnByValue: true,
  });
  if (!clicked?.result?.value) return false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await sleep(250);
    const state = await client.call("Runtime.evaluate", {
      expression: `(() => [...document.querySelectorAll('.poly-card')].slice(0,20).map((card)=>(card.querySelector('a.poly-component__title,h2 a,h3 a')?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase()).filter(Boolean).join('|'))()`,
      returnByValue: true,
    });
    const nextFingerprint = state?.result?.value || "";
    if (nextFingerprint && nextFingerprint !== previousFingerprint) return true;
  }
  return false;
}

function deriveMarketplacePageUrl(template, pageIndex, step = 48) {
  if (!template || pageIndex < 1) return template;
  const offset = 1 + Math.max(1, step) * pageIndex;
  if (/_Desde_\d+/i.test(template)) return template.replace(/_Desde_\d+/i, `_Desde_${offset}`);
  try {
    const url = new URL(template);
    const offsetKey = ["offset", "from", "desde"].find((key) => url.searchParams.has(key));
    if (offsetKey) {
      url.searchParams.set(offsetKey, String(offset));
      return url.toString();
    }
  } catch {}
  return template;
}

async function scanDeals(options = {}) {
  const source = ["offers", "showcase", "all"].includes(options.source) ? options.source : null;
  const mode = source === "offers" || (!source && options.mode !== "marketplace") ? "offers" : "marketplace";
  const rawCategory = String(options.category || "").trim();
  const requestedCategory = source ? "" : (/^geral$/i.test(rawCategory) ? "" : rawCategory);
  const query = String(options.query || "").trim();
  const sourceUrl = source ? smartphoneSources[source] : options.url;
  const startUrl = source
    ? (source === "offers" ? normalizeDealsUrl(sourceUrl) : normalizeMarketplaceUrl(sourceUrl))
    : (mode === "marketplace"
      ? (String(options.url || "").trim() ? normalizeMarketplaceUrl(options.url) : marketplaceSearchUrl(query, rawCategory))
      : normalizeDealsUrl(options.url));
  const limit = Math.max(1, Math.min(10000, Number(options.limit) || 20));
  const scanLimit = Math.max(limit, Math.min(10000, Number(options.scanLimit) || limit));
  const monitorAll = Boolean(options.monitorAll) && mode === "offers";
  const collectionLimit = scanLimit;
  const minDiscount = Math.max(0, Math.min(95, Number(options.minDiscount) || 0));
  const minRating = Math.max(0, Math.min(5, Number(options.minRating) || 0));
  const requestedMaxPages = Math.max(1, Math.min(50, Number(options.maxPages) || 10));
  const ignoreInternational = options.ignoreInternational !== false;
  const couponsOnly = false;
  const realDealsOnly = Boolean(options.realDealsOnly);
  const smartphoneFocus = Boolean(source) || Boolean(options.smartphoneFocus) || /celulares e telefones/i.test(requestedCategory) && realDealsOnly;
  const forceRefresh = Boolean(options.forceRefresh);
  const cacheKey = JSON.stringify({ source, mode, startUrl, requestedCategory, query, limit, scanLimit, minDiscount, minRating, requestedMaxPages, ignoreInternational, couponsOnly, realDealsOnly, smartphoneFocus, monitorAll });
  const cached = dealsCache.get(cacheKey);
  if (!forceRefresh && !monitorAll && cached && Date.now() - cached.savedAt < 90_000) return { ...cached.value, cached: true };
  const runKey = String(options.monitorId || cacheKey);
  const previousRun = activeDealsRuns.get(runKey);
  if (previousRun) {
    previousRun.cancelled = true;
    await closeChromeTarget(previousRun.target, previousRun.client);
  }
  const run = { cancelled: false, target: null, client: null };
  activeDealsRuns.set(runKey, run);
  const { target, client } = await createChromeTarget();
  run.target = target;
  run.client = client;
  const collected = [];
  const collectedByFingerprint = new Map();
  let categories = [];
  let currentUrl = startUrl;
  let totalText = null;
  let pagesScanned = 0;
  let cardsVisited = 0;
  let duplicatesRemoved = 0;
  let paginationTemplate = null;
  let paginationStep = 48;
  const pageUrls = [];
  const pageFingerprints = new Set();
  let paginationLinks = [];
  let pageLoadedByClick = false;
  try {
    await client.call("Page.enable");
    await client.call("Runtime.enable");
    const maxPages = requestedMaxPages;
    for (let page = 0; page < maxPages && currentUrl && collected.length < collectionLimit; page += 1) {
      if (run.cancelled) throw new Error("Busca substituída por uma categoria mais recente.");
      if (!pageLoadedByClick) await navigateToDealCards(client, currentUrl, "A página de ofertas");
      pageLoadedByClick = false;
      await loadEveryDealCard(client);

      if (page === 0 && requestedCategory && mode === "offers") {
        const categoryResult = await client.call("Runtime.evaluate", {
          expression: `(() => { const wanted=${JSON.stringify(requestedCategory.toLocaleLowerCase("pt-BR"))}; const norm=(v)=>String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().trim(); const anchors=[...document.querySelectorAll('a[href]')]; const anchor=anchors.find((item)=>norm(item.textContent)===norm(wanted))||anchors.find((item)=>norm(item.textContent).includes(norm(wanted))); return anchor?.href||null; })()`,
          returnByValue: true,
        });
        const categoryId = mercadoLivreCategoryIds[requestedCategory];
        const categoryUrl = categoryResult?.result?.value || (categoryId ? `${startUrl}${startUrl.includes("?") ? "&" : "?"}category=${encodeURIComponent(categoryId)}` : null);
        if (!categoryUrl) throw new Error(`A categoria “${requestedCategory}” não possui uma rota reconhecida pelo Mercado Livre.`);
        await navigateToDealCards(client, categoryUrl, `A categoria “${requestedCategory}”`);
        await loadEveryDealCard(client);
      }

      const result = await client.call("Runtime.evaluate", { expression: dealsExtractor, returnByValue: true });
      if (result?.exceptionDetails) throw new Error("Não foi possível ler os cartões da página de ofertas.");
      const pageData = result.result.value;
      if (!paginationLinks.length) paginationLinks = pageData.paginationLinks || [];
      pageUrls.push(pageData.url || currentUrl);
      pagesScanned = page + 1;
      cardsVisited += pageData.cards?.length || 0;
      const pageFingerprint = (pageData.cards || []).map((card) => dealFingerprint(card)).filter(Boolean).slice(0, 20).join("|");
      if (pageFingerprint && pageFingerprints.has(pageFingerprint)) {
        const nextDerived = paginationTemplate ? deriveMarketplacePageUrl(paginationTemplate, page + 1, paginationStep) : null;
        if (!nextDerived || nextDerived === currentUrl) break;
        currentUrl = nextDerived;
        continue;
      }
      if (pageFingerprint) pageFingerprints.add(pageFingerprint);
      if (!categories.length) categories = pageData.categories || [];
      totalText ||= pageData.totalText;
      for (const card of pageData.cards || []) {
        const scored = scoreDeal(card);
        if ((scored.realDiscountPercentage || 0) < minDiscount) continue;
        if (minRating > 0 && (!Number.isFinite(scored.rating) || scored.rating < minRating)) continue;
        if (ignoreInternational && scored.isInternational) continue;
        if (couponsOnly && !scored.coupon) continue;
        const candidate = {
          ...scored,
          productId: productIdFromUrl(scored.url),
          capturedAt: new Date().toISOString(),
          catalogSource: mode,
          duplicateCount: 1,
        };
        const fingerprint = dealFingerprint(candidate);
        const existingIndex = collectedByFingerprint.get(fingerprint);
        if (existingIndex == null) {
          collectedByFingerprint.set(fingerprint, collected.length);
          collected.push(candidate);
        } else {
          collected[existingIndex] = mergeDuplicateDeal(collected[existingIndex], candidate);
          duplicatesRemoved += 1;
        }
        if (collected.length >= collectionLimit) break;
      }
      if (page === 0 && pageData.nextUrl) {
        paginationTemplate = pageData.nextUrl;
        const parsedOffset = Number(String(pageData.nextUrl).match(/_Desde_(\d+)/i)?.[1]);
        if (Number.isFinite(parsedOffset) && parsedOffset > 1) paginationStep = parsedOffset - 1;
      }
      const clickedNextPage = page + 1 < maxPages
        ? await clickMarketplacePage(client, page + 2, pageFingerprint).catch(() => false)
        : false;
      if (clickedNextPage) {
        pageLoadedByClick = true;
        currentUrl = pageData.url || currentUrl;
      } else {
        const derived = paginationTemplate ? deriveMarketplacePageUrl(paginationTemplate, page + 1, paginationStep) : pageData.nextUrl;
        currentUrl = derived && derived !== pageData.url ? derived : null;
      }
    }
    const histories = recordPriceHistories(collected);
    const snapshotKey = JSON.stringify({ source, mode, startUrl, requestedCategory, query, minDiscount, couponsOnly, realDealsOnly, smartphoneFocus });
    const changes = monitorAll ? updateDealSnapshot(snapshotKey, collected) : { hasBaseline: false, newUrls: new Set(), drops: new Map() };
    const evaluated = collected.map((product) => {
      const rows = histories.get(priceHistoryKey(product)) || [];
      const observed = rows.map((row) => row.price).filter(Number.isFinite);
      const validation = validateRealOffer(product, rows, { smartphoneFocus });
      const historyKey = priceHistoryKey(product);
      return { ...product, ...validation, historyKey, isNew: changes.newUrls.has(historyKey), priceDrop: changes.drops.get(historyKey) || null, historyCount: rows.length, lowestObservedPrice: observed.length ? Math.min(...observed) : product.effectivePrice };
    }).sort((a, b) => b.dealScore - a.dealScore || (b.discountVsMedian || 0) - (a.discountVsMedian || 0) || (b.realDiscountPercentage || 0) - (a.realDiscountPercentage || 0));
    const validatedCount = evaluated.filter((product) => product.isValidatedOffer).length;
    const products = (realDealsOnly ? evaluated.filter((product) => product.isValidatedOffer) : evaluated).slice(0, limit);
    const value = {
      ok: true,
      capturedAt: new Date().toISOString(),
      source: source || mode,
      mode,
      sourceUrl: startUrl,
      category: source ? "Celulares e Smartphones" : (requestedCategory || "Geral"),
      totalText,
      totalScanned: collected.length,
      validatedCount,
      cardsVisited,
      duplicatesRemoved,
      pagesScanned,
      pageUrls,
      paginationLinks,
      monitorAll,
      changes: { baselineCreated: monitorAll && !changes.hasBaseline, newCount: changes.newUrls.size, priceDropCount: changes.drops.size },
      categories,
      products,
      criteria: { limit, scanLimit, minDiscount, minRating, maxPages, ignoreInternational, couponsOnly, realDealsOnly, smartphoneFocus, monitorAll },
    };
    dealsCache.set(cacheKey, { savedAt: Date.now(), value });
    return value;
  } finally {
    await closeChromeTarget(target, client);
    if (activeDealsRuns.get(runKey) === run) activeDealsRuns.delete(runKey);
  }
}

async function navigateCouponPage(client) {
  await client.call("Page.enable");
  await client.call("Runtime.enable");
  const loaded = client.waitFor("Page.loadEventFired", 30000);
  await client.call("Page.navigate", { url: "https://www.mercadolivre.com.br/cupons" });
  await loaded;
  await waitForPage(client, "document.readyState === 'complete'", 20000);
  await sleep(1000);
  const auth = await client.call("Runtime.evaluate", { expression: `(() => ({url:location.href,text:(document.body?.innerText||'').slice(0,3000)}))()`, returnByValue: true });
  const state = auth?.result?.value || {};
  if (/\/login\//i.test(state.url || "")) throw new Error("Entre na sua conta do Mercado Livre na janela do Chrome do coletor e tente novamente.");
  if (/captcha|confirme que você é humano|valide sua identidade/i.test(state.text || "")) throw new Error("O Mercado Livre pediu validação. Resolva-a na janela do Chrome do coletor e tente novamente.");
}

async function extractCouponCards(client, fallbackCode = "", executionContextId = null) {
  const evaluation = await client.call("Runtime.evaluate", {
    expression: couponCardsExtractor,
    returnByValue: true,
    ...(executionContextId ? { contextId: executionContextId } : {}),
  });
  const entries = evaluation?.result?.value || [];
  return entries.map((entry) => parseCouponCardText(entry, fallbackCode)).filter(Boolean);
}

function findFrameByUrl(frameTree, pattern) {
  if (!frameTree) return null;
  if (pattern.test(frameTree.frame?.url || "")) return frameTree.frame;
  for (const child of frameTree.childFrames || []) {
    const found = findFrameByUrl(child, pattern);
    if (found) return found;
  }
  return null;
}

const couponFeedbackExtractor = String.raw`(() => {
  const visible=(node)=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
  const nodes=[...document.querySelectorAll('[role="alert"],[class*="toast" i],[class*="snackbar" i],[class*="feedback" i],div,p')].filter(visible);
  const matches=nodes.map((node)=>(node.innerText||'').replace(/\s+/g,' ').trim()).filter((text)=>text.length>3&&text.length<260&&/voc[eê] aplicou|cupom (?:aplicado|adicionado|ativado|inserido)|j[aá] foi aplicado|inv[aá]lido|expirado|esgotado|n[aã]o foi poss[ií]vel|n[aã]o dispon[ií]vel|sucesso/i.test(text));
  return [...new Set(matches)].sort((a,b)=>a.length-b.length);
})()`;

async function readCouponFeedback(client) {
  const result = await client.call("Runtime.evaluate", { expression: couponFeedbackExtractor, returnByValue: true });
  return Array.isArray(result?.result?.value) ? result.result.value : [];
}

async function scanCouponsLocal() {
  const { target, client } = await createChromeTarget();
  try {
    await navigateCouponPage(client);
    for (let pass = 0; pass < 5; pass += 1) {
      await client.call("Runtime.evaluate", { expression: `window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});true`, returnByValue: true });
      await sleep(350);
    }
    const coupons = await extractCouponCards(client);
    return { ok: true, coupons, capturedAt: new Date().toISOString() };
  } finally { await closeChromeTarget(target, client); }
}

async function applyCouponCodeLocal(rawCode) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,30}$/.test(code)) throw new Error("Código de cupom inválido.");
  const { target, client } = await createChromeTarget();
  try {
    await navigateCouponPage(client);
    // O Mercado Livre pode manter o toast do cupom anterior visível por vários
    // segundos. Guarde o estado anterior para nunca atribuí-lo ao novo código.
    const previousFeedback = new Set(await readCouponFeedback(client));
    const codeLiteral = JSON.stringify(code);
    await client.call("Runtime.evaluate", {
      expression: `(() => {
        const visible=(node)=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
        const hasCouponInput=[...document.querySelectorAll('input')].filter(visible).some((node)=>/cupom|c[oó]digo/i.test([node.placeholder,node.name,node.getAttribute('aria-label'),node.closest('form,section,div')?.innerText?.slice(0,180)].filter(Boolean).join(' ')));
        if(hasCouponInput)return false;
        const opener=[...document.querySelectorAll('button,a,[role="button"]')].filter(visible).find((node)=>/c[oó]digo/i.test(node.innerText||node.getAttribute('aria-label')||''));
        if(!opener)return false; opener.click(); return true;
      })()`, returnByValue: true,
    });
    await sleep(600);
    const interaction = await client.call("Runtime.evaluate", {
      expression: `(() => {
        const visible=(node)=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
        const inputs=[...document.querySelectorAll('input')].filter(visible);
        const input=inputs.find((node)=>/cupom|c[oó]digo/i.test([node.placeholder,node.name,node.getAttribute('aria-label'),node.closest('form,section,div')?.innerText?.slice(0,220)].filter(Boolean).join(' ')));
        if(!input){const labels=[...document.querySelectorAll('button,a,[role="button"]')].filter(visible).map((node)=>(node.innerText||node.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim()).filter(Boolean).slice(0,40);return {ok:false,error:'Não encontrei o campo de código de cupom nesta versão da página.',labels};}
        const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set; setter?.call(input,${codeLiteral});
        input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); input.focus();
        const inputRect=input.getBoundingClientRect();
        const buttons=[...document.querySelectorAll('button,[role="button"]')].filter(visible).filter((node)=>/aplicar|adicionar|ativar|usar|confirmar/i.test(node.innerText||node.getAttribute('aria-label')||''));
        const button=buttons.sort((a,b)=>{const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();return Math.hypot(ar.left-inputRect.left,ar.top-inputRect.top)-Math.hypot(br.left-inputRect.left,br.top-inputRect.top)})[0];
        if(!button){const labels=[...document.querySelectorAll('button,[role="button"]')].filter(visible).map((node)=>(node.innerText||node.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim()).filter(Boolean).slice(-30);return {ok:false,error:'Não encontrei o botão para aplicar o cupom.',labels};}
        button.click(); return {ok:true};
      })()`, returnByValue: true,
    });
    if (!interaction?.result?.value?.ok) throw new Error(`${interaction?.result?.value?.error || "Não foi possível preencher o cupom."} Ações visíveis: ${(interaction?.result?.value?.labels || []).join(" | ")}`);
    let confirmationMessage = "";
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await sleep(300);
      const freshFeedback = (await readCouponFeedback(client)).filter((message) => !previousFeedback.has(message));
      confirmationMessage = freshFeedback[0] || "";
      if (confirmationMessage) break;
    }
    if (!confirmationMessage) {
      const dialog = await client.call("Runtime.evaluate", { expression: `(() => { const nodes=[...document.querySelectorAll('[role="dialog"],[class*="modal" i],[class*="popover" i]')].map((node)=>(node.innerText||'').replace(/\s+/g,' ').trim()).filter((text)=>text.length>3&&text.length<500); return nodes.sort((a,b)=>a.length-b.length)[0]||''; })()`, returnByValue: true });
      const dialogText = dialog?.result?.value || "";
      if (/aplicado|adicionado|ativado|inserido|sucesso/i.test(dialogText)) confirmationMessage = dialogText;
      else if (dialogText) throw new Error(`O Mercado Livre respondeu: ${dialogText}`);
    }
    if (/inv[aá]lido|expirado|esgotado|n[aã]o foi poss[ií]vel|n[aã]o dispon[ií]vel/i.test(confirmationMessage)) throw new Error(confirmationMessage);
    const cards = await extractCouponCards(client);
    const direct = cards.find((coupon) => coupon.code === code);
    const inferred = direct || cards.find((coupon) => {
      const confirmation = normalizeCouponText(confirmationMessage).toLowerCase();
      const title = normalizeCouponText(coupon.title).toLowerCase();
      return title && confirmation.includes(title);
    });
    if (!confirmationMessage && !direct) throw new Error("O Mercado Livre não exibiu uma confirmação de aplicação para esse código. O cupom não foi salvo no painel.");
    const parsedConfirmation = parseCouponCardText(confirmationMessage, code);
    const coupon = { ...(inferred || parsedConfirmation || {}), ...(parsedConfirmation || {}), id: code, code, confirmationMessage: confirmationMessage || `Cupom ${code} aplicado.`, active: true, appliedAt: new Date().toISOString(), lastVerifiedAt: new Date().toISOString() };
    return { ok: true, coupon, coupons: cards, confirmationMessage: coupon.confirmationMessage };
  } finally { await closeChromeTarget(target, client); }
}

function couponSignature(value) {
  const stop = new Set(["voce","aplicou","cupom","ativado","aplicado","com","de","do","da","off","compra","minima","limite","venc","para","em","um","uma","produto","produtos","selecionado","selecionados"]);
  return normalizeCouponText(value).toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2 && !stop.has(token));
}

function matchManagedCoupon(product, availableCoupons, managedCoupons) {
  // A página já pode exibir um cupom automático/de loja no preço principal.
  // Cupons do Mercado Livre podem acumular com ele, então parta do menor preço
  // efetivamente mostrado e não volte ao preço cheio do anúncio.
  const price = Number(product.pixPrice || product.price || product.standardPrice);
  if (!Number.isFinite(price)) return null;
  const managed = (Array.isArray(managedCoupons) ? managedCoupons : []).filter((coupon) => coupon?.active !== false && coupon?.code);
  let best = null;
  for (const tracked of managed) {
    for (const available of availableCoupons) {
      const trackedCode = tracked.code.toUpperCase();
      const availableText = normalizeCouponText(`${available.code || ""} ${available.rawText || ""}`).toUpperCase();
      const exactCode = available.code?.toUpperCase() === trackedCode
        || new RegExp(`(?:^|[^A-Z0-9])${trackedCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^A-Z0-9])`).test(availableText);
      const left = new Set(couponSignature(`${tracked.title || ""} ${tracked.confirmationMessage || ""} ${tracked.rawText || ""}`));
      const right = couponSignature(`${available.title || ""} ${available.rawText || ""}`);
      const overlap = right.filter((token) => left.has(token)).length;
      const trackedValue = Number(tracked.discountValue) || 0;
      const availableValue = Number(available.discountValue) || 0;
      const compatibleValue = !trackedValue || !availableValue || trackedValue === availableValue;
      if (!exactCode && (overlap < 1 || !compatibleValue)) continue;
      const minimumPurchase = Number(available.minimumPurchase || tracked.minimumPurchase) || 0;
      if (price < minimumPurchase) continue;
      const availablePercent = Number(available.percentOff) || 0;
      const availableFixed = Number(available.amountOff) || 0;
      // As regras lidas agora no modal têm precedência sobre o cadastro salvo.
      // Isso também repara cupons antigos que herdaram por engano o toast de
      // outro código (por exemplo, OFFSOHJ salvo como R$ 120 em vez de 10%).
      const percent = availablePercent || (!availableFixed && tracked.discountType === "percent" ? Number(tracked.discountValue) || 0 : 0);
      const fixed = availableFixed || (!availablePercent && tracked.discountType === "fixed" ? Number(tracked.discountValue) || 0 : 0);
      const rawSaving = fixed || price * percent / 100;
      const saving = Number(available.maxDiscount || tracked.maxDiscount) > 0 ? Math.min(rawSaving, Number(available.maxDiscount || tracked.maxDiscount)) : rawSaving;
      const candidate = { ...available, code: tracked.code.toUpperCase(), confirmationMessage: tracked.confirmationMessage || null, minimumPurchase, amountOff: fixed || saving || null, percentOff: percent || null, price: saving > 0 ? Math.max(0, Math.round((price - saving) * 100) / 100) : null, text: available.title || tracked.title || `Cupom ${tracked.code}` };
      if (!best || (candidate.amountOff || 0) > (best.amountOff || 0)) best = candidate;
    }
  }
  return best;
}

function matchAutomaticProductCoupon(product, availableCoupons) {
  const price = Number(product.standardPrice || product.price || product.pixPrice);
  if (!Number.isFinite(price) || price <= 0) return null;
  let best = null;
  for (const available of Array.isArray(availableCoupons) ? availableCoupons : []) {
    // Cupons com código só são usados quando foram vinculados pelo painel.
    // Aqui entram apenas benefícios já ativados na conta, como checkbox,
    // seguir a loja ou cupons automáticos sem código visível.
    if (available?.code) continue;
    const minimumPurchase = Number(available?.minimumPurchase) || 0;
    if (price < minimumPurchase) continue;
    const percent = Number(available?.percentOff) || 0;
    const fixed = Number(available?.amountOff) || 0;
    const rawSaving = fixed || price * percent / 100;
    const maxDiscount = Number(available?.maxDiscount) || 0;
    const saving = maxDiscount > 0 ? Math.min(rawSaving, maxDiscount) : rawSaving;
    if (!Number.isFinite(saving) || saving <= 0 || saving >= price) continue;
    const candidate = {
      ...available,
      code: null,
      automatic: true,
      actionRequired: available?.actionRequired === true,
      alreadyApplied: available?.alreadyApplied === true,
      amountOff: fixed || Math.round(saving * 100) / 100,
      percentOff: percent || null,
      price: Math.round((price - saving) * 100) / 100,
      text: available.title || available.rawText || "Cupom automático",
    };
    if (!best || candidate.price < best.price) best = candidate;
  }
  return best;
}

async function readProductCouponOptions(client) {
  const clicked = await client.call("Runtime.evaluate", { expression: `(() => { const visible=(node)=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}; const button=[...document.querySelectorAll('button,a,[role="button"]')].filter(visible).find((node)=>/ver cupons dispon[ií]veis|cupons dispon[ií]veis|ver cupom/i.test(node.innerText||'')); if(!button)return false; button.click(); return true; })()`, returnByValue: true });
  if (!clicked?.result?.value) return [];
  let couponFrame = null;
  for (let attempt = 0; attempt < 20 && !couponFrame; attempt += 1) {
    await sleep(150);
    const frameTree = await client.call("Page.getFrameTree").catch(() => null);
    couponFrame = findFrameByUrl(frameTree?.frameTree, /\/cupons\/pdp(?:\?|$)/i);
  }
  let cards = [];
  if (couponFrame?.id) {
    const isolatedWorld = await client.call("Page.createIsolatedWorld", {
      frameId: couponFrame.id,
      worldName: `descontex-coupons-${Date.now()}`,
      grantUniveralAccess: false,
    }).catch(() => null);
    if (isolatedWorld?.executionContextId) {
      cards = await extractCouponCards(client, "", isolatedWorld.executionContextId);
    }
  }
  if (!cards.length) cards = await extractCouponCards(client);
  await client.call("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 }).catch(() => undefined);
  await client.call("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 }).catch(() => undefined);
  return cards;
}

async function scrapeProduct(input, managedCoupons = [], options = {}) {
  const targetUrl = normalizeInput(input);
  const { target, client } = await createChromeTarget();
  let keepTargetOpen = false;
  try {
    await client.call("Page.enable");
    await client.call("Runtime.enable");
    await client.call("Page.navigate", { url: targetUrl });
    await waitForPage(client, "Boolean(document.querySelector('.ui-pdp-price, .ui-pdp-container__row--price') || /confirme que você é humano|valide sua identidade|captcha/i.test(document.body?.innerText || ''))", 20000);
    await sleep(500);
    const result = await client.call("Runtime.evaluate", { expression: extractor, awaitPromise: true, returnByValue: true });
    if (result?.exceptionDetails) throw new Error(result.exceptionDetails.text || "Falha ao ler a página.");
    const product = result.result.value;
    if (!product?.ok) {
      if (product?.needsUserAction && chromeHeadless) {
        product.userActionMessage = "O Mercado Livre pediu login, CAPTCHA ou confirmação de identidade. O coletor está em modo invisível; feche-o e inicie temporariamente com PROMOZAP_CHROME_HEADLESS=0 para concluir a validação.";
      }
      keepTargetOpen = Boolean(product?.needsUserAction && options.keepOnUserAction);
      return product;
    }

    const availableCoupons = await readProductCouponOptions(client).catch(() => []);
    const matchedCoupon = matchManagedCoupon(product, availableCoupons, managedCoupons)
      || matchAutomaticProductCoupon(product, availableCoupons);
    product.availableCoupons = availableCoupons;
    if (matchedCoupon) {
      product.coupon = matchedCoupon;
    } else {
      const referencePrice = Number(product.standardPrice || product.price || product.pixPrice);
      const couponMinimums = availableCoupons
        .map((coupon) => Number(coupon?.minimumPurchase))
        .filter((minimum) => Number.isFinite(minimum) && minimum > 0);
      const allCouponsRequireMore = Number.isFinite(referencePrice)
        && availableCoupons.length > 0
        && couponMinimums.length === availableCoupons.length
        && couponMinimums.every((minimum) => referencePrice < minimum);
      if (allCouponsRequireMore) {
        product.coupon = null;
        product.couponSkippedReason = "minimum_purchase_not_met";
        product.couponMinimumPurchase = Math.min(...couponMinimums);
      }
    }

    let reviewsResult = null;
    if (options.includeReviews !== false) {
      const openReviews = await client.call("Runtime.evaluate", {
        expression: `(() => { const button=[...document.querySelectorAll('button,a')].find((node)=>/Mostrar todas as opiniões/i.test(node.textContent||'')); if(!button)return false; button.click(); return true; })()`,
        returnByValue: true,
      });
      if (openReviews?.result?.value) {
        const iframeReady = await waitForPage(client, "Boolean(document.querySelector('iframe.ui-pdp-iframe-reviews__content[src], iframe[src*=\"/catalog/reviews/\"]'))", 12000);
        if (iframeReady) {
          const iframeResult = await client.call("Runtime.evaluate", {
            expression: "document.querySelector('iframe.ui-pdp-iframe-reviews__content[src], iframe[src*=\"/catalog/reviews/\"]')?.src || null",
            returnByValue: true,
          });
          const reviewsUrl = iframeResult?.result?.value;
          if (reviewsUrl) {
            const reviewsLoaded = client.waitFor("Page.loadEventFired", 25000);
            await client.call("Page.navigate", { url: reviewsUrl });
            await reviewsLoaded;
            await waitForPage(client, "Boolean(document.querySelector('.ui-review-capability-comments__comment, article') || /captcha|confirme que você é humano/i.test(document.body?.innerText||''))", 25000);
            const reviewEvaluation = await client.call("Runtime.evaluate", { expression: reviewExtractor, returnByValue: true });
            if (!reviewEvaluation?.exceptionDetails) reviewsResult = reviewEvaluation?.result?.value;
          }
        }
      }
      if (!reviewsResult) {
        const inlineEvaluation = await client.call("Runtime.evaluate", { expression: reviewExtractor, returnByValue: true });
        if (!inlineEvaluation?.exceptionDetails) reviewsResult = inlineEvaluation?.result?.value;
      }
    }
    const enrichedProduct = {
      ...product,
      effectivePrice: product.coupon?.price || product.pixPrice || product.standardPrice || product.price || null,
      reviews: reviewsResult?.reviews || [],
      reviewsTotal: reviewsResult?.total || null,
      reviewsSourceUrl: reviewsResult?.sourceUrl || null,
      reviewsCapturedAt: reviewsResult?.capturedAt || null,
    };
    enrichedProduct.priceHistory = recordPriceHistory(enrichedProduct);
    return enrichedProduct;
  } finally {
    if (!keepTargetOpen) await closeChromeTarget(target, client);
    else client.close();
  }
}

async function verifyCatalogBatch(body) {
  const items = Array.isArray(body.items) ? body.items.slice(0, 5) : [];
  if (!items.length) return { ok: false, error: "Nenhum produto foi enviado para verificação." };
  const managedCoupons = Array.isArray(body.managedCoupons) ? body.managedCoupons : [];
  const results = await Promise.all(items.map(async (item) => {
    const id = String(item?.id || "");
    const category = String(item?.category || "Geral");
    try {
      const product = await scrapeProduct(item?.productUrl || item?.url, managedCoupons, { includeReviews: false, keepOnUserAction: true });
      return { id, category, ok: Boolean(product?.ok), needsUserAction: Boolean(product?.needsUserAction), error: product?.userActionMessage || null, product };
    } catch (error) {
      return { id, category, ok: false, needsUserAction: false, error: error instanceof Error ? error.message : "Falha ao verificar o produto.", product: null };
    }
  }));
  return { ok: true, checkedAt: new Date().toISOString(), results };
}

function corsHeaders(request) {
  const origin = request.headers.origin || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "null",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Promozap-Local-Token",
    "Access-Control-Allow-Private-Network": "true",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
}

function respond(response, status, payload, headers) {
  response.writeHead(status, headers);
  response.end(JSON.stringify(payload));
}

function localPanelHtml() {
  const safeToken = JSON.stringify(localToken).replace(/</g, "\\u003c");
  const marketCategories = ["Celulares e Smartphones"];
  const categoryOptions = marketCategories.map((category) => `<option value="${category}">${category}</option>`).join("");
  const categoryButtons = marketCategories.map((category) => `<button class="category-link${category === "Geral" ? " active" : ""}" data-category="${category}">${category}</button>`).join("");
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AchadeX — Coletor Mercado Livre</title><style>
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#050806;color:#edf7ef}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% 0,#12351d 0,transparent 34rem),#050806;min-height:100vh}.wrap{width:min(1380px,calc(100% - 28px));margin:0 auto;padding:28px 0 64px}.hero{display:flex;gap:16px;align-items:center;margin-bottom:24px}.logo{width:56px;height:56px;border-radius:18px;background:#22c55e;display:grid;place-items:center;color:#04140a;font-weight:1000;font-size:20px;box-shadow:0 0 40px #22c55e33}.eyebrow{color:#62ef8b;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h1{margin:4px 0 0;font-size:clamp(24px,5vw,38px);letter-spacing:-.04em}.panel{border:1px solid #27372c;background:#0a100cdd;border-radius:22px;padding:20px;box-shadow:0 24px 70px #0008}.status{display:inline-flex;align-items:center;gap:8px;background:#12351d;color:#8af3a5;border:1px solid #286d3b;border-radius:999px;padding:7px 12px;font-size:12px;font-weight:800}.dot{width:8px;height:8px;border-radius:99px;background:#31df66;box-shadow:0 0 12px #31df66}label{display:block;margin:18px 0 8px;font-size:13px;font-weight:800;color:#bed0c2}input,select{width:100%;height:54px;border:1px solid #34483a;background:#050806;color:white;border-radius:14px;padding:0 15px;font-size:15px;outline:none}input:focus,select:focus{border-color:#31df66;box-shadow:0 0 0 3px #31df6622}.actions{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}button,a.button{border:0;border-radius:13px;height:48px;padding:0 18px;font-weight:900;font-size:14px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;text-decoration:none}.primary{background:#24c75a;color:#04140a;flex:1}.secondary{background:#151f18;color:#eaf5ec;border:1px solid #34483a}button:disabled{opacity:.55;cursor:wait}.hint{margin:14px 0 0;color:#85968a;font-size:12px;line-height:1.65}.error{margin-top:16px;border:1px solid #7e4138;background:#24110e;color:#ffb8ad;padding:13px;border-radius:13px}.result{margin-top:20px;display:none}.result.show{display:block}.product{display:grid;gap:26px;grid-template-columns:330px 1fr}.image{aspect-ratio:1;background:white;border-radius:18px;padding:12px;display:grid;place-items:center}.image img{width:100%;height:100%;object-fit:contain}.badges{display:flex;gap:8px;flex-wrap:wrap}.badge{border-radius:999px;background:#153520;color:#8af3a5;padding:6px 10px;font-size:11px;font-weight:800}.badge.yellow{background:#ffe600;color:#211e00}.badge.coupon{background:#3b3008;color:#ffe974}.title{font-size:clamp(22px,3vw,32px);line-height:1.16;margin:12px 0 16px;max-width:34ch}.prices{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.price{background:#101812;border:1px solid #26362b;border-radius:14px;padding:13px}.price small{display:block;color:#7f9184;margin-bottom:5px}.price strong{font-size:22px;color:#69f08f}.details{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:12px}.detail{background:#0d140f;border-radius:12px;padding:12px}.detail small{color:#738177}.detail div{font-weight:750;margin-top:5px;word-break:break-word}.history-block{margin-top:22px;padding-top:20px;border-top:1px solid #27372c}.history-heading{display:flex;justify-content:space-between;align-items:start;gap:16px}.history-heading h3{font-size:22px;margin:0}.history-heading p{color:#85968a;margin:6px 0 0;font-size:13px}.history-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.history-chart{min-height:250px;border:1px solid #27372c;border-radius:16px;background:#07100a;padding:10px;overflow:hidden}.history-chart svg{width:100%;height:240px;display:block}.chart-grid{stroke:#1f3526;stroke-width:1}.chart-line{fill:none;stroke:#36d96b;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.chart-area{fill:url(#priceArea)}.chart-reference{stroke:#ffe600;stroke-width:2;stroke-dasharray:7 7}.chart-point{fill:#050806;stroke:#69f08f;stroke-width:4}.chart-label{fill:#91a696;font-size:11px}.attrs{margin-top:18px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.attr{border:1px solid #26362b;background:#0d140f;border-radius:11px;padding:10px}.attr small{color:#738177}.attr div{margin-top:4px;font-weight:700}.reviews-title{margin:24px 0 10px}.reviews{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.review{border:1px solid #26362b;background:#0d140f;border-radius:15px;padding:14px}.review-head{display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#9daf9f}.stars{color:#ffe04a;letter-spacing:1px}.review p{line-height:1.5;margin:10px 0;color:#e9f2eb}.review-images{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}.review-images img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:9px;border:1px solid #34483a}.json{margin-top:16px}pre{max-height:360px;overflow:auto;background:#030503;border:1px solid #26362b;border-radius:14px;padding:14px;color:#8fe5a8;font-size:11px;white-space:pre-wrap;word-break:break-word}.catalog-panel{margin-top:22px}.preset-row{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:16px 0;padding:14px 16px;border:1px solid #27372c;border-radius:15px;background:#0d140f}.preset-row strong,.preset-row span{display:block}.preset-row span{font-size:12px;color:#738177;margin-top:3px}.filters{display:grid;grid-template-columns:1fr 2fr 1fr 150px 130px;gap:10px;align-items:end}.filters.rules{grid-template-columns:180px 180px 220px 1fr}.filters label{margin-top:0}.check{height:54px;display:flex;align-items:center;gap:8px;border:1px solid #34483a;border-radius:14px;padding:0 12px;background:#050806}.check input{width:18px;height:18px}.monitor{display:flex;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap}.monitor select{width:170px}.catalog-layout{display:grid;grid-template-columns:230px 1fr;gap:16px;margin-top:18px;align-items:start}.category-rail{position:sticky;top:16px;border:1px solid #27372c;background:#0a100c;border-radius:18px;padding:16px}.category-rail h3{margin:0 0 10px}.category-links{display:grid;gap:3px;max-height:72vh;overflow:auto}.category-link{height:auto;text-align:left;justify-content:flex-start;border-radius:9px;padding:9px 10px;background:transparent;color:#bfd0c2;font-weight:650}.category-link:hover,.category-link.active{background:#16351f;color:#79f098}.catalog-meta{color:#85968a;font-size:13px;margin:0 0 10px}.catalog{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.deal-card{border:1px solid #27372c;background:#0a100c;border-radius:16px;overflow:hidden;display:flex;flex-direction:column}.deal-card:hover{border-color:#42a45e}.deal-image{aspect-ratio:1;background:white;padding:10px}.deal-image img{width:100%;height:100%;object-fit:contain}.deal-body{padding:12px;display:flex;flex-direction:column;gap:8px;flex:1}.deal-body h3{font-size:14px;line-height:1.35;margin:0;min-height:57px}.old{text-decoration:line-through;color:#728077;font-size:12px}.current{font-size:21px;font-weight:950;color:#69f08f}.reasons{font-size:11px;color:#a0b0a4}.deal-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:auto}.deal-actions>*{height:40px!important;padding:0 9px!important}.empty{grid-column:1/-1;text-align:center;color:#839087;border:1px dashed #34483a;border-radius:18px;padding:42px}@media(max-width:1100px){.catalog{grid-template-columns:repeat(3,1fr)}}@media(max-width:880px){.filters{grid-template-columns:1fr 1fr}.catalog-layout{grid-template-columns:1fr}.category-rail{position:static;padding:12px}.category-links{display:flex;overflow:auto;max-height:none}.category-link{white-space:nowrap;border:1px solid #27372c}.catalog{grid-template-columns:repeat(2,1fr)}}@media(max-width:760px){.preset-row{align-items:stretch;flex-direction:column}.preset-row button{width:100%}.product{grid-template-columns:1fr}.image{max-width:350px}.prices,.history-stats{grid-template-columns:repeat(2,1fr)}.details,.attrs,.filters,.reviews{grid-template-columns:1fr}.actions>*{width:100%}}@media(max-width:430px){.catalog{gap:8px}.deal-body{padding:9px}.deal-body h3{font-size:12px}.current{font-size:17px}.deal-actions{grid-template-columns:1fr}.history-chart{padding:4px}}
</style></head><body><main class="wrap"><div class="hero"><div class="logo">%</div><div><div class="eyebrow">Promozap</div><h1>Operação Smartphones</h1></div></div><section class="panel"><span class="status"><i class="dot"></i> Consultar um produto específico</span><label for="input">Cole o link ou código MLB</label><input id="input" value="" placeholder="Ex.: https://www.mercadolivre.com.br/... ou MLB123456789"><div class="actions"><button id="collect" class="primary">Consultar produto</button><a class="button secondary" href="${panelUrl}" target="_blank" rel="noreferrer">Voltar ao painel online</a></div><p class="hint">Use esta consulta apenas quando quiser analisar um celular específico com preço, cupom, histórico e avaliações.</p><div id="error" class="error" hidden></div></section><section id="result" class="panel result"><div class="product"><div class="image"><img id="image" alt="Imagem oficial do produto"></div><div><div class="badges"><span id="item" class="badge yellow"></span><span id="discount" class="badge"></span><span id="store" class="badge"></span><span id="coupon-badge" class="badge coupon" hidden></span></div><h2 id="title" class="title"></h2><div id="prices" class="prices"></div><div id="details" class="details"></div></div></div><section class="history-block"><div class="history-heading"><div><h3>Histórico de preço</h3><p id="history-note">O coletor começa a guardar as medições a partir da primeira consulta.</p></div><span id="history-verdict" class="badge"></span></div><div id="history-stats" class="history-stats"></div><div id="history-chart" class="history-chart"></div></section><div id="attrs" class="attrs"></div><h3 id="reviews-title" class="reviews-title"></h3><div id="reviews" class="reviews"></div><details class="json"><summary>Resposta completa (JSON)</summary><div class="actions"><button id="copy" class="secondary">Copiar JSON</button></div><pre id="json"></pre></details></section><section class="panel catalog-panel"><span class="status"><i class="dot"></i> Encontrar celulares em promoção</span><h2>Onde você quer procurar?</h2><p class="source-intro">Comece pelas ofertas oficiais. Depois, use o mercado inteiro para formar histórico e descobrir quedas reais de preço.</p><div class="source-grid"><label class="source-option"><input type="radio" name="source" value="offers" checked><span><strong>Ofertas de celulares</strong><small>26 produtos selecionados pelo Mercado Livre. Melhor para achar algo bom agora.</small><b>Recomendado</b></span></label><label class="source-option"><input type="radio" name="source" value="showcase"><span><strong>Grandes ofertas</strong><small>Mais variedade, mas pode misturar tablets e anúncios patrocinados.</small></span></label><label class="source-option"><input type="radio" name="source" value="all"><span><strong>Todos os celulares</strong><small>Varredura ampla para criar histórico e detectar futuras quedas de preço.</small></span></label></div><div class="simple-controls"><div><label for="quality">Qualidade mínima</label><select id="quality"><option value="recommended" selected>Boas oportunidades</option><option value="strict">Somente muito fortes</option><option value="all">Ver todos para criar histórico</option></select></div><div><label for="limit">Quantidade na tela</label><select id="limit"><option>8</option><option selected>20</option><option>40</option><option>80</option></select></div><button id="scan" class="primary">Encontrar celulares com bom preço</button></div><details class="advanced"><summary>Ajustes avançados</summary><div class="filters rules"><div><label for="scan-limit">Analisar até</label><select id="scan-limit"><option value="120" selected>120 produtos</option><option value="500">500 produtos</option><option value="3000">3.000 produtos</option><option value="10000">10.000 produtos</option></select></div><div><label for="min-discount">Desconto anunciado</label><select id="min-discount"><option value="0">Não exigir</option><option value="10">10% ou mais</option><option value="15" selected>15% ou mais</option><option value="20">20% ou mais</option><option value="30">30% ou mais</option></select></div><div><label class="check"><input id="coupons-only" type="checkbox"> Exigir cupom</label></div><label class="check"><input id="real-deals-only" type="checkbox"> Exigir validação pelo histórico</label></div></details><div class="monitor-card"><div><strong>Monitorar novas ofertas e quedas</strong><span>Repete esta mesma busca e salva os preços encontrados.</span></div><select id="monitor-interval"><option value="5">a cada 5 min</option><option value="15" selected>a cada 15 min</option><option value="30">a cada 30 min</option><option value="60">a cada 1 hora</option></select><button id="monitor-toggle" class="secondary">Ativar monitoramento</button><span id="monitor-note" class="hint">O monitor funciona enquanto o coletor estiver aberto.</span></div><input id="catalog-mode" type="hidden" value="offers"><input id="deals-url" type="hidden" value="https://www.mercadolivre.com.br/ofertas?category=MLB1055"><input id="market-query" type="hidden" value="celular"><select id="category" hidden>${categoryOptions}</select><select id="monitor-scope" hidden><option value="current" selected>Celulares</option></select><div id="catalog-error" class="error" hidden></div></section><div class="catalog-main"><div id="catalog-meta" class="catalog-meta">Escolha a fonte e clique em “Encontrar celulares com bom preço”.</div><section id="catalog" class="catalog"><div class="empty">As melhores oportunidades aparecerão aqui.</div></section></div></main><script>
const token=${safeToken};const allCategories=${JSON.stringify(marketCategories.filter((category) => category !== "Geral"))};const input=document.querySelector('#input'),button=document.querySelector('#collect'),error=document.querySelector('#error'),result=document.querySelector('#result');let last=null;
const productDialog=document.createElement('dialog');productDialog.className='product-dialog';const closeProduct=document.createElement('button');closeProduct.className='dialog-close';closeProduct.type='button';closeProduct.setAttribute('aria-label','Fechar janela');closeProduct.textContent='×';result.replaceWith(productDialog);productDialog.append(closeProduct,result);const sendStrip=document.createElement('div');sendStrip.className='send-strip';sendStrip.innerHTML='<div><strong>Gostou desta oferta?</strong><span>Abra o painel com este produto pronto para escolher o grupo.</span></div><button type="button" class="primary">Enviar para meu grupo</button>';result.querySelector('.product').after(sendStrip);closeProduct.onclick=()=>productDialog.close();productDialog.onclick=event=>{if(event.target===productDialog)productDialog.close()};sendStrip.querySelector('button').onclick=()=>{const productUrl=last?.canonicalUrl||last?.url||input.value;navigator.clipboard?.writeText(productUrl);window.open('${panelUrl}/?product='+encodeURIComponent(productUrl)+'#consultar-produtos','_blank','noopener')};const modalStyle=document.createElement('style');modalStyle.textContent='.product-dialog{width:min(1180px,calc(100vw - 24px));max-height:94vh;padding:0;border:0;border-radius:22px;background:#fff;color:#263746;box-shadow:0 30px 90px rgba(16,34,49,.28);overflow:auto}.product-dialog::backdrop{background:rgba(15,28,39,.65);backdrop-filter:blur(5px)}.product-dialog .result{display:block;margin:0;border:0;border-radius:0;background:#fff}.dialog-close{position:sticky;z-index:8;top:12px;float:right;margin:12px 12px -54px 0;width:42px;height:42px;padding:0;border-radius:999px;background:#edf2f5;color:#263746;font-size:30px;line-height:1}.send-strip{margin-top:18px;display:flex;gap:18px;align-items:center;justify-content:space-between;border:1px solid #d7e3ec;border-radius:16px;background:#eef8ff;padding:16px}.send-strip div{display:grid;gap:4px}.send-strip span{color:#667788;font-size:13px}.product-dialog .price,.product-dialog .detail,.product-dialog .attr,.product-dialog .review,.product-dialog .history-chart{background:#f8fafb;border-color:#dce4ea}.product-dialog .price strong,.product-dialog .current{color:#087bd3}.product-dialog .review p{color:#34495a}.product-dialog pre{background:#17232e;color:#b7f7c7}@media(max-width:620px){.send-strip{align-items:stretch;flex-direction:column}.send-strip button{width:100%}}';document.head.append(modalStyle);
const catalogTheme=document.createElement('style');catalogTheme.textContent=':root{color-scheme:light}body{background:#f4f6f8;color:#263746}.panel,.deal-card{background:#fff;border-color:#dce4ea;box-shadow:0 7px 25px rgba(31,54,76,.07)}label{color:#34495a!important}input,select,.check{background:#fff;color:#172b3b;border-color:#aebdca}.secondary{background:#fff;color:#253a4d;border-color:#b9c6d0}.deal-card:hover{border-color:#78b9e7}.current{color:#087bd3}.hint,.catalog-meta,.reasons{color:#566b7c}.badge{background:#e8f8ef;color:#138244}.badge.yellow{background:#087bd3;color:#fff}.badge.coupon{background:#fff1bf;color:#795d00}.badge.new-badge{background:#dff7e8;color:#087a35}.badge.drop-badge{background:#ffe4e7;color:#a4192d}.logo,.primary{background:#087bd3;color:#fff}.primary:hover{background:#076bb7}.status{background:transparent;border:0;border-left:4px solid #087bd3;border-radius:0;padding:2px 0 2px 10px;color:#263746;font-size:14px}.status .dot{display:none}.eyebrow{color:#0874c9}.catalog-panel h2{color:#1d3345;margin-bottom:6px}button:disabled{color:#fff;opacity:.58}#monitor-note{margin:0}.badge.verified-badge{background:#dbf7e7;color:#087a35}.badge.low-badge{background:#eef2f5;color:#607080}.source-intro{margin:0 0 18px;color:#607487}.source-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.source-option{margin:0!important;cursor:pointer}.source-option input{position:absolute;opacity:0;pointer-events:none}.source-option span{display:flex;min-height:150px;flex-direction:column;gap:7px;border:2px solid #dce4ea;border-radius:17px;padding:17px;background:#fff}.source-option strong{font-size:16px;color:#1d3345}.source-option small{font-size:12px;line-height:1.55;color:#637689}.source-option b{align-self:flex-start;margin-top:auto;border-radius:999px;background:#e4f3ff;color:#075f9f;padding:5px 9px;font-size:10px;text-transform:uppercase;letter-spacing:.06em}.source-option input:checked+span{border-color:#087bd3;background:#f3faff;box-shadow:0 0 0 3px #087bd31a}.simple-controls{display:grid;grid-template-columns:1fr 180px minmax(260px,1.2fr);gap:12px;align-items:end;margin-top:18px}.simple-controls label{margin-top:0}.simple-controls button{height:54px}.advanced{margin-top:14px;border:1px solid #dce4ea;border-radius:14px;background:#f8fafb}.advanced summary{cursor:pointer;padding:14px 16px;font-weight:800;color:#40576a}.advanced .filters{padding:0 16px 16px}.filters.rules{grid-template-columns:1fr 1fr 1fr 1fr}.monitor-card{display:grid;grid-template-columns:minmax(240px,1fr) 170px 210px;gap:12px;align-items:center;margin-top:14px;border:1px solid #dce4ea;border-radius:16px;padding:15px;background:#f8fafb}.monitor-card div{display:grid;gap:4px}.monitor-card div span{font-size:12px;color:#667b8d}.monitor-card #monitor-note{grid-column:1/-1}.catalog-main{margin-top:18px}.catalog-meta{font-weight:700}.catalog{grid-template-columns:repeat(4,minmax(0,1fr))}@media(max-width:900px){.source-grid{grid-template-columns:1fr}.source-option span{min-height:auto}.simple-controls,.monitor-card{grid-template-columns:1fr 1fr}.simple-controls button,.monitor-card div,.monitor-card #monitor-note{grid-column:1/-1}}@media(max-width:620px){.simple-controls,.monitor-card,.filters.rules{grid-template-columns:1fr}.monitor-card>*{width:100%}}';document.head.append(catalogTheme);const statusLabels=document.querySelectorAll('.status');
const money=(v,c='BRL')=>v==null?'—':new Intl.NumberFormat('pt-BR',{style:'currency',currency:c}).format(v);const esc=(v)=>String(v??'—').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
async function loadProduct(value,sourceButton=button){const previous=sourceButton.textContent;sourceButton.disabled=true;sourceButton.textContent='Lendo dados e avaliações...';error.hidden=true;try{const response=await fetch('/scrape',{method:'POST',headers:{'Content-Type':'application/json','X-Promozap-Local-Token':token},body:JSON.stringify({input:value})});const data=await response.json();if(!response.ok||!data.product?.ok)throw new Error(data.product?.userActionMessage||data.error||'Falha na coleta.');render(data.product);renderHistory(data.product);if(!productDialog.open)productDialog.showModal();productDialog.scrollTop=0}catch(e){error.textContent=e.message;error.hidden=false;error.scrollIntoView({behavior:'smooth',block:'center'})}finally{sourceButton.disabled=false;sourceButton.textContent=previous}}
button.onclick=()=>loadProduct(input.value,button);
function renderHistory(p){const rows=(p.priceHistory||[]).filter(row=>Number.isFinite(row.price));const current=p.coupon?.price||p.pixPrice||p.standardPrice||p.price;const observed=rows.map(row=>row.price);const reference=p.originalPrice;const lowest=observed.length?Math.min(...observed):current;const highest=observed.length?Math.max(...observed):current;document.querySelector('#history-stats').innerHTML=[['Valor atual',current],['Menor observado',lowest],['Maior observado',highest],['Preço de referência',reference]].map(([label,value])=>'<div class="price"><small>'+label+'</small><strong>'+money(value,p.currency||'BRL')+'</strong></div>').join('');const verdict=document.querySelector('#history-verdict');const saving=reference&&current&&reference>current?Math.round((1-current/reference)*100):0;verdict.textContent=saving?'Preço atual '+saving+'% abaixo da referência':rows.length>1&&current===lowest?'Menor preço observado':'Acompanhando preço';document.querySelector('#history-note').textContent=rows.length>1?'Histórico real salvo neste computador: '+rows.length+' medições.':'Primeira medição salva. As próximas consultas formarão o histórico real.';const values=[...observed,...(Number.isFinite(reference)?[reference]:[])].filter(Number.isFinite);if(!values.length){document.querySelector('#history-chart').innerHTML='<div class="empty">Preço ainda não disponível para formar o gráfico.</div>';return}const width=900,height=240,padX=58,padY=28;let min=Math.min(...values),max=Math.max(...values);if(min===max){min*=.95;max*=1.05}const gap=(max-min)*.14;min=Math.max(0,min-gap);max+=gap;const x=index=>rows.length<=1?width/2:padX+index*(width-padX*2)/(rows.length-1);const y=value=>height-padY-(value-min)*(height-padY*2)/(max-min);const points=rows.map((row,index)=>[x(index),y(row.price)]);const line=points.map((point,index)=>(index?'L':'M')+point[0].toFixed(1)+' '+point[1].toFixed(1)).join(' ');const area=points.length>1?line+' L '+points.at(-1)[0].toFixed(1)+' '+(height-padY)+' L '+points[0][0].toFixed(1)+' '+(height-padY)+' Z':'';const grid=[0,.25,.5,.75,1].map(step=>{const value=max-(max-min)*step;const gy=padY+(height-padY*2)*step;return '<line class="chart-grid" x1="'+padX+'" y1="'+gy+'" x2="'+(width-padX)+'" y2="'+gy+'"/><text class="chart-label" x="4" y="'+(gy+4)+'">'+money(value,p.currency||'BRL')+'</text>'}).join('');const referenceLine=Number.isFinite(reference)?'<line class="chart-reference" x1="'+padX+'" y1="'+y(reference)+'" x2="'+(width-padX)+'" y2="'+y(reference)+'"/><text class="chart-label" x="'+(width-155)+'" y="'+(y(reference)-7)+'">referência '+money(reference,p.currency||'BRL')+'</text>':'';const dots=points.map((point,index)=>'<circle class="chart-point" cx="'+point[0]+'" cy="'+point[1]+'" r="5"><title>'+new Date(rows[index].capturedAt).toLocaleString('pt-BR')+' — '+money(rows[index].price,p.currency||'BRL')+'</title></circle>').join('');document.querySelector('#history-chart').innerHTML='<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Gráfico do histórico de preço"><defs><linearGradient id="priceArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#36d96b" stop-opacity=".32"/><stop offset="1" stop-color="#36d96b" stop-opacity="0"/></linearGradient></defs>'+grid+referenceLine+(area?'<path class="chart-area" d="'+area+'"/>':'')+(line?'<path class="chart-line" d="'+line+'"/>':'')+dots+'</svg>'}
function render(p){last=p;const currency=p.currency||'BRL';document.querySelector('#image').src=p.imageUrl||'';document.querySelector('#item').textContent=[p.itemId,p.userProductId].filter(Boolean).join(' · ');document.querySelector('#discount').textContent=p.discountPercentage?p.discountPercentage+'% OFF':'Sem desconto informado';document.querySelector('#store').textContent=p.officialStore?'Loja oficial: '+p.officialStore:(p.seller||'Vendedor não informado');const couponBadge=document.querySelector('#coupon-badge');couponBadge.hidden=!p.coupon;couponBadge.textContent=p.coupon?(p.coupon.code?'Cupom '+p.coupon.code:p.coupon.text):'';document.querySelector('#title').textContent=p.title;const prices=[['No Pix',p.pixPrice],['Normal',p.standardPrice],['Anterior',p.originalPrice],['Com cupom',p.coupon?.price]];document.querySelector('#prices').innerHTML=prices.map(([l,v])=>'<div class="price"><small>'+l+'</small><strong>'+money(v,currency)+'</strong></div>').join('');const details=[['Benefício do cupom',p.coupon?.amountOff?money(p.coupon.amountOff):p.coupon?.text],['Compra mínima',p.coupon?.minimumPurchase?money(p.coupon.minimumPurchase):null],['Código',p.coupon?.code||(p.coupon?.automatic?'Automático/sem código visível':null)],['Parcelamento',p.installments?.text],['Estoque',p.stockText],['Vendidos',p.soldText],['Entrega',p.deliveryText],['Avaliação',p.ratingText],['Total de opiniões',p.reviewsTotal],['Capturado em',new Date(p.capturedAt).toLocaleString('pt-BR')]];document.querySelector('#details').innerHTML=details.map(([l,v])=>'<div class="detail"><small>'+esc(l)+'</small><div>'+esc(v)+'</div></div>').join('');document.querySelector('#attrs').innerHTML=(p.attributes||[]).map(a=>'<div class="attr"><small>'+esc(a.name)+'</small><div>'+esc(a.value_name)+'</div></div>').join('');const reviews=p.reviews||[];document.querySelector('#reviews-title').textContent=reviews.length?'10 primeiras avaliações encontradas ('+reviews.length+' exibidas)':'Avaliações';document.querySelector('#reviews').innerHTML=reviews.map(r=>'<article class="review"><div class="review-head"><span class="stars">'+('★'.repeat(Math.round(r.rating||0)))+('☆'.repeat(Math.max(0,5-Math.round(r.rating||0))))+'</span><span>'+esc([...new Set([r.country,r.date].filter(Boolean))].join(' · '))+'</span></div><p>'+esc(r.text||'Avaliação publicada somente com foto.')+'</p>'+(r.images?.length?'<div class="review-images">'+r.images.map(url=>'<a href="'+esc(url)+'" target="_blank" rel="noreferrer"><img loading="lazy" src="'+esc(url)+'" alt="Foto enviada nesta avaliação"></a>').join('')+'</div>':'')+(r.usefulCount?'<div class="hint">'+r.usefulCount+' pessoas acharam útil</div>':'')+'</article>').join('')||'<div class="empty">Este anúncio não exibiu avaliações públicas para o coletor.</div>';document.querySelector('#json').textContent=JSON.stringify(p,null,2);result.classList.add('show');result.scrollIntoView({behavior:'smooth',block:'start'})}
document.querySelector('#copy').onclick=()=>last&&navigator.clipboard.writeText(JSON.stringify(last,null,2));
const scanButton=document.querySelector('#scan'),catalogError=document.querySelector('#catalog-error'),catalog=document.querySelector('#catalog');let monitorTimer=null;
const selectedSource=()=>document.querySelector('input[name="source"]:checked')?.value||'offers';const sourceLabels={offers:'ofertas oficiais de celulares',showcase:'grandes ofertas',all:'todos os celulares'};function applyQuality(){const quality=document.querySelector('#quality').value;const minDiscount=document.querySelector('#min-discount'),validated=document.querySelector('#real-deals-only');if(quality==='strict'){minDiscount.value='20';validated.checked=true}else if(quality==='all'){minDiscount.value='0';validated.checked=false}else{minDiscount.value='15';validated.checked=false}}document.querySelector('#quality').onchange=applyQuality;document.querySelectorAll('input[name="source"]').forEach(radio=>radio.onchange=()=>{const source=selectedSource();document.querySelector('#scan-limit').value=source==='offers'?'120':'500';document.querySelector('#catalog-meta').textContent=source==='offers'?'Fonte recomendada: ofertas oficiais de celulares.':source==='showcase'?'Fonte ampla: grandes ofertas; acessórios e tablets serão descartados.':'Mercado inteiro: indicado para formar histórico, não para disparo imediato.'});applyQuality();
let catalogAbort=null,catalogRequestId=0;async function runCatalog(silent=false){if(catalogAbort)catalogAbort.abort();catalogAbort=new AbortController();const requestId=++catalogRequestId;scanButton.disabled=true;const normalLabel='Encontrar celulares com bom preço';scanButton.textContent='Procurando celulares...';catalogError.hidden=true;if(!silent)catalog.innerHTML='<div class="empty"><strong>Buscando e comparando preços…</strong><br>Isso pode levar alguns segundos.</div>';try{const payload={source:selectedSource(),mode:document.querySelector('#catalog-mode').value,url:document.querySelector('#deals-url').value,query:document.querySelector('#market-query').value,category:'Celulares e Smartphones',limit:Number(document.querySelector('#limit').value),scanLimit:Number(document.querySelector('#scan-limit').value),minDiscount:Number(document.querySelector('#min-discount').value),couponsOnly:document.querySelector('#coupons-only').checked,realDealsOnly:document.querySelector('#real-deals-only').checked,smartphoneFocus:true,monitorAll:false};const response=await fetch('/scan-deals',{method:'POST',headers:{'Content-Type':'application/json','X-Promozap-Local-Token':token},body:JSON.stringify(payload),signal:catalogAbort.signal});const data=await response.json();if(requestId!==catalogRequestId)return;if(!response.ok||!data.ok)throw new Error(data.error||'Falha ao pesquisar celulares.');renderCatalog(data,silent)}catch(e){if(e.name==='AbortError'||requestId!==catalogRequestId)return;catalogError.textContent=e.message;catalogError.hidden=false;if(!silent)catalog.innerHTML='<div class="empty">Não foi possível concluir a busca.</div>'}finally{if(requestId===catalogRequestId){catalogAbort=null;scanButton.disabled=false;scanButton.textContent=normalLabel}}}
function renderCatalog(data,monitoring=false){const watchKey='promozap-smartphones:'+data.source;let previous={};try{previous=JSON.parse(localStorage.getItem(watchKey)||'{}')}catch{}const hasBaseline=Object.keys(previous).length>0;const current={};let newCount=0,dropCount=0;for(const product of data.products||[]){const key=product.historyKey||product.productId||product.url;const oldPrice=previous[key]?.price;product.isNew=monitoring&&hasBaseline&&!previous[key];product.priceDrop=monitoring&&Number.isFinite(oldPrice)&&oldPrice>product.effectivePrice?Math.round((1-product.effectivePrice/oldPrice)*1000)/10:null;if(product.isNew)newCount+=1;if(product.priceDrop)dropCount+=1;current[key]={price:product.effectivePrice,title:product.title,seenAt:new Date().toISOString()}}localStorage.setItem(watchKey,JSON.stringify(current));const notices=[];if(newCount)notices.push(newCount+' novas');if(dropCount)notices.push(dropCount+' com queda de preço');document.querySelector('#catalog-meta').textContent=data.cardsVisited+' cartões lidos · '+(data.duplicatesRemoved||0)+' repetidos removidos · '+data.products.length+' celulares únicos exibidos · fonte: '+(sourceLabels[data.source]||data.source)+' · atualizado '+new Date(data.capturedAt).toLocaleString('pt-BR')+(notices.length?' · '+notices.join(' · '):'');if(monitoring&&notices.length&&Notification.permission==='granted')new Notification('Promozap encontrou celulares',{body:notices.join(' e ')});catalog.innerHTML=(data.products||[]).map((p,i)=>'<article class="deal-card"><div class="deal-image"><img loading="lazy" src="'+esc(p.imageUrl||'')+'" alt=""></div><div class="deal-body"><div class="badges"><span class="badge yellow">#'+(i+1)+' · '+p.dealScore+' pts</span>'+(p.isNew?'<span class="badge new-badge">NOVA</span>':'')+(p.priceDrop?'<span class="badge drop-badge">CAIU '+p.priceDrop+'%</span>':'')+(p.isValidatedOffer?(p.historyCount>=3?'<span class="badge verified-badge">VALIDADO PELO HISTÓRICO</span>':'<span class="badge verified-badge">CANDIDATO FORTE</span>'):'<span class="badge low-badge">CRIANDO HISTÓRICO</span>')+(p.coupon?'<span class="badge coupon">CUPOM</span>':'')+'</div><h3>'+esc(p.title)+'</h3><div><span class="old">'+money(p.originalPrice)+'</span><div class="current">'+money(p.effectivePrice)+'</div></div><div class="reasons">'+esc((p.validationReasons?.length?p.validationReasons:p.scoreReasons||[]).join(' · '))+'</div><div class="reasons">Histórico salvo: '+(p.historyCount||1)+' medições · menor observado '+money(p.lowestObservedPrice)+'</div>'+(p.coupon?'<div class="reasons">🏷️ '+esc(p.coupon.text)+(p.coupon.amountOff?' — economiza '+money(p.coupon.amountOff):'')+'</div>':'')+'<div class="deal-actions"><button class="primary detail-product" data-url="'+esc(p.url)+'">Ver detalhes</button><a class="button secondary" href="'+esc(p.url)+'" target="_blank" rel="noreferrer">Abrir produto</a></div></div></article>').join('')||'<div class="empty"><strong>Nenhuma oportunidade passou pelo filtro.</strong><br>Tente “Ver todos para criar histórico” ou aguarde a próxima verificação.</div>';catalog.querySelectorAll('.detail-product').forEach(btn=>btn.onclick=()=>loadProduct(btn.dataset.url,btn))}
scanButton.onclick=()=>runCatalog(false);const monitorButton=document.querySelector('#monitor-toggle'),monitorNote=document.querySelector('#monitor-note'),monitorInterval=document.querySelector('#monitor-interval');function runMonitorPass(){monitorNote.textContent='Verificando '+sourceLabels[selectedSource()]+' agora…';return runCatalog(true)}monitorButton.onclick=()=>{if(monitorTimer){clearInterval(monitorTimer);monitorTimer=null;monitorButton.textContent='Ativar monitoramento';monitorNote.textContent='Monitoramento parado.';return}const minutes=Number(monitorInterval.value);if('Notification'in window&&Notification.permission==='default')Notification.requestPermission();runMonitorPass();monitorTimer=setInterval(runMonitorPass,minutes*60000);monitorButton.textContent='Parar monitoramento';monitorNote.textContent='Monitor ativo a cada '+minutes+' min enquanto o coletor estiver aberto.'};
</script></body></html>`;
}

const server = createServer(async (request, response) => {
  const headers = corsHeaders(request);
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers);
    response.end();
    return;
  }
  const origin = request.headers.origin || "";
  if (origin && !allowedOrigins.has(origin)) return respond(response, 403, { error: "Origem não autorizada." }, headers);
  if ((request.url === "/" || request.url === "/index.html") && request.method === "GET") {
    response.writeHead(200, { ...headers, "Content-Type": "text/html; charset=utf-8" });
    response.end(localPanelHtml());
    return;
  }
  if (request.url === "/health" && request.method === "GET") return respond(response, 200, { ok: true, service: "DesconteX Coletor Local", version: 15, browserMode: chromeHeadless ? "headless" : "visible" }, headers);
  if (request.url === "/session" && request.method === "GET") return respond(response, 200, { ok: true, token: localToken }, headers);
  const isScrape = request.url === "/scrape" && request.method === "POST";
  const isDealsScan = request.url === "/scan-deals" && request.method === "POST";
  const isAffiliateHubScan = request.url === "/scan-affiliate-hub" && request.method === "POST";
  const isAffiliateLink = request.url === "/generate-affiliate-link" && request.method === "POST";
  const isCouponApply = request.url === "/coupons/apply" && request.method === "POST";
  const isCouponScan = request.url === "/coupons/scan" && request.method === "POST";
  const isCatalogVerify = request.url === "/catalog/verify-batch" && request.method === "POST";
  const isAutomationLease = request.url === "/automation/lease" && request.method === "POST";
  if (!isScrape && !isDealsScan && !isAffiliateHubScan && !isAffiliateLink && !isCouponApply && !isCouponScan && !isCatalogVerify && !isAutomationLease) return respond(response, 404, { error: "Rota não encontrada." }, headers);
  if (request.headers["x-promozap-local-token"] !== localToken) return respond(response, 401, { error: "Token local inválido." }, headers);

  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 100_000) return respond(response, 413, { error: "Requisição muito grande." }, headers);
  }
  try {
    const body = JSON.parse(raw || "{}");
    const executeBrowserTask = () => isDealsScan ? scanDeals(body)
      : isAffiliateHubScan ? scanAffiliateHub()
      : isAffiliateLink ? generateAffiliateLinkLocal(body.input, body.tag)
      : isCouponApply ? applyCouponCodeLocal(body.code)
      : isCouponScan ? scanCouponsLocal()
      : isCatalogVerify ? verifyCatalogBatch(body)
      : scrapeProduct(body.input, body.managedCoupons);
    const task = isAutomationLease
      ? Promise.resolve(updateAutomationLease(body.ownerId, body.action))
      : scrapeQueue.then(executeBrowserTask);
    if (!isAutomationLease) scrapeQueue = task.catch(() => undefined);
    const result = await task;
    if (isDealsScan || isAffiliateHubScan || isAffiliateLink || isCouponApply || isCouponScan || isCatalogVerify || isAutomationLease) respond(response, result.ok ? 200 : 409, result, headers);
    else respond(response, result.ok ? 200 : 409, { ok: result.ok, product: result }, headers);
  } catch (error) {
    respond(response, 400, { ok: false, error: error instanceof Error ? error.message : "Falha na coleta." }, headers);
  }
});

server.listen(collectorPort, "127.0.0.1", () => {
  console.log("\nAchadeX Coletor Local está pronto.");
  console.log(`Endereço: http://127.0.0.1:${collectorPort}`);
  console.log(`Token local: ${localToken}`);
  console.log("Cole esse token na seção Coletor pelo navegador do painel.\n");
  if (process.platform === "win32" && process.env.PROMOZAP_AUTO_OPEN === "1") {
    const opener = spawn("cmd.exe", ["/d", "/c", "start", "", `http://127.0.0.1:${collectorPort}`], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    opener.unref();
  }
});

