"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Bell,
  Check,
  CircleAlert,
  Copy,
  Database,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Link2,
  LoaderCircle,
  MessageCircleMore,
  PackageSearch,
  Pause,
  Play,
  LayoutTemplate,
  Plus,
  Radar,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Smartphone,
  ScrollText,
  TicketPercent,
  TrendingDown,
  UsersRound,
  Webhook,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";

type Group = {
  JID: string;
  Name: string;
  Topic?: string;
  ParticipantCount?: number;
  OwnerCanSendMessage?: boolean;
  image_preview_url?: string;
};

type Role = "source" | "destination" | "ignored";

type GroupConfig = {
  jid: string;
  name: string;
  role: Role;
  category: string;
  destinationJid: string;
  enabled: boolean;
};

type AffiliateSettings = {
  amazonTrackingId: string;
  mercadoLivreLabel: string;
  redirectDomain: string;
  amazonEnabled: boolean;
  mercadoLivreEnabled: boolean;
};

type WhatsAppSettings = {
  serverUrl: string;
  instanceToken: string;
};

type AutomationButtonSettings = {
  enabled: boolean;
  labels: string[];
};

type OfferTemplatePreset = {
  id: string;
  name: string;
  content: string;
};

type ManagedCoupon = {
  id: string;
  code: string;
  title?: string | null;
  confirmationMessage?: string | null;
  discountType?: "percent" | "fixed" | null;
  discountValue?: number | null;
  minimumPurchase?: number | null;
  maxDiscount?: number | null;
  expiresAt?: string | null;
  rawText?: string | null;
  active: boolean;
  appliedAt: string;
  lastVerifiedAt?: string | null;
};

type AiCtaSettings = {
  enabled: boolean;
  generationMode: "cta" | "full-copy";
  model: "gpt-6-luna" | "gpt-6.1-sol" | "gpt-6-astra";
  style: "direto" | "urgencia" | "bem-humorado" | "elegante";
  emoji: boolean;
  formatting: "plain" | "bold" | "italic" | "bold-italic";
  maxWords: number;
};

type PrivateAssistantSettings = {
  enabled: boolean;
  model: "gpt-6-luna" | "gpt-6.1-sol" | "gpt-6-astra";
  typingDelayMs: number;
};

type ProductRecord = {
  id: string;
  store: "amazon" | "mercadolivre" | "unknown";
  productCode?: string | null;
  title?: string | null;
  imageUrl?: string | null;
  productDataJson?: string | null;
  dataSource?: string | null;
  sourceUrl: string;
  resolvedUrl?: string | null;
  affiliateUrl?: string | null;
  status: "found" | "converted" | "waiting_credentials" | "unsupported" | "error" | "sent";
  sourceGroup?: string | null;
  destinationGroup?: string | null;
  messageExcerpt?: string | null;
  redirectCount: number;
  occurrences: number;
  errorMessage?: string | null;
  foundAt: string;
  lastSeenAt: string;
  sentAt?: string | null;
  updatedAt?: string | null;
};

type AutomationLog = {
  id: string;
  level: "info" | "success" | "warning" | "error";
  stage: string;
  message: string;
  detailsJson?: string | null;
  groupJid?: string | null;
  productId?: string | null;
  createdAt: string;
};

type ProductInstallments = {
  text?: string | null;
  quantity?: number | null;
  amount?: number | null;
  noInterest?: boolean;
  rate?: number | null;
  currency_id?: string | null;
};

type CatalogItem = {
  id: string;
  itemId?: string | null;
  catalogProductId?: string | null;
  title: string;
  imageUrl?: string | null;
  url?: string | null;
  price?: number | null;
  originalPrice?: number | null;
  currency?: string | null;
  brand?: string | null;
  condition?: string | null;
  availability?: string | null;
  availableQuantity?: number | null;
  soldQuantity?: number | null;
  freeShipping?: boolean;
  seller?: string | number | null;
  categoryId?: string | null;
  officialStore?: string | null;
  discountPercentage?: number;
  full?: boolean;
  logisticType?: string | null;
  sellerId?: string | number | null;
  sellerReputation?: string | null;
  categoryName?: string | null;
  installments?: ProductInstallments | null;
  warranty?: string | null;
  attributes?: Array<Record<string, unknown>>;
  pictures?: Array<Record<string, unknown>>;
  saleTerms?: Array<Record<string, unknown>>;
  tags?: string[];
  bestSellerPosition?: number | null;
  promotionType?: string | null;
  promotionId?: string | null;
  priceId?: string | null;
  priceSource?: "sale_price" | "prices" | "buy_box" | "item" | "catalog" | "marketplace_page";
  priceUpdatedAt?: string | null;
  promotions?: Array<Record<string, unknown>>;
  coupon?: Record<string, unknown> | null;
  source?: "item" | "buy_box" | "best_seller" | "catalog" | "web_search";
  raw?: Record<string, unknown>;
  priceHistory?: Array<{ capturedAt: string; price: number; pixPrice?: number | null; standardPrice?: number | null; originalPrice?: number | null; couponPrice?: number | null }>;
  reviews?: Array<{ position?: number; rating?: number | null; country?: string | null; date?: string | null; text?: string | null; images?: string[]; videos?: string[]; media?: Array<{ type: "image" | "video"; url: string }>; usefulCount?: number }>;
  reviewsTotal?: number | null;
};

type MonitoredDeal = CatalogItem & {
  dealScore?: number;
  effectivePrice?: number | null;
  scoreReasons?: string[];
  detectedAt?: string;
};

type AffiliateHubOffer = MonitoredDeal & {
  affiliateEarningsPercentage?: number | null;
  rating?: number | null;
  soldText?: string | null;
  badge?: string | null;
  isNew?: boolean;
  isInternational?: boolean;
  sourceText?: string | null;
};

type MonitorSource = { id: string; url: string; weight: number };
type OfferPreviewStyle = "classic" | "focus" | "ai-home";
type OfferMonitor = {
  id: string;
  name: string;
  kind: "hub" | "urls";
  destinationJid: string;
  intervalMinutes: number;
  dailyTarget: number;
  sendStartHour?: number;
  sendEndHour?: number;
  sendStartTime: string;
  sendEndTime: string;
  scheduleEnabled: boolean;
  minimumSpacingMinutes: number;
  autoSend: boolean;
  aiCtaEnabled: boolean;
  showInstallments: boolean;
  installmentText: string;
  previewStyle: OfferPreviewStyle;
  minRating: number;
  minDiscount: number;
  maxPages: number;
  ignoreInternational: boolean;
  sources: MonitorSource[];
};
type MonitorRuntime = {
  offers: AffiliateHubOffer[];
  loading: boolean;
  error: string;
  lastScan: string | null;
  selectedSource?: string;
};
type MonitorActivity = {
  id: string;
  monitorId: string;
  at: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
};
type MonitorPhase = "paused" | "waiting" | "queued" | "checking" | "scanning" | "cataloging" | "preparing" | "linking" | "writing" | "sending" | "success" | "error";
type MonitorStatus = {
  phase: MonitorPhase;
  message: string;
  detail?: string;
  nextAt?: string | null;
  updatedAt: string;
};
type SendSummary = { productId: string; productTitle?: string | null; sendCount: number; groupCount: number; lastSentAt: string };
type SendHistoryRow = { id: string; productId: string; productTitle?: string | null; destinationJid: string; destinationName?: string | null; monitorId?: string | null; sendMode: string; sentAt: string };
type CatalogedProduct = CatalogItem & { category: string; productCode?: string | null; currentPrice?: number | null; previousPrice?: number | null; productUrl?: string; rating?: number | null; firstSeenAt?: string; lastSeenAt?: string };
type CatalogedStats = { total: number; categoryCount: number; withPrice: number; withDiscount: number; withFreeShipping: number; historyPoints: number };
type RankedProduct = CatalogedProduct & {
  referencePrice: number;
  average7d?: number | null;
  previousLow?: number | null;
  historyCount: number;
  dropPercent: number;
  saving: number;
  historicalLow: boolean;
  score: number;
  lastObservedAt?: string | null;
  updatedAt?: string | null;
};
type RankingStats = { totalDrops: number; historicalLows: number; averageDrop: number; biggestDrop: number };
type CatalogVerificationState = { running: boolean; paused: boolean; total: number; completed: number; updated: number; failed: number; currentTitle: string; message: string };

const OFFER_CACHE_KEY = "descontex.offerCache.v1";
const OFFER_CACHE_MAX_PER_MONITOR = 250;
const defaultInstallmentText = "💳 {{quantidade}}x de {{valor_parcela}} {{juros}}";

const defaultOfferMonitors: OfferMonitor[] = [
  {
    id: "geral-hub", name: "Ofertas gerais", kind: "hub", destinationJid: "", intervalMinutes: 5,
    dailyTarget: 20, sendStartTime: "07:00", sendEndTime: "00:00", scheduleEnabled: true, minimumSpacingMinutes: 20,
    autoSend: false, aiCtaEnabled: true, showInstallments: false, installmentText: defaultInstallmentText, previewStyle: "classic", minRating: 0, minDiscount: 10, maxPages: 10, ignoreInternational: true,
    sources: [{ id: "hub", url: "https://www.mercadolivre.com.br/afiliados/hub", weight: 100 }],
  },
  {
    id: "smartphones", name: "Celulares e Smartphones", kind: "urls", destinationJid: "", intervalMinutes: 5,
    dailyTarget: 8, sendStartTime: "07:00", sendEndTime: "00:00", scheduleEnabled: true, minimumSpacingMinutes: 20,
    autoSend: false, aiCtaEnabled: true, showInstallments: false, installmentText: defaultInstallmentText, previewStyle: "classic", minRating: 4.7, minDiscount: 20, maxPages: 10, ignoreInternational: true,
    sources: [
      { id: "smartphones-busca", url: "https://lista.mercadolivre.com.br/smartphone?sb=all_mercadolibre", weight: 50 },
      { id: "smartphones-ofertas", url: "https://lista.mercadolivre.com.br/_Container_lp-smfs-geral-26_NoIndex_True", weight: 30 },
      { id: "carregadores", url: "https://lista.mercadolivre.com.br/carregador-celular?sb=all_mercadolibre", weight: 20 },
    ],
  },
  {
    id: "iphone", name: "iPhone", kind: "urls", destinationJid: "", intervalMinutes: 5,
    dailyTarget: 8, sendStartTime: "07:00", sendEndTime: "00:00", scheduleEnabled: true, minimumSpacingMinutes: 20,
    autoSend: false, aiCtaEnabled: true, showInstallments: true, installmentText: defaultInstallmentText, previewStyle: "classic", minRating: 4.7, minDiscount: 20, maxPages: 10, ignoreInternational: true,
    sources: [
      { id: "iphone-busca", url: "https://lista.mercadolivre.com.br/iphone", weight: 100 },
    ],
  },
  {
    id: "eletrodomesticos", name: "Eletrodomésticos", kind: "urls", destinationJid: "", intervalMinutes: 5,
    dailyTarget: 8, sendStartTime: "07:00", sendEndTime: "00:00", scheduleEnabled: true, minimumSpacingMinutes: 20,
    autoSend: false, aiCtaEnabled: true, showInstallments: true, installmentText: defaultInstallmentText, previewStyle: "classic", minRating: 4.5, minDiscount: 20, maxPages: 10, ignoreInternational: true,
    sources: [
      { id: "eletrodomesticos-busca", url: "https://lista.mercadolivre.com.br/eletrodom%C3%A9sticos", weight: 80 },
      { id: "tvs-busca", url: "https://lista.mercadolivre.com.br/tvs", weight: 20 },
    ],
  },
  {
    id: "maternidade", name: "Maternidade", kind: "urls", destinationJid: "", intervalMinutes: 5,
    dailyTarget: 8, sendStartTime: "07:00", sendEndTime: "00:00", scheduleEnabled: true, minimumSpacingMinutes: 20,
    autoSend: false, aiCtaEnabled: true, showInstallments: false, installmentText: defaultInstallmentText, previewStyle: "classic", minRating: 4.5, minDiscount: 20, maxPages: 10, ignoreInternational: true,
    sources: [
      { id: "maternidade-busca", url: "https://lista.mercadolivre.com.br/maternidade", weight: 100 },
    ],
  },
  {
    id: "casa-decoracao", name: "Casa e Decoração", kind: "urls", destinationJid: "", intervalMinutes: 5,
    dailyTarget: 8, sendStartTime: "07:00", sendEndTime: "00:00", scheduleEnabled: true, minimumSpacingMinutes: 20,
    autoSend: false, aiCtaEnabled: true, showInstallments: false, installmentText: defaultInstallmentText, previewStyle: "ai-home", minRating: 4.5, minDiscount: 20, maxPages: 10, ignoreInternational: true,
    sources: [
      { id: "casa-ofertas", url: "https://lista.mercadolivre.com.br/_Container_fh-lp-ofertas-dod-c1_NoIndex_True", weight: 100 },
    ],
  },
];

type DailyScheduleState = {
  date: string;
  signature: string;
  completedSlots: number;
  sentCount: number;
  lastSentAt?: string;
  retryAfter?: string;
};

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function seededUnit(seed: string) {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return ((value >>> 0) % 1_000_000) / 1_000_000;
}

function timeToMinutes(value: string | undefined, fallback: number, allowEndOfDay = false) {
  const match = String(value || "").match(/^(\d{2}):(\d{2})$/);
  if (!match) return fallback;
  const hour = Math.max(0, Math.min(23, Number(match[1])));
  const minute = Math.max(0, Math.min(59, Number(match[2])));
  const total = hour * 60 + minute;
  return allowEndOfDay && total === 0 ? 1440 : total;
}

function legacyHourToTime(value: number | undefined, fallback: string) {
  if (!Number.isFinite(value)) return fallback;
  const hour = Math.max(0, Math.min(24, Math.floor(Number(value))));
  return hour === 24 ? "00:00" : `${String(hour).padStart(2, "0")}:00`;
}

function monitorScheduleSettings(monitor: OfferMonitor) {
  const configuredStart = timeToMinutes(monitor.sendStartTime, Math.max(0, Math.min(23, Number(monitor.sendStartHour) || 7)) * 60);
  const configuredEnd = timeToMinutes(monitor.sendEndTime, Math.max(1, Math.min(24, Number(monitor.sendEndHour) || 24)) * 60, true);
  const startMinute = monitor.scheduleEnabled === false ? 0 : configuredStart;
  const endMinute = monitor.scheduleEnabled === false ? 1440 : Math.max(startMinute + 1, configuredEnd);
  const availableMinutes = endMinute - startMinute;
  const requestedTarget = Math.max(1, Math.min(200, Math.floor(Number(monitor.dailyTarget) || 1)));
  const averageSpacing = availableMinutes / requestedTarget;
  const minimumSpacingMinutes = Math.max(5, Math.min(55, Math.floor((averageSpacing * 0.55) / 5) * 5 || 5));
  const capacity = Math.max(1, Math.floor(availableMinutes / minimumSpacingMinutes));
  return { startMinute, endMinute, startHour: startMinute / 60, endHour: endMinute / 60, minimumSpacingMinutes, target: Math.min(requestedTarget, capacity), requestedTarget, availableMinutes };
}

function buildDailyMonitorSlots(monitor: OfferMonitor, date = new Date()) {
  const settings = monitorScheduleSettings(monitor);
  const day = localDateKey(date);
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const start = midnight + settings.startMinute * 60_000;
  const end = midnight + settings.endMinute * 60_000;
  const segment = (end - start) / settings.target;
  const jitterLimit = Math.max(0, Math.min(segment * 0.28, 9 * 60_000));
  const slots: number[] = [];
  for (let index = 0; index < settings.target; index += 1) {
    const center = start + segment * (index + 0.5);
    const jitter = (seededUnit(`${monitor.id}:${day}:${index}`) * 2 - 1) * jitterLimit;
    let candidate = Math.round((center + jitter) / 60_000) * 60_000;
    const earliest = index === 0 ? start + 2 * 60_000 : slots[index - 1] + settings.minimumSpacingMinutes * 60_000;
    const latest = end - (settings.target - index) * settings.minimumSpacingMinutes * 60_000;
    candidate = Math.max(earliest, Math.min(candidate, Math.max(earliest, latest)));
    slots.push(candidate);
  }
  const signature = [settings.target, settings.startMinute, settings.endMinute, settings.minimumSpacingMinutes, monitor.scheduleEnabled !== false].join(":");
  return { ...settings, day, signature, slots };
}

const defaultOfferTemplate = `{{linha_cta_ia}}🔥 *{{titulo}}*

{{linha_preco_anterior}}✅ *Por: {{preco}}{{linha_desconto}}*
{{linha_cupom}}
{{linha_parcelas}}
{{linha_frete}}
🛒 Garanta aqui: {{link}}`;

const offerTemplateVariables = [
  ["{{cta_ia}}", "CTA curto gerado por IA"],
  ["{{linha_cta_ia}}", "CTA gerado por IA, com espaçamento; some quando estiver desligado"],
  ["{{titulo}}", "Nome do produto"],
  ["{{preco}}", "Preço atual"],
  ["{{preco_anterior}}", "Preço anterior"],
  ["{{desconto}}", "Percentual de desconto"],
  ["{{economia}}", "Economia em reais"],
  ["{{cupom}}", "Código ou benefício do cupom aplicável"],
  ["{{link}}", "Link convertido da oferta"],
  ["{{loja}}", "Mercado Livre"],
  ["{{frete}}", "Frete grátis / envio Full"],
  ["{{parcelas}}", "Resumo do parcelamento encontrado"],
  ["{{quantidade_parcelas}}", "Quantidade de parcelas"],
  ["{{valor_parcela}}", "Valor de cada parcela"],
  ["{{juros_parcela}}", "Sem Juros, somente quando confirmado"],
  ["{{vendedor}}", "Nome do vendedor"],
  ["{{marca}}", "Marca"],
  ["{{categoria}}", "Categoria"],
  ["{{id_produto}}", "ID do produto"],
  ["{{linha_preco_anterior}}", "Linha pronta, ocultada quando não houver preço anterior"],
  ["{{linha_desconto}}", "Trecho pronto, ocultado quando não houver desconto"],
  ["{{linha_cupom}}", "Linha pronta com o cupom aplicável; some quando não houver cupom"],
  ["{{linha_frete}}", "Linha pronta, ocultada quando não houver benefício de entrega"],
  ["{{linha_parcelas}}", "Linha configurável por nicho; some quando estiver desligada ou indisponível"],
] as const;

const defaultAiCtaSettings: AiCtaSettings = {
  enabled: true,
  generationMode: "cta",
  model: "gpt-6-luna",
  style: "direto",
  emoji: true,
  formatting: "bold",
  maxWords: 10,
};

const defaultPrivateAssistantSettings: PrivateAssistantSettings = {
  enabled: false,
  model: "gpt-6-luna",
  typingDelayMs: 2400,
};

type CatalogSearchResponse = {
  store?: "mercadolivre";
  query?: string;
  items?: CatalogItem[];
  total?: number;
  filters?: unknown;
  sorts?: Array<string | { id: string; name: string }>;
  error?: string;
  credentialsRequired?: boolean;
  warning?: string | null;
};

type MercadoLivreApiLookup = {
  ok: boolean;
  checkedAt: string;
  connection: { connected: boolean; expiresAt?: string | null; userId?: string | null; scope?: string | null };
  endpoints: Array<{ key: string; label: string; available: boolean }>;
  product: CatalogItem;
  notes: string[];
};

type LocalCollectorProduct = {
  ok?: boolean;
  needsUserAction?: boolean;
  userActionMessage?: string | null;
  capturedAt?: string;
  canonicalUrl?: string | null;
  url?: string | null;
  title?: string | null;
  itemId?: string | null;
  userProductId?: string | null;
  brand?: string | null;
  currency?: string | null;
  price?: number | null;
  pixPrice?: number | null;
  standardPrice?: number | null;
  originalPrice?: number | null;
  discountPercentage?: number | null;
  discountText?: string | null;
  coupon?: { text?: string | null; title?: string | null; code?: string | null; price?: number | null; amountOff?: number | null; percentOff?: number | null; minimumPurchase?: number | null; maxDiscount?: number | null; confirmationMessage?: string | null; discountType?: "percent" | "fixed" | null; discountValue?: number | null; rawText?: string | null; expiresAt?: string | null; appliedAt?: string | null; lastVerifiedAt?: string | null } | null;
  availableCoupons?: Array<{ text?: string | null; title?: string | null; code?: string | null; price?: number | null; amountOff?: number | null; percentOff?: number | null; minimumPurchase?: number | null; maxDiscount?: number | null }>;
  installments?: ProductInstallments | null;
  availability?: string | null;
  condition?: string | null;
  soldText?: string | null;
  availableQuantity?: number | null;
  stockText?: string | null;
  seller?: string | null;
  sellerSales?: string | null;
  officialStore?: string | null;
  deliveryText?: string | null;
  freeShipping?: boolean;
  ratingText?: string | null;
  imageUrl?: string | null;
  images?: string[];
  categories?: string[];
  highlighted?: string[];
  attributes?: Array<{ name?: string; value_name?: string }>;
  description?: string | null;
  personalizedContext?: Record<string, unknown>;
  structuredData?: Record<string, unknown>;
  priceHistory?: Array<{ capturedAt: string; price: number; pixPrice?: number | null; standardPrice?: number | null; originalPrice?: number | null; couponPrice?: number | null }>;
  reviews?: Array<{ position?: number; rating?: number | null; country?: string | null; date?: string | null; text?: string | null; images?: string[]; videos?: string[]; media?: Array<{ type: "image" | "video"; url: string }>; usefulCount?: number }>;
  reviewsTotal?: number | null;
};

type MercadoLivreCategory = { id: string; name: string };

type ModelContext = {
  registerTool: (tool: {
    name: string;
    title: string;
    description: string;
    inputSchema: object;
    annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
    execute: (input: unknown) => Promise<unknown>;
  }, options?: { signal?: AbortSignal }) => void | Promise<void>;
};

const categories = [
  ["geral", "Ofertas gerais"],
  ["tecnologia", "Celulares e tecnologia"],
  ["games", "Games"],
  ["casa", "Casa e cozinha"],
  ["eletro", "Eletrodomésticos"],
  ["tv", "TVs"],
  ["pc", "PCs e notebooks"],
] as const;

const emptyAffiliate: AffiliateSettings = {
  amazonTrackingId: "",
  mercadoLivreLabel: "",
  redirectDomain: "",
  amazonEnabled: false,
  mercadoLivreEnabled: false,
};

const emptyWhatsApp: WhatsAppSettings = {
  serverUrl: "https://free.uazapi.com",
  instanceToken: "",
};

const defaultAutomationButtons: AutomationButtonSettings = {
  enabled: true,
  labels: ["VER OFERTA", "COMPRAR AGORA", "ADQUIRA JÁ", "LINK COM DESCONTO", "APROVEITAR OFERTA", "VER PROMOÇÃO"],
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function roleLabel(role: Role) {
  if (role === "source") return "Monitorar";
  if (role === "destination") return "Meu grupo";
  return "Ignorar";
}

function productStatusLabel(status: ProductRecord["status"]) {
  return ({
    found: "Identificado",
    converted: "Convertido",
    waiting_credentials: "Aguardando sessão",
    unsupported: "Não reconhecido",
    error: "Erro",
    sent: "Enviado",
  } as const)[status];
}

function productStatusClass(status: ProductRecord["status"]) {
  if (status === "sent") return "border-[#2d8a4b] bg-[#153520] text-[#8af3a5]";
  if (status === "converted") return "border-[#2b6840] bg-[#102a19] text-[#62ef8b]";
  if (status === "waiting_credentials") return "border-[#725f22] bg-[#2a230c] text-[#f4d35e]";
  if (status === "unsupported") return "border-[#4c5650] bg-[#202622] text-[#c0c9c3]";
  if (status === "error") return "border-[#764239] bg-[#2a1612] text-[#ff9b92]";
  return "border-[#365044] bg-[#17231c] text-[#b2c9ba]";
}

function renderWhatsAppLine(line: string, lineIndex: number) {
  const pattern = /(https?:\/\/[^\s]+|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|`[^`\n]+`)/g;
  const parts = line.split(pattern).filter((part) => part.length > 0);
  return (
    <span key={`line-${lineIndex}`}>
      {parts.map((part, index) => {
        const key = `${lineIndex}-${index}`;
        if (/^https?:\/\//i.test(part)) return <a key={key} href={part} target="_blank" rel="noreferrer" className="break-all text-[#53bdeb] underline decoration-[#427d91] underline-offset-2">{part}</a>;
        if (part.startsWith("*") && part.endsWith("*")) return <strong key={key} className="font-bold text-white">{part.slice(1, -1)}</strong>;
        if (part.startsWith("_") && part.endsWith("_")) return <em key={key}>{part.slice(1, -1)}</em>;
        if (part.startsWith("~") && part.endsWith("~")) return <s key={key} className="text-[#9caaa1]">{part.slice(1, -1)}</s>;
        if (part.startsWith("`") && part.endsWith("`")) return <code key={key} className="rounded bg-black/30 px-1 py-0.5 text-[0.9em]">{part.slice(1, -1)}</code>;
        return <span key={key}>{part}</span>;
      })}
    </span>
  );
}

function WhatsAppMessage({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="whitespace-pre-wrap break-words text-[15px] leading-6 text-[#eef5f0]">
      {lines.map((line, index) => (
        <span key={index}>{renderWhatsAppLine(line, index)}{index < lines.length - 1 && <br />}</span>
      ))}
    </div>
  );
}

function parseProductData(value?: string | null) {
  if (!value) return null;
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return null; }
}

const productDataLabels: Record<string, string> = {
  id: "ID retornado", asin: "ASIN", siteId: "Site", title: "Título da API", name: "Nome", familyName: "Família",
  status: "Status", domainId: "Domínio", categoryId: "Categoria", sellerId: "Vendedor", officialStoreId: "Loja oficial",
  price: "Preço", basePrice: "Preço-base", originalPrice: "Preço original", currencyId: "Moeda", availableQuantity: "Quantidade disponível",
  soldQuantity: "Quantidade vendida", condition: "Condição", catalogProductId: "Produto de catálogo", parentId: "Produto-pai",
  permalink: "Página oficial", buyingMode: "Modo de compra", listingTypeId: "Tipo de anúncio", warranty: "Garantia", health: "Qualidade do anúncio",
  brand: "Marca", description: "Descrição", sku: "SKU", mpn: "MPN", gtin: "GTIN/EAN", category: "Categoria", color: "Cor",
  size: "Tamanho", material: "Material", model: "Modelo", apiStatus: "Situação da API", apiNote: "Observação da API",
};

function productDataValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

function catalogFilterLabels(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => {
    const row = item as { name?: string; displayName?: string; id?: string };
    return row.name || row.displayName || row.id || "Filtro";
  }).filter(Boolean);
  if (value && typeof value === "object") {
    const rows = value as Record<string, { displayName?: string; id?: string }>;
    return Object.entries(rows).map(([key, item]) => item?.displayName || item?.id || key);
  }
  return [];
}

function formatMoney(value: number | null | undefined, currency = "BRL") {
  return value == null ? "Não informado" : new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

function parseBrazilianMoney(value: string) {
  const normalized = value.replace(/[^\d.,]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function productInstallmentDetails(item: CatalogItem) {
  const installment = item.installments;
  if (!installment) return null;
  const text = typeof installment.text === "string" ? installment.text.trim() : "";
  const textMatch = text.match(/(\d{1,2})x\s*(?:de\s*)?(R\$\s*[\d.,]+)/i);
  const quantityValue = Number(installment.quantity ?? textMatch?.[1]);
  const amountValue = Number(installment.amount) || (textMatch?.[2] ? parseBrazilianMoney(textMatch[2]) : null);
  if (!Number.isFinite(quantityValue) || quantityValue < 2 || !amountValue || amountValue <= 0) return null;
  const noInterest = installment.noInterest === true || (typeof installment.rate === "number" && installment.rate === 0) || /sem juros/i.test(text);
  return { quantity: Math.round(quantityValue), amount: amountValue, noInterest, text };
}

function renderInstallmentText(item: CatalogItem, pattern = defaultInstallmentText) {
  const details = productInstallmentDetails(item);
  if (!details) return "";
  const currency = item.currency || item.installments?.currency_id || "BRL";
  const values: Record<string, string> = {
    "{{quantidade}}": String(details.quantity),
    "{{valor_parcela}}": formatMoney(details.amount, currency),
    "{{juros}}": details.noInterest ? "*Sem Juros*" : "",
  };
  return Object.entries(values).reduce((text, [variable, value]) => text.split(variable).join(value), pattern || defaultInstallmentText)
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function retryOnce<T>(operation: () => Promise<T>, delayMs = 900) {
  try {
    return await operation();
  } catch {
    await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    return operation();
  }
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("A imagem não permitiu a composição personalizada."));
    image.src = src;
  });
}

function drawContainedImage(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawRoundedFill(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string | CanvasGradient) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fillStyle = fill;
  context.fill();
}

async function createBrandedPreviewImage(item: CatalogItem) {
  if (!item.imageUrl) return "";
  try {
    const [productImage, logoImage] = await Promise.all([loadCanvasImage(item.imageUrl), loadCanvasImage("/descontex-logo-white.png")]);
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const context = canvas.getContext("2d");
    if (!context) return "";
    const background = context.createLinearGradient(0, 0, 1200, 630);
    background.addColorStop(0, "#f8fcff");
    background.addColorStop(.7, "#ffffff");
    background.addColorStop(1, "#e5f6ff");
    context.fillStyle = background;
    context.fillRect(0, 0, 1200, 630);

    const accent = context.createLinearGradient(0, 0, 1200, 0);
    accent.addColorStop(0, "#075ff7");
    accent.addColorStop(.55, "#087bd3");
    accent.addColorStop(1, "#06cce3");
    context.fillStyle = accent;
    context.fillRect(0, 614, 1200, 16);
    context.fillStyle = "rgba(7,95,247,.06)";
    context.beginPath();
    context.arc(1120, 80, 210, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(6,204,227,.055)";
    context.beginPath();
    context.arc(70, 585, 190, 0, Math.PI * 2);
    context.fill();

    drawContainedImage(context, productImage, 170, 48, 860, 490);

    const discount = Math.max(0, Math.min(95, Math.round(Number(item.discountPercentage) || 0)));
    if (discount) {
      drawRoundedFill(context, 38, 34, 226, 72, 18, accent);
      context.fillStyle = "#ffffff";
      context.font = "900 36px Arial, sans-serif";
      context.textAlign = "center";
      context.fillText(`-${discount}% OFF`, 151, 82);
    }

    drawRoundedFill(context, 858, 20, 318, 108, 24, "#061b46");
    drawContainedImage(context, logoImage, 884, 30, 266, 88);

    if (item.rating) {
      drawRoundedFill(context, 38, 540, 236, 56, 28, "#071a3a");
      context.fillStyle = "#ffd84d";
      context.font = "900 28px Arial, sans-serif";
      context.textAlign = "center";
      context.fillText(`★★★★★  ${Number(item.rating).toFixed(1)}`, 156, 578);
    }

    const rawSoldText = String(item.soldText || "").trim();
    const soldText = (rawSoldText && /^\d/.test(rawSoldText) ? `+${rawSoldText}` : rawSoldText).slice(0, 30);
    if (soldText) {
      context.font = "900 27px Arial, sans-serif";
      const soldWidth = Math.max(245, Math.min(390, context.measureText(soldText).width + 64));
      drawRoundedFill(context, 1162 - soldWidth, 540, soldWidth, 56, 28, accent);
      context.fillStyle = "#ffffff";
      context.textAlign = "center";
      context.fillText(soldText, 1162 - soldWidth / 2, 578);
    }

    return canvas.toDataURL("image/jpeg", 0.88);
  } catch {
    return "";
  }
}

async function createProductFocusPreviewImage(item: CatalogItem) {
  if (!item.imageUrl) return "";
  try {
    const [productImage, logoImage] = await Promise.all([loadCanvasImage(item.imageUrl), loadCanvasImage("/descontex-logo-white.png")]);
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const context = canvas.getContext("2d");
    if (!context) return "";

    const background = context.createLinearGradient(0, 0, 1200, 630);
    background.addColorStop(0, "#f7fbff");
    background.addColorStop(.5, "#ffffff");
    background.addColorStop(1, "#e9f7ff");
    context.fillStyle = background;
    context.fillRect(0, 0, 1200, 630);

    const accent = context.createLinearGradient(0, 0, 1200, 0);
    accent.addColorStop(0, "#075ff7");
    accent.addColorStop(.62, "#087bd3");
    accent.addColorStop(1, "#06d2e8");
    context.fillStyle = accent;
    context.fillRect(0, 616, 1200, 14);

    // O produto é o protagonista: ocupa praticamente toda a peça, enquanto os dados ficam nas bordas.
    drawContainedImage(context, productImage, 46, 24, 1108, 580);

    const discount = Math.max(0, Math.min(95, Math.round(Number(item.discountPercentage) || 0)));
    if (discount) {
      drawRoundedFill(context, 26, 24, 230, 70, 20, accent);
      context.fillStyle = "#ffffff";
      context.font = "900 34px Arial, sans-serif";
      context.textAlign = "center";
      context.fillText(`-${discount}% OFF`, 141, 70);
    }

    drawRoundedFill(context, 943, 22, 231, 78, 22, "#061b46");
    drawContainedImage(context, logoImage, 964, 32, 189, 58);

    if (item.rating) {
      drawRoundedFill(context, 26, 544, 236, 56, 28, "rgba(7,26,58,.96)");
      context.fillStyle = "#ffd84d";
      context.font = "900 27px Arial, sans-serif";
      context.textAlign = "center";
      context.fillText(`★★★★★  ${Number(item.rating).toFixed(1)}`, 144, 582);
    }

    const rawSoldText = String(item.soldText || "").trim();
    const soldText = (rawSoldText && /^\d/.test(rawSoldText) ? `+${rawSoldText}` : rawSoldText).slice(0, 30);
    if (soldText) {
      context.font = "900 26px Arial, sans-serif";
      const soldWidth = Math.max(238, Math.min(382, context.measureText(soldText).width + 58));
      drawRoundedFill(context, 1174 - soldWidth, 544, soldWidth, 56, 28, accent);
      context.fillStyle = "#ffffff";
      context.textAlign = "center";
      context.fillText(soldText, 1174 - soldWidth / 2, 582);
    }

    return canvas.toDataURL("image/jpeg", 0.9);
  } catch {
    return "";
  }
}

function drawCoverImage(context: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawWrappedCanvasText(context: CanvasRenderingContext2D, value: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (words.length && lines.join(" ").split(/\s+/).length < words.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.…]+$/, "")}…`;
  }
  lines.forEach((text, index) => context.fillText(text, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

function openAiPreviewCache() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open("descontex-ai-preview-cache", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("scenes");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Cache local indisponível."));
  });
}

async function readAiPreviewCache(key: string) {
  try {
    const database = await openAiPreviewCache();
    return await new Promise<string>((resolve) => {
      const request = database.transaction("scenes", "readonly").objectStore("scenes").get(key);
      request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : "");
      request.onerror = () => resolve("");
    }).finally(() => database.close());
  } catch {
    return "";
  }
}

async function writeAiPreviewCache(key: string, image: string) {
  try {
    const database = await openAiPreviewCache();
    await new Promise<void>((resolve) => {
      const request = database.transaction("scenes", "readwrite").objectStore("scenes").put(image, key);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
    database.close();
  } catch {}
}

async function createAiHomePreviewImage(item: CatalogItem, adminToken: string) {
  if (!item.imageUrl) throw new Error("O produto não tem imagem oficial para criar a arte.");
  const productKey = String(item.itemId || item.id || item.url || item.title);
  const cacheKey = `home-v1:${productKey}:${item.imageUrl}`;
  let scene = await readAiPreviewCache(cacheKey);
  if (!scene) {
    const response = await fetch("/api/ai/product-image", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Promozap-Admin-Token": adminToken },
      body: JSON.stringify({ id: productKey, title: item.title, imageUrl: item.imageUrl, style: "home-decor" }),
    });
    const result = await response.json() as { image?: string; error?: string };
    if (!response.ok || !result.image) throw new Error(result.error || "A IA não devolveu a arte do produto.");
    scene = result.image;
    await writeAiPreviewCache(cacheKey, scene);
  }

  const [sceneImage, logoImage] = await Promise.all([loadCanvasImage(scene), loadCanvasImage("/descontex-logo-white.png")]);
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("O navegador não conseguiu montar a arte.");
  drawCoverImage(context, sceneImage, canvas.width, canvas.height);

  const shade = context.createLinearGradient(760, 0, 1536, 0);
  shade.addColorStop(0, "rgba(3,18,48,0)");
  shade.addColorStop(.27, "rgba(3,18,48,.72)");
  shade.addColorStop(1, "rgba(3,15,40,.97)");
  context.fillStyle = shade;
  context.fillRect(660, 0, 876, 1024);

  const brand = context.createLinearGradient(0, 0, 560, 0);
  brand.addColorStop(0, "rgba(3,17,70,.98)");
  brand.addColorStop(1, "rgba(4,100,245,.96)");
  drawRoundedFill(context, 32, 30, 560, 148, 30, brand);
  drawContainedImage(context, logoImage, 64, 54, 490, 96);

  const discount = Math.max(0, Math.min(95, Math.round(Number(item.discountPercentage) || 0)));
  if (discount) {
    const discountGradient = context.createLinearGradient(0, 0, 420, 0);
    discountGradient.addColorStop(0, "#075ff7");
    discountGradient.addColorStop(1, "#06d9ea");
    drawRoundedFill(context, 970, 334, 500, 190, 34, discountGradient);
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.font = "900 112px Arial, sans-serif";
    context.fillText(`${discount}%`, 1175, 458);
    context.fillStyle = "#bdfaff";
    context.font = "900 54px Arial, sans-serif";
    context.fillText("OFF", 1380, 456);
  }

  context.textAlign = "left";
  context.fillStyle = "#ffffff";
  context.font = "900 52px Arial, sans-serif";
  drawWrappedCanvasText(context, item.title || "Oferta para sua casa", 970, 118, 500, 58, 3);

  let priceY = 610;
  if (item.originalPrice && item.price && item.originalPrice > item.price) {
    context.fillStyle = "rgba(255,255,255,.74)";
    context.font = "500 36px Arial, sans-serif";
    context.fillText(`De: ${formatMoney(item.originalPrice, item.currency || "BRL")}`, 970, priceY);
    const measured = context.measureText(`De: ${formatMoney(item.originalPrice, item.currency || "BRL")}`).width;
    context.strokeStyle = "rgba(255,255,255,.8)";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(1034, priceY - 12);
    context.lineTo(970 + measured, priceY - 12);
    context.stroke();
    priceY += 62;
  }
  context.fillStyle = "#fff200";
  context.font = "900 38px Arial, sans-serif";
  context.fillText("POR", 970, priceY);
  context.font = "900 82px Arial, sans-serif";
  context.fillText(formatMoney(item.price, item.currency || "BRL"), 970, priceY + 88);

  if (item.freeShipping) {
    drawRoundedFill(context, 970, 814, 500, 96, 28, "#06cfe3");
    context.fillStyle = "#031836";
    context.textAlign = "center";
    context.font = "900 42px Arial, sans-serif";
    context.fillText("🚚  FRETE GRÁTIS", 1220, 877);
  }
  if (item.rating) {
    drawRoundedFill(context, 42, 914, 350, 72, 36, "rgba(3,20,50,.92)");
    context.fillStyle = "#ffd84d";
    context.textAlign = "center";
    context.font = "900 32px Arial, sans-serif";
    context.fillText(`★★★★★  ${Number(item.rating).toFixed(1)}`, 217, 962);
  }

  return canvas.toDataURL("image/jpeg", 0.86);
}

function PriceHistoryPanel({ item }: { item: CatalogItem }) {
  const history = (item.priceHistory || []).filter((point) => Number.isFinite(point.price));
  const current = item.price ?? history.at(-1)?.price ?? null;
  const observed = history.map((point) => point.price);
  const reference = item.originalPrice && item.originalPrice > (current || 0) ? item.originalPrice : null;
  const values = [...observed, ...(reference ? [reference] : [])];
  if (!values.length) return null;
  const width = 820;
  const height = 220;
  const padX = 58;
  const padY = 26;
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) { min *= 0.95; max *= 1.05; }
  const gap = (max - min) * 0.14;
  min = Math.max(0, min - gap);
  max += gap;
  const x = (index: number) => history.length <= 1 ? width / 2 : padX + index * (width - padX * 2) / (history.length - 1);
  const y = (value: number) => height - padY - (value - min) * (height - padY * 2) / (max - min);
  const points = history.map((point, index) => [x(index), y(point.price)] as const);
  const line = points.map((point, index) => `${index ? "L" : "M"}${point[0].toFixed(1)} ${point[1].toFixed(1)}`).join(" ");
  const lowest = observed.length ? Math.min(...observed) : current;
  const highest = observed.length ? Math.max(...observed) : current;
  const saving = reference && current ? Math.round((1 - current / reference) * 100) : 0;
  return <section className="rounded-2xl border border-[#2b4934] bg-[#08120c] p-4">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-lg font-extrabold">Histórico de preço</h3><p className="mt-1 text-xs leading-5 text-[#8fa096]">{history.length > 1 ? `${history.length} medições reais salvas pelo coletor local.` : "Primeira medição salva. Novas consultas formarão a curva real."}</p></div>{saving > 0 && <Badge className="w-fit bg-[#153520] text-[#8af3a5]">Atual {saving}% abaixo da referência</Badge>}</div>
    <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">{[["Atual", current], ["Menor observado", lowest], ["Maior observado", highest], ["Referência", reference]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-[#27322b] bg-[#101812] p-3"><p className="text-xs text-[#718079]">{label}</p><p className="mt-1 font-extrabold text-[#62ef8b]">{formatMoney(value as number | null, item.currency || "BRL")}</p></div>)}</div>
    <div className="mt-4 overflow-hidden rounded-xl border border-[#27322b] bg-[#050a07] p-2"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de histórico de preço" className="h-auto w-full"><defs><linearGradient id="panelPriceArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#36d96b" stopOpacity=".32" /><stop offset="1" stopColor="#36d96b" stopOpacity="0" /></linearGradient></defs>{[0, .25, .5, .75, 1].map((step) => { const value = max - (max - min) * step; const gridY = padY + (height - padY * 2) * step; return <g key={step}><line x1={padX} y1={gridY} x2={width - padX} y2={gridY} stroke="#1f3526" /><text x="4" y={gridY + 4} fill="#91a696" fontSize="11">{formatMoney(value, item.currency || "BRL")}</text></g>; })}{reference && <><line x1={padX} y1={y(reference)} x2={width - padX} y2={y(reference)} stroke="#ffe600" strokeWidth="2" strokeDasharray="7 7" /><text x={width - 190} y={y(reference) - 7} fill="#c7bb42" fontSize="11">referência {formatMoney(reference, item.currency || "BRL")}</text></>}{points.length > 1 && <path d={`${line} L ${points.at(-1)?.[0]} ${height - padY} L ${points[0][0]} ${height - padY} Z`} fill="url(#panelPriceArea)" />}{line && <path d={line} fill="none" stroke="#36d96b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}{points.map((point, index) => <circle key={`${point[0]}-${index}`} cx={point[0]} cy={point[1]} r="5" fill="#050806" stroke="#69f08f" strokeWidth="4"><title>{new Date(history[index].capturedAt).toLocaleString("pt-BR")} — {formatMoney(history[index].price, item.currency || "BRL")}</title></circle>)}</svg></div>
  </section>;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("automation");
  const [groups, setGroups] = useState<Group[]>([]);
  const [configs, setConfigs] = useState<Record<string, GroupConfig>>({});
  const [affiliate, setAffiliate] = useState<AffiliateSettings>(emptyAffiliate);
  const [whatsapp, setWhatsapp] = useState<WhatsAppSettings>(emptyWhatsApp);
  const [whatsappLoaded, setWhatsappLoaded] = useState(false);
  const [whatsappTesting, setWhatsappTesting] = useState(false);
  const [whatsappTokenVisible, setWhatsappTokenVisible] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(false);
  const [offerMonitorsLoaded, setOfferMonitorsLoaded] = useState(false);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [productTotals, setProductTotals] = useState<Record<string, number>>({});
  const [productSearch, setProductSearch] = useState("");
  const [productStatus, setProductStatus] = useState("all");
  const [catalogStore] = useState("mercadolivre");
  const [productsLoading, setProductsLoading] = useState(false);
  const [enrichingProductId, setEnrichingProductId] = useState("");
  const [productsError, setProductsError] = useState("");
  const [automationLogs, setAutomationLogs] = useState<AutomationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [webhookSettingUp, setWebhookSettingUp] = useState(false);
  const [webhookActive, setWebhookActive] = useState(false);
  const [buttonSettings, setButtonSettings] = useState<AutomationButtonSettings>(defaultAutomationButtons);
  const [buttonDraft, setButtonDraft] = useState("");
  const [buttonSettingsSaving, setButtonSettingsSaving] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogSearchStore] = useState<"mercadolivre" | "amazon">("mercadolivre");
  const [catalogSort, setCatalogSort] = useState("");
  const [catalogMinPrice, setCatalogMinPrice] = useState("");
  const [catalogMaxPrice, setCatalogMaxPrice] = useState("");
  const [catalogQuality, setCatalogQuality] = useState("all");
  const [catalogCategory, setCatalogCategory] = useState("");
  const [catalogSubcategory, setCatalogSubcategory] = useState("");
  const [mercadoLivreCategories, setMercadoLivreCategories] = useState<MercadoLivreCategory[]>([]);
  const [mercadoLivreSubcategories, setMercadoLivreSubcategories] = useState<MercadoLivreCategory[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogFilters, setCatalogFilters] = useState<unknown>(null);
  const [catalogSorts, setCatalogSorts] = useState<Array<string | { id: string; name: string }>>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogSearching, setCatalogSearching] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [catalogWarning, setCatalogWarning] = useState("");
  const [localCollectorUrl, setLocalCollectorUrl] = useState("http://127.0.0.1:8765");
  const [localCollectorToken, setLocalCollectorToken] = useState("");
  const [localCollectorInput, setLocalCollectorInput] = useState("https://www.mercadolivre.com.br/o-boticario-zaad-infinity-eau-de-parfum-95ml/up/MLBU4815336108");
  const [localCollectorConnected, setLocalCollectorConnected] = useState(false);
  const [localCollectorLoading, setLocalCollectorLoading] = useState(false);
  const [localCollectorError, setLocalCollectorError] = useState("");
  const [localCollectorResult, setLocalCollectorResult] = useState<LocalCollectorProduct | null>(null);
  const [managedCoupons, setManagedCoupons] = useState<ManagedCoupon[]>([]);
  const [couponDraft, setCouponDraft] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponRefreshing, setCouponRefreshing] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [prioritizeCouponProducts, setPrioritizeCouponProducts] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null);
  const [offerMessage, setOfferMessage] = useState("");
  const [offerDestination, setOfferDestination] = useState("");
  const [offerIncludeImage, setOfferIncludeImage] = useState(true);
  const [offerPreparing, setOfferPreparing] = useState(false);
  const [offerSending, setOfferSending] = useState(false);
  const [offerTemplate, setOfferTemplate] = useState(defaultOfferTemplate);
  const [offerTemplates, setOfferTemplates] = useState<OfferTemplatePreset[]>([{ id: "padrao", name: "Padrão", content: defaultOfferTemplate }]);
  const [activeOfferTemplateId, setActiveOfferTemplateId] = useState("padrao");
  const [offerTemplateName, setOfferTemplateName] = useState("Padrão");
  const [templateSavedAt, setTemplateSavedAt] = useState<string | null>(null);
  const [carouselEnabled, setCarouselEnabled] = useState(true);
  const [carouselButtonLabel, setCarouselButtonLabel] = useState("VER OFERTA");
  const [brandedPreviewEnabled, setBrandedPreviewEnabled] = useState(false);
  const [brandedPreviewStyle, setBrandedPreviewStyle] = useState<OfferPreviewStyle>("classic");
  const [aiCtaSettings, setAiCtaSettings] = useState<AiCtaSettings>(defaultAiCtaSettings);
  const [aiCtaConfigured, setAiCtaConfigured] = useState(false);
  const [aiCtaCacheEntries, setAiCtaCacheEntries] = useState(0);
  const [aiCtaTesting, setAiCtaTesting] = useState(false);
  const [aiCtaResetting, setAiCtaResetting] = useState(false);
  const [privateAssistantSettings, setPrivateAssistantSettings] = useState<PrivateAssistantSettings>(defaultPrivateAssistantSettings);
  const [privateAssistantConfigured, setPrivateAssistantConfigured] = useState(false);
  const [privateAssistantSaving, setPrivateAssistantSaving] = useState(false);
  const [promotionAiCta, setPromotionAiCta] = useState("");
  const [promotionUsesFullAiCopy, setPromotionUsesFullAiCopy] = useState(false);
  const [promotionInput, setPromotionInput] = useState("");
  const [promotionItem, setPromotionItem] = useState<CatalogItem | null>(null);
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [promotionRecordId, setPromotionRecordId] = useState("");
  const [promotionStore] = useState<"amazon" | "mercadolivre">("mercadolivre");
  const [promotionMessage, setPromotionMessage] = useState("");
  const [promotionIncludeImage, setPromotionIncludeImage] = useState(true);
  const [promotionGroups, setPromotionGroups] = useState<string[]>([]);
  const [promotionGroupSearch, setPromotionGroupSearch] = useState("");
  const [promotionPreviewStyle, setPromotionPreviewStyle] = useState<OfferPreviewStyle>("classic");
  const [promotionInstallmentOptions, setPromotionInstallmentOptions] = useState<{ enabled: boolean; text: string }>({ enabled: false, text: defaultInstallmentText });
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [promotionSending, setPromotionSending] = useState(false);
  const [promotionDataWarning, setPromotionDataWarning] = useState("");
  const [promotionAffiliateError, setPromotionAffiliateError] = useState("");
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [monitoringCategory, setMonitoringCategory] = useState("Geral");
  const [monitoringIntervalMinutes, setMonitoringIntervalMinutes] = useState("2");
  const [monitoringMinDiscount, setMonitoringMinDiscount] = useState("20");
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [monitoringError, setMonitoringError] = useState("");
  const [monitoringDeals, setMonitoringDeals] = useState<MonitoredDeal[]>([]);
  const [monitoringLastScan, setMonitoringLastScan] = useState<string | null>(null);
  const monitoringSeen = useRef(new Set<string>());
  const [affiliateHubOffers, setAffiliateHubOffers] = useState<AffiliateHubOffer[]>([]);
  const [affiliateHubVisibleCount, setAffiliateHubVisibleCount] = useState(48);
  const [affiliateHubLoading, setAffiliateHubLoading] = useState(false);
  const [affiliateHubError, setAffiliateHubError] = useState("");
  const [affiliateHubLastScan, setAffiliateHubLastScan] = useState<string | null>(null);
  const [affiliateHubAutoSend, setAffiliateHubAutoSend] = useState(false);
  const [affiliateHubInterval, setAffiliateHubInterval] = useState("5");
  const [affiliateHubDestination, setAffiliateHubDestination] = useState("");
  const [affiliateHubSentRevision, setAffiliateHubSentRevision] = useState(0);
  const affiliateHubRunning = useRef(false);
  const [offerMonitors, setOfferMonitors] = useState<OfferMonitor[]>(defaultOfferMonitors);
  const [activeOfferMonitorId, setActiveOfferMonitorId] = useState(defaultOfferMonitors[0].id);
  const [newNicheOpen, setNewNicheOpen] = useState(false);
  const [newNicheDraft, setNewNicheDraft] = useState({ name: "", url: "", destinationJid: "", dailyTarget: 8, minRating: 4.5, minDiscount: 20, maxPages: 10, showInstallments: false });
  const [monitorRuntimes, setMonitorRuntimes] = useState<Record<string, MonitorRuntime>>({});
  const [monitorActivity, setMonitorActivity] = useState<MonitorActivity[]>([]);
  const [monitorStatuses, setMonitorStatuses] = useState<Record<string, MonitorStatus>>({});
  const [automationCoordinator, setAutomationCoordinator] = useState<"checking" | "leader" | "follower" | "offline">("checking");
  const [monitorScheduleRevision, setMonitorScheduleRevision] = useState(0);
  const [scheduleDraft, setScheduleDraft] = useState({ dailyTarget: 20, sendStartTime: "07:00", sendEndTime: "00:00" });
  const [aiHomeTestPreview, setAiHomeTestPreview] = useState("");
  const [aiHomeTestLoading, setAiHomeTestLoading] = useState(false);
  const offerMonitorRunning = useRef(new Set<string>());
  const offerMonitorQueued = useRef(new Set<string>());
  const offerMonitorQueue = useRef<Promise<void>>(Promise.resolve());
  const automationOwnerId = useRef("");
  const monitorRuntimesRef = useRef<Record<string, MonitorRuntime>>({});
  const [sendSummary, setSendSummary] = useState<SendSummary[]>([]);
  const [sendHistory, setSendHistory] = useState<SendHistoryRow[]>([]);
  const [sendHistoryLoading, setSendHistoryLoading] = useState(false);
  const [catalogedProducts, setCatalogedProducts] = useState<CatalogedProduct[]>([]);
  const [catalogedCategories, setCatalogedCategories] = useState<Array<{ category: string; total: number }>>([]);
  const [catalogedStats, setCatalogedStats] = useState<CatalogedStats>({ total: 0, categoryCount: 0, withPrice: 0, withDiscount: 0, withFreeShipping: 0, historyPoints: 0 });
  const [catalogedSearch, setCatalogedSearch] = useState("");
  const [catalogedCategory, setCatalogedCategory] = useState("Todas");
  const [catalogedLoading, setCatalogedLoading] = useState(false);
  const [catalogedSelected, setCatalogedSelected] = useState<CatalogedProduct | null>(null);
  const [catalogedPriceHistory, setCatalogedPriceHistory] = useState<Array<{ price: number | null; originalPrice: number | null; observedAt: string }>>([]);
  const [rankedProducts, setRankedProducts] = useState<RankedProduct[]>([]);
  const [rankingStats, setRankingStats] = useState<RankingStats>({ totalDrops: 0, historicalLows: 0, averageDrop: 0, biggestDrop: 0 });
  const [rankingCategory, setRankingCategory] = useState("Todas");
  const [rankingSearch, setRankingSearch] = useState("");
  const [rankingLoading, setRankingLoading] = useState(false);
  const [verificationBatchSize, setVerificationBatchSize] = useState<1 | 5>(5);
  const [catalogVerification, setCatalogVerification] = useState<CatalogVerificationState>({ running: false, paused: false, total: 0, completed: 0, updated: 0, failed: 0, currentTitle: "", message: "" });
  const catalogVerificationControl = useRef({ stop: false });
  const catalogVerificationResumeIndex = useRef(0);
  const [catalogCredentials, setCatalogCredentials] = useState({ mercadoLivreConfigured: false, mercadoLivreAppConfigured: false, mercadoLivreExpiresAt: null as string | null, mercadoLivreUserId: null as string | null });
  const [mercadoLivreAccessToken, setMercadoLivreAccessToken] = useState("");
  const [mercadoLivreClientId, setMercadoLivreClientId] = useState("1038957964690859");
  const [mercadoLivreClientSecret, setMercadoLivreClientSecret] = useState("");
  const [mercadoLivreConnecting, setMercadoLivreConnecting] = useState(false);
  const [catalogCredentialsSaving, setCatalogCredentialsSaving] = useState(false);
  const [mlApiProductInput, setMlApiProductInput] = useState("");
  const [mlApiProductLoading, setMlApiProductLoading] = useState(false);
  const [mlApiProductError, setMlApiProductError] = useState("");
  const [mlApiProductResult, setMlApiProductResult] = useState<MercadoLivreApiLookup | null>(null);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const groupsRequest = whatsapp.instanceToken.trim()
        ? fetch("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serverUrl: whatsapp.serverUrl, token: whatsapp.instanceToken, search }) })
        : fetch("/api/groups");
      const [groupsResponse, configResponse, affiliateResponse, buttonResponse] = await Promise.all([
        groupsRequest,
        fetch("/api/config"),
        fetch("/api/affiliate"),
        fetch("/api/automation/buttons"),
      ]);
      const groupsData = await groupsResponse.json() as { groups?: Group[]; demo?: boolean; connected?: boolean; error?: string };
      const configData = await configResponse.json() as { configs?: GroupConfig[] };
      const affiliateData = await affiliateResponse.json() as { settings?: Partial<AffiliateSettings> };
      const buttonData = await buttonResponse.json() as { settings?: Partial<AutomationButtonSettings> };
      setAffiliate({ ...emptyAffiliate, ...(affiliateData.settings || {}), amazonTrackingId: "", amazonEnabled: false, mercadoLivreEnabled: Boolean(affiliateData.settings?.mercadoLivreEnabled) });
      setButtonSettings({
        enabled: Boolean(buttonData.settings?.enabled ?? true),
        labels: Array.isArray(buttonData.settings?.labels) && buttonData.settings.labels.length ? buttonData.settings.labels : defaultAutomationButtons.labels,
      });
      if (!groupsResponse.ok) throw new Error(groupsData.error || "Não foi possível carregar os grupos.");
      const nextGroups = groupsData.groups || [];
      const saved = new Map<string, GroupConfig>((configData.configs || []).map((item: GroupConfig) => [item.jid, item]));
      const merged: Record<string, GroupConfig> = {};
      for (const group of nextGroups) {
        const item = saved.get(group.JID);
        merged[group.JID] = item ? { ...item, enabled: Boolean(item.enabled), destinationJid: item.destinationJid || "" } : {
          jid: group.JID,
          name: group.Name || group.JID,
          role: "ignored",
          category: "geral",
          destinationJid: "",
          enabled: false,
        };
      }
      setGroups(nextGroups);
      setWhatsappConnected(Boolean(groupsData.connected));
      setConfigs(merged);
      setDemo(Boolean(groupsData.demo));
    } catch (caught) {
      setWhatsappConnected(false);
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar o painel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const saved = window.localStorage.getItem("promozap.whatsapp.settings.v1");
    if (saved) {
      try { setWhatsapp({ ...emptyWhatsApp, ...JSON.parse(saved) as Partial<WhatsAppSettings> }); } catch {}
    }
    setWhatsappLoaded(true);
  }, []);

  useEffect(() => {
    const savedUrl = window.localStorage.getItem("promozap.localCollectorUrl");
    const savedToken = window.localStorage.getItem("promozap.localCollectorToken");
    const savedTemplate = window.localStorage.getItem("promozap.offerTemplate.v1");
    const savedTemplates = window.localStorage.getItem("promozap.offerTemplates.v2");
    const savedActiveTemplate = window.localStorage.getItem("promozap.offerTemplates.active.v2");
    const savedCarouselEnabled = window.localStorage.getItem("promozap.carousel.enabled.v1");
    const savedCarouselButton = window.localStorage.getItem("promozap.carousel.buttonLabel.v1");
    const savedBrandedPreview = window.localStorage.getItem("descontex.brandedPreview.enabled.v1");
    const savedBrandedPreviewStyle = window.localStorage.getItem("descontex.brandedPreview.style.v1") as OfferPreviewStyle | null;
    const savedAiCtaSettings = window.localStorage.getItem("achadex.aiCta.settings.v1");
    const savedHubSettings = window.localStorage.getItem("promozap.affiliateHub.settings.v1");
    const savedOfferMonitors = window.localStorage.getItem("promozap.offerMonitors.v1");
    const savedOfferCache = window.localStorage.getItem(OFFER_CACHE_KEY);
    const savedCoupons = window.localStorage.getItem("descontex.coupons.v1");
    const savedCouponPriority = window.localStorage.getItem("descontex.coupons.prioritize.v1");
    const savedMonitorActivity = window.localStorage.getItem("promozap.monitor.activity.v1");
    window.localStorage.removeItem("promozap.ml.sessionCookies.v1");
    if (savedUrl) setLocalCollectorUrl(savedUrl);
    if (savedToken) setLocalCollectorToken(savedToken);
    if (savedCoupons) {
      try {
        const parsed = JSON.parse(savedCoupons) as ManagedCoupon[];
        if (Array.isArray(parsed)) setManagedCoupons(parsed.filter((coupon) => coupon?.code));
      } catch {}
    }
    setPrioritizeCouponProducts(savedCouponPriority === "true");
    if (savedMonitorActivity) {
      try {
        const parsed = JSON.parse(savedMonitorActivity) as MonitorActivity[];
        if (Array.isArray(parsed)) setMonitorActivity(parsed.slice(0, 80));
      } catch {}
    }
    let initialTemplates: OfferTemplatePreset[] = [{ id: "padrao", name: "Padrão", content: savedTemplate || defaultOfferTemplate }];
    if (savedTemplates) {
      try {
        const parsed = JSON.parse(savedTemplates) as OfferTemplatePreset[];
        const valid = Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === "string" && typeof item.name === "string" && typeof item.content === "string").slice(0, 10) : [];
        if (valid.length) initialTemplates = valid;
      } catch {}
    }
    const initialActive = initialTemplates.find((item) => item.id === savedActiveTemplate) || initialTemplates[0];
    setOfferTemplates(initialTemplates);
    setActiveOfferTemplateId(initialActive.id);
    setOfferTemplateName(initialActive.name);
    setOfferTemplate(initialActive.content);
    if (savedCarouselEnabled === "false") setCarouselEnabled(false);
    if (savedCarouselButton?.trim()) setCarouselButtonLabel(savedCarouselButton.trim().slice(0, 25));
    if (savedBrandedPreview === "true") setBrandedPreviewEnabled(true);
    if (savedBrandedPreviewStyle === "classic" || savedBrandedPreviewStyle === "focus") setBrandedPreviewStyle(savedBrandedPreviewStyle);
    if (savedAiCtaSettings) {
      try {
        const parsed = JSON.parse(savedAiCtaSettings) as Partial<AiCtaSettings>;
        const migratedMaxWords = Number(parsed.maxWords) === 9 ? 10 : Number(parsed.maxWords);
        setAiCtaSettings({ ...defaultAiCtaSettings, ...parsed, maxWords: Math.max(4, Math.min(15, migratedMaxWords || defaultAiCtaSettings.maxWords)) });
      } catch {}
    }
    void fetch("/api/ai/cta", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { configured?: boolean; cacheEntries?: number };
      setAiCtaConfigured(Boolean(response.ok && result.configured));
      setAiCtaCacheEntries(Number(result.cacheEntries) || 0);
    }).catch(() => setAiCtaConfigured(false));
    void fetch("/api/automation/private-assistant", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { configured?: boolean; settings?: Partial<PrivateAssistantSettings> };
      setPrivateAssistantConfigured(Boolean(response.ok && result.configured));
      if (result.settings) setPrivateAssistantSettings({ ...defaultPrivateAssistantSettings, ...result.settings });
    }).catch(() => setPrivateAssistantConfigured(false));
    if (savedHubSettings) {
      try {
        const settings = JSON.parse(savedHubSettings) as { interval?: string; destination?: string };
        if (settings.interval) setAffiliateHubInterval(settings.interval);
        if (settings.destination) setAffiliateHubDestination(settings.destination);
      } catch {}
    }
    if (savedOfferMonitors) {
      try {
        const parsed = JSON.parse(savedOfferMonitors) as OfferMonitor[];
        const valid = Array.isArray(parsed) ? parsed
          .filter((item) => item?.id && item?.name && Array.isArray(item.sources))
          .map((item) => {
            const preset = defaultOfferMonitors.find((candidate) => candidate.id === item.id);
            const scheduleDefaults = preset || { dailyTarget: 8, sendStartTime: "07:00", sendEndTime: "00:00", scheduleEnabled: true, minimumSpacingMinutes: 20, showInstallments: false, installmentText: defaultInstallmentText };
            const merged = {
              ...scheduleDefaults,
              ...item,
              sendStartTime: item.sendStartTime || legacyHourToTime(item.sendStartHour, "07:00"),
              sendEndTime: item.sendEndTime || legacyHourToTime(item.sendEndHour, "00:00"),
              scheduleEnabled: item.scheduleEnabled !== false,
              aiCtaEnabled: item.aiCtaEnabled !== false,
              showInstallments: item.showInstallments ?? preset?.showInstallments ?? false,
              installmentText: item.installmentText || preset?.installmentText || defaultInstallmentText,
            } as OfferMonitor;
            return merged.id === "geral-hub" && Number(merged.minDiscount) < 10 ? { ...merged, minDiscount: 10 } : merged;
          }) : [];
        if (valid.length) {
          const missingDefaults = defaultOfferMonitors.filter((preset) => !valid.some((item) => item.id === preset.id));
          const merged = [...valid, ...missingDefaults];
          setOfferMonitors(merged);
          setActiveOfferMonitorId(merged[0].id);
        }
      } catch {}
    }
    if (savedOfferCache) {
      try {
        const parsed = JSON.parse(savedOfferCache) as Record<string, Partial<MonitorRuntime>>;
        const restored: Record<string, MonitorRuntime> = {};
        for (const [monitorId, cached] of Object.entries(parsed || {})) {
          const offers = Array.isArray(cached.offers) ? cached.offers.slice(0, OFFER_CACHE_MAX_PER_MONITOR) : [];
          if (!offers.length) continue;
          restored[monitorId] = {
            offers,
            loading: false,
            error: "",
            lastScan: typeof cached.lastScan === "string" ? cached.lastScan : null,
            selectedSource: typeof cached.selectedSource === "string" ? cached.selectedSource : undefined,
          };
        }
        setMonitorRuntimes(restored);
      } catch {}
    }
    setOfferMonitorsLoaded(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("promozap.affiliateHub.settings.v1", JSON.stringify({ interval: affiliateHubInterval, destination: affiliateHubDestination }));
  }, [affiliateHubInterval, affiliateHubDestination]);

  useEffect(() => {
    if (!offerMonitorsLoaded) return;
    window.localStorage.setItem("promozap.offerMonitors.v1", JSON.stringify(offerMonitors));
  }, [offerMonitors, offerMonitorsLoaded]);

  useEffect(() => {
    if (!offerMonitorsLoaded) return;
    const cache = Object.fromEntries(Object.entries(monitorRuntimes)
      .filter(([, runtime]) => runtime.offers.length)
      .map(([monitorId, runtime]) => [monitorId, {
        offers: runtime.offers.slice(0, OFFER_CACHE_MAX_PER_MONITOR),
        lastScan: runtime.lastScan,
        selectedSource: runtime.selectedSource,
      }]));
    try { window.localStorage.setItem(OFFER_CACHE_KEY, JSON.stringify(cache)); } catch {}
  }, [monitorRuntimes, offerMonitorsLoaded]);

  useEffect(() => {
    window.localStorage.setItem("descontex.coupons.v1", JSON.stringify(managedCoupons));
  }, [managedCoupons]);

  useEffect(() => {
    window.localStorage.setItem("descontex.coupons.prioritize.v1", String(prioritizeCouponProducts));
  }, [prioritizeCouponProducts]);

  useEffect(() => {
    monitorRuntimesRef.current = monitorRuntimes;
  }, [monitorRuntimes]);

  useEffect(() => {
    if (!whatsappLoaded) return;
    window.localStorage.setItem("promozap.whatsapp.settings.v1", JSON.stringify(whatsapp));
  }, [whatsapp, whatsappLoaded]);

  useEffect(() => { if (whatsappLoaded) void loadData(); }, [whatsappLoaded]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool || groups.length === 0) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: "configure_group_route",
      title: "Configurar rota de grupo",
      description: "Define um grupo existente como fonte, destino ou ignorado e atualiza sua categoria no painel.",
      inputSchema: {
        type: "object",
        properties: {
          jid: { type: "string" },
          role: { type: "string", enum: ["source", "destination", "ignored"] },
          category: { type: "string", enum: categories.map(([value]) => value) },
          destinationJid: { type: "string" },
        },
        required: ["jid", "role", "category"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        const value = input as Partial<GroupConfig>;
        const group = groups.find((item) => item.JID === value.jid);
        if (!group || !["source", "destination", "ignored"].includes(value.role || "")) throw new Error("Grupo ou função inválida.");
        const next: GroupConfig = {
          ...configs[group.JID],
          role: value.role as Role,
          category: value.category || "geral",
          destinationJid: value.destinationJid || "",
          enabled: value.role !== "ignored",
        };
        setConfigs((current) => ({ ...current, [group.JID]: next }));
        return { jid: group.JID, name: group.Name, role: next.role, category: next.category, destinationJid: next.destinationJid };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [groups, configs]);

  const destinationGroups = useMemo(() => groups.filter((group) => configs[group.JID]?.role === "destination"), [groups, configs]);
  const filteredPromotionGroups = useMemo(() => {
    const value = promotionGroupSearch.trim().toLowerCase();
    return value ? destinationGroups.filter((group) => `${group.Name} ${group.JID}`.toLowerCase().includes(value)) : destinationGroups;
  }, [destinationGroups, promotionGroupSearch]);
  const filteredGroups = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return groups;
    return groups.filter((group) => `${group.Name} ${group.Topic || ""} ${group.JID}`.toLowerCase().includes(value));
  }, [groups, search]);

  const stats = useMemo(() => ({
    sources: Object.values(configs).filter((item) => item.role === "source" && item.enabled).length,
    destinations: Object.values(configs).filter((item) => item.role === "destination").length,
    routes: Object.values(configs).filter((item) => item.role === "source" && item.destinationJid).length,
  }), [configs]);
  const statItems = [
    { value: stats.sources, label: "fontes ativas", Icon: Activity },
    { value: stats.destinations, label: "meus grupos", Icon: MessageCircleMore },
    { value: stats.routes, label: "rotas prontas", Icon: ArrowRight },
  ];
  const productStatItems = [
    { value: products.length, label: "produtos no histórico", Icon: PackageSearch },
    { value: productTotals.converted || 0, label: "links convertidos", Icon: Link2 },
    { value: productTotals.sent || 0, label: "ofertas enviadas", Icon: Send },
  ];
  const promotionStatItems = [
    { value: promotionItem ? 1 : 0, label: "promoção preparada", Icon: Sparkles },
    { value: promotionGroups.length, label: "grupos selecionados", Icon: UsersRound },
    { value: promotionItem?.imageUrl && promotionIncludeImage ? 1 : 0, label: "foto no envio", Icon: ShoppingBag },
  ];
  const catalogProducts = useMemo(() => products.filter((product) =>
    product.status === "sent"
    && product.store === "mercadolivre"
  ), [products, catalogStore]);
  const catalogStatItems = [
    { value: catalogProducts.length, label: "produtos enviados", Icon: Database },
    { value: catalogProducts.filter((product) => product.store === "mercadolivre").length, label: "Mercado Livre", Icon: ShoppingBag },
    { value: catalogProducts.filter((product) => Boolean(product.productDataJson)).length, label: "com dados completos", Icon: PackageSearch },
  ];
  const discoveryStatItems = [
    { value: catalogItems.length, label: "resultados exibidos", Icon: Search },
    { value: catalogTotal, label: "produtos encontrados", Icon: PackageSearch },
    { value: catalogSorts.length, label: "ordenações disponíveis", Icon: Settings2 },
  ];
  function patchConfig(jid: string, patch: Partial<GroupConfig>) {
    setConfigs((current) => ({ ...current, [jid]: { ...current[jid], ...patch } }));
  }

  async function saveGroups() {
    setSaving(true);
    try {
      const response = await fetch("/api/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ configs: Object.values(configs) }) });
      if (!response.ok) throw new Error();
      toast.success("Organização dos grupos salva.");
    } catch {
      toast.error("Não foi possível salvar os grupos.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAffiliate() {
    setSaving(true);
    try {
      const response = await fetch("/api/affiliate", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...affiliate, amazonTrackingId: "", amazonEnabled: false }) });
      if (!response.ok) throw new Error();
      toast.success("Configurações de afiliado salvas.");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Não foi possível salvar as configurações.");
    } finally {
      setSaving(false);
    }
  }

  async function loadProducts() {
    setProductsLoading(true);
    setProductsError("");
    try {
      const params = new URLSearchParams();
      params.set("store", "mercadolivre");
      const requestedStatus = activeTab === "catalog" ? "sent" : productStatus;
      if (requestedStatus !== "all") params.set("status", requestedStatus);
      if (productSearch.trim()) params.set("search", productSearch.trim());
      const response = await fetch(`/api/products?${params.toString()}`);
      const result = await response.json() as { products?: ProductRecord[]; totals?: Record<string, number>; error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar os produtos.");
      setProducts(result.products || []);
      setProductTotals(result.totals || {});
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Não foi possível carregar os produtos.";
      setProductsError(message);
      toast.error(message);
    } finally {
      setProductsLoading(false);
    }
  }

  async function loadAutomationLogs() {
    setLogsLoading(true);
    try {
      const response = await fetch("/api/logs?limit=150", { cache: "no-store" });
      const result = await response.json() as { logs?: AutomationLog[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar os logs.");
      setAutomationLogs(result.logs || []);
    } catch (caught) {
      if (activeTab === "logs") toast.error(caught instanceof Error ? caught.message : "Não foi possível carregar os logs.");
    } finally {
      setLogsLoading(false);
    }
  }

  async function setupUazapiWebhook(showToast = true) {
    setWebhookSettingUp(true);
    try {
      const response = await fetch("/api/automation/uazapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverUrl: whatsapp.serverUrl, token: whatsapp.instanceToken }),
      });
      const result = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message || "A UAZAPI recusou o webhook.");
      setWebhookActive(true);
      if (showToast) toast.success("Automação ativada na UAZAPI.");
      await loadAutomationLogs();
    } catch (caught) {
      setWebhookActive(false);
      if (showToast) toast.error(caught instanceof Error ? caught.message : "Não foi possível ativar o webhook.");
    } finally {
      setWebhookSettingUp(false);
    }
  }

  function addButtonLabel() {
    const label = buttonDraft.trim().replace(/\s+/g, " ");
    if (label.length < 2) return toast.error("Digite um texto para o botão.");
    if (label.length > 25) return toast.error("Use no máximo 25 caracteres.");
    if (label.includes("|")) return toast.error("O texto não pode conter o caractere |.");
    if (buttonSettings.labels.length >= 8) return toast.error("Você pode cadastrar até 8 opções.");
    if (buttonSettings.labels.some((item) => item.toLocaleUpperCase("pt-BR") === label.toLocaleUpperCase("pt-BR"))) return toast.error("Essa opção já foi adicionada.");
    setButtonSettings((current) => ({ ...current, labels: [...current.labels, label] }));
    setButtonDraft("");
  }

  async function saveButtonSettings() {
    if (!whatsapp.instanceToken.trim()) return toast.error("Informe o token da UAZAPI para autorizar o salvamento.");
    if (buttonSettings.enabled && buttonSettings.labels.length === 0) return toast.error("Adicione pelo menos uma opção de botão.");
    setButtonSettingsSaving(true);
    try {
      const response = await fetch("/api/automation/buttons", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Promozap-Admin-Token": whatsapp.instanceToken.trim() },
        body: JSON.stringify(buttonSettings),
      });
      const result = await response.json() as { error?: string; settings?: AutomationButtonSettings };
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar os botões.");
      if (result.settings) setButtonSettings(result.settings);
      toast.success("Botões de compra salvos para a automação.");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Não foi possível salvar os botões.");
    } finally {
      setButtonSettingsSaving(false);
    }
  }

  async function loadCatalogCredentialStatus() {
    try {
      const response = await fetch("/api/catalog/credentials");
      const result = await response.json() as typeof catalogCredentials;
      if (response.ok) setCatalogCredentials(result);
    } catch {}
  }

  async function saveCatalogCredentials() {
    if (!whatsapp.instanceToken.trim()) return toast.error("Informe o token da UAZAPI para autorizar o salvamento seguro.");
    setCatalogCredentialsSaving(true);
    try {
      const response = await fetch("/api/catalog/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Promozap-Admin-Token": whatsapp.instanceToken.trim() },
        body: JSON.stringify({ mercadoLivreClientId, mercadoLivreClientSecret, mercadoLivreAccessToken }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar as credenciais.");
      setMercadoLivreAccessToken("");
      setMercadoLivreClientSecret("");
      await loadCatalogCredentialStatus();
      toast.success("Credenciais de catálogo salvas com criptografia.");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Não foi possível salvar as credenciais.");
    } finally {
      setCatalogCredentialsSaving(false);
    }
  }

  async function connectMercadoLivre() {
    if (!whatsapp.instanceToken.trim()) return toast.error("Informe o token da UAZAPI para autorizar a conexão.");
    setMercadoLivreConnecting(true);
    try {
      if (mercadoLivreClientId.trim() || mercadoLivreClientSecret.trim()) {
        const saveResponse = await fetch("/api/catalog/credentials", {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-Promozap-Admin-Token": whatsapp.instanceToken.trim() },
          body: JSON.stringify({ mercadoLivreClientId, mercadoLivreClientSecret }),
        });
        const saved = await saveResponse.json() as { error?: string };
        if (!saveResponse.ok) throw new Error(saved.error || "Não foi possível salvar as credenciais do aplicativo.");
        setMercadoLivreClientSecret("");
      }
      const response = await fetch("/api/oauth/mercadolivre/start", {
        method: "POST",
        headers: { "X-Promozap-Admin-Token": whatsapp.instanceToken.trim() },
      });
      const result = await response.json() as { authorizationUrl?: string; error?: string };
      if (!response.ok || !result.authorizationUrl) throw new Error(result.error || "Não foi possível iniciar a autorização.");
      window.location.href = result.authorizationUrl;
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Não foi possível conectar o Mercado Livre.");
      setMercadoLivreConnecting(false);
    }
  }

  async function searchCatalog() {
    setCatalogSearching(true);
    setCatalogError("");
      setCatalogWarning("");
    try {
      const params = new URLSearchParams({ store: catalogSearchStore });
      if (catalogQuery.trim()) params.set("q", catalogQuery.trim());
      if (catalogSort) params.set("sort", catalogSort);
      if (catalogMinPrice) params.set("minPrice", catalogMinPrice);
      if (catalogMaxPrice) params.set("maxPrice", catalogMaxPrice);
      if (catalogQuality) params.set("quality", catalogQuality);
      const selectedCategory = mercadoLivreSubcategories.find((category) => category.id === catalogSubcategory)
        || mercadoLivreCategories.find((category) => category.id === catalogCategory);
      if (selectedCategory) params.set("q", `${selectedCategory.name} ${catalogQuery.trim()}`.trim());
      const response = await fetch(`/api/catalog/search?${params}`);
      const result = await response.json() as CatalogSearchResponse;
      if (!response.ok) throw new Error(result.error || "Não foi possível consultar os produtos.");
      setCatalogItems(result.items || []);
      setCatalogFilters(result.filters || null);
      setCatalogSorts(result.sorts || []);
      setCatalogTotal(result.total || 0);
      setCatalogWarning(result.warning || "");
      if (!catalogQuery.trim() && result.query) setCatalogQuery(result.query);
    } catch (caught) {
      setCatalogItems([]);
      setCatalogFilters(null);
      setCatalogWarning("");
      setCatalogError(caught instanceof Error ? caught.message : "Não foi possível consultar os produtos.");
    } finally {
      setCatalogSearching(false);
    }
  }

  async function lookupMercadoLivreApiProduct() {
    if (!mlApiProductInput.trim()) return toast.error("Informe um ID MLB ou cole o link do produto.");
    if (!whatsapp.instanceToken.trim()) return toast.error("Informe o token da UAZAPI em Credenciais para autorizar a consulta.");
    setMlApiProductLoading(true);
    setMlApiProductError("");
    setMlApiProductResult(null);
    try {
      const response = await fetch(`/api/catalog/mercadolivre-product?id=${encodeURIComponent(mlApiProductInput.trim())}`, {
        headers: { "X-Promozap-Admin-Token": whatsapp.instanceToken.trim() },
        cache: "no-store",
      });
      const result = await response.json() as MercadoLivreApiLookup & { error?: string };
      if (!response.ok || !result.product) throw new Error(result.error || "A API não retornou o produto.");
      setMlApiProductResult(result);
      toast.success("Produto consultado na API oficial do Mercado Livre.");
    } catch (caught) {
      setMlApiProductError(caught instanceof Error ? caught.message : "Não foi possível consultar o produto.");
    } finally {
      setMlApiProductLoading(false);
    }
  }

  async function checkLocalCollector(showToast = false) {
    try {
      const response = await fetch(`${localCollectorUrl.replace(/\/$/, "")}/health`, { cache: "no-store" });
      const result = await response.json() as { ok?: boolean };
      const connected = response.ok && Boolean(result.ok);
      setLocalCollectorConnected(connected);
      if (showToast) connected ? toast.success("Coletor local conectado.") : toast.error("O coletor local não respondeu.");
      return connected;
    } catch {
      setLocalCollectorConnected(false);
      if (showToast) toast.error("Abra o arquivo iniciar-coletor.cmd no seu computador e tente novamente.");
      return false;
    }
  }

  function localProductToCatalog(product: LocalCollectorProduct): CatalogItem {
    const raw = product as unknown as Record<string, unknown>;
    const attributes = (product.attributes || []).map((attribute) => ({ ...attribute }));
    if (product.standardPrice != null) attributes.unshift({ name: "Preço normal", value_name: formatMoney(product.standardPrice, product.currency || "BRL") });
    if (product.pixPrice != null) attributes.unshift({ name: "Preço no Pix", value_name: formatMoney(product.pixPrice, product.currency || "BRL") });
    if (product.coupon?.price != null) attributes.unshift({ name: "Preço com cupom", value_name: formatMoney(product.coupon.price, product.currency || "BRL") });
    const currentPrice = product.coupon?.price ?? product.pixPrice ?? product.price ?? product.standardPrice;
    const calculatedDiscount = currentPrice != null && product.originalPrice != null && product.originalPrice > currentPrice
      ? Math.round((1 - currentPrice / product.originalPrice) * 100)
      : 0;
    const claimedDiscount = Number(product.discountPercentage) || 0;
    const safeDiscount = calculatedDiscount > 0 && calculatedDiscount < 100
      ? calculatedDiscount
      : claimedDiscount > 0 && claimedDiscount <= 90 && /%\s*OFF/i.test(product.discountText || "") ? claimedDiscount : 0;
    return {
      id: product.itemId || product.userProductId || crypto.randomUUID(),
      itemId: product.itemId,
      catalogProductId: product.userProductId,
      title: product.title || "Produto do Mercado Livre",
      imageUrl: product.imageUrl,
      url: product.canonicalUrl || product.url,
      price: currentPrice,
      originalPrice: product.originalPrice,
      currency: product.currency || "BRL",
      brand: product.brand,
      condition: product.condition,
      availability: product.availability,
      availableQuantity: product.availableQuantity,
      soldQuantity: null,
      freeShipping: product.freeShipping,
      seller: product.seller,
      officialStore: product.officialStore,
      discountPercentage: safeDiscount,
      installments: product.installments,
      attributes,
      pictures: (product.images || []).map((url) => ({ url })),
      promotionType: product.coupon ? "Cupom disponível" : product.discountPercentage ? "Desconto na página" : null,
      priceSource: "marketplace_page",
      priceUpdatedAt: product.capturedAt,
      coupon: product.coupon || null,
      source: "web_search",
      priceHistory: product.priceHistory || [],
      reviews: product.reviews || [],
      reviewsTotal: product.reviewsTotal || null,
      raw,
    };
  }

  async function collectProductFromBrowser() {
    if (!localCollectorInput.trim()) return toast.error("Cole a URL do produto ou um código MLB.");
    if (!localCollectorToken.trim()) return toast.error("Cole o token exibido pela janela do coletor local.");
    setLocalCollectorLoading(true);
    setLocalCollectorError("");
    setLocalCollectorResult(null);
    localStorage.setItem("promozap.localCollectorUrl", localCollectorUrl);
    localStorage.setItem("promozap.localCollectorToken", localCollectorToken);
    try {
      const result = await retryOnce(async () => {
        const response = await fetch(`${localCollectorUrl.replace(/\/$/, "")}/scrape`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Promozap-Local-Token": localCollectorToken.trim() },
          body: JSON.stringify({ input: localCollectorInput.trim(), managedCoupons: managedCoupons.filter((coupon) => coupon.active) }),
        });
        const value = await response.json() as { ok?: boolean; product?: LocalCollectorProduct; error?: string };
        if (!response.ok || !value.product?.ok) throw new Error(value.product?.userActionMessage || value.error || "Não foi possível extrair esse produto.");
        return value;
      });
      setLocalCollectorConnected(true);
      setLocalCollectorResult(result.product);
      const item = localProductToCatalog(result.product);
      setCatalogItems([item]);
      setCatalogTotal(1);
      setCatalogWarning("");
      setSelectedCatalogItem(item);
      setOfferIncludeImage(Boolean(item.imageUrl));
      setOfferMessage(composeOfferMessage(item));
      toast.success("Produto lido diretamente da página do Mercado Livre.");
    } catch (caught) {
      setLocalCollectorConnected(false);
      const message = caught instanceof Error ? caught.message : "Não foi possível falar com o coletor local.";
      setLocalCollectorError(`${message} Se o navegador pedir acesso à rede local, clique em Permitir.`);
    } finally {
      setLocalCollectorLoading(false);
    }
  }

  async function loadMercadoLivreCategories(parent = "") {
    try {
      const response = await fetch(`/api/catalog/mercadolivre-categories${parent ? `?parent=${encodeURIComponent(parent)}` : ""}`);
      const result = await response.json() as { categories?: MercadoLivreCategory[] };
      if (!response.ok) return;
      if (parent) setMercadoLivreSubcategories(result.categories || []);
      else setMercadoLivreCategories(result.categories || []);
    } catch {
      // A busca continua utilizável mesmo se a árvore oficial estiver indisponível.
    }
  }

  async function collectorAuth() {
    const base = localCollectorUrl.replace(/\/$/, "");
    let token = localCollectorToken.trim();
    if (!token) {
      const sessionResponse = await fetch(`${base}/session`, { cache: "no-store" });
      const session = await sessionResponse.json() as { token?: string; error?: string };
      if (!sessionResponse.ok || !session.token) throw new Error(session.error || "Não foi possível obter a sessão do coletor.");
      token = session.token;
      setLocalCollectorToken(token);
      window.localStorage.setItem("promozap.localCollectorToken", token);
    }
    return { base, token };
  }

  function mergeManagedCoupons(incoming: ManagedCoupon[]) {
    setManagedCoupons((current) => {
      const merged = new Map(current.map((coupon) => [coupon.code.toUpperCase(), coupon]));
      for (const coupon of incoming) {
        const key = coupon.code.toUpperCase();
        merged.set(key, { ...merged.get(key), ...coupon, code: key, active: merged.get(key)?.active ?? coupon.active ?? true });
      }
      return [...merged.values()].sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
    });
  }

  async function applyManagedCoupon() {
    const code = couponDraft.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,30}$/.test(code)) return setCouponError("Digite um código de cupom válido.");
    setCouponApplying(true);
    setCouponError("");
    try {
      const { base, token } = await collectorAuth();
      const response = await fetch(`${base}/coupons/apply`, { method: "POST", headers: { "Content-Type": "application/json", "X-Promozap-Local-Token": token }, body: JSON.stringify({ code }) });
      const result = await response.json() as { coupon?: ManagedCoupon; coupons?: ManagedCoupon[]; confirmationMessage?: string; error?: string };
      if (!response.ok || !result.coupon) throw new Error(result.error || "O Mercado Livre não confirmou a aplicação do cupom.");
      mergeManagedCoupons([result.coupon, ...(result.coupons || [])]);
      setCouponDraft("");
      toast.success(result.confirmationMessage || `Cupom ${code} aplicado e salvo.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Não foi possível aplicar o cupom.";
      setCouponError(message);
      toast.error(message);
    } finally { setCouponApplying(false); }
  }

  async function refreshManagedCoupons() {
    setCouponRefreshing(true);
    setCouponError("");
    try {
      const { base, token } = await collectorAuth();
      const response = await fetch(`${base}/coupons/scan`, { method: "POST", headers: { "Content-Type": "application/json", "X-Promozap-Local-Token": token }, body: "{}" });
      const result = await response.json() as { coupons?: ManagedCoupon[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar os cupons.");
      mergeManagedCoupons(result.coupons || []);
      toast.success(`${result.coupons?.length || 0} cupom(ns) encontrado(s) na conta.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Não foi possível atualizar os cupons.";
      setCouponError(message);
      toast.error(message);
    } finally { setCouponRefreshing(false); }
  }

  function composeOfferMessage(item: CatalogItem, link = item.url || "", storeOverride?: "mercadolivre", aiCta = "", installmentOptions: { enabled?: boolean; text?: string } = {}) {
    void storeOverride;
    const currency = item.currency || "BRL";
    const currentPrice = item.price != null ? formatMoney(item.price, currency) : "Consulte o preço no link";
    const hasPreviousPrice = Boolean(item.originalPrice && item.price && item.originalPrice > item.price);
    const previousPrice = hasPreviousPrice ? formatMoney(item.originalPrice, currency) : "";
    const savings = hasPreviousPrice ? formatMoney((item.originalPrice || 0) - (item.price || 0), currency) : "";
    const shipping = [item.freeShipping ? "Frete grátis" : "", item.full ? "Envio Full" : ""].filter(Boolean).join(" · ");
    const installmentDetails = productInstallmentDetails(item);
    const installmentLine = installmentOptions.enabled ? renderInstallmentText(item, installmentOptions.text) : "";
    const coupon = item.coupon && typeof item.coupon === "object" ? item.coupon : null;
    const couponCode = coupon ? String(coupon.code || "").trim().toUpperCase() : "";
    const couponRawText = coupon ? String(coupon.title || coupon.text || coupon.confirmationMessage || "").replace(/\s+/g, " ").trim() : "";
    const couponPrice = coupon ? Number(coupon.price) : 0;
    const percentBenefit = coupon ? Number(coupon.percentOff || (coupon.discountType === "percent" ? coupon.discountValue : 0)) : 0;
    const fixedBenefit = coupon ? Number(coupon.amountOff || (coupon.discountType === "fixed" ? coupon.discountValue : 0)) : 0;
    const textBenefit = couponRawText.match(/(?:R\$\s*[\d.,]+|\d+(?:[.,]\d+)?)\s*%?\s*OFF/i)?.[0] || "";
    const couponBenefit = percentBenefit > 0 ? `${percentBenefit}% OFF` : fixedBenefit > 0 ? `${formatMoney(fixedBenefit, currency)} OFF` : textBenefit;
    const isAutomaticCoupon = Boolean(coupon && (coupon.automatic || !couponCode || /seguir\s+a\s+loja|checkbox|aplique|ativar|ver\s+cupons\s+dispon[ií]veis/i.test(couponRawText)));
    const couponNeedsAction = Boolean(coupon && isAutomaticCoupon && coupon.actionRequired !== false && !coupon.alreadyApplied);
    const couponLabel = couponCode || (couponNeedsAction ? "Aplicar ao abrir o produto" : "");
    const couponLine = couponCode
      ? `🎟️ Use o cupom: \`${couponCode}\`${couponBenefit ? ` - *${couponBenefit}*` : ""}`
      : couponNeedsAction ? "🎟️ Aplique o cupom ao abrir o produto!" : "";
    const store = "Mercado Livre";
    const values: Record<string, string> = {
      "{{titulo}}": item.title || "",
      "{{preco}}": currentPrice,
      "{{preco_anterior}}": previousPrice,
      "{{desconto}}": item.discountPercentage ? `${item.discountPercentage}%` : "",
      "{{economia}}": savings,
      "{{cupom}}": couponLabel,
      "{{link}}": link,
      "{{loja}}": store,
      "{{frete}}": shipping,
      "{{parcelas}}": installmentDetails ? `${installmentDetails.quantity}x de ${formatMoney(installmentDetails.amount, currency)}${installmentDetails.noInterest ? " Sem Juros" : ""}` : "",
      "{{quantidade_parcelas}}": installmentDetails ? String(installmentDetails.quantity) : "",
      "{{valor_parcela}}": installmentDetails ? formatMoney(installmentDetails.amount, currency) : "",
      "{{juros_parcela}}": installmentDetails?.noInterest ? "Sem Juros" : "",
      "{{vendedor}}": item.seller == null ? "" : String(item.seller),
      "{{marca}}": item.brand || "",
      "{{categoria}}": item.categoryName || item.categoryId || "",
      "{{id_produto}}": item.itemId || item.catalogProductId || item.id,
      "{{linha_preco_anterior}}": hasPreviousPrice ? `De: ~${previousPrice}~\n` : "",
      "{{linha_desconto}}": item.discountPercentage ? ` (${item.discountPercentage}% OFF)` : "",
      "{{linha_cupom}}": couponLine ? `${couponLine}\n` : "",
      "{{linha_frete}}": shipping ? `🚚 ${shipping}\n` : "",
      "{{linha_parcelas}}": installmentLine ? `${installmentLine}\n` : "",
      "{{cta_ia}}": aiCta,
      "{{linha_cta_ia}}": aiCta ? `${aiCta}\n\n` : "",
    };
    const templateHasCta = offerTemplate.includes("{{cta_ia}}") || offerTemplate.includes("{{linha_cta_ia}}");
    const templateHasInstallments = ["{{parcelas}}", "{{quantidade_parcelas}}", "{{valor_parcela}}", "{{juros_parcela}}", "{{linha_parcelas}}"].some((variable) => offerTemplate.includes(variable));
    const templateHasCoupon = offerTemplate.includes("{{cupom}}") || offerTemplate.includes("{{linha_cupom}}");
    const templateWithCoupon = couponLine && !templateHasCoupon
      ? offerTemplate.replace(/([^\n]*\{\{preco\}\}[^\n]*)/, "$1\n{{linha_cupom}}")
      : offerTemplate;
    const templateWithInstallments = installmentLine && !templateHasInstallments
      ? templateWithCoupon.replace(/([^\n]*\{\{preco\}\}[^\n]*)/, "$1\n{{linha_parcelas}}")
      : templateWithCoupon;
    const rendered = Object.entries(values).reduce((message, [variable, value]) => message.split(variable).join(value), templateWithInstallments);
    return `${aiCta && !templateHasCta ? `${aiCta}\n\n` : ""}${rendered}`
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  async function generateAiCta(item: CatalogItem, options: { testing?: boolean; enabled?: boolean } = {}) {
    if (!(options.enabled ?? aiCtaSettings.enabled) && !options.testing) return "";
    if (!whatsapp.instanceToken.trim()) {
      if (options.testing) toast.error("Informe o token da UAZAPI para autorizar o teste.");
      return "";
    }
    try {
      const response = await fetch("/api/ai/cta", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Promozap-Admin-Token": whatsapp.instanceToken.trim() },
        body: JSON.stringify({
          mode: aiCtaSettings.generationMode,
          model: aiCtaSettings.model,
          style: aiCtaSettings.style,
          emoji: aiCtaSettings.emoji,
          maxWords: aiCtaSettings.maxWords,
          product: {
            id: item.itemId || item.catalogProductId || item.id,
            title: item.title,
            category: item.categoryName || item.categoryId || "",
            brand: item.brand || "",
            price: item.price,
            originalPrice: item.originalPrice,
            discountPercentage: item.discountPercentage,
            freeShipping: item.freeShipping,
            full: item.full,
            seller: item.seller == null ? "" : String(item.seller),
            link: item.url || "",
          },
        }),
      });
      const result = await response.json() as { ok?: boolean; cta?: string; cached?: boolean; error?: string };
      if (!response.ok || !result.cta) throw new Error(result.error || "A IA não devolveu uma frase.");
      if (!result.cached) setAiCtaCacheEntries((current) => current + 1);
      const raw = result.cta.trim();
      if (aiCtaSettings.generationMode === "full-copy") return raw;
      if (aiCtaSettings.formatting === "bold") return `*${raw}*`;
      if (aiCtaSettings.formatting === "italic") return `_${raw}_`;
      if (aiCtaSettings.formatting === "bold-italic") return `_*${raw}*_`;
      return raw;
    } catch (error) {
      if (options.testing) toast.error(error instanceof Error ? error.message : "Não foi possível testar o CTA.");
      return "";
    }
  }

  function saveAiCtaSettings() {
    const normalized = { ...aiCtaSettings, maxWords: Math.max(4, Math.min(15, Math.floor(Number(aiCtaSettings.maxWords) || 9))) };
    setAiCtaSettings(normalized);
    window.localStorage.setItem("achadex.aiCta.settings.v1", JSON.stringify(normalized));
    toast.success("Configuração do CTA por IA salva.");
  }

  async function testAiCta() {
    setAiCtaTesting(true);
    try {
      const sample: CatalogItem = { id: "teste-cta", title: "Chave de impacto a bateria profissional", brand: "", categoryName: "Ferramentas", price: 142, originalPrice: 280, discountPercentage: 49, freeShipping: true, url: "https://meli.la/testeAchadeX" };
      const cta = await generateAiCta(sample, { testing: true });
      if (cta) toast.success(`Teste aprovado: “${cta}”`);
    } finally {
      setAiCtaTesting(false);
    }
  }

  async function resetAiCtaCache() {
    if (!window.confirm("Apagar todos os CTAs salvos? Os próximos envios voltarão a gerar frases e consumir tokens.")) return;
    if (!whatsapp.instanceToken.trim()) return toast.error("Informe o token da UAZAPI para autorizar a limpeza.");
    setAiCtaResetting(true);
    try {
      const response = await fetch("/api/ai/cta", { method: "DELETE", headers: { "X-Promozap-Admin-Token": whatsapp.instanceToken.trim() } });
      const result = await response.json() as { ok?: boolean; deleted?: number; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Não foi possível limpar o cache.");
      setAiCtaCacheEntries(0);
      toast.success(`${result.deleted || 0} CTA(s) removido(s) do cache.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível limpar o cache.");
    } finally {
      setAiCtaResetting(false);
    }
  }

  async function savePrivateAssistantSettings(settings = privateAssistantSettings) {
    if (!whatsapp.instanceToken.trim()) return toast.error("Informe o token da UAZAPI para salvar o atendimento privado.");
    setPrivateAssistantSaving(true);
    try {
      const response = await fetch("/api/automation/private-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Promozap-Admin-Token": whatsapp.instanceToken.trim() },
        body: JSON.stringify(settings),
      });
      const result = await response.json() as { ok?: boolean; error?: string; configured?: boolean; settings?: PrivateAssistantSettings };
      if (!response.ok || !result.ok) throw new Error(result.error || "Não foi possível salvar o atendimento privado.");
      if (result.settings) setPrivateAssistantSettings(result.settings);
      setPrivateAssistantConfigured(Boolean(result.configured));
      if (result.settings?.enabled) await setupUazapiWebhook(false);
      toast.success(result.settings?.enabled ? "Atendimento privado ativado e webhook atualizado." : "Atendimento privado desativado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o atendimento privado.");
    } finally {
      setPrivateAssistantSaving(false);
    }
  }

  function promotionItemFromRecord(record: ProductRecord): CatalogItem {
    const data = parseProductData(record.productDataJson) || {};
    const offers = data.offers && typeof data.offers === "object" ? data.offers as Record<string, unknown> : {};
    const shipping = data.shipping && typeof data.shipping === "object" ? data.shipping as Record<string, unknown> : {};
    const asNumber = (...values: unknown[]) => {
      for (const value of values) {
        const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(",", ".")) : NaN;
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
      }
      return null;
    };
    const price = asNumber(data.price, offers.price, offers.lowPrice);
    const originalPrice = asNumber(data.originalPrice, data.basePrice, offers.highPrice);
    const discountPercentage = price && originalPrice && originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0;
    return {
      id: record.id,
      itemId: record.store === "mercadolivre" ? record.productCode : null,
      catalogProductId: typeof data.catalogProductId === "string" ? data.catalogProductId : null,
      title: record.title || String(data.title || data.name || "Produto selecionado"),
      imageUrl: record.imageUrl,
      url: record.affiliateUrl || record.resolvedUrl || record.sourceUrl,
      price,
      originalPrice: originalPrice && originalPrice > (price || 0) ? originalPrice : null,
      currency: String(data.currencyId || offers.priceCurrency || "BRL"),
      brand: typeof data.brand === "string" ? data.brand : null,
      categoryId: typeof data.categoryId === "string" ? data.categoryId : null,
      categoryName: typeof data.categoryName === "string" ? data.categoryName : typeof data.category === "string" ? data.category : null,
      seller: typeof data.seller === "string" || typeof data.seller === "number" ? data.seller : null,
      freeShipping: Boolean(shipping.freeShipping || shipping.free_shipping),
      full: Boolean(shipping.full || shipping.logisticType === "fulfillment"),
      coupon: data.coupon && typeof data.coupon === "object" ? data.coupon as Record<string, unknown> : null,
      discountPercentage,
      source: record.store === "amazon" ? "web_search" : "item",
      raw: data,
    };
  }

  function normalizeMercadoLivreShortAffiliateUrl(value?: string | null) {
    if (!value) return false;
    try {
      const normalized = /^(?:www\.)?meli\.la\//i.test(value.trim()) ? `https://${value.trim()}` : value.trim();
      const url = new URL(normalized);
      return url.hostname.toLowerCase().replace(/^www\./, "") === "meli.la" && url.pathname.length > 1
        ? `https://meli.la${url.pathname}`
        : "";
    } catch {
      return "";
    }
  }

  function isMercadoLivreShortAffiliateUrl(value?: string | null) {
    return Boolean(normalizeMercadoLivreShortAffiliateUrl(value));
  }

  function mercadoLivreAffiliateSource(record: ProductRecord, item: CatalogItem) {
    for (const value of [record.sourceUrl, record.resolvedUrl, item.url]) {
      if (!value) continue;
      try {
        const url = new URL(value);
        if (!url.hostname.toLowerCase().endsWith("mercadolivre.com.br")) continue;
        const itemHint = url.searchParams.get("wid")?.match(/^MLB-?(\d{7,})$/i)
          || url.searchParams.get("item_id")?.match(/^MLB-?(\d{7,})$/i)
          || url.searchParams.get("pdp_filters")?.match(/(?:^|[|,;])item_id\s*[:=]\s*MLB-?(\d{7,})(?:$|[|,;])/i);
        if (itemHint) return `https://produto.mercadolivre.com.br/MLB-${itemHint[1]}`;
        if (/\/up\/MLBU\d{7,}(?:[/?]|$)/i.test(url.pathname)) return `${url.origin}${url.pathname}${url.search}`;
      } catch {
        // Continua tentando as demais fontes conhecidas do produto.
      }
    }
    const itemId = String(item.itemId || record.productCode || "").toUpperCase();
    const itemMatch = itemId.match(/^MLB-?(\d{7,})$/);
    if (itemMatch) return `https://produto.mercadolivre.com.br/MLB-${itemMatch[1]}`;
    const direct = [record.resolvedUrl, record.sourceUrl, item.url].find((value) => {
      if (!value || !/\bMLB-?\d{7,}\b/i.test(value)) return false;
      try {
        return new URL(value).hostname.toLowerCase().endsWith("mercadolivre.com.br");
      } catch {
        return false;
      }
    });
    if (direct) return direct;
    return "";
  }

  async function createMercadoLivreShortAffiliateUrl(record: ProductRecord, item: CatalogItem) {
    const existingShortUrl = normalizeMercadoLivreShortAffiliateUrl(record.affiliateUrl);
    if (existingShortUrl) return existingShortUrl;
    const sourceUrl = mercadoLivreAffiliateSource(record, item);
    if (!sourceUrl) throw new Error("Não encontrei o código MLB do anúncio para gerar o link curto.");
    let affiliateLabel = affiliate.mercadoLivreLabel.trim();
    if (!affiliateLabel) {
      const affiliateResponse = await fetch("/api/affiliate", { cache: "no-store" });
      const affiliateData = await affiliateResponse.json() as { settings?: Partial<AffiliateSettings>; error?: string };
      affiliateLabel = affiliateData.settings?.mercadoLivreLabel?.trim() || "";
      if (affiliateLabel) setAffiliate((current) => ({ ...current, ...affiliateData.settings, mercadoLivreLabel: affiliateLabel, amazonTrackingId: "", amazonEnabled: false }));
    }
    if (!affiliateLabel) throw new Error("Informe sua tag de afiliado em Credenciais antes de gerar a promoção.");
    let localFailure = "";
    try {
      let collectorToken = localCollectorToken.trim();
      if (!collectorToken) {
        const sessionResponse = await fetch(`${localCollectorUrl.replace(/\/$/, "")}/session`, { cache: "no-store" });
        const session = await sessionResponse.json() as { ok?: boolean; token?: string };
        if (sessionResponse.ok && session.ok && session.token) {
          collectorToken = session.token;
          setLocalCollectorToken(collectorToken);
          window.localStorage.setItem("promozap.localCollectorToken", collectorToken);
        }
      }
      if (collectorToken) {
        const localResult = await retryOnce(async () => {
          const localResponse = await fetch(`${localCollectorUrl.replace(/\/$/, "")}/generate-affiliate-link`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Promozap-Local-Token": collectorToken },
            body: JSON.stringify({ input: sourceUrl, tag: affiliateLabel }),
          });
          const value = await localResponse.json() as { ok?: boolean; shortUrl?: string; error?: string };
          if (!localResponse.ok || !value.ok) throw new Error(value.error || "O coletor não recebeu um meli.la.");
          return value;
        });
        const localShortUrl = normalizeMercadoLivreShortAffiliateUrl(localResult.shortUrl);
        if (localResult.ok && localShortUrl) return localShortUrl;
        localFailure = localResult.error || "O coletor não recebeu um meli.la.";
      }
    } catch (caught) {
      localFailure = caught instanceof Error ? caught.message : "O coletor local não respondeu.";
    }
    throw new Error(localFailure || "Abra o coletor local, mantenha o Chrome conectado ao Mercado Livre e tente novamente.");
  }

  async function generatePromotionPreview(inputOverride?: string, options: { silent?: boolean; background?: boolean; aiCtaEnabled?: boolean; previewStyle?: OfferPreviewStyle; showInstallments?: boolean; installmentText?: string; onProgress?: (phase: MonitorPhase, message: string, detail?: string) => void } = {}) {
    const targetInput = (inputOverride || promotionInput).trim();
    if (!targetInput) {
      if (!options.silent) toast.error("Cole o link do produto.");
      return null;
    }
    if (!options.background) {
      if (inputOverride) setPromotionInput(inputOverride);
      setPromotionLoading(true);
      setPromotionItem(null);
      setPromotionPreviewStyle(options.previewStyle || brandedPreviewStyle);
      setPromotionInstallmentOptions({ enabled: Boolean(options.showInstallments), text: options.installmentText || defaultInstallmentText });
      setPromotionAiCta("");
      setPromotionUsesFullAiCopy(false);
      setPromotionModalOpen(false);
      setPromotionDataWarning("");
      setPromotionAffiliateError("");
    }
    try {
      options.onProgress?.("checking", "Confirmando o produto", "Identificando o anúncio e preparando os dados oficiais.");
      const result = await retryOnce(async () => {
        const response = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: targetInput }),
        });
        const value = await response.json() as { products?: ProductRecord[]; error?: string };
        if (!response.ok || !value.products?.length) throw new Error(value.error || "O produto não pôde ser identificado.");
        return value;
      });
      const record = result.products[0];
      if (record.store !== "mercadolivre") throw new Error("A Amazon está desativada. Use um link do Mercado Livre.");
      let item = promotionItemFromRecord(record);
      if (record.store === "mercadolivre") {
        try {
          options.onProgress?.("preparing", "Abrindo a página do produto", "Confirmando preço, desconto, cupom e parcelas diretamente no Mercado Livre.");
          let collectorToken = localCollectorToken.trim();
          if (!collectorToken) {
            const sessionResponse = await fetch(`${localCollectorUrl.replace(/\/$/, "")}/session`, { cache: "no-store" });
            const session = await sessionResponse.json() as { ok?: boolean; token?: string; error?: string };
            if (!sessionResponse.ok || !session.ok || !session.token) throw new Error(session.error || "O coletor local não está aberto.");
            collectorToken = session.token;
            setLocalCollectorToken(collectorToken);
            window.localStorage.setItem("promozap.localCollectorToken", collectorToken);
          }
          const scrape = async (token: string) => {
            const collectorResponse = await fetch(`${localCollectorUrl.replace(/\/$/, "")}/scrape`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Promozap-Local-Token": token },
              body: JSON.stringify({ input: record.resolvedUrl || targetInput, managedCoupons: managedCoupons.filter((coupon) => coupon.active) }),
            });
            const collectorResult = await collectorResponse.json() as { ok?: boolean; product?: LocalCollectorProduct; error?: string };
            if (!collectorResponse.ok || !collectorResult.product?.ok) throw new Error(collectorResult.product?.userActionMessage || collectorResult.error || "O coletor não retornou os dados completos.");
            return collectorResult;
          };
          const collectorResult = await retryOnce(() => scrape(collectorToken));
          const verifiedCoupon = collectorResult.product.coupon;
          if (verifiedCoupon?.code) {
            // A página do produto é a fonte mais atual das regras do cupom.
            // Atualize também o cadastro local para corrigir benefícios antigos
            // que possam ter sido associados a uma confirmação visual anterior.
            mergeManagedCoupons([{
              ...verifiedCoupon,
              code: verifiedCoupon.code.toUpperCase(),
              title: verifiedCoupon.title || verifiedCoupon.text || `Cupom ${verifiedCoupon.code.toUpperCase()}`,
              discountType: verifiedCoupon.discountType || (verifiedCoupon.percentOff ? "percent" : verifiedCoupon.amountOff ? "fixed" : null),
              discountValue: verifiedCoupon.discountValue || verifiedCoupon.percentOff || verifiedCoupon.amountOff || null,
              active: true,
              appliedAt: verifiedCoupon.appliedAt || new Date().toISOString(),
              lastVerifiedAt: new Date().toISOString(),
            } as ManagedCoupon]);
          }
          const pageItem = localProductToCatalog(collectorResult.product);
          item = {
            ...pageItem,
            id: record.id,
            url: record.affiliateUrl || pageItem.url || record.resolvedUrl || record.sourceUrl,
            imageUrl: pageItem.imageUrl || record.imageUrl,
            title: pageItem.title || record.title || "Produto selecionado",
          };
          setLocalCollectorConnected(true);
          setLocalCollectorResult(collectorResult.product);
        } catch (collectorError) {
          setLocalCollectorConnected(false);
          const reason = collectorError instanceof Error ? collectorError.message : "O coletor local não conseguiu ler os preços.";
          if (options.background) {
            throw new Error(`${reason} A oferta automática foi cancelada porque preço e cupom não puderam ser confirmados diretamente na página do produto.`);
          }
          if (!options.background) setPromotionDataWarning(`${reason} Abra uma vez o arquivo iniciar-coletor.cmd e clique novamente em “Gerar promoção”. Depois disso, esta tela chama o coletor automaticamente.`);
        }
        try {
          options.onProgress?.("linking", "Gerando o link curto", "Aguardando o Mercado Livre devolver o endereço meli.la.");
          const shortAffiliateUrl = await createMercadoLivreShortAffiliateUrl(record, item);
          item = { ...item, url: shortAffiliateUrl };
        } catch (affiliateError) {
          const reason = affiliateError instanceof Error ? affiliateError.message : "Não foi possível gerar o link afiliado encurtado.";
          item = { ...item, url: "" };
          if (!options.background) setPromotionAffiliateError(`${reason} O envio foi bloqueado para impedir que o link completo seja publicado por engano.`);
        }
      }
      options.onProgress?.("writing", "Montando a mensagem", options.aiCtaEnabled ? "Gerando o CTA e aplicando o modelo deste nicho." : "Aplicando o modelo configurado para este nicho.");
      const aiCta = await generateAiCta(item, { enabled: options.aiCtaEnabled });
      const usesFullAiCopy = aiCtaSettings.generationMode === "full-copy" && Boolean(aiCta);
      const installmentOptions = { enabled: Boolean(options.showInstallments), text: options.installmentText || defaultInstallmentText };
      const message = usesFullAiCopy ? aiCta : composeOfferMessage(item, item.url || record.sourceUrl, record.store, aiCta, installmentOptions);
      if (!options.background) {
        setPromotionRecordId(record.id);
        setPromotionItem(item);
        setPromotionModalOpen(true);
        setPromotionIncludeImage(Boolean(item.imageUrl));
        setPromotionMessage(message);
        setPromotionAiCta(aiCta);
        setPromotionUsesFullAiCopy(usesFullAiCopy);
      }
      if (!options.silent) toast.success("Promoção pronta para revisar e enviar.");
      return { item, record, store: record.store, message };
    } catch (caught) {
      if (!options.silent) toast.error(caught instanceof Error ? caught.message : "Não foi possível gerar a promoção.");
      return null;
    } finally {
      if (!options.background) setPromotionLoading(false);
    }
  }

  function togglePromotionGroup(jid: string) {
    setPromotionGroups((current) => current.includes(jid) ? current.filter((item) => item !== jid) : [...current, jid]);
  }

  function updatePromotionItem(patch: Partial<CatalogItem>) {
    setPromotionItem((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      if (!promotionUsesFullAiCopy) setPromotionMessage(composeOfferMessage(next, next.url || "", promotionStore, promotionAiCta, promotionInstallmentOptions));
      return next;
    });
  }

  async function sendPromotionToGroups() {
    if (!promotionItem) return toast.error("Gere a promoção primeiro.");
    if (promotionStore === "mercadolivre" && !isMercadoLivreShortAffiliateUrl(promotionItem.url)) return toast.error("Gere o link afiliado encurtado meli.la antes de enviar.");
    if (!promotionGroups.length) return toast.error("Escolha pelo menos um grupo de destino.");
    if (!promotionMessage.trim()) return toast.error("A mensagem está vazia.");
    if (!whatsapp.instanceToken.trim()) return toast.error("Informe o token da UAZAPI em Credenciais.");
    setPromotionSending(true);
    try {
    let sent = 0;
    const failures: string[] = [];
    const reviewCards = carouselEnabled ? (promotionItem.reviews || []).flatMap((review) => {
      const firstMedia = review.media?.[0]
        || (review.videos?.[0] ? { type: "video" as const, url: review.videos[0] } : null)
        || (review.images?.[0] ? { type: "image" as const, url: review.images[0] } : null);
      if (!firstMedia) return [];
      return [{
        text: review.text || "Avaliação publicada com mídia.",
        imageUrl: firstMedia.type === "image" ? firstMedia.url : undefined,
        videoUrl: firstMedia.type === "video" ? firstMedia.url : undefined,
      }];
    }).slice(0, 4) : [];
    const selectedButtonLabel = carouselButtonLabel.trim() || "VER OFERTA";
    let brandedPreviewImage = "";
    if (brandedPreviewEnabled && !carouselEnabled) {
      try {
        brandedPreviewImage = await buildOfferPreview(promotionItem, promotionPreviewStyle);
      } catch (caught) {
        toast.warning(`${caught instanceof Error ? caught.message : "A arte com IA falhou."} Usando o preview horizontal anterior.`);
        brandedPreviewImage = await createBrandedPreviewImage(promotionItem);
      }
    }
    for (const destinationJid of promotionGroups) {
      try {
        const response = await fetch("/api/offers/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Promozap-Admin-Token": whatsapp.instanceToken.trim() },
          body: JSON.stringify({ destinationJid, text: promotionMessage, imageUrl: promotionItem.imageUrl, includeImage: promotionIncludeImage, reviewCards, carouselEnabled, carouselButtonLabel: selectedButtonLabel, brandedPreviewEnabled, brandedPreviewImage, discountPercentage: promotionItem.discountPercentage, rating: promotionItem.rating, productUrl: promotionItem.url, productId: promotionItem.itemId || promotionItem.id, productTitle: promotionItem.title }),
        });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error || "Falha no envio.");
        sent += 1;
      } catch (caught) {
        failures.push(destinationGroups.find((group) => group.JID === destinationJid)?.Name || destinationJid);
      }
    }
    if (sent && promotionRecordId) {
      await fetch("/api/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: promotionRecordId, status: "sent", destinationGroup: promotionGroups.join(",") }) }).catch(() => undefined);
    }
    if (sent) toast.success(`Oferta enviada para ${sent} grupo${sent === 1 ? "" : "s"}.`);
    if (failures.length) toast.error(`Falha em ${failures.length} grupo(s): ${failures.join(", ")}.`);
    void loadLogs();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "O envio manual foi interrompido. Tente novamente.");
    } finally {
      setPromotionSending(false);
    }
  }

  function saveOfferTemplate() {
    const name = offerTemplateName.trim() || "Modelo sem nome";
    const next = offerTemplates.map((item) => item.id === activeOfferTemplateId ? { ...item, name, content: offerTemplate } : item);
    setOfferTemplates(next);
    setOfferTemplateName(name);
    window.localStorage.setItem("promozap.offerTemplates.v2", JSON.stringify(next));
    window.localStorage.setItem("promozap.offerTemplates.active.v2", activeOfferTemplateId);
    window.localStorage.setItem("promozap.offerTemplate.v1", offerTemplate);
    setTemplateSavedAt(new Date().toISOString());
    toast.success(`Modelo “${name}” salvo neste navegador.`);
  }

  function saveOfferTemplateAsNew() {
    if (offerTemplates.length >= 10) return toast.error("Você já atingiu o limite de 10 modelos.");
    const name = offerTemplateName.trim() || `Modelo ${offerTemplates.length + 1}`;
    const preset: OfferTemplatePreset = { id: crypto.randomUUID(), name, content: offerTemplate };
    const next = [...offerTemplates, preset];
    setOfferTemplates(next);
    setActiveOfferTemplateId(preset.id);
    setOfferTemplateName(preset.name);
    window.localStorage.setItem("promozap.offerTemplates.v2", JSON.stringify(next));
    window.localStorage.setItem("promozap.offerTemplates.active.v2", preset.id);
    window.localStorage.setItem("promozap.offerTemplate.v1", preset.content);
    setTemplateSavedAt(new Date().toISOString());
    toast.success(`Novo modelo “${name}” criado.`);
  }

  function selectOfferTemplate(id: string) {
    const preset = offerTemplates.find((item) => item.id === id);
    if (!preset) return;
    setActiveOfferTemplateId(preset.id);
    setOfferTemplateName(preset.name);
    setOfferTemplate(preset.content);
    window.localStorage.setItem("promozap.offerTemplates.active.v2", preset.id);
    window.localStorage.setItem("promozap.offerTemplate.v1", preset.content);
  }

  function deleteOfferTemplate() {
    if (offerTemplates.length <= 1) return toast.error("Mantenha pelo menos um modelo salvo.");
    const next = offerTemplates.filter((item) => item.id !== activeOfferTemplateId);
    const fallback = next[0];
    setOfferTemplates(next);
    setActiveOfferTemplateId(fallback.id);
    setOfferTemplateName(fallback.name);
    setOfferTemplate(fallback.content);
    window.localStorage.setItem("promozap.offerTemplates.v2", JSON.stringify(next));
    window.localStorage.setItem("promozap.offerTemplates.active.v2", fallback.id);
    window.localStorage.setItem("promozap.offerTemplate.v1", fallback.content);
    toast.success("Modelo excluído.");
  }

  function updateCarouselEnabled(enabled: boolean) {
    setCarouselEnabled(enabled);
    window.localStorage.setItem("promozap.carousel.enabled.v1", String(enabled));
  }

  function updateCarouselButtonLabel(label: string) {
    const normalized = label.trim().slice(0, 25) || "VER OFERTA";
    setCarouselButtonLabel(normalized);
    window.localStorage.setItem("promozap.carousel.buttonLabel.v1", normalized);
  }

  function updateBrandedPreviewEnabled(enabled: boolean) {
    setBrandedPreviewEnabled(enabled);
    window.localStorage.setItem("descontex.brandedPreview.enabled.v1", String(enabled));
    toast.success(enabled ? "Preview personalizado DesconteX ativado." : "Preview personalizado desativado.");
  }

  function updateBrandedPreviewStyle(style: OfferPreviewStyle) {
    const safeStyle = style === "focus" ? "focus" : "classic";
    setBrandedPreviewStyle(safeStyle);
    window.localStorage.setItem("descontex.brandedPreview.style.v1", safeStyle);
    toast.success(safeStyle === "focus" ? "Layout Produto em destaque selecionado." : "Layout Informativo selecionado.");
  }

  async function buildOfferPreview(item: CatalogItem, style: OfferPreviewStyle) {
    if (style === "ai-home") return createAiHomePreviewImage(item, whatsapp.instanceToken.trim());
    if (style === "focus") return createProductFocusPreviewImage(item);
    return createBrandedPreviewImage(item);
  }

  async function generateAiHomeTestPreview(item: CatalogItem) {
    if (!whatsapp.instanceToken.trim()) return toast.error("Configure primeiro o token da UAZAPI em Credenciais.");
    setAiHomeTestLoading(true);
    try {
      const preview = await buildOfferPreview(item, activeOfferMonitor?.previewStyle || "classic");
      setAiHomeTestPreview(preview);
      toast.success("Arte de teste criada e armazenada no cache deste navegador.");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Não foi possível gerar a arte de teste.");
    } finally {
      setAiHomeTestLoading(false);
    }
  }

  async function scanMonitoredDeals() {
    if (!localCollectorToken.trim()) {
      setMonitoringActive(false);
      setMonitoringError("Cadastre primeiro o token do coletor local em Credenciais.");
      return;
    }
    setMonitoringLoading(true);
    setMonitoringError("");
    try {
      const response = await fetch(`${localCollectorUrl.replace(/\/$/, "")}/scan-deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Promozap-Local-Token": localCollectorToken.trim() },
        body: JSON.stringify({
          url: "https://www.mercadolivre.com.br/ofertas?container_id=MLB779362-1&promotion_type=deal_of_the_day",
          category: monitoringCategory,
          limit: 40,
          minDiscount: Number(monitoringMinDiscount),
          couponsOnly: false,
        }),
      });
      const data = await response.json() as { ok?: boolean; products?: Array<Record<string, unknown>>; capturedAt?: string; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "O coletor não conseguiu ler as ofertas.");
      const now = data.capturedAt || new Date().toISOString();
      const next = (data.products || []).map((raw) => {
        const url = String(raw.url || "");
        const id = String(raw.itemId || raw.id || url);
        return {
          id,
          itemId: raw.itemId ? String(raw.itemId) : null,
          title: String(raw.title || "Oferta Mercado Livre"),
          imageUrl: raw.imageUrl ? String(raw.imageUrl) : null,
          url,
          price: Number(raw.effectivePrice || raw.price) || null,
          effectivePrice: Number(raw.effectivePrice || raw.price) || null,
          originalPrice: Number(raw.originalPrice) || null,
          currency: "BRL",
          discountPercentage: Number(raw.discountPercentage) || 0,
          coupon: raw.coupon && typeof raw.coupon === "object" ? raw.coupon as Record<string, unknown> : null,
          dealScore: Number(raw.dealScore) || 0,
          scoreReasons: Array.isArray(raw.scoreReasons) ? raw.scoreReasons.map(String) : [],
          priceSource: "marketplace_page" as const,
          detectedAt: now,
          freeShipping: Boolean(raw.freeShipping),
        } satisfies MonitoredDeal;
      });
      const fresh = next.filter((item) => !monitoringSeen.current.has(item.id));
      next.forEach((item) => monitoringSeen.current.add(item.id));
      setMonitoringDeals((current) => [...fresh, ...current.filter((item) => !fresh.some((freshItem) => freshItem.id === item.id))].slice(0, 120));
      setMonitoringLastScan(now);
      setLocalCollectorConnected(true);
      if (fresh.length && monitoringSeen.current.size > fresh.length) toast.success(`${fresh.length} nova(s) oferta(s) detectada(s).`);
    } catch (caught) {
      setMonitoringError(caught instanceof Error ? caught.message : "Não foi possível executar o monitoramento.");
      setLocalCollectorConnected(false);
    } finally {
      setMonitoringLoading(false);
    }
  }

  function affiliateHubCooldowns() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem("promozap.affiliateHub.sent.v1") || "{}") as Record<string, string>;
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      return Object.fromEntries(Object.entries(parsed).filter(([, sentAt]) => Date.parse(sentAt) > cutoff));
    } catch {
      return {} as Record<string, string>;
    }
  }

  async function scanAffiliateHub(sendAutomatically = false) {
    if (affiliateHubRunning.current) return;
    affiliateHubRunning.current = true;
    setAffiliateHubLoading(true);
    setAffiliateHubError("");
    try {
      let collectorToken = localCollectorToken.trim();
      if (!collectorToken) {
        const sessionResponse = await fetch(`${localCollectorUrl.replace(/\/$/, "")}/session`, { cache: "no-store" });
        const session = await sessionResponse.json() as { ok?: boolean; token?: string; error?: string };
        if (!sessionResponse.ok || !session.ok || !session.token) throw new Error(session.error || "Abra o coletor local para pesquisar o Hub de Afiliados.");
        collectorToken = session.token;
        setLocalCollectorToken(collectorToken);
        window.localStorage.setItem("promozap.localCollectorToken", collectorToken);
      }
      const response = await fetch(`${localCollectorUrl.replace(/\/$/, "")}/scan-affiliate-hub`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Promozap-Local-Token": collectorToken },
        body: "{}",
      });
      const data = await response.json() as { ok?: boolean; products?: AffiliateHubOffer[]; capturedAt?: string; changes?: { baselineCreated?: boolean; newCount?: number }; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "O coletor não conseguiu ler o Hub de Afiliados.");
      const products = data.products || [];
      setAffiliateHubOffers(products);
      setAffiliateHubVisibleCount(Math.min(48, Math.max(12, products.length)));
      setAffiliateHubLastScan(data.capturedAt || new Date().toISOString());
      setLocalCollectorConnected(true);
      if (data.changes?.newCount) toast.success(`${data.changes.newCount} nova(s) oferta(s) apareceram no Hub.`);
      try {
        await saveCatalogedProducts(defaultOfferMonitors[0], products);
      } catch (catalogError) {
        console.warn("Não foi possível atualizar Produtos Catalogados com o Hub", catalogError);
      }

      if (sendAutomatically) {
        if (!affiliateHubDestination) throw new Error("Escolha o grupo que receberá as ofertas automáticas.");
        if (!whatsapp.instanceToken.trim()) throw new Error("Configure o token da UAZAPI antes de ativar o envio automático.");
        const sent = affiliateHubCooldowns();
        const selected = randomItem(products.filter((offer) => {
          const discount = Number(offer.discountPercentage) || 0;
          return discount >= 10 && discount <= 90 && !sent[stableOfferKey(offer)];
        }));
        if (!selected?.url) return;
        const prepared = await generatePromotionPreview(selected.url, { silent: true });
        if (!prepared) throw new Error("A melhor oferta foi encontrada, mas não foi possível preparar a mensagem.");
        const preparedItem = { ...prepared.item, rating: prepared.item.rating || selected.rating || null, soldText: prepared.item.soldText || selected.soldText || null };
        validateAutomaticOfferPricing(selected, preparedItem, 10);
        if (prepared.store === "mercadolivre" && !isMercadoLivreShortAffiliateUrl(preparedItem.url)) {
          throw new Error("A oferta foi encontrada, mas o Mercado Livre não devolveu um link curto meli.la. Nada foi enviado.");
        }
        const reviewCards = carouselEnabled ? (preparedItem.reviews || []).flatMap((review) => {
          const firstMedia = review.media?.[0]
            || (review.videos?.[0] ? { type: "video" as const, url: review.videos[0] } : null)
            || (review.images?.[0] ? { type: "image" as const, url: review.images[0] } : null);
          if (!firstMedia) return [];
          return [{
            text: review.text || "Avaliação publicada com mídia.",
            imageUrl: firstMedia.type === "image" ? firstMedia.url : undefined,
            videoUrl: firstMedia.type === "video" ? firstMedia.url : undefined,
          }];
        }).slice(0, 4) : [];
        const key = stableOfferKey(selected);
        const brandedPreviewImage = brandedPreviewEnabled && !carouselEnabled ? await createBrandedPreviewImage(preparedItem) : "";
        const sendResponse = await fetch("/api/offers/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Promozap-Admin-Token": whatsapp.instanceToken.trim() },
          body: JSON.stringify({ destinationJid: affiliateHubDestination, text: prepared.message, imageUrl: preparedItem.imageUrl, includeImage: Boolean(preparedItem.imageUrl), reviewCards, carouselEnabled, carouselButtonLabel: carouselButtonLabel.trim() || "VER OFERTA", brandedPreviewEnabled, brandedPreviewImage, discountPercentage: preparedItem.discountPercentage, rating: preparedItem.rating, productUrl: preparedItem.url, productId: preparedItem.itemId || preparedItem.id, productKey: key, productTitle: preparedItem.title, monitorId: "geral-hub" }),
        });
        const sendResult = await sendResponse.json() as { error?: string };
        if (!sendResponse.ok) throw new Error(sendResult.error || "A UAZAPI recusou o envio automático.");
        const nextSent = { ...sent, [key]: new Date().toISOString() };
        window.localStorage.setItem("promozap.affiliateHub.sent.v1", JSON.stringify(nextSent));
        setAffiliateHubSentRevision((value) => value + 1);
        if (prepared.record.id) {
          await fetch("/api/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: prepared.record.id, status: "sent", destinationGroup: affiliateHubDestination }) }).catch(() => undefined);
        }
        toast.success(`Oferta automática enviada: ${selected.title}`);
        void loadLogs();
      }
    } catch (caught) {
      setAffiliateHubError(caught instanceof Error ? caught.message : "Não foi possível pesquisar o Hub de Afiliados.");
      setLocalCollectorConnected(false);
    } finally {
      setAffiliateHubLoading(false);
      affiliateHubRunning.current = false;
    }
  }

  function updateOfferMonitor(id: string, patch: Partial<OfferMonitor>) {
    setOfferMonitors((current) => current.map((monitor) => monitor.id === id ? { ...monitor, ...patch } : monitor));
  }

  function addMonitorActivity(monitorId: string, level: MonitorActivity["level"], message: string) {
    const entry: MonitorActivity = { id: crypto.randomUUID(), monitorId, at: new Date().toISOString(), level, message };
    setMonitorActivity((current) => {
      const next = [entry, ...current].slice(0, 80);
      try { window.localStorage.setItem("promozap.monitor.activity.v1", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function setMonitorStatus(monitorId: string, phase: MonitorPhase, message: string, detail?: string, nextAt?: string | null) {
    setMonitorStatuses((current) => ({
      ...current,
      [monitorId]: { phase, message, detail, nextAt, updatedAt: new Date().toISOString() },
    }));
  }

  function waitingMonitorStatus(monitor: OfferMonitor, now = new Date()) {
    if (!monitor.autoSend) return { phase: "paused" as const, message: "Envio automático pausado", detail: "Use a chave do nicho para retomar.", nextAt: null };
    const daily = monitorDailyState(monitor, now);
    if (daily.state.completedSlots >= daily.plan.target || !daily.nextAt) {
      return { phase: "success" as const, message: "Meta diária concluída", detail: `${daily.state.sentCount}/${daily.plan.target} ofertas enviadas hoje.`, nextAt: null };
    }
    const nextDate = new Date(daily.nextAt);
    const retryDate = daily.state.retryAfter ? new Date(daily.state.retryAfter) : null;
    const effectiveNext = retryDate && retryDate.getTime() > now.getTime() && retryDate.getTime() > nextDate.getTime() ? retryDate : nextDate;
    const time = effectiveNext.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return {
      phase: "waiting" as const,
      message: `Esperando para enviar às ${time}`,
      detail: `${daily.state.sentCount}/${daily.plan.target} ofertas enviadas hoje.`,
      nextAt: effectiveNext.toISOString(),
    };
  }

  function refreshIdleMonitorStatuses(monitors = offerMonitors) {
    const busyPhases = new Set<MonitorPhase>(["queued", "checking", "scanning", "cataloging", "preparing", "linking", "writing", "sending", "error"]);
    const now = new Date();
    setMonitorStatuses((current) => {
      const next = { ...current };
      for (const monitor of monitors) {
        if (!monitor.autoSend) {
          const paused = waitingMonitorStatus(monitor, now);
          next[monitor.id] = { ...paused, updatedAt: current[monitor.id]?.updatedAt || now.toISOString() };
          continue;
        }
        if (current[monitor.id] && busyPhases.has(current[monitor.id].phase)) continue;
        const waiting = waitingMonitorStatus(monitor, now);
        next[monitor.id] = { ...waiting, updatedAt: current[monitor.id]?.updatedAt || now.toISOString() };
      }
      return next;
    });
  }

  function monitorDailyState(monitor: OfferMonitor, now = new Date()) {
    const plan = buildDailyMonitorSlots(monitor, now);
    const storageKey = `promozap.monitor.dailySchedule.${monitor.id}`;
    let state: DailyScheduleState | null = null;
    try { state = JSON.parse(window.localStorage.getItem(storageKey) || "null") as DailyScheduleState | null; } catch {}
    if (!state || state.date !== plan.day || state.signature !== plan.signature) {
      state = {
        date: plan.day,
        signature: plan.signature,
        completedSlots: plan.slots.filter((slot) => slot <= now.getTime()).length,
        sentCount: 0,
      };
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    }
    return { plan, state, storageKey, nextAt: plan.slots[state.completedSlots] || null };
  }

  function saveMonitorDailyState(storageKey: string, state: DailyScheduleState) {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
    setMonitorScheduleRevision((value) => value + 1);
  }

  async function runScheduledMonitor(monitor: OfferMonitor) {
    if (!monitor.autoSend) return;
    const now = new Date();
    const daily = monitorDailyState(monitor, now);
    if (!daily.nextAt || now.getTime() < daily.nextAt) return;
    if (daily.state.retryAfter && now.getTime() < Date.parse(daily.state.retryAfter)) return;
    if (daily.state.lastSentAt && now.getTime() - Date.parse(daily.state.lastSentAt) < daily.plan.minimumSpacingMinutes * 60_000) return;
    try {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const countResponse = await fetch(`/api/sends?monitorId=${encodeURIComponent(monitor.id)}&from=${encodeURIComponent(dayStart.toISOString())}&to=${encodeURIComponent(dayEnd.toISOString())}`, { cache: "no-store" });
      const countData = await countResponse.json() as { dailyCount?: number };
      const confirmedCount = Number(countData.dailyCount) || 0;
      if (confirmedCount >= daily.plan.target) {
        if (daily.state.completedSlots < daily.plan.target || daily.state.sentCount !== confirmedCount) {
          addMonitorActivity(monitor.id, "success", `${monitor.name}: meta diária concluída (${confirmedCount}/${daily.plan.target}). A operação continua ligada e retomará amanhã.`);
        }
        saveMonitorDailyState(daily.storageKey, { ...daily.state, completedSlots: daily.plan.target, sentCount: confirmedCount, retryAfter: undefined });
        setMonitorStatus(monitor.id, "success", "Meta diária concluída", `${confirmedCount}/${daily.plan.target} ofertas enviadas hoje.`);
        return;
      }
      if (confirmedCount > daily.state.sentCount) daily.state.sentCount = confirmedCount;
    } catch {}
    const attempting = { ...daily.state, retryAfter: new Date(now.getTime() + 3 * 60_000).toISOString() };
    saveMonitorDailyState(daily.storageKey, attempting);
    const sent = await sendRandomMonitorNow(monitor.id, "scheduled");
    const finishedAt = new Date();
    if (sent) {
      const passedSlots = daily.plan.slots.filter((slot) => slot <= finishedAt.getTime()).length;
      saveMonitorDailyState(daily.storageKey, {
        ...attempting,
        completedSlots: Math.max(attempting.completedSlots + 1, passedSlots),
        sentCount: attempting.sentCount + 1,
        lastSentAt: finishedAt.toISOString(),
        retryAfter: undefined,
      });
      const waiting = waitingMonitorStatus(monitor, finishedAt);
      setMonitorStatus(monitor.id, waiting.phase, waiting.message, waiting.detail, waiting.nextAt);
    } else {
      const retryAt = new Date(finishedAt.getTime() + 5 * 60_000);
      saveMonitorDailyState(daily.storageKey, { ...attempting, retryAfter: retryAt.toISOString() });
      setMonitorStatus(monitor.id, "error", "Tentativa não concluída", `Nova tentativa automática às ${retryAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.` , retryAt.toISOString());
    }
  }

  function updateMonitorSource(monitorId: string, sourceId: string, patch: Partial<MonitorSource>) {
    setOfferMonitors((current) => current.map((monitor) => monitor.id === monitorId
      ? { ...monitor, sources: monitor.sources.map((source) => source.id === sourceId ? { ...source, ...patch } : source) }
      : monitor));
  }

  function addOfferMonitor() {
    const name = newNicheDraft.name.trim();
    const url = newNicheDraft.url.trim();
    if (!name) return toast.error("Digite o nome do novo nicho.");
    if (!url) return toast.error("Cole a URL inicial do Mercado Livre.");
    try {
      const parsed = new URL(url);
      if (!/(^|\.)mercadolivre\.com\.br$/i.test(parsed.hostname)) throw new Error();
    } catch {
      return toast.error("Use uma URL válida do Mercado Livre.");
    }
    const id = crypto.randomUUID();
    const next: OfferMonitor = {
      id, name, kind: "urls", destinationJid: newNicheDraft.destinationJid, intervalMinutes: 5,
      dailyTarget: Math.min(200, Math.max(1, newNicheDraft.dailyTarget)), sendStartTime: "07:00", sendEndTime: "00:00", scheduleEnabled: true, minimumSpacingMinutes: 20,
      autoSend: false, aiCtaEnabled: true, showInstallments: newNicheDraft.showInstallments, installmentText: defaultInstallmentText, previewStyle: "classic", minRating: Math.min(5, Math.max(0, newNicheDraft.minRating)), minDiscount: Math.min(95, Math.max(0, newNicheDraft.minDiscount)), maxPages: Math.min(50, Math.max(1, newNicheDraft.maxPages)), ignoreInternational: true,
      sources: [{ id: crypto.randomUUID(), url, weight: 100 }],
    };
    setOfferMonitors((current) => [...current, next]);
    setActiveOfferMonitorId(id);
    setNewNicheOpen(false);
    setNewNicheDraft({ name: "", url: "", destinationJid: "", dailyTarget: 8, minRating: 4.5, minDiscount: 20, maxPages: 10, showInstallments: false });
    toast.success(`Nicho “${name}” criado e salvo neste painel.`);
  }

  function removeOfferMonitor(id: string) {
    if (id === "geral-hub") return toast.error("Mantenha a operação de ofertas gerais.");
    setOfferMonitors((current) => {
      const next = current.filter((monitor) => monitor.id !== id);
      setActiveOfferMonitorId(next[0]?.id || "geral-hub");
      return next;
    });
  }

  function chooseWeightedSource(sources: MonitorSource[]) {
    const valid = sources.filter((source) => source.url.trim() && source.weight > 0);
    const total = valid.reduce((sum, source) => sum + source.weight, 0);
    if (!valid.length || total <= 0) return null;
    let cursor = Math.random() * total;
    for (const source of valid) {
      cursor -= source.weight;
      if (cursor <= 0) return source;
    }
    return valid.at(-1) || null;
  }

  function stableOfferKey(offer: AffiliateHubOffer | CatalogItem) {
    const url = String(offer.url || "");
    const catalogCode = url.match(/\/(?:p|up)\/(MLBU?\d{7,})(?:[/?#]|$)/i)?.[1]?.toUpperCase();
    if (catalogCode) return `catalog:${catalogCode}`;
    const directCode = String(offer.itemId || offer.id || "").toUpperCase().match(/\bMLBU?-?\d{7,}\b/)?.[0];
    if (directCode) return `item:${directCode.replace("MLB-", "MLB")}`;
    const normalizedTitle = String(offer.title || "produto").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim().replace(/\b(preto|branco|azul|verde|vermelho|cinza|prata|dourado)\b/g, "").replace(/\s+/g, " ");
    return `title:${normalizedTitle.slice(0, 140)}`;
  }

  function randomItem<T>(values: T[]) {
    if (!values.length) return null;
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return values[buffer[0] % values.length];
  }

  async function postToLocalCollector(endpoint: string, collectorToken: string, payload: Record<string, unknown>, timeoutMs: number) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${localCollectorUrl.replace(/\/$/, "")}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Promozap-Local-Token": collectorToken },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const result = await response.json() as { ok?: boolean; products?: AffiliateHubOffer[]; capturedAt?: string; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "O coletor não conseguiu concluir esta operação.");
      return result;
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") throw new Error("A página excedeu o tempo máximo de leitura.");
      if (caught instanceof TypeError || (caught instanceof Error && /failed to fetch|networkerror|load failed/i.test(caught.message))) {
        throw new Error("O coletor local não está acessível em 127.0.0.1:8765. Abra o arquivo iniciar-coletor.cmd e mantenha o coletor ligado.");
      }
      throw caught;
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function saveCatalogedProducts(monitor: OfferMonitor, products: AffiliateHubOffer[]) {
    if (!products.length || !whatsapp.instanceToken.trim()) return;
    const response = await fetch("/api/catalog/products", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Promozap-Admin-Token": whatsapp.instanceToken.trim() },
      body: JSON.stringify({ category: monitor.name, products }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(result.error || "Não foi possível salvar os produtos no catálogo.");
    }
  }

  async function loadCatalogedProducts() {
    setCatalogedLoading(true);
    try {
      const params = new URLSearchParams();
      if (catalogedSearch.trim()) params.set("search", catalogedSearch.trim());
      if (catalogedCategory !== "Todas") params.set("category", catalogedCategory);
      const response = await fetch(`/api/catalog/products?${params.toString()}`, { cache: "no-store" });
      const data = await response.json() as { products?: CatalogedProduct[]; categories?: Array<{ category: string; total: number }>; stats?: Partial<CatalogedStats>; error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar o catálogo.");
      setCatalogedProducts((data.products || []).map((item) => ({ ...item, price: item.currentPrice ?? item.price })));
      setCatalogedCategories(data.categories || []);
      setCatalogedStats({
        total: Number(data.stats?.total) || 0,
        categoryCount: Number(data.stats?.categoryCount) || 0,
        withPrice: Number(data.stats?.withPrice) || 0,
        withDiscount: Number(data.stats?.withDiscount) || 0,
        withFreeShipping: Number(data.stats?.withFreeShipping) || 0,
        historyPoints: Number(data.stats?.historyPoints) || 0,
      });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Não foi possível carregar o catálogo.");
    } finally { setCatalogedLoading(false); }
  }

  function startOfTodayIso() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }

  async function loadPriceDropRanking() {
    setRankingLoading(true);
    try {
      const params = new URLSearchParams({ mode: "ranking", dayStart: startOfTodayIso() });
      if (rankingSearch.trim()) params.set("search", rankingSearch.trim());
      if (rankingCategory !== "Todas") params.set("category", rankingCategory);
      const response = await fetch(`/api/catalog/products?${params.toString()}`, { cache: "no-store" });
      const data = await response.json() as { products?: RankedProduct[]; stats?: Partial<RankingStats>; error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível montar o ranking de quedas.");
      setRankedProducts(data.products || []);
      setRankingStats({
        totalDrops: Number(data.stats?.totalDrops) || 0,
        historicalLows: Number(data.stats?.historicalLows) || 0,
        averageDrop: Number(data.stats?.averageDrop) || 0,
        biggestDrop: Number(data.stats?.biggestDrop) || 0,
      });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Não foi possível montar o ranking de quedas.");
    } finally { setRankingLoading(false); }
  }

  function pauseCatalogVerification() {
    catalogVerificationControl.current.stop = true;
    setCatalogVerification((current) => ({ ...current, paused: true, message: "Pausando após o lote atual..." }));
  }

  async function verifyAllCatalogedProducts(resume = false) {
    if (catalogVerification.running) return;
    if (!whatsapp.instanceToken.trim()) return toast.error("Conecte a UAZAPI em Credenciais para autorizar a atualização do catálogo.");
    let collectorToken = localCollectorToken.trim();
    try {
      if (!collectorToken) {
        const sessionResponse = await fetch(`${localCollectorUrl.replace(/\/$/, "")}/session`, { cache: "no-store" });
        const session = await sessionResponse.json() as { token?: string };
        collectorToken = session.token || "";
        if (!collectorToken) throw new Error("Não foi possível obter o token do coletor local.");
        setLocalCollectorToken(collectorToken);
        window.localStorage.setItem("promozap.localCollectorToken", collectorToken);
      }
      const listResponse = await fetch("/api/catalog/products?mode=verification", { cache: "no-store" });
      const listData = await listResponse.json() as { products?: Array<{ id: string; category: string; title: string; productUrl: string }>; error?: string };
      if (!listResponse.ok) throw new Error(listData.error || "Não foi possível carregar os produtos para verificação.");
      const products = listData.products || [];
      if (!products.length) return toast.info("Ainda não há produtos catalogados para verificar.");
      const startingAt = resume ? Math.min(catalogVerificationResumeIndex.current, products.length) : 0;
      if (!resume) catalogVerificationResumeIndex.current = 0;
      catalogVerificationControl.current.stop = false;
      let completed = startingAt;
      let updated = resume ? catalogVerification.updated : 0;
      let failed = resume ? catalogVerification.failed : 0;
      let pausedByCaptcha = false;
      setCatalogVerification({ running: true, paused: false, total: products.length, completed, updated, failed, currentTitle: products[startingAt]?.title || "", message: `Abrindo ${verificationBatchSize === 5 ? "até 5 abas" : "1 aba"} por lote.` });
      for (let index = startingAt; index < products.length; index += verificationBatchSize) {
        if (catalogVerificationControl.current.stop) break;
        const batch = products.slice(index, index + verificationBatchSize);
        setCatalogVerification((current) => ({ ...current, currentTitle: batch[0]?.title || "", message: `Verificando ${index + 1}–${Math.min(index + batch.length, products.length)} de ${products.length}...` }));
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 180_000);
        let result: { results?: Array<{ id: string; category: string; ok: boolean; needsUserAction?: boolean; error?: string | null; product?: LocalCollectorProduct | null }> };
        try {
          const collectorResponse = await fetch(`${localCollectorUrl.replace(/\/$/, "")}/catalog/verify-batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Promozap-Local-Token": collectorToken },
            body: JSON.stringify({ items: batch, managedCoupons: managedCoupons.filter((coupon) => coupon.active) }),
            signal: controller.signal,
          });
          result = await collectorResponse.json();
          if (!collectorResponse.ok) throw new Error("O coletor não conseguiu concluir o lote.");
        } finally { window.clearTimeout(timer); }
        const rows = result.results || [];
        const validRows = rows.filter((row): row is typeof row & { product: LocalCollectorProduct } => Boolean(row.ok && row.product));
        const valid = validRows.map((row) => ({ ...row.product, url: row.product.canonicalUrl || row.product.url || batch.find((item) => item.id === row.id)?.productUrl }));
        const byCategory = new Map<string, LocalCollectorProduct[]>();
        validRows.forEach((row, rowIndex) => {
          const category = row.category || "Geral";
          byCategory.set(category, [...(byCategory.get(category) || []), valid[rowIndex]]);
        });
        for (const [category, categoryProducts] of byCategory) {
          const saveResponse = await fetch("/api/catalog/products", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Promozap-Admin-Token": whatsapp.instanceToken.trim() },
            body: JSON.stringify({ category, products: categoryProducts }),
          });
          if (!saveResponse.ok) throw new Error("A leitura foi concluída, mas não foi possível atualizar o catálogo online.");
        }
        const captchaRow = rows.find((row) => row.needsUserAction);
        updated += valid.length;
        failed += Math.max(0, batch.length - valid.length);
        completed += batch.length;
        catalogVerificationResumeIndex.current = completed;
        if (captchaRow) {
          completed = index;
          catalogVerificationResumeIndex.current = index;
        }
        setCatalogVerification((current) => ({ ...current, completed, updated, failed, currentTitle: batch.at(-1)?.title || "", message: captchaRow ? (captchaRow.error || "O Mercado Livre pediu validação.") : "Lote concluído; aguardando 1 segundo..." }));
        if (captchaRow) { pausedByCaptcha = true; catalogVerificationControl.current.stop = true; break; }
        if (index + batch.length < products.length) await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }
      const wasStopped = catalogVerificationControl.current.stop;
      setCatalogVerification((current) => ({ ...current, running: false, paused: wasStopped, currentTitle: "", message: pausedByCaptcha ? "Pausado: resolva o CAPTCHA no Chrome do coletor e clique em Continuar." : wasStopped ? "Verificação pausada. Clique em Continuar para retomar." : "Verificação concluída e ranking recalculado." }));
      await Promise.all([loadPriceDropRanking(), loadCatalogedProducts()]);
      if (!wasStopped) toast.success(`Verificação concluída: ${updated} preço(s) confirmado(s).`);
      else if (pausedByCaptcha) toast.error("O Mercado Livre pediu CAPTCHA. O processo foi pausado sem gravar preços inválidos.");
    } catch (caught) {
      setCatalogVerification((current) => ({ ...current, running: false, paused: true, message: caught instanceof Error ? caught.message : "A verificação foi interrompida." }));
      toast.error(caught instanceof Error ? caught.message : "A verificação foi interrompida.");
    }
  }

  async function openCatalogedProduct(item: CatalogedProduct) {
    setCatalogedSelected(item);
    setCatalogedPriceHistory([]);
    const response = await fetch(`/api/catalog/products?id=${encodeURIComponent(item.id)}`, { cache: "no-store" });
    const data = await response.json() as { product?: CatalogedProduct; history?: Array<{ price: number | null; originalPrice: number | null; observedAt: string }> };
    if (data.product) setCatalogedSelected({ ...data.product, price: data.product.currentPrice ?? data.product.price });
    setCatalogedPriceHistory(data.history || []);
  }

  function monitorCooldowns(monitorId: string) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(`promozap.monitor.sent.${monitorId}`) || "{}") as Record<string, string>;
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      return Object.fromEntries(Object.entries(parsed).filter(([, sentAt]) => Date.parse(sentAt) > cutoff));
    } catch { return {} as Record<string, string>; }
  }

  function validateAutomaticOfferPricing(selected: AffiliateHubOffer, prepared: CatalogItem, minimumDiscount = 1) {
    const price = Number(prepared.price);
    if (!Number.isFinite(price) || price <= 0) throw new Error("O produto foi ignorado porque o preço atual não pôde ser confirmado.");
    const advertisedDiscount = Number(selected.discountPercentage) || 0;
    const requiredDiscount = Math.max(1, Math.min(90, Number(minimumDiscount) || 1));
    if (advertisedDiscount < requiredDiscount || advertisedDiscount > 90) {
      throw new Error(`O produto foi ignorado porque não possui desconto válido de pelo menos ${requiredDiscount}%.`);
    }
    const originalPrice = Number(prepared.originalPrice);
    const selectedCoupon = selected.coupon && typeof selected.coupon === "object" ? selected.coupon : null;
    const scannedPrice = Number(selectedCoupon?.price || selected.effectivePrice || selected.price);
    const currentPriceRatio = Number.isFinite(scannedPrice) && scannedPrice > 0 ? price / scannedPrice : null;
    const hasCouponPrice = Boolean(selectedCoupon?.price || (prepared.coupon && typeof prepared.coupon === "object" && prepared.coupon.price));
    const minimumCompatibleRatio = hasCouponPrice ? 0.9 : 0.75;
    const maximumCompatibleRatio = hasCouponPrice ? 1.1 : 1.25;
    const currentPricesAreCompatible = currentPriceRatio != null && currentPriceRatio >= minimumCompatibleRatio && currentPriceRatio <= maximumCompatibleRatio;
    if (currentPriceRatio != null && !currentPricesAreCompatible) {
      throw new Error("O produto foi ignorado porque a vitrine e a página exibiram preços atuais muito diferentes.");
    }
    if (!Number.isFinite(originalPrice) || originalPrice <= price) {
      throw new Error("O produto foi ignorado: havia desconto anunciado, mas o preço anterior não foi confirmado na página.");
    }
    if (Number.isFinite(originalPrice) && originalPrice > price) {
      const calculated = Math.round((1 - price / originalPrice) * 100);
      if (calculated < requiredDiscount || calculated > 90) {
        throw new Error(`O produto foi ignorado porque o desconto confirmado foi de apenas ${calculated}%.`);
      }
      if (!currentPricesAreCompatible && Math.abs(calculated - advertisedDiscount) > 8) {
        throw new Error("O produto foi ignorado porque preço e desconto estavam inconsistentes.");
      }
    }
  }

  async function loadSendHistory() {
    setSendHistoryLoading(true);
    try {
      const response = await fetch(`/api/sends${productSearch.trim() ? `?search=${encodeURIComponent(productSearch.trim())}` : ""}`);
      const data = await response.json() as { history?: SendHistoryRow[]; summary?: SendSummary[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Falha ao carregar envios.");
      setSendHistory(data.history || []);
      setSendSummary((data.summary || []).map((row) => ({ ...row, sendCount: Number(row.sendCount), groupCount: Number(row.groupCount) })));
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Falha ao carregar envios.");
    } finally { setSendHistoryLoading(false); }
  }

  async function sendRandomMonitorOffer(monitor: OfferMonitor, products: AffiliateHubOffer[]) {
    if (!monitor.destinationJid) throw new Error("Escolha o grupo exclusivo desta operação antes de enviar.");
    if (!whatsapp.instanceToken.trim()) throw new Error("Configure o token da UAZAPI antes de enviar.");
    const requiredDiscount = Math.max(1, Number(monitor.minDiscount) || 0);
    const sent = monitorCooldowns(monitor.id);
    const eligible = products.filter((offer) => !sent[stableOfferKey(offer)]);
    const couponEligible = prioritizeCouponProducts ? eligible.filter((offer) => Boolean(offer.coupon)) : [];
    const selectionPool = couponEligible.length ? couponEligible : eligible;
    const selected = randomItem(selectionPool);
    if (couponEligible.length) addMonitorActivity(monitor.id, "info", `${monitor.name}: priorização ativa; escolhendo entre ${couponEligible.length} produto(s) com cupom e usando o preço já descontado.`);
    else if (prioritizeCouponProducts) addMonitorActivity(monitor.id, "warning", `${monitor.name}: priorização de cupom está ativa, mas nenhum cartão desta leitura trouxe “com Cupom”.`);
    if (!selected?.url) {
      addMonitorActivity(monitor.id, "warning", `${monitor.name}: nenhuma oferta elegível fora do cooldown de 24 horas.`);
      return false;
    }
    const key = stableOfferKey(selected);
    addMonitorActivity(monitor.id, "info", `${monitor.name}: preparando “${selected.title}” em segundo plano.`);
    setMonitorStatus(monitor.id, "preparing", "Preparando a oferta", selected.title);
    const prepared = await generatePromotionPreview(selected.url, {
      silent: true,
      background: true,
      aiCtaEnabled: monitor.aiCtaEnabled,
      previewStyle: monitor.previewStyle,
      showInstallments: monitor.showInstallments,
      installmentText: monitor.installmentText,
      onProgress: (phase, message, detail) => setMonitorStatus(monitor.id, phase, message, detail),
    });
    if (!prepared) throw new Error("A oferta passou pelos filtros, mas a mensagem não pôde ser preparada.");
    const preparedItem = { ...prepared.item, rating: prepared.item.rating || selected.rating || null, soldText: prepared.item.soldText || selected.soldText || null };
    if (prioritizeCouponProducts && selected.coupon) {
      const confirmedCoupon = preparedItem.coupon && typeof preparedItem.coupon === "object" ? preparedItem.coupon : null;
      const confirmedCode = confirmedCoupon ? String(confirmedCoupon.code || "").trim().toUpperCase() : "";
      const confirmedPrice = confirmedCoupon ? Number(confirmedCoupon.price) : 0;
      const confirmedText = confirmedCoupon ? String(confirmedCoupon.title || confirmedCoupon.text || "") : "";
      const isAutomaticCoupon = Boolean(confirmedCoupon && (confirmedCoupon.automatic || /seguir\s+a\s+loja|checkbox|aplique|ativar|ver\s+cupons\s+dispon[ií]veis/i.test(confirmedText)));
      const couponSkippedByMinimum = preparedItem.raw?.couponSkippedReason === "minimum_purchase_not_met";
      if (couponSkippedByMinimum) {
        const minimumPurchase = Number(preparedItem.raw?.couponMinimumPurchase) || 0;
        addMonitorActivity(monitor.id, "info", `${monitor.name}: os cupons encontrados exigem compra mínima${minimumPurchase > 0 ? ` de ${formatMoney(minimumPurchase, preparedItem.currency || "BRL")}` : " acima do preço do produto"}; enviando a oferta normalmente, sem cupom.`);
      }
      if ((!confirmedCode && !isAutomaticCoupon) || !Number.isFinite(confirmedPrice) || confirmedPrice <= 0) {
        if (!couponSkippedByMinimum) {
          throw new Error("O cartão dizia “com Cupom”, mas nenhum dos cupons salvos foi confirmado para este produto. Nada foi enviado e outro produto será sorteado na próxima tentativa.");
        }
      } else {
        addMonitorActivity(monitor.id, "success", confirmedCode
          ? `${monitor.name}: cupom ${confirmedCode} confirmado; preço final ${formatMoney(confirmedPrice, preparedItem.currency || "BRL")}.`
          : `${monitor.name}: cupom de ativação/seguir loja confirmado; preço final ${formatMoney(confirmedPrice, preparedItem.currency || "BRL")}.`);
      }
    }
    validateAutomaticOfferPricing(selected, preparedItem, requiredDiscount);
    if (!isMercadoLivreShortAffiliateUrl(preparedItem.url)) throw new Error("O Mercado Livre não devolveu o link curto meli.la. Nada foi enviado.");
    addMonitorActivity(monitor.id, "success", `${monitor.name}: link curto confirmado; enviando ao grupo exclusivo.`);
    setMonitorStatus(monitor.id, "sending", "Enviando para o grupo", "Link curto confirmado; aguardando a confirmação da UAZAPI.");
    const reviewCards = carouselEnabled ? (preparedItem.reviews || []).flatMap((review) => {
      const firstMedia = review.media?.[0] || (review.videos?.[0] ? { type: "video" as const, url: review.videos[0] } : null) || (review.images?.[0] ? { type: "image" as const, url: review.images[0] } : null);
      if (!firstMedia) return [];
      return [{ text: review.text || "Avaliação publicada com mídia.", imageUrl: firstMedia.type === "image" ? firstMedia.url : undefined, videoUrl: firstMedia.type === "video" ? firstMedia.url : undefined }];
    }).slice(0, 4) : [];
    let brandedPreviewImage = "";
    if (brandedPreviewEnabled && !carouselEnabled) {
      if (monitor.previewStyle === "ai-home") addMonitorActivity(monitor.id, "info", `${monitor.name}: criando arte Casa e Decoração com IA ou reutilizando o cache.`);
      try {
        brandedPreviewImage = await buildOfferPreview(preparedItem, monitor.previewStyle);
      } catch (caught) {
        addMonitorActivity(monitor.id, "warning", `${monitor.name}: ${caught instanceof Error ? caught.message : "a arte com IA falhou"} Usando o preview horizontal anterior.`);
        brandedPreviewImage = await createBrandedPreviewImage(preparedItem);
      }
    }
    const sendResponse = await fetch("/api/offers/send", {
      method: "POST", headers: { "Content-Type": "application/json", "X-Promozap-Admin-Token": whatsapp.instanceToken.trim() },
      body: JSON.stringify({ destinationJid: monitor.destinationJid, text: prepared.message, imageUrl: preparedItem.imageUrl, includeImage: Boolean(preparedItem.imageUrl), reviewCards, carouselEnabled, carouselButtonLabel: carouselButtonLabel.trim() || "VER OFERTA", brandedPreviewEnabled, brandedPreviewImage, discountPercentage: preparedItem.discountPercentage, rating: preparedItem.rating, productUrl: preparedItem.url, productId: preparedItem.itemId || preparedItem.id, productKey: key, productTitle: preparedItem.title, monitorId: monitor.id }),
    });
    const sendResult = await sendResponse.json() as { error?: string };
    if (!sendResponse.ok) {
      if (sendResponse.status === 409) window.localStorage.setItem(`promozap.monitor.sent.${monitor.id}`, JSON.stringify({ ...sent, [key]: new Date().toISOString() }));
      throw new Error(sendResult.error || "A UAZAPI recusou o envio automático.");
    }
    window.localStorage.setItem(`promozap.monitor.sent.${monitor.id}`, JSON.stringify({ ...sent, [key]: new Date().toISOString() }));
    if (prepared.record.id) await fetch("/api/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: prepared.record.id, status: "sent", destinationGroup: monitor.destinationJid }) }).catch(() => undefined);
    toast.success(`${monitor.name}: oferta enviada para o grupo configurado.`);
    addMonitorActivity(monitor.id, "success", `${monitor.name}: “${selected.title}” enviada com sucesso.`);
    setMonitorStatus(monitor.id, "success", "Oferta enviada com sucesso", selected.title);
    void loadSendHistory();
    return true;
  }

  async function sendRandomMonitorNow(monitorId: string, mode: "manual" | "scheduled" = "manual") {
    const monitor = offerMonitors.find((item) => item.id === monitorId);
    if (!monitor) return false;
    addMonitorActivity(monitorId, "info", mode === "manual"
      ? `${monitor.name}: envio aleatório solicitado; abrindo novamente a fonte antes de escolher.`
      : `${monitor.name}: horário alcançado; abrindo novamente a fonte antes de escolher.`);
    return scanOfferMonitor(monitorId, true);
  }

  async function scanOfferMonitor(monitorId: string, sendAutomatically = false) {
    const monitor = offerMonitors.find((item) => item.id === monitorId);
    if (!monitor) return false;
    if (offerMonitorQueued.current.has(monitorId)) {
      addMonitorActivity(monitorId, "info", `${monitor.name}: esta operação já está na fila; o pedido não foi perdido.`);
      setMonitorStatus(monitorId, "queued", "Aguardando na fila", "Outro nicho está terminando a leitura, o link ou o envio.");
      return false;
    }

    const needsToWait = offerMonitorRunning.current.size > 0 || offerMonitorQueued.current.size > 0;
    offerMonitorQueued.current.add(monitorId);
    if (needsToWait) {
      addMonitorActivity(monitorId, "info", `${monitor.name}: envio colocado na fila; será iniciado assim que a varredura atual terminar.`);
      setMonitorStatus(monitorId, "queued", "Aguardando na fila", `Há ${offerMonitorQueued.current.size} operação(ões) antes deste nicho.`);
    } else {
      setMonitorStatus(monitorId, "checking", "Iniciando a operação", "Reservando o coletor para este nicho.");
    }

    const task = offerMonitorQueue.current.then(async () => {
      offerMonitorQueued.current.delete(monitorId);
      return performOfferMonitorScan(monitorId, sendAutomatically);
    });
    offerMonitorQueue.current = task.then(() => undefined, () => undefined);
    return task;
  }

  async function performOfferMonitorScan(monitorId: string, sendAutomatically = false) {
    const monitor = offerMonitors.find((item) => item.id === monitorId);
    if (!monitor || offerMonitorRunning.current.has(monitorId)) return false;
    offerMonitorRunning.current.add(monitorId);
    addMonitorActivity(monitorId, "info", `${monitor.name}: iniciando pesquisa independente${sendAutomatically ? " e envio automático" : ""}.`);
    setMonitorStatus(monitorId, "scanning", "Lendo as páginas de ofertas", `O coletor está trabalhando somente em ${monitor.name}.`);
    setMonitorRuntimes((current) => ({ ...current, [monitorId]: { ...(current[monitorId] || { offers: [], error: "", lastScan: null }), loading: true, error: "" } }));
    try {
      if (!monitor.destinationJid && sendAutomatically) throw new Error("Escolha o grupo exclusivo desta operação antes de ativar o envio.");
      let collectorToken = localCollectorToken.trim();
      if (!collectorToken) {
        try {
          const sessionResponse = await fetch(`${localCollectorUrl.replace(/\/$/, "")}/session`, { cache: "no-store" });
          const session = await sessionResponse.json() as { ok?: boolean; token?: string; error?: string };
          if (!sessionResponse.ok || !session.token) throw new Error(session.error || "Abra o coletor local.");
          collectorToken = session.token;
          setLocalCollectorToken(collectorToken);
          window.localStorage.setItem("promozap.localCollectorToken", collectorToken);
        } catch (caught) {
          if (caught instanceof TypeError || (caught instanceof Error && /failed to fetch|networkerror|load failed/i.test(caught.message))) {
            throw new Error("O coletor local está fechado ou inacessível. Abra iniciar-coletor.cmd; a chave de envio automático agenda os envios, mas o navegador não pode iniciar um programa do Windows sozinho.");
          }
          throw caught;
        }
      }
      const preferredSource = monitor.kind === "hub" ? monitor.sources[0] : chooseWeightedSource(monitor.sources);
      if (!preferredSource?.url) throw new Error("Cadastre pelo menos uma URL com peso maior que zero.");
      const alternativeSources = monitor.sources
        .filter((source) => source.url && source.id !== preferredSource.id && source.weight > 0)
        .sort(() => Math.random() - 0.5);
      const sourceAttempts = monitor.kind === "hub" ? [preferredSource] : [preferredSource, ...alternativeSources].slice(0, 2);
      const endpoint = monitor.kind === "hub" ? "/scan-affiliate-hub" : "/scan-deals";
      let selectedSource = preferredSource;
      let data: { ok?: boolean; products?: AffiliateHubOffer[]; capturedAt?: string; error?: string } | null = null;
      let lastScanError = "O coletor não conseguiu concluir esta operação.";
      for (let index = 0; index < sourceAttempts.length; index += 1) {
        const candidate = sourceAttempts[index];
        selectedSource = candidate;
        addMonitorActivity(monitorId, "info", `${monitor.name}: lendo ${new URL(candidate.url).hostname}.`);
        setMonitorStatus(monitorId, "scanning", `Lendo a fonte ${index + 1} de ${sourceAttempts.length}`, `${new URL(candidate.url).hostname} · até ${monitor.maxPages} página(s).`);
        const fullPayload = monitor.kind === "hub" ? {} : {
          monitorId, mode: "marketplace", url: candidate.url, limit: 10000,
          scanLimit: 10000, maxPages: monitor.maxPages,
          minDiscount: 0, minRating: 0,
          ignoreInternational: false, realDealsOnly: false, smartphoneFocus: /celular|smartphone|iphone/i.test(monitor.name),
          forceRefresh: true,
        };
        const scanTimeout = monitor.kind === "hub" ? 180_000 : Math.min(600_000, 90_000 + monitor.maxPages * 30_000);
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            data = await postToLocalCollector(endpoint, collectorToken, fullPayload, scanTimeout);
            if (attempt > 0) addMonitorActivity(monitorId, "success", `${monitor.name}: a segunda leitura completa respondeu.`);
            else if (index > 0) addMonitorActivity(monitorId, "success", `${monitor.name}: a URL alternativa respondeu; o horário de envio foi preservado.`);
            break;
          } catch (scanError) {
            lastScanError = scanError instanceof Error ? scanError.message : "O coletor não conseguiu concluir esta operação.";
            if (attempt === 0) addMonitorActivity(monitorId, "warning", `${monitor.name}: a leitura completa demorou ou falhou; repetindo todas as ${monitor.maxPages} página(s), sem reduzir a coleta.`);
          }
        }
        if (data?.ok) break;
        if (index + 1 < sourceAttempts.length) addMonitorActivity(monitorId, "warning", `${monitor.name}: esta fonte não respondeu; tentando outra URL do nicho.`);
      }
      if (!data?.ok) throw new Error(`${lastScanError} O horário continuará pendente e será tentado novamente automaticamente.`);
      const extractedProducts = data.products || [];
      const requiredDiscount = Math.max(1, Number(monitor.minDiscount) || 0);
      const products = extractedProducts.filter((offer) => {
        const discount = offer.discountPercentage || 0;
        const rating = offer.rating || 0;
        return discount >= requiredDiscount && discount <= 90 && rating >= monitor.minRating && (!monitor.ignoreInternational || !offer.isInternational);
      });
      try {
        setMonitorStatus(monitorId, "cataloging", "Atualizando Produtos Catalogados", `${extractedProducts.length} produto(s) encontrados nesta leitura.`);
        await saveCatalogedProducts(monitor, extractedProducts);
        addMonitorActivity(monitorId, "success", `${monitor.name}: ${extractedProducts.length} produto(s) atualizado(s) em Produtos Catalogados.`);
      } catch (catalogError) {
        addMonitorActivity(monitorId, "warning", `${monitor.name}: ${catalogError instanceof Error ? catalogError.message : "falha ao atualizar o catálogo"}`);
      }
      setMonitorRuntimes((current) => ({ ...current, [monitorId]: { offers: products, loading: false, error: "", lastScan: data.capturedAt || new Date().toISOString(), selectedSource: selectedSource.url } }));
      setLocalCollectorConnected(true);
      const couponProducts = products.filter((offer) => Boolean(offer.coupon)).length;
      addMonitorActivity(monitorId, products.length ? "success" : "warning", `${monitor.name}: ${extractedProducts.length} produto(s) encontrado(s); ${products.length} oferta(s) aprovada(s) pelos filtros; ${couponProducts} com cupom detectado.`);
      if (!products.length) toast.info(`${monitor.name}: nenhum produto passou por todos os filtros.`);

      if (sendAutomatically) return await sendRandomMonitorOffer(monitor, products);
      setMonitorStatus(monitor.id, "success", "Pesquisa concluída", `${products.length} oferta(s) aprovada(s) pelos filtros.`);
      return false;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Falha na operação.";
      setMonitorRuntimes((current) => ({ ...current, [monitorId]: { ...(current[monitorId] || { offers: [], lastScan: null }), loading: false, error: message } }));
      addMonitorActivity(monitorId, "error", `${monitor.name}: ${message}`);
      setMonitorStatus(monitorId, "error", "A operação não foi concluída", message);
      setLocalCollectorConnected(false);
      return false;
    } finally { offerMonitorRunning.current.delete(monitorId); }
  }

  function openMonitoredDeal(item: MonitoredDeal) {
    setSelectedCatalogItem(item);
    setOfferDestination((current) => current || destinationGroups[0]?.JID || "");
    setOfferIncludeImage(Boolean(item.imageUrl));
    setOfferMessage(composeOfferMessage(item));
  }

  async function prepareCatalogOffer(item: CatalogItem) {
    setSelectedCatalogItem(item);
    setOfferDestination((current) => current || destinationGroups[0]?.JID || "");
    setOfferIncludeImage(Boolean(item.imageUrl));
    setOfferMessage(composeOfferMessage(item));
    if (!item.url) return;
    setOfferPreparing(true);
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: item.url, destinationGroup: offerDestination || destinationGroups[0]?.JID || "" }),
      });
      const result = await response.json() as { products?: ProductRecord[]; error?: string };
      const prepared = result.products?.[0];
      const link = prepared?.affiliateUrl || item.url;
      setOfferMessage(composeOfferMessage(item, link));
      if (!prepared?.affiliateUrl && catalogSearchStore === "mercadolivre") toast.warning("O produto foi preparado, mas o gerador de afiliado não devolveu um novo link. Revise a sessão do Mercado Livre.");
    } catch {
      setOfferMessage(composeOfferMessage(item));
    } finally {
      setOfferPreparing(false);
    }
  }

  async function sendPreparedOffer() {
    if (!selectedCatalogItem) return;
    if (!offerDestination) return toast.error("Escolha o grupo de destino.");
    if (!offerMessage.trim()) return toast.error("Escreva a mensagem da oferta.");
    if (!whatsapp.instanceToken.trim()) return toast.error("Informe o token da UAZAPI em Credenciais.");
    setOfferSending(true);
    try {
      const reviewCards = carouselEnabled ? (selectedCatalogItem.reviews || []).flatMap((review) => {
        const firstMedia = review.media?.[0]
          || (review.videos?.[0] ? { type: "video" as const, url: review.videos[0] } : null)
          || (review.images?.[0] ? { type: "image" as const, url: review.images[0] } : null);
        if (!firstMedia) return [];
        return [{
          text: review.text || "Avaliação publicada com mídia.",
          imageUrl: firstMedia.type === "image" ? firstMedia.url : undefined,
          videoUrl: firstMedia.type === "video" ? firstMedia.url : undefined,
        }];
      }).slice(0, 4) : [];
      const response = await fetch("/api/offers/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Promozap-Admin-Token": whatsapp.instanceToken.trim() },
        body: JSON.stringify({ destinationJid: offerDestination, text: offerMessage, imageUrl: selectedCatalogItem.imageUrl, includeImage: offerIncludeImage, reviewCards, carouselEnabled, carouselButtonLabel: carouselButtonLabel.trim() || "VER OFERTA", productUrl: selectedCatalogItem.url, productId: selectedCatalogItem.itemId || selectedCatalogItem.id, productTitle: selectedCatalogItem.title }),
      });
      const result = await response.json() as { error?: string; destination?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar a oferta.");
      toast.success(`Oferta enviada para ${result.destination || "o grupo"}.`);
      setSelectedCatalogItem(null);
      await loadLogs();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Não foi possível enviar a oferta.");
    } finally {
      setOfferSending(false);
    }
  }

  async function markProductSent(id: string) {
    try {
      const response = await fetch("/api/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "sent" }) });
      if (!response.ok) throw new Error();
      toast.success("Produto marcado como enviado.");
      await loadProducts();
    } catch {
      toast.error("Não foi possível atualizar o produto.");
    }
  }

  async function refreshProductData(id: string) {
    if (!whatsapp.instanceToken.trim()) return toast.error("Informe o token da UAZAPI na configuração para autorizar a atualização.");
    setEnrichingProductId(id);
    try {
      const response = await fetch("/api/products/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Promozap-Admin-Token": whatsapp.instanceToken.trim() },
        body: JSON.stringify({ id }),
      });
      const result = await response.json() as { error?: string; source?: string };
      if (!response.ok) throw new Error(result.error || "A loja não retornou os dados.");
      toast.success(`Dados atualizados${result.source ? ` via ${result.source}` : ""}.`);
      await loadProducts();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Não foi possível atualizar os dados.");
    } finally {
      setEnrichingProductId("");
    }
  }

  useEffect(() => {
    if (activeTab === "products" || activeTab === "catalog") void loadProducts();
    if (activeTab === "products") void loadSendHistory();
  }, [activeTab, productStatus]);

  useEffect(() => {
    if (activeTab !== "products" && activeTab !== "catalog") return;
    const timer = window.setInterval(() => void loadProducts(), 10_000);
    return () => window.clearInterval(timer);
  }, [activeTab, productStatus, productSearch]);

  useEffect(() => {
    if (activeTab !== "logs") return;
    void loadAutomationLogs();
    const timer = window.setInterval(() => void loadAutomationLogs(), 6_000);
    return () => window.clearInterval(timer);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "discovery" || activeTab === "ml-api") {
      void loadCatalogCredentialStatus();
      if (!mercadoLivreCategories.length) void loadMercadoLivreCategories();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "monitoring") void loadCatalogedProducts();
  }, [activeTab, catalogedCategory]);

  useEffect(() => {
    if (activeTab !== "ranking") return;
    void loadPriceDropRanking();
    if (!catalogedCategories.length) void loadCatalogedProducts();
  }, [activeTab, rankingCategory]);

  useEffect(() => {
    if (!monitoringActive) return;
    void scanMonitoredDeals();
    const timer = window.setInterval(() => void scanMonitoredDeals(), Math.max(1, Number(monitoringIntervalMinutes)) * 60_000);
    return () => window.clearInterval(timer);
  }, [monitoringActive, monitoringIntervalMinutes, monitoringCategory, monitoringMinDiscount, localCollectorUrl, localCollectorToken]);

  useEffect(() => {
    if (!affiliateHubAutoSend) return;
    void scanAffiliateHub(true);
    const timer = window.setInterval(() => void scanAffiliateHub(true), Math.max(1, Number(affiliateHubInterval) || 5) * 60_000);
    return () => window.clearInterval(timer);
  }, [affiliateHubAutoSend, affiliateHubInterval, affiliateHubDestination, localCollectorUrl, localCollectorToken, whatsapp.instanceToken, carouselEnabled, carouselButtonLabel]);

  useEffect(() => {
    if (!offerMonitorsLoaded) return;
    const active = offerMonitors.filter((monitor) => monitor.autoSend);
    refreshIdleMonitorStatuses(offerMonitors);
    if (!active.length) {
      setAutomationCoordinator("offline");
      return;
    }
    let disposed = false;
    let leaseToken = localCollectorToken.trim();
    if (!automationOwnerId.current) automationOwnerId.current = crypto.randomUUID();
    const ownerId = automationOwnerId.current;
    const collectorBase = localCollectorUrl.replace(/\/$/, "");

    const heartbeat = async () => {
      try {
        if (!leaseToken) {
          const sessionResponse = await fetch(`${collectorBase}/session`, { cache: "no-store" });
          const session = await sessionResponse.json() as { token?: string };
          if (!sessionResponse.ok || !session.token) throw new Error("Coletor sem sessão ativa.");
          leaseToken = session.token;
          setLocalCollectorToken(leaseToken);
          window.localStorage.setItem("promozap.localCollectorToken", leaseToken);
        }
        const response = await fetch(`${collectorBase}/automation/lease`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Promozap-Local-Token": leaseToken },
          body: JSON.stringify({ ownerId, action: "acquire" }),
        });
        const result = await response.json() as { leader?: boolean; error?: string };
        if (!response.ok) throw new Error(result.error || "O coletor não aceitou a coordenação entre abas.");
        if (!disposed) {
          setAutomationCoordinator(result.leader ? "leader" : "follower");
          setMonitorStatuses((current) => Object.fromEntries(Object.entries(current).filter(([, status]) => status.message !== "Coletor desconectado")));
          refreshIdleMonitorStatuses(offerMonitors);
        }
      } catch {
        if (!disposed) {
          setAutomationCoordinator("offline");
          setMonitorStatuses((current) => {
            const next = { ...current };
            for (const monitor of active) {
              const phase = current[monitor.id]?.phase;
              if (phase && ["queued", "checking", "scanning", "cataloging", "preparing", "linking", "writing", "sending"].includes(phase)) continue;
              next[monitor.id] = { phase: "error", message: "Coletor desconectado", detail: "Abra ou reinicie o coletor local para retomar a agenda.", nextAt: null, updatedAt: new Date().toISOString() };
            }
            return next;
          });
        }
      }
    };

    void heartbeat();
    const timer = window.setInterval(() => void heartbeat(), 5_000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      if (leaseToken) void fetch(`${collectorBase}/automation/lease`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Promozap-Local-Token": leaseToken },
        body: JSON.stringify({ ownerId, action: "release" }),
        keepalive: true,
      }).catch(() => undefined);
    };
  }, [offerMonitorsLoaded, localCollectorUrl, localCollectorToken, offerMonitors.map((monitor) => `${monitor.id}:${monitor.autoSend}:${monitor.dailyTarget}:${monitor.sendStartTime}:${monitor.sendEndTime}:${monitor.scheduleEnabled}`).join("|")]);

  useEffect(() => {
    if (!offerMonitorsLoaded || automationCoordinator !== "leader") return;
    const active = offerMonitors.filter((monitor) => monitor.autoSend);
    if (!active.length) return;
    const tick = () => {
      setMonitorScheduleRevision((value) => value + 1);
      active.forEach((monitor) => {
        void runScheduledMonitor(monitor);
      });
    };
    const wake = () => {
      if (document.visibilityState === "visible") tick();
    };
    tick();
    const timer = window.setInterval(tick, 30_000);
    window.addEventListener("focus", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [offerMonitors, offerMonitorsLoaded, automationCoordinator, localCollectorUrl, localCollectorToken, whatsapp.instanceToken, carouselEnabled, carouselButtonLabel]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const product = params.get("product");
    if (product) {
      setActiveTab("discovery");
      setLocalCollectorInput(product);
      window.history.replaceState({}, "", `${window.location.pathname}#consultar-produtos`);
      toast.info("Produto recebido do coletor. Clique em “Abrir Chrome e extrair dados” para atualizar e enviar.");
      return;
    }
    const oauth = params.get("ml_oauth");
    if (!oauth) return;
    setActiveTab("ml-api");
    if (oauth === "success") toast.success("Mercado Livre conectado. A renovação do token será automática.");
    else toast.error(params.get("ml_message") || "Não foi possível conectar o Mercado Livre.");
    void loadCatalogCredentialStatus();
    window.history.replaceState({}, "", `${window.location.pathname}#consulta-api-ml`);
  }, []);

  async function testWhatsappConnection() {
    if (!whatsapp.serverUrl.trim() || !whatsapp.instanceToken.trim()) {
      toast.error("Informe a URL e o token da instância.");
      return;
    }
    setWhatsappTesting(true);
    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverUrl: whatsapp.serverUrl, token: whatsapp.instanceToken }),
      });
      const result = await response.json() as { groups?: Group[]; error?: string };
      if (!response.ok) throw new Error(result.error || "A conexão foi recusada.");
      const nextGroups = result.groups || [];
      setGroups(nextGroups);
      setConfigs((current) => {
        const next = { ...current };
        for (const group of nextGroups) {
          if (next[group.JID]) continue;
          next[group.JID] = {
            jid: group.JID,
            name: group.Name || group.JID,
            role: "ignored",
            category: "geral",
            destinationJid: "",
            enabled: false,
          };
        }
        return next;
      });
      setWhatsappConnected(true);
      setDemo(false);
      setError("");
      toast.success(`UAZAPI conectada: ${(result.groups || []).length} grupo(s) encontrado(s).`);
      await setupUazapiWebhook(false);
    } catch (caught) {
      setWhatsappConnected(false);
      toast.error(caught instanceof Error ? caught.message : "Não foi possível conectar à UAZAPI.");
    } finally {
      setWhatsappTesting(false);
    }
  }

  const pageMeta = {
    automation: ["Automação", "Configure os nichos, agendas e envios automáticos de ofertas."],
    groups: ["Grupos", "Organize fontes, destinos e categorias da operação."],
    generate: ["Gerar promoção", "Cole um produto, revise a mensagem e envie para seus grupos."],
    products: ["Histórico", "Acompanhe os produtos identificados, convertidos e enviados."],
    catalog: ["Dados dos produtos", "Veja tudo o que foi extraído das ofertas enviadas do Mercado Livre."],
    discovery: ["Consultar produtos", "Pesquise recomendações, preços e filtros nos catálogos oficiais."],
    "ml-api": ["Consulta API Mercado Livre", "Consulte um anúncio pelo ID e inspecione todos os campos autorizados pela API oficial."],
    monitoring: ["Produtos Catalogados", "Consulte os produtos encontrados, seus dados e o histórico de preços observado."],
    ranking: ["Ranking de Quedas", "Veja quais produtos realmente caíram de preço com base nas medições anteriores."],
    templates: ["Layout das mensagens", "Monte o texto das ofertas com variáveis preenchidas automaticamente."],
    coupons: ["Cupons", "Aplique códigos, acompanhe regras e use o cupom correto em cada oferta."],
    credentials: ["Credenciais", "Centralize as integrações da UAZAPI, afiliados, APIs e coletor local."],
    logs: ["Logs", "Acompanhe os eventos e diagnósticos da operação."],
  }[activeTab] || ["Painel DesconteX", "Operação de grupos de ofertas."];
  const activeOfferMonitor = offerMonitors.find((monitor) => monitor.id === activeOfferMonitorId) || offerMonitors[0];
  const activeMonitorRuntime = activeOfferMonitor ? monitorRuntimes[activeOfferMonitor.id] || { offers: [], loading: false, error: "", lastScan: null } : { offers: [], loading: false, error: "", lastScan: null };
  useEffect(() => {
    if (!activeOfferMonitor) return;
    setScheduleDraft({ dailyTarget: activeOfferMonitor.dailyTarget, sendStartTime: activeOfferMonitor.sendStartTime, sendEndTime: activeOfferMonitor.sendEndTime });
  }, [activeOfferMonitor?.id, activeOfferMonitor?.dailyTarget, activeOfferMonitor?.sendStartTime, activeOfferMonitor?.sendEndTime]);
  const activeDailySchedule = useMemo(() => {
    if (!activeOfferMonitor || typeof window === "undefined") return null;
    return monitorDailyState(activeOfferMonitor, new Date());
  }, [activeOfferMonitor, monitorScheduleRevision]);
  const draftSchedulePreview = useMemo(() => activeOfferMonitor
    ? monitorScheduleSettings({ ...activeOfferMonitor, ...scheduleDraft })
    : null, [activeOfferMonitor, scheduleDraft]);

  function saveActiveMonitorSchedule() {
    if (!activeOfferMonitor || !draftSchedulePreview) return;
    updateOfferMonitor(activeOfferMonitor.id, {
      dailyTarget: draftSchedulePreview.requestedTarget,
      sendStartTime: scheduleDraft.sendStartTime,
      sendEndTime: scheduleDraft.sendEndTime,
      minimumSpacingMinutes: draftSchedulePreview.minimumSpacingMinutes,
    });
    window.localStorage.removeItem(`promozap.monitor.dailySchedule.${activeOfferMonitor.id}`);
    setMonitorScheduleRevision((value) => value + 1);
    toast.success(`Agenda de ${activeOfferMonitor.name} salva.`);
  }

  return (
    <main className="promozap-light min-h-screen bg-background text-foreground">
      <Toaster position="top-center" richColors />
      <div className="min-h-screen lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[#243029] bg-[#070a08] lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="flex h-[76px] items-center border-b border-[#243029] px-4">
              <div className="flex h-14 w-full items-center rounded-xl bg-white px-3 shadow-sm"><Image src="/descontex-logo.png" width={190} height={63} alt="DesconteX" className="h-auto w-[190px] object-contain" priority /></div>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3 text-sm">
              {[
                ["automation", "Automação", Activity],
                ["generate", "Gerar promoção", Sparkles],
                ["groups", "Grupos", UsersRound],
                ["products", "Histórico", PackageSearch],
                ["catalog", "Dados dos produtos", Database],
                ["discovery", "Consultar produtos", Search],
                ["ml-api", "Consulta API ML", Database],
                ["monitoring", "Produtos Catalogados", ShoppingBag],
                ["ranking", "Ranking de Quedas", TrendingDown],
                ["templates", "Layout das mensagens", LayoutTemplate],
                ["coupons", "Cupons", TicketPercent],
                ["logs", "Logs", ScrollText],
                ["credentials", "Credenciais", KeyRound],
              ].map(([value, label, Icon]) => (
                <button key={String(value)} onClick={() => setActiveTab(String(value))} className={`promozap-menu-item flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left font-semibold transition-colors ${activeTab === value ? "promozap-menu-active bg-[#62ef8b] text-[#07140b] ring-1 ring-[#80f59f]/55" : "text-[#e0e8e2] hover:bg-[#18221b] hover:text-white"}`}>
                  <Icon className="size-4 shrink-0" /><span className="truncate">{label}</span>
                </button>
              ))}
            </nav>
            <div className="border-t border-[#243029] p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-[#101612] px-3 py-3">
                <div className="min-w-0"><p className="truncate text-sm font-medium">José Augusto</p><p className="truncate text-xs text-[#62ef8b]">Operação DesconteX</p></div>
                <button onClick={() => setActiveTab("credentials")} aria-label="Abrir credenciais" className="grid size-8 place-items-center rounded-lg text-[#94a69b] hover:bg-[#1b241e] hover:text-white"><Settings2 className="size-4" /></button>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[#243029] bg-[#030504]/88 px-4 py-3 backdrop-blur-xl sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="rounded-lg bg-white px-2 py-1 lg:hidden"><Image src="/descontex-logo.png" width={140} height={47} alt="DesconteX" className="h-auto w-32 object-contain" priority /></span>
              <div className="relative hidden max-w-sm flex-1 lg:block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#718079]" /><Input value={activeTab === "groups" ? search : ""} onChange={(event) => { setActiveTab("groups"); setSearch(event.target.value); }} placeholder="Buscar grupos..." className="h-10 border-[#2a3730] bg-[#0d1310] pl-9" /></div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="icon" className="border-[#2a3730] bg-[#0d1310] text-[#94a69b] hover:bg-[#172019]" aria-label="Notificações"><Bell className="size-4" /></Button>
              <button onClick={() => setActiveTab("credentials")} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${whatsappConnected ? "border-[#2f7042] bg-[#102218] text-[#72f295]" : "border-[#3b443e] bg-[#111512] text-[#a7afa9]"}`}><span className={`size-2 rounded-full ${whatsappConnected ? "bg-[#31d365]" : "bg-[#778078]"}`} />{whatsappConnected ? "Conectado" : "Configurar"}</button>
            </div>
          </header>

          <section className="min-w-0 space-y-6 p-4 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0"><h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{pageMeta[0]}</h1><p className="mt-1 text-sm text-[#94a69b]">{pageMeta[1]}</p></div>
              <Button onClick={() => void loadData()} variant="outline" className="h-10 rounded-lg border-[#2b3830] bg-[#0d1310] text-white hover:bg-[#162019]"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Atualizar</Button>
            </div>

          <div className="mb-6 grid grid-cols-3 overflow-hidden rounded-2xl border border-[#27322b] bg-[#0b100d] shadow-[0_18px_50px_rgba(0,0,0,.28)]">
            {(activeTab === "generate" ? promotionStatItems : activeTab === "products" ? productStatItems : activeTab === "catalog" ? catalogStatItems : activeTab === "discovery" ? discoveryStatItems : statItems).map(({ value, label, Icon }, index) => (
              <div key={label} className={`px-3 py-4 sm:px-5 ${index ? "border-l border-[#27322b]" : ""}`}>
                <Icon className="mb-2 size-4 text-[#00a947]" />
                <p className="text-2xl font-extrabold tracking-tight">{value}</p>
                <p className="text-xs text-[#94a69b] sm:text-sm">{label}</p>
              </div>
            ))}
          </div>

          {demo && <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><CircleAlert className="mt-0.5 size-4 shrink-0" /><span>Prévia com grupos de exemplo. Na versão publicada, o painel usa os grupos da sua instância.</span></div>}
          {error && <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><CircleAlert className="mt-0.5 size-4 shrink-0" /><span>{error}</span></div>}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-5">
            <TabsList className="h-12 w-full justify-start overflow-x-auto rounded-xl border border-[#27322b] bg-[#0b100d] p-1 lg:hidden">
              <TabsTrigger value="automation" className="h-10 min-w-32 rounded-lg px-4">Automação</TabsTrigger>
              <TabsTrigger value="generate" className="h-10 min-w-40 rounded-lg px-4">Gerar promoção</TabsTrigger>
              <TabsTrigger value="groups" className="h-10 min-w-28 rounded-lg px-4">Grupos</TabsTrigger>
              <TabsTrigger value="products" className="h-10 min-w-28 rounded-lg px-4">Histórico</TabsTrigger>
              <TabsTrigger value="catalog" className="h-10 min-w-40 rounded-lg px-4">Dados dos produtos</TabsTrigger>
              <TabsTrigger value="discovery" className="h-10 min-w-40 rounded-lg px-4">Consultar produtos</TabsTrigger>
              <TabsTrigger value="ml-api" className="h-10 min-w-40 rounded-lg px-4">Consulta API ML</TabsTrigger>
              <TabsTrigger value="monitoring" className="h-10 min-w-36 rounded-lg px-4">Produtos Catalogados</TabsTrigger>
              <TabsTrigger value="ranking" className="h-10 min-w-36 rounded-lg px-4">Ranking de Quedas</TabsTrigger>
              <TabsTrigger value="templates" className="h-10 min-w-40 rounded-lg px-4">Layout das mensagens</TabsTrigger>
              <TabsTrigger value="coupons" className="h-10 min-w-28 rounded-lg px-4">Cupons</TabsTrigger>
              <TabsTrigger value="logs" className="h-10 min-w-28 rounded-lg px-4">Logs</TabsTrigger>
              <TabsTrigger value="credentials" className="h-10 min-w-36 rounded-lg px-4">Credenciais</TabsTrigger>
            </TabsList>

            <TabsContent value="groups" id="grupos">
              <Card className="gap-0 overflow-hidden border-[#dce7df] py-0 shadow-[0_10px_30px_rgba(7,20,22,.05)]">
                <CardHeader className="border-b border-[#e4ece7] px-4 py-5 sm:px-6">
                  <CardTitle className="text-xl">Seus grupos do WhatsApp</CardTitle>
                  <CardDescription>Marque os grupos-fonte, seus grupos de destino e a categoria de cada rota.</CardDescription>
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#7a8880]" />
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar grupo pelo nome" className="h-11 rounded-xl border-[#dce7df] bg-[#f8fbf9] pl-10" />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-[#66736c]"><LoaderCircle className="size-5 animate-spin text-[#00c853]" /> Carregando grupos...</div>
                  ) : filteredGroups.length === 0 ? (
                    <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><UsersRound className="mb-3 size-8 text-[#9bad9f]" /><p className="font-semibold">Nenhum grupo encontrado</p><p className="mt-1 text-sm text-[#66736c]">Confira a conexão ou tente outra busca.</p></div>
                  ) : filteredGroups.map((group) => {
                    const config = configs[group.JID];
                    if (!config) return null;
                    return (
                      <div key={group.JID} className="border-b border-[#edf2ee] p-4 last:border-0 sm:p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#e9f9ee] text-sm font-extrabold text-[#008f3d]">{initials(group.Name || "G")}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-bold">{group.Name || "Grupo sem nome"}</p>
                              {config.role !== "ignored" && <Badge className={config.role === "source" ? "bg-[#e7f9ed] text-[#087c39]" : "bg-[#071416] text-white"}>{roleLabel(config.role)}</Badge>}
                            </div>
                            <p className="mt-1 truncate text-xs text-[#7a8880]">{group.Topic || `${group.ParticipantCount || 0} participantes`}</p>
                          </div>
                          <Switch checked={config.enabled} onCheckedChange={(enabled) => patchConfig(group.JID, { enabled })} disabled={config.role === "ignored"} aria-label={`Ativar ${group.Name}`} />
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <label className="space-y-1.5 text-xs font-semibold text-[#526159]">
                            Função do grupo
                            <NativeSelect value={config.role} onChange={(event) => patchConfig(group.JID, { role: event.target.value as Role, enabled: event.target.value !== "ignored" })} className="h-11 w-full rounded-xl bg-white text-sm">
                              <NativeSelectOption value="ignored">Ignorar</NativeSelectOption>
                              <NativeSelectOption value="source">Monitorar como fonte</NativeSelectOption>
                              <NativeSelectOption value="destination">Meu grupo de destino</NativeSelectOption>
                            </NativeSelect>
                          </label>
                          <label className="space-y-1.5 text-xs font-semibold text-[#526159]">
                            Categoria
                            <NativeSelect value={config.category} onChange={(event) => patchConfig(group.JID, { category: event.target.value })} disabled={config.role === "ignored"} className="h-11 w-full rounded-xl bg-white text-sm">
                              {categories.map(([value, label]) => <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>)}
                            </NativeSelect>
                          </label>
                          <label className="space-y-1.5 text-xs font-semibold text-[#526159]">
                            Enviar as ofertas para
                            <NativeSelect value={config.destinationJid} onChange={(event) => patchConfig(group.JID, { destinationJid: event.target.value })} disabled={config.role !== "source"} className="h-11 w-full rounded-xl bg-white text-sm">
                              <NativeSelectOption value="">Escolher meu grupo</NativeSelectOption>
                              {destinationGroups.map((destination) => <NativeSelectOption key={destination.JID} value={destination.JID}>{destination.Name}</NativeSelectOption>)}
                            </NativeSelect>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => void saveGroups()} disabled={saving} className="h-12 w-full rounded-xl bg-[#00c853] px-6 text-[#04140a] shadow-[0_10px_30px_rgba(0,200,83,.28)] hover:bg-[#16dc61] sm:w-auto">{saving ? <LoaderCircle className="animate-spin" /> : <Check />} Salvar organização</Button>
              </div>
            </TabsContent>

            <TabsContent value={activeTab === "automation" ? "automation" : "generate"} id={activeTab === "automation" ? "automacao" : "gerar-promocao"} className="promotion-builder">
              <div className="space-y-5">
                {activeTab === "generate" ? <Card className="overflow-hidden border-[#26372d] bg-[#09100c] shadow-[0_20px_60px_rgba(0,0,0,.24)]">
                  <CardHeader className="border-b border-[#213028] bg-[linear-gradient(110deg,rgba(0,200,83,.13),transparent_56%)]">
                    <div className="flex items-start gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#30dd6b] text-[#04140a]"><Sparkles className="size-5" /></div>
                      <div><CardTitle className="text-xl">Transformar produto em promoção</CardTitle><CardDescription className="mt-1">Cole um link do Mercado Livre. O painel busca a foto, os preços e converte o link de afiliado.</CardDescription></div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                      <label className="space-y-2 text-sm font-bold">Link do produto<Input value={promotionInput} onChange={(event) => setPromotionInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void generatePromotionPreview(); }} placeholder="https://www.mercadolivre.com.br/..." className="h-12 border-[#35483d] bg-[#050806]" /></label>
                      <Button onClick={() => void generatePromotionPreview()} disabled={promotionLoading} className="h-12 self-end rounded-xl bg-[#30dd6b] font-black text-[#04140a] hover:bg-[#55ec82]">{promotionLoading ? <LoaderCircle className="animate-spin" /> : <Sparkles />} {promotionLoading ? "Buscando dados..." : "Gerar promoção"}</Button>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[#829389]">A imagem usada será a imagem oficial encontrada na loja. No Mercado Livre, o coletor local completa preço, preço anterior, frete, parcelas e estoque. O texto segue o modelo salvo em “Layout das mensagens”.</p>
                    {promotionDataWarning ? <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#d69e35] bg-[#2a210d] p-3 text-sm leading-6 text-[#f4d277]"><CircleAlert className="mt-0.5 size-4 shrink-0" /><span>{promotionDataWarning}</span></div> : null}
                    {promotionAffiliateError ? <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#d45b5b] bg-[#2b1111] p-3 text-sm leading-6 text-[#ffaaaa]"><CircleAlert className="mt-0.5 size-4 shrink-0" /><span>{promotionAffiliateError}</span></div> : null}
                  </CardContent>
                </Card> : null}

                {activeTab === "automation" ? <Card className="overflow-hidden border-[#26372d] bg-[#09100c] shadow-none">
                  <CardHeader className="border-b border-[#213028]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><CardTitle className="flex items-center gap-2 text-xl"><Radar className="size-5 text-[#30dd6b]" /> Operações de monitoramento</CardTitle><CardDescription className="mt-2 max-w-3xl">Cada nicho tem sua própria meta diária, janela de envio, grupo e filtros. A agenda distribui as ofertas ao longo do dia com horários levemente aleatórios; produtos enviados continuam em cooldown por 24 horas.</CardDescription></div><Button type="button" onClick={() => setNewNicheOpen(true)} variant="outline" className="border-[#35483d] bg-[#111813] text-white"><Plus /> Criar novo nicho</Button></div>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-5">
                    <div className="overflow-hidden rounded-2xl border border-[#cddce8] bg-[#f4f9ff] text-[#17324d] shadow-[0_14px_38px_rgba(16,78,130,.08)]">
                      <div className="flex flex-col gap-3 border-b border-[#d7e4ef] bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div><p className="flex items-center gap-2 text-base font-black"><Activity className="size-4 text-[#087bd3]" /> Status atual</p><p className="mt-1 text-xs text-[#60788e]">Uma única operação usa o navegador por vez, da leitura até a confirmação do envio.</p></div>
                        <Badge className={automationCoordinator === "leader" ? "bg-[#dff7e7] text-[#176b38]" : automationCoordinator === "follower" ? "bg-[#e8f2ff] text-[#075fa8]" : automationCoordinator === "offline" ? "bg-[#ffe5e1] text-[#a22b1f]" : "bg-[#fff1c7] text-[#765500]"}>
                          {automationCoordinator === "leader" ? "Esta aba controla a automação" : automationCoordinator === "follower" ? "Outra aba controla a automação" : automationCoordinator === "offline" ? "Coletor desconectado" : "Conectando ao coletor"}
                        </Badge>
                      </div>
                      <div className="grid gap-px bg-[#d7e4ef] md:grid-cols-2 xl:grid-cols-3">
                        {offerMonitors.map((monitor) => {
                          const status = monitorStatuses[monitor.id] || { phase: monitor.autoSend ? "checking" as const : "paused" as const, message: monitor.autoSend ? "Calculando a agenda" : "Envio automático pausado", detail: monitor.autoSend ? "Aguardando o coletor informar a próxima ação." : "Use a chave do nicho para retomar.", nextAt: null, updatedAt: "" };
                          const busy = ["queued", "checking", "scanning", "cataloging", "preparing", "linking", "writing", "sending"].includes(status.phase);
                          const tone = status.phase === "error" ? "bg-[#fff7f5] text-[#a22b1f]" : status.phase === "success" ? "bg-[#f2fbf5] text-[#176b38]" : status.phase === "paused" ? "bg-[#f7f9fb] text-[#667788]" : status.phase === "waiting" ? "bg-white text-[#17324d]" : "bg-[#eef7ff] text-[#075fa8]";
                          return <button key={monitor.id} type="button" onClick={() => setActiveOfferMonitorId(monitor.id)} className={`min-h-32 p-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#087bd3] ${tone}`}>
                            <div className="flex items-start justify-between gap-3"><span className="font-black leading-5">{monitor.name}</span>{busy ? <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin" /> : status.phase === "success" ? <BadgeCheck className="mt-0.5 size-4 shrink-0" /> : status.phase === "error" ? <span className="group/error relative mt-0.5 flex shrink-0 items-center gap-1.5"><CircleAlert className="size-4" /><span title={status.detail || status.message} aria-label={`Motivo do erro: ${status.detail || status.message}`} className="grid size-5 place-items-center rounded-full border border-[#e3a49d] bg-white text-[11px] font-black text-[#a22b1f]">?</span><span role="tooltip" className="pointer-events-none absolute right-0 top-7 z-30 hidden w-72 rounded-xl border border-[#efc7c2] bg-white p-3 text-left text-xs font-medium leading-5 text-[#71342e] shadow-[0_12px_32px_rgba(92,35,28,.18)] group-hover/error:block">{status.detail || status.message}</span></span> : status.phase === "paused" ? <Pause className="mt-0.5 size-4 shrink-0" /> : <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-[#f4a900] shadow-[0_0_0_4px_rgba(244,169,0,.13)]" />}</div>
                            <p className="mt-3 text-sm font-extrabold leading-5">{status.message}</p>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 opacity-75">{status.detail}</p>
                            <div className="mt-3 flex items-center justify-between text-[11px] font-bold opacity-65"><span>{monitor.autoSend ? `${monitor.dailyTarget}/dia` : "Manual"}</span>{status.nextAt ? <span>Próxima {new Date(status.nextAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span> : status.updatedAt ? <span>Atualizado {new Date(status.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span> : null}</div>
                          </button>;
                        })}
                      </div>
                      <div className="border-t border-[#d7e4ef] bg-[#f8fbfd] p-4">
                        <div className="mb-2 flex items-center justify-between"><div><p className="text-sm font-black text-[#263b4e]">Histórico recente</p><p className="mt-0.5 text-xs text-[#6d8091]">As etapas e falhas continuam salvas mesmo após atualizar a página.</p></div><ScrollText className="size-4 text-[#7b8d9c]" /></div>
                        <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-[#dce6df] bg-white p-3 font-mono text-[11px] leading-5">
                          {monitorActivity.length ? monitorActivity.slice(0, 20).map((entry) => <div key={entry.id} className="grid grid-cols-[64px_minmax(0,1fr)] gap-2"><span className="text-[#7b8a81]">{new Date(entry.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span><span className={entry.level === "error" ? "text-[#b42318]" : entry.level === "warning" ? "text-[#8a6100]" : entry.level === "success" ? "text-[#13783d]" : "text-[#405149]"}>{entry.message}</span></div>) : <p className="text-[#7b8a81]">Ative uma operação ou clique em “Pesquisar agora” para acompanhar cada etapa.</p>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">{offerMonitors.map((monitor) => { const selected = monitor.id === activeOfferMonitor?.id; return <button key={monitor.id} type="button" onClick={() => setActiveOfferMonitorId(monitor.id)} className={`min-w-52 rounded-xl border p-3 text-left transition ${selected ? "border-[#22c55e] bg-[#e9fff0] text-[#153824] shadow-[0_0_0_2px_rgba(34,197,94,.12)]" : "border-[#d8e0e6] bg-white text-[#253545] hover:border-[#9fcfb0]"}`}><span className="block truncate text-sm font-black">{monitor.name}</span><span className={`mt-1 block text-xs ${selected ? "text-[#39734d]" : "text-[#6b7c89]"}`}>{monitor.autoSend ? `● ${monitor.dailyTarget || 1}/dia` : "○ Manual"} · {monitor.kind === "hub" ? "Hub" : `${monitor.sources.length} fonte(s)`}</span></button>; })}</div>
                    {activeOfferMonitor ? <>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                        <label className="space-y-2 text-sm font-bold">Nome da operação<Input value={activeOfferMonitor.name} onChange={(event) => updateOfferMonitor(activeOfferMonitor.id, { name: event.target.value })} className="h-11 border-[#35483d] bg-[#050806]" /></label>
                        <label className="space-y-2 text-sm font-bold">Grupo exclusivo<NativeSelect value={activeOfferMonitor.destinationJid} onChange={(event) => updateOfferMonitor(activeOfferMonitor.id, { destinationJid: event.target.value })} className="h-11 border-[#35483d] bg-[#050806]"><NativeSelectOption value="">Escolher grupo</NativeSelectOption>{destinationGroups.map((group) => <NativeSelectOption key={group.JID} value={group.JID}>{group.Name}</NativeSelectOption>)}</NativeSelect></label>
                        <label className="space-y-2 text-sm font-bold">Ofertas por dia<Input type="number" min="1" max="200" value={scheduleDraft.dailyTarget} onChange={(event) => setScheduleDraft((current) => ({ ...current, dailyTarget: Math.min(200, Math.max(1, Number(event.target.value))) }))} className="h-11 border-[#35483d] bg-[#050806]" /></label>
                        <label className="space-y-2 text-sm font-bold">Layout da imagem<NativeSelect value={activeOfferMonitor.previewStyle} onChange={(event) => updateOfferMonitor(activeOfferMonitor.id, { previewStyle: event.target.value as OfferPreviewStyle })} className="h-11 border-[#35483d] bg-[#050806]"><NativeSelectOption value="classic">Informativo</NativeSelectOption><NativeSelectOption value="focus">Produto em destaque</NativeSelectOption>{activeOfferMonitor.id === "casa-decoracao" ? <NativeSelectOption value="ai-home">Cenário com IA</NativeSelectOption> : null}</NativeSelect></label>
                        <div className="flex items-center justify-between self-end rounded-xl border border-[#35483d] bg-[#050806] px-4 py-3"><div><p className="text-sm font-bold">Enviar automático</p><p className="mt-1 text-xs text-[#829389]">Segue a agenda diária</p></div><Switch checked={activeOfferMonitor.autoSend} onCheckedChange={(checked) => { if (checked && !activeOfferMonitor.destinationJid) return toast.error("Escolha primeiro o grupo desta operação."); updateOfferMonitor(activeOfferMonitor.id, { autoSend: checked }); }} /></div>
                        <div className="flex items-center justify-between self-end rounded-xl border border-[#35483d] bg-[#050806] px-4 py-3"><div><p className="text-sm font-bold">CTA por IA</p><p className="mt-1 text-xs text-[#829389]">Somente neste nicho</p></div><Switch checked={activeOfferMonitor.aiCtaEnabled} onCheckedChange={(checked) => updateOfferMonitor(activeOfferMonitor.id, { aiCtaEnabled: checked })} /></div>
                      </div>
                      <div className="grid gap-3 rounded-2xl border border-[#26372d] bg-[#050806] p-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-end">
                        <div className="flex min-h-11 items-center justify-between rounded-xl border border-[#35483d] bg-[#09100c] px-4 py-3"><div><p className="text-sm font-bold">Mostrar parcelas</p><p className="mt-1 text-xs text-[#829389]">Opcional neste nicho</p></div><Switch checked={activeOfferMonitor.showInstallments} onCheckedChange={(checked) => updateOfferMonitor(activeOfferMonitor.id, { showInstallments: checked })} /></div>
                        <label className={`space-y-2 text-sm font-bold ${activeOfferMonitor.showInstallments ? "" : "opacity-45"}`}>Texto da parcela<Input value={activeOfferMonitor.installmentText} disabled={!activeOfferMonitor.showInstallments} onChange={(event) => updateOfferMonitor(activeOfferMonitor.id, { installmentText: event.target.value })} className="h-11 border-[#35483d] bg-[#09100c]" /><span className="block text-[11px] font-normal leading-5 text-[#829389]">Use <code>{"{{quantidade}}"}</code>, <code>{"{{valor_parcela}}"}</code> e <code>{"{{juros}}"}</code>. A linha some se o Mercado Livre não informar as parcelas.</span></label>
                      </div>
                      {activeOfferMonitor.id === "casa-decoracao" ? <div className="overflow-hidden rounded-2xl border border-[#1d65be] bg-gradient-to-br from-[#061b46] via-[#073f91] to-[#087bd3] p-4 shadow-[0_12px_30px_rgba(4,70,160,.22)]">
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-center"><div><div className="flex items-center gap-3"><Image src="/descontex-logo-white.png" width={190} height={64} alt="DesconteX" className="h-auto w-44 object-contain" /><Badge className="bg-[#c9f8ff] text-[#064685]">Teste Casa e Decoração</Badge></div><p className="mt-3 text-sm font-black text-white">Visual da imagem enviada</p><p className="mt-1 max-w-2xl text-xs leading-5 text-[#c9ddf6]">Escolha entre o layout informativo já salvo, a foto oficial ampliada ou o cenário doméstico criado por IA. A escolha fica guardada neste nicho.</p><div className="mt-3 flex flex-wrap gap-2 text-[11px]"><span className="rounded-full bg-white/10 px-3 py-1.5 text-white">Informativo · dados nos cantos</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-white">Produto em destaque · sem custo de IA</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-white">Cenário com IA · cache automático</span></div></div><div className="space-y-3"><NativeSelect value={activeOfferMonitor.previewStyle} onChange={(event) => { updateOfferMonitor(activeOfferMonitor.id, { previewStyle: event.target.value as OfferPreviewStyle }); setAiHomeTestPreview(""); }} className="h-11 border-white/30 bg-white text-[#17324d]"><NativeSelectOption value="classic">Informativo</NativeSelectOption><NativeSelectOption value="focus">Produto em destaque</NativeSelectOption><NativeSelectOption value="ai-home">Cenário com IA</NativeSelectOption></NativeSelect><Button type="button" onClick={() => { const sample = activeMonitorRuntime.offers[0]; if (!sample) return toast.error("Pesquise as ofertas primeiro para termos um produto de teste."); void generateAiHomeTestPreview(sample); }} disabled={aiHomeTestLoading || !activeMonitorRuntime.offers.length} className="h-11 w-full bg-[#19d5e8] font-black text-[#032451] hover:bg-[#5ce8f3]">{aiHomeTestLoading ? <LoaderCircle className="animate-spin" /> : <Sparkles />} {aiHomeTestLoading ? "Montando prévia..." : "Ver este layout"}</Button></div></div>
                        {!brandedPreviewEnabled || carouselEnabled ? <div className="mt-3 rounded-xl border border-[#ffd47a]/40 bg-[#4a3109]/50 px-3 py-2 text-xs leading-5 text-[#ffe4a6]">{!brandedPreviewEnabled ? "Ative “Preview personalizado DesconteX” em Credenciais para usar esta arte nos envios." : "O carrossel está ligado e tem prioridade. Desligue-o em Credenciais para enviar esta arte como preview do link."}</div> : null}
                        {aiHomeTestPreview ? <div className="mt-4 overflow-hidden rounded-xl border border-white/30 bg-black/20 p-2"><img src={aiHomeTestPreview} alt="Prévia da arte Casa e Decoração" className="aspect-[3/2] w-full rounded-lg object-cover" /></div> : null}
                      </div> : null}
                      <div className="rounded-2xl border border-[#d8e3dc] bg-white p-4 text-[#203128] shadow-[0_6px_20px_rgba(31,54,76,.06)]">
                        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-sm font-black text-[#174e2c]">Agenda inteligente de envios</p><p className="mt-1 text-xs leading-5 text-[#66776d]">A meta é distribuída uniformemente pelas horas disponíveis. Desative a janela para permitir envios automáticos também durante a madrugada.</p></div><div className="flex flex-wrap items-center gap-3"><div className="flex min-h-10 items-center gap-3 rounded-xl border border-[#cbd8d0] bg-[#f6faf7] px-3"><div><p className="text-xs font-black text-[#30463a]">Restringir horário</p><p className="text-[10px] text-[#718078]">Por nicho</p></div><Switch checked={activeOfferMonitor.scheduleEnabled !== false} onCheckedChange={(checked) => { updateOfferMonitor(activeOfferMonitor.id, { scheduleEnabled: checked }); window.localStorage.removeItem(`promozap.monitor.dailySchedule.${activeOfferMonitor.id}`); setMonitorScheduleRevision((value) => value + 1); }} /></div><Button type="button" onClick={saveActiveMonitorSchedule} className="shrink-0 bg-[#138244] font-extrabold text-white hover:bg-[#0f6f38]"><Check /> Salvar agenda</Button></div></div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <label className={`space-y-2 text-sm font-bold text-[#30463a] ${activeOfferMonitor.scheduleEnabled === false ? "opacity-45" : ""}`}>Começar a enviar<Input type="time" step="60" value={scheduleDraft.sendStartTime} disabled={activeOfferMonitor.scheduleEnabled === false} onChange={(event) => setScheduleDraft((current) => ({ ...current, sendStartTime: event.target.value }))} className="h-11 border-[#cbd8d0] bg-white text-[#203128]" /></label>
                          <label className={`space-y-2 text-sm font-bold text-[#30463a] ${activeOfferMonitor.scheduleEnabled === false ? "opacity-45" : ""}`}>Parar de enviar<Input type="time" step="60" value={scheduleDraft.sendEndTime} disabled={activeOfferMonitor.scheduleEnabled === false} onChange={(event) => setScheduleDraft((current) => ({ ...current, sendEndTime: event.target.value }))} className="h-11 border-[#cbd8d0] bg-white text-[#203128]" /></label>
                          <div className="space-y-2"><p className="text-sm font-bold text-[#30463a]">Espaçamento automático</p><div className="flex h-11 items-center rounded-md border border-[#cbd8d0] bg-[#f6faf7] px-3 font-black text-[#138244]">{draftSchedulePreview?.minimumSpacingMinutes || 5} minutos no mínimo</div><span className="block text-[11px] text-[#718078]">calculado pela meta e pela janela</span></div>
                        </div>
                        {activeDailySchedule ? <div className="mt-4 grid gap-2 sm:grid-cols-3"><div className="rounded-xl border border-[#e0e8e3] bg-[#f6faf7] p-3"><p className="text-[11px] text-[#718078]">Ritmo planejado</p><p className="mt-1 font-black text-[#174e2c]">{activeDailySchedule.plan.target} por dia · {(activeDailySchedule.plan.target / Math.max(1, activeDailySchedule.plan.endHour - activeDailySchedule.plan.startHour)).toFixed(1)}/h</p></div><div className="rounded-xl border border-[#e0e8e3] bg-[#f6faf7] p-3"><p className="text-[11px] text-[#718078]">Enviadas hoje</p><p className="mt-1 font-black text-[#174e2c]">{activeDailySchedule.state.sentCount} de {activeDailySchedule.plan.target}</p></div><div className="rounded-xl border border-[#e0e8e3] bg-[#f6faf7] p-3"><p className="text-[11px] text-[#718078]">Próximo horário</p><p className="mt-1 font-black text-[#174e2c]">{activeOfferMonitor.autoSend && activeDailySchedule.nextAt ? new Date(activeDailySchedule.nextAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : activeDailySchedule.state.sentCount >= activeDailySchedule.plan.target ? "Meta concluída" : "Automático pausado"}</p></div>{activeDailySchedule.plan.requestedTarget > activeDailySchedule.plan.target ? <p className="sm:col-span-3 rounded-lg border border-[#efd796] bg-[#fff8e6] px-3 py-2 text-xs text-[#805d00]">Nesta janela cabem no máximo {activeDailySchedule.plan.target} envios com segurança. A agenda foi limitada automaticamente.</p> : null}</div> : null}
                        <p className="mt-3 text-[11px] leading-5 text-[#718078]">{activeOfferMonitor.scheduleEnabled === false ? "Restrição de horário desligada: este nicho pode enviar durante as 24 horas do dia." : "A automação funciona enquanto este painel e o coletor local estiverem abertos. Horários perdidos não são acumulados nem enviados todos de uma vez."}</p>
                      </div>
                      {activeOfferMonitor.kind === "urls" ? <>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><label className="space-y-2 text-sm font-bold">Avaliação mínima<Input type="number" min="0" max="5" step="0.1" value={activeOfferMonitor.minRating} onChange={(event) => updateOfferMonitor(activeOfferMonitor.id, { minRating: Math.min(5, Math.max(0, Number(event.target.value))) })} className="h-11 border-[#35483d] bg-[#050806]" /></label><label className="space-y-2 text-sm font-bold">Desconto mínimo (%)<Input type="number" min="0" max="95" value={activeOfferMonitor.minDiscount} onChange={(event) => updateOfferMonitor(activeOfferMonitor.id, { minDiscount: Math.min(95, Math.max(0, Number(event.target.value))) })} className="h-11 border-[#35483d] bg-[#050806]" /></label><label className="space-y-2 text-sm font-bold">Páginas por pesquisa<Input type="number" min="1" max="50" value={activeOfferMonitor.maxPages} onChange={(event) => updateOfferMonitor(activeOfferMonitor.id, { maxPages: Math.min(50, Math.max(1, Number(event.target.value))) })} className="h-11 border-[#35483d] bg-[#050806]" /></label><div className="flex items-center justify-between self-end rounded-xl border border-[#35483d] bg-[#050806] px-4 py-3"><div><p className="text-sm font-bold">Ignorar internacional</p><p className="mt-1 text-xs text-[#829389]">Descarta o cartão antes do ranking</p></div><Switch checked={activeOfferMonitor.ignoreInternational} onCheckedChange={(checked) => updateOfferMonitor(activeOfferMonitor.id, { ignoreInternational: checked })} /></div></div>
                        <div className="space-y-2"><div className="flex items-center justify-between"><p className="text-sm font-black">URLs e chance de escolha</p><Button type="button" size="sm" variant="outline" onClick={() => updateOfferMonitor(activeOfferMonitor.id, { sources: [...activeOfferMonitor.sources, { id: crypto.randomUUID(), url: "", weight: 10 }] })} className="border-[#35483d] bg-[#111813] text-white"><Plus /> URL</Button></div>{activeOfferMonitor.sources.map((source) => <div key={source.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_42px]"><Input value={source.url} onChange={(event) => updateMonitorSource(activeOfferMonitor.id, source.id, { url: event.target.value })} placeholder="https://lista.mercadolivre.com.br/..." className="h-11 border-[#35483d] bg-[#050806]" /><div className="relative"><Input type="number" min="0" max="100" value={source.weight} onChange={(event) => updateMonitorSource(activeOfferMonitor.id, source.id, { weight: Math.min(100, Math.max(0, Number(event.target.value))) })} className="h-11 border-[#35483d] bg-[#050806] pr-8" /><span className="absolute right-3 top-3 text-xs text-[#829389]">%</span></div><Button type="button" variant="outline" onClick={() => updateOfferMonitor(activeOfferMonitor.id, { sources: activeOfferMonitor.sources.filter((item) => item.id !== source.id) })} disabled={activeOfferMonitor.sources.length === 1} className="h-11 border-[#543b3b] bg-[#1b1010] text-[#ffaaa2]"><X /></Button></div>)}</div>
                      </> : <div className="rounded-xl border border-[#31543b] bg-[#0b1710] p-4 text-sm text-[#9eeab3]">A operação geral continua lendo todas as recomendações carregadas no Hub de Afiliados. Para nichos, use operações por URLs com filtros próprios.</div>}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="text-xs leading-5 text-[#829389]"><div className="mb-1 flex flex-wrap items-center gap-2"><Badge className="bg-[#dff7e7] text-[#176b38]">Leitura completa</Badge><span>{activeMonitorRuntime.offers.length} oferta(s) aprovadas · cooldown de 24 horas</span></div>{activeMonitorRuntime.selectedSource ? <p className="max-w-3xl truncate">Última fonte sorteada: {activeMonitorRuntime.selectedSource}</p> : null}{activeMonitorRuntime.lastScan ? <p>Última leitura: {new Date(activeMonitorRuntime.lastScan).toLocaleString("pt-BR")}</p> : <p>A primeira leitura será feita quando a operação iniciar.</p>}<p>Antes de cada envio, a fonte é aberta novamente, todas as páginas configuradas são lidas e a oferta é sorteada da lista completa.</p></div><div className="flex flex-wrap gap-2"><Button type="button" onClick={() => removeOfferMonitor(activeOfferMonitor.id)} disabled={activeOfferMonitor.id === "geral-hub"} variant="outline" className="border-[#543b3b] bg-[#1b1010] text-[#ffaaa2]">Remover</Button><Button type="button" onClick={() => void sendRandomMonitorNow(activeOfferMonitor.id)} disabled={activeMonitorRuntime.loading || !activeOfferMonitor.destinationJid} className="bg-[#0b72d9] font-black text-white hover:bg-[#075eae]"><Send /> Enviar aleatória agora</Button><Button onClick={() => void scanOfferMonitor(activeOfferMonitor.id, false)} disabled={activeMonitorRuntime.loading} className="bg-[#30dd6b] font-black text-[#04140a] hover:bg-[#55ec82]">{activeMonitorRuntime.loading ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} {activeMonitorRuntime.loading ? "Pesquisando..." : "Pesquisar páginas agora"}</Button></div></div>
                      {activeMonitorRuntime.error ? <div className="flex items-start gap-3 rounded-xl border border-[#d69e35] bg-[#2a210d] p-3 text-sm leading-6 text-[#f4d277]"><CircleAlert className="mt-0.5 size-4 shrink-0" /><span>{activeMonitorRuntime.error}</span></div> : null}
                      {activeMonitorRuntime.offers.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{activeMonitorRuntime.offers.slice(0, 80).map((offer) => { const key = offer.itemId || offer.id || offer.url || ""; const sentAt = monitorCooldowns(activeOfferMonitor.id)[key]; return <div key={key} className="overflow-hidden rounded-2xl border border-[#26372d] bg-[#050806]"><div className="aspect-[4/3] bg-white p-3">{offer.imageUrl ? <img src={offer.imageUrl} alt={offer.title} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-[#708078]"><ShoppingBag className="size-10" /></div>}</div><div className="space-y-3 p-4"><div className="flex flex-wrap gap-1.5"><Badge className="bg-[#ffe04b] text-[#251f00]">-{offer.discountPercentage || 0}%</Badge>{offer.rating ? <Badge className="bg-[#173a28] text-[#8df3aa]">★ {offer.rating}</Badge> : null}</div><h3 className="line-clamp-3 min-h-[3.75rem] text-sm font-bold leading-5">{offer.title}</h3><div>{offer.originalPrice ? <p className="text-xs text-[#829389] line-through">{formatMoney(offer.originalPrice)}</p> : null}<p className="text-xl font-black text-[#62ef8b]">{formatMoney(offer.price)}</p></div><p className="text-xs text-[#829389]">{[offer.soldText, offer.rating ? `Nota ${offer.rating}` : null].filter(Boolean).join(" · ")}</p>{sentAt ? <p className="rounded-lg bg-[#251f12] px-2 py-1.5 text-xs font-bold text-[#f1d478]">Cooldown até {new Date(Date.parse(sentAt) + 86400000).toLocaleString("pt-BR")}</p> : null}<Button onClick={() => void generatePromotionPreview(offer.url || "", { previewStyle: activeOfferMonitor.previewStyle, showInstallments: activeOfferMonitor.showInstallments, installmentText: activeOfferMonitor.installmentText })} disabled={!offer.url || promotionLoading} className="h-9 w-full bg-[#18231c] text-[#8df3aa] hover:bg-[#223328]"><Sparkles /> Preparar oferta</Button></div></div>; })}</div> : <div className="rounded-2xl border border-dashed border-[#34483c] px-6 py-8 text-center"><Radar className="mx-auto mb-2 size-8 text-[#4e6958]" /><p className="font-bold">Nenhuma oferta aprovada ainda</p><p className="mt-1 text-sm text-[#829389]">A pesquisa só mostra produtos que passam por todos os filtros desta operação.</p></div>}
                    </> : null}
                  </CardContent>
                </Card> : null}

                <Dialog open={newNicheOpen} onOpenChange={setNewNicheOpen}>
                  <DialogContent className="promozap-light max-h-[92vh] overflow-y-auto border-[#d7e1da] bg-white text-[#17221b] sm:max-w-2xl">
                    <DialogHeader><DialogTitle className="pr-8 text-xl">Criar novo nicho</DialogTitle><DialogDescription>Cadastre a primeira fonte e os filtros iniciais. Depois você poderá adicionar outras URLs e ajustar as porcentagens na própria operação.</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-2">
                      <label className="space-y-2 text-sm font-bold">Nome do nicho<Input value={newNicheDraft.name} onChange={(event) => setNewNicheDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Ex.: Beleza e Cuidados" className="h-11 border-[#cbd8d0] bg-white text-[#17221b]" /></label>
                      <label className="space-y-2 text-sm font-bold">URL inicial do Mercado Livre<Input value={newNicheDraft.url} onChange={(event) => setNewNicheDraft((current) => ({ ...current, url: event.target.value }))} placeholder="https://lista.mercadolivre.com.br/..." className="h-11 border-[#cbd8d0] bg-white text-[#17221b]" /><span className="block text-[11px] font-normal leading-5 text-[#718078]">Esta primeira fonte começa com 100% de chance. Outras URLs podem ser incluídas depois.</span></label>
                      <label className="space-y-2 text-sm font-bold">Grupo de destino opcional<NativeSelect value={newNicheDraft.destinationJid} onChange={(event) => setNewNicheDraft((current) => ({ ...current, destinationJid: event.target.value }))} className="h-11 border-[#cbd8d0] bg-white text-[#17221b]"><NativeSelectOption value="">Escolher depois</NativeSelectOption>{destinationGroups.map((group) => <NativeSelectOption key={group.JID} value={group.JID}>{group.Name}</NativeSelectOption>)}</NativeSelect></label>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="space-y-2 text-sm font-bold">Ofertas por dia<Input type="number" min="1" max="200" value={newNicheDraft.dailyTarget} onChange={(event) => setNewNicheDraft((current) => ({ ...current, dailyTarget: Number(event.target.value) }))} className="h-11 border-[#cbd8d0] bg-white text-[#17221b]" /></label>
                        <label className="space-y-2 text-sm font-bold">Avaliação mínima<Input type="number" min="0" max="5" step="0.1" value={newNicheDraft.minRating} onChange={(event) => setNewNicheDraft((current) => ({ ...current, minRating: Number(event.target.value) }))} className="h-11 border-[#cbd8d0] bg-white text-[#17221b]" /></label>
                        <label className="space-y-2 text-sm font-bold">Desconto mínimo<Input type="number" min="0" max="95" value={newNicheDraft.minDiscount} onChange={(event) => setNewNicheDraft((current) => ({ ...current, minDiscount: Number(event.target.value) }))} className="h-11 border-[#cbd8d0] bg-white text-[#17221b]" /></label>
                        <label className="space-y-2 text-sm font-bold">Páginas<Input type="number" min="1" max="50" value={newNicheDraft.maxPages} onChange={(event) => setNewNicheDraft((current) => ({ ...current, maxPages: Number(event.target.value) }))} className="h-11 border-[#cbd8d0] bg-white text-[#17221b]" /></label>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-[#d8e3dc] bg-[#f7fbf8] px-4 py-3"><div><p className="text-sm font-bold">Mostrar parcelas</p><p className="mt-1 text-xs text-[#718078]">Útil para produtos de maior valor.</p></div><Switch checked={newNicheDraft.showInstallments} onCheckedChange={(checked) => setNewNicheDraft((current) => ({ ...current, showInstallments: checked }))} /></div>
                    </div>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setNewNicheOpen(false)} className="border-[#cbd8d0] bg-white text-[#30463a]">Cancelar</Button><Button type="button" onClick={addOfferMonitor} className="bg-[#24c75a] font-black text-[#04140a] hover:bg-[#46df75]"><Plus /> Criar nicho</Button></div>
                  </DialogContent>
                </Dialog>

                {promotionItem ? <Dialog open={promotionModalOpen} onOpenChange={setPromotionModalOpen}>
                  <DialogContent className="promozap-light promotion-builder max-h-[94vh] overflow-y-auto border-[#d7e1da] bg-white text-[#17221b] sm:max-w-[min(1500px,96vw)]">
                    <DialogHeader><DialogTitle className="pr-8 text-xl">Preparar oferta</DialogTitle><DialogDescription>Revise os dados, a mensagem e os grupos antes de enviar. Use o X para fechar esta janela.</DialogDescription></DialogHeader>
                    <div className="grid gap-5 2xl:grid-cols-[minmax(300px,.85fr)_minmax(360px,1fr)_minmax(300px,.8fr)]">
                  <Card className="h-fit border-[#26372d] bg-[#09100c] shadow-none">
                    <CardHeader><CardTitle className="text-lg">Dados da oferta</CardTitle><CardDescription>Revise os dados extraídos antes de publicar.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="overflow-hidden rounded-2xl border border-[#26372d] bg-white p-4"><div className="aspect-[4/3]">{promotionItem.imageUrl ? <img src={promotionItem.imageUrl} alt={promotionItem.title} className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-[#708078]"><ShoppingBag className="size-12" /></div>}</div></div>
                      <label className="block space-y-1.5 text-xs font-bold text-[#aebbb3]">Título<Input value={promotionItem.title} onChange={(event) => updatePromotionItem({ title: event.target.value })} className="h-11 border-[#35483d] bg-[#050806] text-sm" /></label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block space-y-1.5 text-xs font-bold text-[#aebbb3]">Preço atual<Input type="number" step="0.01" value={promotionItem.price ?? ""} onChange={(event) => updatePromotionItem({ price: event.target.value ? Number(event.target.value) : null })} className="h-11 border-[#35483d] bg-[#050806] text-sm" /></label>
                        <label className="block space-y-1.5 text-xs font-bold text-[#aebbb3]">Preço anterior<Input type="number" step="0.01" value={promotionItem.originalPrice ?? ""} onChange={(event) => { const originalPrice = event.target.value ? Number(event.target.value) : null; const discountPercentage = originalPrice && promotionItem.price && originalPrice > promotionItem.price ? Math.round((1 - promotionItem.price / originalPrice) * 100) : 0; updatePromotionItem({ originalPrice, discountPercentage }); }} className="h-11 border-[#35483d] bg-[#050806] text-sm" /></label>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-[#26372d] bg-[#050806] p-3"><p className="text-xs text-[#829389]">Código</p><p className="mt-1 break-all text-sm font-bold">{promotionItem.itemId || promotionItem.catalogProductId || promotionItem.id}</p></div>
                        <div className="rounded-xl border border-[#26372d] bg-[#050806] p-3"><p className="text-xs text-[#829389]">Desconto</p><p className="mt-1 text-sm font-bold">{promotionItem.discountPercentage ? `${promotionItem.discountPercentage}% OFF` : "Não informado"}</p></div>
                      </div>
                      <label className="block space-y-1.5 text-xs font-bold text-[#aebbb3]">
                        <span className="flex items-center justify-between gap-2"><span>Link de divulgação</span><Badge className={isMercadoLivreShortAffiliateUrl(promotionItem.url) ? "bg-[#183524] text-[#77eda0]" : "bg-[#3a1717] text-[#ffaaaa]"}>{isMercadoLivreShortAffiliateUrl(promotionItem.url) ? "meli.la pronto" : "link curto pendente"}</Badge></span>
                        <Input value={promotionItem.url || ""} onChange={(event) => { const url = event.target.value; updatePromotionItem({ url }); if (isMercadoLivreShortAffiliateUrl(url)) setPromotionAffiliateError(""); }} placeholder="O link curto meli.la aparecerá aqui" className="h-11 border-[#35483d] bg-[#050806] text-sm" />
                      </label>
                      <details className="rounded-xl border border-[#26372d] bg-[#050806] p-3 text-sm"><summary className="cursor-pointer font-bold">Todos os dados extraídos</summary><div className="mt-3 grid grid-cols-2 gap-2">{[["Loja", "Mercado Livre"], ["Marca", promotionItem.brand], ["Vendedor", promotionItem.seller], ["Parcelamento", renderInstallmentText(promotionItem, "{{quantidade}}x de {{valor_parcela}} {{juros}}")], ["Estoque", promotionItem.availableQuantity], ["Vendidos", promotionItem.soldQuantity], ["Condição", promotionItem.condition], ["Categoria", promotionItem.categoryName || promotionItem.categoryId], ["Entrega", promotionItem.freeShipping ? "Frete grátis" : promotionItem.full ? "Envio Full" : "Não informada"]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-[#26372d] p-2"><p className="text-[11px] text-[#829389]">{label}</p><p className="mt-1 break-words text-xs font-semibold">{value == null || value === "" ? "—" : String(value)}</p></div>)}</div></details>
                      <div className="flex items-center justify-between rounded-xl border border-[#26372d] bg-[#050806] p-3"><div><p className="text-sm font-bold">Mostrar parcelas</p><p className="mt-1 text-xs text-[#829389]">Inclui a linha somente quando disponível.</p></div><Switch checked={promotionInstallmentOptions.enabled} onCheckedChange={(checked) => { const next = { ...promotionInstallmentOptions, enabled: checked }; setPromotionInstallmentOptions(next); if (!promotionUsesFullAiCopy) setPromotionMessage(composeOfferMessage(promotionItem, promotionItem.url || "", promotionStore, promotionAiCta, next)); }} disabled={!productInstallmentDetails(promotionItem)} /></div>
                      <div className="flex items-center justify-between rounded-xl border border-[#26372d] bg-[#050806] p-3"><div><p className="text-sm font-bold">Enviar foto oficial</p><p className="mt-1 text-xs text-[#829389]">A foto segue junto com o texto.</p></div><Switch checked={promotionIncludeImage} onCheckedChange={setPromotionIncludeImage} disabled={!promotionItem.imageUrl} /></div>
                    </CardContent>
                  </Card>

                  <Card className="h-fit border-[#26372d] bg-[#09100c] shadow-none">
                    <CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-lg">Preview da mensagem</CardTitle><CardDescription>O conteúdo abaixo é o que chegará ao grupo.</CardDescription></div><Badge className="bg-[#183524] text-[#77eda0]">Mercado Livre</Badge></div></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="whatsapp-preview-shell rounded-2xl bg-[#efeae2] p-3 sm:p-5" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(75,94,82,.12) 0 1px, transparent 1px)", backgroundSize: "18px 18px" }}>
                        <div className="whatsapp-preview-message mx-auto max-w-md overflow-hidden rounded-xl rounded-tl-sm bg-white text-[#111b21] shadow-[0_10px_30px_rgba(45,55,50,.18)]">
                          {promotionIncludeImage && promotionItem.imageUrl ? <div className="bg-white p-2"><img src={promotionItem.imageUrl} alt="Foto da promoção" className="aspect-[4/3] w-full object-contain" /></div> : null}
                          <div className="p-3"><WhatsAppMessage text={promotionMessage} /><p className="mt-1 text-right text-[11px] text-[#9aaba1]">agora ✓✓</p></div>
                        </div>
                      </div>
                      <label className="block space-y-2 text-sm font-bold">Editar mensagem<Textarea value={promotionMessage} onChange={(event) => setPromotionMessage(event.target.value)} rows={12} className="min-h-64 resize-y border-[#35483d] bg-[#050806] leading-6" /></label>
                      <div className="grid gap-2 sm:grid-cols-2"><Button variant="outline" onClick={() => { void navigator.clipboard.writeText(promotionMessage); toast.success("Mensagem copiada."); }} className="border-[#35483d] bg-[#111813] text-white"><Copy /> Copiar texto</Button><Button variant="outline" onClick={() => setActiveTab("templates")} className="border-[#35483d] bg-[#111813] text-white"><LayoutTemplate /> Editar modelo</Button></div>
                    </CardContent>
                  </Card>

                  <Card className="h-fit border-[#26372d] bg-[#09100c] shadow-none 2xl:sticky 2xl:top-24">
                    <CardHeader><CardTitle className="text-lg">Enviar para grupos</CardTitle><CardDescription>Escolha um ou vários destinos.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#829389]" /><Input value={promotionGroupSearch} onChange={(event) => setPromotionGroupSearch(event.target.value)} placeholder="Buscar grupo..." className="h-11 border-[#35483d] bg-[#050806] pl-9" /></div>
                      {destinationGroups.length ? <button type="button" onClick={() => setPromotionGroups(promotionGroups.length === destinationGroups.length ? [] : destinationGroups.map((group) => group.JID))} className="flex w-full items-center gap-3 rounded-xl border border-[#26372d] bg-[#0d1711] p-3 text-left text-sm font-bold hover:border-[#3d6a4b]"><span className={`grid size-5 place-items-center rounded border ${promotionGroups.length === destinationGroups.length ? "border-[#30dd6b] bg-[#30dd6b] text-[#04140a]" : "border-[#506158]"}`}>{promotionGroups.length === destinationGroups.length ? <Check className="size-3.5" /> : null}</span>Selecionar todos</button> : null}
                      <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                        {filteredPromotionGroups.map((group) => { const selected = promotionGroups.includes(group.JID); return <button key={group.JID} type="button" onClick={() => togglePromotionGroup(group.JID)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? "border-[#30dd6b] bg-[#0f2b18]" : "border-[#26372d] bg-[#0d1711] hover:border-[#3d6a4b]"}`}><span className={`grid size-5 shrink-0 place-items-center rounded border ${selected ? "border-[#30dd6b] bg-[#30dd6b] text-[#04140a]" : "border-[#506158]"}`}>{selected ? <Check className="size-3.5" /> : null}</span><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#173c28] text-xs font-black text-[#78eea0]">{initials(group.Name || "G")}</span><span className="min-w-0"><span className="block truncate text-sm font-bold">{group.Name}</span><span className="block truncate text-xs text-[#829389]">WhatsApp · grupo</span></span></button>; })}
                        {!destinationGroups.length ? <div className="rounded-xl border border-dashed border-[#34483c] p-6 text-center"><UsersRound className="mx-auto mb-2 size-8 text-[#63746a]" /><p className="text-sm font-bold">Nenhum destino configurado</p><button type="button" onClick={() => setActiveTab("groups")} className="mt-2 text-xs font-bold text-[#58e683] underline">Configurar grupos</button></div> : null}
                      </div>
                      <Button onClick={() => void sendPromotionToGroups()} disabled={promotionSending || !promotionGroups.length || !promotionMessage.trim() || !isMercadoLivreShortAffiliateUrl(promotionItem.url)} className="h-12 w-full rounded-xl bg-[#30dd6b] font-black text-[#04140a] hover:bg-[#55ec82]">{promotionSending ? <LoaderCircle className="animate-spin" /> : <Send />} {promotionSending ? "Enviando..." : `Enviar para ${promotionGroups.length || 0} grupo${promotionGroups.length === 1 ? "" : "s"}`}</Button>
                      <p className="rounded-xl border border-[#31543b] bg-[#0b1710] p-3 text-center text-xs leading-5 text-[#9eeab3]">{carouselEnabled ? `Carrossel ativado: foto oficial e mensagem no primeiro cartão, seguidas por até quatro avaliações com mídia. Todos os cartões levam o botão “${carouselButtonLabel || "VER OFERTA"}” para o mesmo link. O link só aparece no corpo se o modelo usar {{link}}.` : "Carrossel desativado: a oferta será enviada como mensagem normal, com foto oficial e o texto exato do modelo. O link só aparece no corpo se o modelo usar {{link}}."}</p>
                      <p className="text-center text-xs leading-5 text-[#829389]">O envio só é liberado depois que o Mercado Livre confirma o seu link curto meli.la.</p>
                    </CardContent>
                  </Card>
                    </div>
                  </DialogContent>
                </Dialog> : <div className="rounded-2xl border border-dashed border-[#34483c] bg-[#09100c] px-6 py-14 text-center"><Sparkles className="mx-auto mb-3 size-10 text-[#4e6958]" /><p className="font-bold">O preview aparecerá em uma janela</p><p className="mt-1 text-sm text-[#829389]">Cole um link ou prepare uma oferta para abrir o editor.</p></div>}
              </div>
            </TabsContent>

            <TabsContent value="products" id="produtos">
              <div className="min-w-0 space-y-4">
                  <Card className="border-[#27322b] bg-[#0b100d] shadow-none">
                    <CardContent className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_210px_auto]">
                      <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#718079]" /><Input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { void loadProducts(); void loadSendHistory(); } }} placeholder="Buscar produto, código ou grupo" className="h-11 rounded-xl border-[#34423a] bg-[#080c09] pl-10" /></div>
                      <NativeSelect value={productStatus} onChange={(event) => setProductStatus(event.target.value)} className="h-11 w-full rounded-xl border-[#34423a] bg-[#080c09]">
                        <NativeSelectOption value="all">Todos os status</NativeSelectOption>
                        <NativeSelectOption value="converted">Convertidos</NativeSelectOption>
                        <NativeSelectOption value="sent">Enviados</NativeSelectOption>
                        <NativeSelectOption value="waiting_credentials">Aguardando sessão</NativeSelectOption>
                        <NativeSelectOption value="unsupported">Não reconhecidos</NativeSelectOption>
                        <NativeSelectOption value="error">Com erro</NativeSelectOption>
                      </NativeSelect>
                      <Button onClick={() => { void loadProducts(); void loadSendHistory(); }} variant="outline" className="h-11 rounded-xl border-[#34423a] bg-[#111813] text-white hover:bg-[#19231c]"><RefreshCw className={productsLoading || sendHistoryLoading ? "animate-spin" : ""} /> Atualizar</Button>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden border-[#27322b] bg-[#0b100d] shadow-none">
                    <CardHeader className="border-b border-[#27322b]"><CardTitle className="flex items-center gap-2 text-lg"><Send className="size-5 text-[#62ef8b]" /> Histórico real de envios</CardTitle><CardDescription>Cada disparo é registrado. A contagem usa o ID do produto, mesmo quando ele é enviado novamente ou para grupos diferentes.</CardDescription></CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      {sendSummary.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{sendSummary.slice(0, 12).map((row) => <div key={row.productId} className="rounded-xl border border-[#27372e] bg-[#07110b] p-3"><p className="line-clamp-2 min-h-10 text-sm font-bold">{row.productTitle || row.productId}</p><p className="mt-2 text-xs text-[#829389]">{row.productId}</p><div className="mt-3 flex items-end justify-between"><span className="text-2xl font-black text-[#62ef8b]">{row.sendCount}x</span><span className="text-right text-xs text-[#9cad9f]">{row.groupCount} grupo(s)<br />{new Date(row.lastSentAt).toLocaleString("pt-BR")}</span></div></div>)}</div> : <p className="rounded-xl border border-dashed border-[#34483c] p-5 text-center text-sm text-[#829389]">Os próximos envios aparecerão aqui com a contagem por produto.</p>}
                      {sendHistory.length ? <div className="max-h-80 overflow-auto rounded-xl border border-[#27372e]"><table className="w-full min-w-[760px] text-left text-xs"><thead className="sticky top-0 bg-[#111a14] text-[#9cad9f]"><tr><th className="p-3">Produto</th><th className="p-3">Grupo</th><th className="p-3">Origem</th><th className="p-3">Enviado em</th></tr></thead><tbody>{sendHistory.map((row) => <tr key={row.id} className="border-t border-[#223028]"><td className="p-3"><p className="max-w-sm truncate font-bold text-white">{row.productTitle || row.productId}</p><p className="mt-1 text-[#718079]">{row.productId}</p></td><td className="p-3">{row.destinationName || row.destinationJid}</td><td className="p-3">{row.monitorId ? `Monitor: ${offerMonitors.find((item) => item.id === row.monitorId)?.name || row.monitorId}` : "Envio manual"}</td><td className="p-3">{new Date(row.sentAt).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div> : null}
                    </CardContent>
                  </Card>

                  {productsError && <div className="flex items-start gap-3 rounded-xl border border-[#74443c] bg-[#251412] p-4 text-sm text-[#ffaaa2]"><CircleAlert className="mt-0.5 size-4 shrink-0" /><div><p className="font-semibold">O histórico não carregou</p><p className="mt-1">{productsError}</p></div></div>}

                  {productsLoading && products.length === 0 ? (
                    <Card className="border-[#27322b] bg-[#0b100d] shadow-none"><CardContent className="flex min-h-56 items-center justify-center gap-3 text-sm text-[#94a69b]"><LoaderCircle className="size-5 animate-spin text-[#62ef8b]" /> Carregando histórico...</CardContent></Card>
                  ) : products.length === 0 ? (
                    <Card className="border-[#27322b] bg-[#0b100d] shadow-none"><CardContent className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><PackageSearch className="mb-3 size-9 text-[#567061]" /><p className="font-semibold">Nenhum produto encontrado ainda</p><p className="mt-2 max-w-md text-sm leading-6 text-[#94a69b]">Cole uma mensagem ao lado para testar. Os produtos capturados pela automação aparecerão neste mesmo histórico.</p></CardContent></Card>
                  ) : products.map((product) => (
                    <Card key={product.id} className="overflow-hidden border-[#27322b] bg-[#0b100d] shadow-none">
                      <CardContent className="p-0">
                        <div className={`flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${product.status === "sent" ? "border-[#245c34] bg-[#102619]" : product.status === "converted" ? "border-[#285d39] bg-[#12251a]" : product.status === "waiting_credentials" ? "border-[#65582d] bg-[#29230f]" : product.status === "error" ? "border-[#74443c] bg-[#2a1512]" : "border-[#343f38] bg-[#151b17]"}`}>
                          <div className="flex min-w-0 items-center gap-3">
                            <span className={`size-2.5 shrink-0 rounded-full ${product.status === "sent" ? "bg-[#62ef8b]" : product.status === "converted" ? "bg-[#39d66d]" : product.status === "waiting_credentials" ? "bg-[#f2c94c]" : product.status === "error" ? "bg-[#ff756b]" : "bg-[#8c9a91]"}`} />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#91a298]">Situação da oferta</p>
                              <p className="mt-0.5 truncate font-bold text-white">{productStatusLabel(product.status)}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#a8b5ad]">
                            <span>{new Date(product.lastSeenAt).toLocaleString("pt-BR")}</span>
                            <span>{product.occurrences} ocorrência(s)</span>
                            {product.sentAt && <span className="font-semibold text-[#75e895]">Enviada {new Date(product.sentAt).toLocaleString("pt-BR")}</span>}
                          </div>
                        </div>

                        <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-5">
                          <div className="min-w-0 rounded-2xl border border-[#26352c] bg-[#07110b] p-3 sm:p-4">
                            <div className="mb-3 flex items-center justify-between gap-3 px-1">
                              <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#62ef8b]">Mensagem original</p>
                                <p className="mt-1 truncate text-xs text-[#87978d]">{product.sourceGroup || "Grupo de origem não identificado"}</p>
                              </div>
                              <MessageCircleMore className="size-5 shrink-0 text-[#62ef8b]" />
                            </div>
                            <div className="ml-auto max-w-[96%] overflow-hidden rounded-2xl rounded-tr-md bg-[#183d2a] shadow-[0_8px_28px_rgba(0,0,0,.22)] sm:max-w-[90%]">
                              {product.imageUrl && (
                                <div className="aspect-[16/10] overflow-hidden bg-[#101713]">
                                  <img src={product.imageUrl} alt={product.title || "Foto da oferta"} loading="lazy" className="h-full w-full object-cover" />
                                </div>
                              )}
                              <div className="p-3.5 sm:p-4">
                                <WhatsAppMessage text={product.messageExcerpt || `${product.title || "Oferta encontrada"}\n\n${product.sourceUrl}`} />
                                <div className="mt-2 flex justify-end text-[11px] text-[#a9c7b5]">{new Date(product.lastSeenAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} <span className="ml-1 text-[#53bdeb]">✓✓</span></div>
                              </div>
                            </div>
                          </div>

                          <div className="min-w-0 space-y-4">
                            <div className="flex items-center gap-3">
                              <div className={`grid size-12 shrink-0 place-items-center rounded-xl font-extrabold ${product.store === "amazon" ? "bg-[#ff9900] text-[#231500]" : product.store === "mercadolivre" ? "bg-[#ffe600] text-[#231f00]" : "bg-[#252d28] text-[#aeb9b1]"}`}>
                                {product.store === "amazon" ? "a" : product.store === "mercadolivre" ? "ML" : <ShoppingBag className="size-5" />}
                              </div>
                              <div className="min-w-0"><p className="line-clamp-2 font-bold leading-5">{product.title || product.productCode || "Produto não reconhecido"}</p><p className="mt-1 text-xs text-[#94a69b]">{product.store === "amazon" ? "Amazon" : product.store === "mercadolivre" ? "Mercado Livre" : "Outra loja"}{product.productCode ? ` · ${product.productCode}` : ""}</p></div>
                            </div>

                            <div className="space-y-2 rounded-xl border border-[#27322b] bg-[#080c09] p-3 text-xs leading-5 text-[#95a39a]">
                              <div className="flex justify-between gap-3"><span>Redirecionamentos</span><strong className="text-white">{product.redirectCount}</strong></div>
                              <div className="flex justify-between gap-3"><span>Destino</span><strong className="max-w-36 truncate text-right text-white">{product.destinationGroup || "—"}</strong></div>
                            </div>

                            {product.errorMessage && <div className="rounded-xl border border-[#66532e] bg-[#241d0c] p-3 text-sm leading-6 text-[#e6c47d]"><p className="font-semibold text-[#f0cf88]">Atenção</p><p className="mt-1">{product.errorMessage}</p></div>}

                            <div className="grid gap-2">
                              {(product.affiliateUrl || product.resolvedUrl) && <Button variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(product.affiliateUrl || product.resolvedUrl || product.sourceUrl); toast.success("Link copiado."); }} className="h-10 justify-start rounded-lg border-[#34423a] bg-[#111813] text-white hover:bg-[#19231c]"><Copy /> Copiar link {product.affiliateUrl ? "convertido" : "resolvido"}</Button>}
                              <Button asChild variant="outline" size="sm" className="h-10 justify-start rounded-lg border-[#34423a] bg-[#111813] text-white hover:bg-[#19231c]"><a href={product.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink /> Abrir link original</a></Button>
                              {product.status === "converted" && <Button size="sm" onClick={() => void markProductSent(product.id)} className="h-10 justify-start rounded-lg bg-[#00c853] text-[#04140a] hover:bg-[#16dc61]"><Send /> Marcar como enviado</Button>}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="catalog" id="dados-dos-produtos">
              <div className="space-y-4">
                <Card className="border-[#27322b] bg-[#0b100d] shadow-none">
                  <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                    <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#718079]" /><Input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void loadProducts(); }} placeholder="Buscar título, código ou link" className="h-11 rounded-xl border-[#34423a] bg-[#080c09] pl-10" /></div>
                    <div className="flex h-11 items-center rounded-xl border border-[#34423a] bg-[#080c09] px-3 text-sm font-semibold text-[#dce9df]">Somente Mercado Livre</div>
                    <Button onClick={() => void loadProducts()} variant="outline" className="h-11 rounded-xl border-[#34423a] bg-[#111813] text-white hover:bg-[#19231c]"><RefreshCw className={productsLoading ? "animate-spin" : ""} /> Atualizar</Button>
                  </CardContent>
                </Card>

                <div className="rounded-xl border border-[#244c31] bg-[#0d1d12] p-4 text-sm leading-6 text-[#a7cbb2]">
                  Esta tela mostra todos os campos que a operação armazena hoje: identificação, imagem oficial, links original, resolvido e convertido, grupos, mensagem, redirecionamentos, ocorrências e datas. Preço, estoque, vendedor e avaliações só aparecem futuramente quando forem obtidos por uma API oficial e confiável.
                </div>

                {productsError && <div className="flex items-start gap-3 rounded-xl border border-[#74443c] bg-[#251412] p-4 text-sm text-[#ffaaa2]"><CircleAlert className="mt-0.5 size-4 shrink-0" /><p>{productsError}</p></div>}
                {productsLoading && products.length === 0 ? (
                  <Card className="border-[#27322b] bg-[#0b100d] shadow-none"><CardContent className="flex min-h-56 items-center justify-center gap-3 text-sm text-[#94a69b]"><LoaderCircle className="size-5 animate-spin text-[#62ef8b]" /> Carregando dados...</CardContent></Card>
                ) : catalogProducts.length === 0 ? (
                  <Card className="border-[#27322b] bg-[#0b100d] shadow-none"><CardContent className="flex min-h-56 flex-col items-center justify-center px-6 text-center"><Database className="mb-3 size-9 text-[#567061]" /><p className="font-semibold">Nenhum produto enviado nesse filtro</p><p className="mt-2 text-sm text-[#94a69b]">Assim que uma oferta do Mercado Livre for enviada, os dados completos aparecerão aqui.</p></CardContent></Card>
                ) : (
                  <div className="grid gap-4 2xl:grid-cols-2">
                    {catalogProducts.map((product) => {
                      const enrichedData = parseProductData(product.productDataJson);
                      const enrichedFields = enrichedData ? Object.entries(enrichedData).filter(([key, value]) =>
                        value !== null && value !== undefined && value !== "" && !["pictures", "images", "attributes", "saleTerms", "shipping", "settings", "offers", "aggregateRating", "tags"].includes(key)
                      ) : [];
                      const attributes = enrichedData && Array.isArray(enrichedData.attributes) ? enrichedData.attributes as Array<Record<string, unknown>> : [];
                      const fields = [
                        ["Loja", product.store === "amazon" ? "Amazon" : "Mercado Livre"],
                        ["ID do produto", product.productCode || "Não identificado"],
                        ["Fonte dos dados", product.dataSource || "Página pública"],
                        ["Situação", productStatusLabel(product.status)],
                        ["Grupo de origem", product.sourceGroup || "Não informado"],
                        ["Grupo de destino", product.destinationGroup || "Não informado"],
                        ["Redirecionamentos", String(product.redirectCount)],
                        ["Ocorrências", String(product.occurrences)],
                        ["Encontrado em", new Date(product.foundAt).toLocaleString("pt-BR")],
                        ["Visto por último", new Date(product.lastSeenAt).toLocaleString("pt-BR")],
                        ["Enviado em", product.sentAt ? new Date(product.sentAt).toLocaleString("pt-BR") : "Não informado"],
                        ["Atualizado em", product.updatedAt ? new Date(product.updatedAt).toLocaleString("pt-BR") : "Não informado"],
                      ];
                      const links = [
                        ["Link recebido", product.sourceUrl],
                        ["Link final resolvido", product.resolvedUrl],
                        ["Link de afiliado enviado", product.affiliateUrl],
                        ["Imagem oficial", product.imageUrl],
                      ].filter((item): item is [string, string] => Boolean(item[1]));
                      return (
                        <Card key={product.id} className="overflow-hidden border-[#27322b] bg-[#0b100d] shadow-none">
                          <CardHeader className="border-b border-[#27322b] bg-[#0d1510]">
                            <div className="flex items-start gap-4">
                              <div className="size-20 shrink-0 overflow-hidden rounded-xl border border-[#2f3d34] bg-[#080c09]">
                                {product.imageUrl ? <img src={product.imageUrl} alt={product.title || "Produto"} loading="lazy" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center"><ShoppingBag className="size-6 text-[#607267]" /></div>}
                              </div>
                              <div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><Badge className={product.store === "amazon" ? "bg-[#ff9900] text-[#231500]" : "bg-[#ffe600] text-[#231f00]"}>{product.store === "amazon" ? "Amazon" : "Mercado Livre"}</Badge><Badge className="border border-[#2d8a4b] bg-[#153520] text-[#8af3a5]">Enviado</Badge></div><CardTitle className="mt-3 line-clamp-2 text-lg leading-6">{product.title || product.productCode || "Produto sem título"}</CardTitle><CardDescription className="mt-1 break-all">Registro {product.id}</CardDescription><Button onClick={() => void refreshProductData(product.id)} disabled={enrichingProductId === product.id} variant="outline" size="sm" className="mt-3 border-[#34423a] bg-[#111813] text-white hover:bg-[#19231c]">{enrichingProductId === product.id ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} Buscar dados da loja</Button></div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-5 p-4 sm:p-5">
                            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                              {fields.map(([label, value]) => <div key={label} className="min-w-0 border-b border-[#202a24] pb-2"><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#718079]">{label}</p><p className="mt-1 break-words text-sm text-[#e8f1eb]">{value}</p></div>)}
                            </div>
                            <div className="space-y-3">
                              {links.map(([label, value]) => <div key={label} className="rounded-xl border border-[#27322b] bg-[#080c09] p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-[#94a69b]">{label}</p><Button variant="ghost" size="sm" onClick={() => { void navigator.clipboard.writeText(value); toast.success(`${label} copiado.`); }} className="h-7 px-2 text-[#62ef8b] hover:bg-[#142019]"><Copy className="size-3.5" /> Copiar</Button></div><a href={value} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs leading-5 text-[#53bdeb] underline underline-offset-2">{value}</a></div>)}
                            </div>
                            <div className="rounded-xl border border-[#2a4834] bg-[#09140d] p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#62ef8b]">Dados extraídos do produto</p><Badge className="border border-[#2a5f39] bg-[#102619] text-[#8af3a5]">{product.dataSource || "dados públicos"}</Badge></div>
                              {enrichedFields.length ? <div className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2">{enrichedFields.map(([key, value]) => <div key={key} className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#718079]">{productDataLabels[key] || key}</p><p className="mt-1 break-words text-sm leading-5 text-[#dce9df]">{productDataValue(value)}</p></div>)}</div> : <p className="mt-3 text-sm leading-6 text-[#94a69b]">Ainda não foi possível obter campos adicionais para este produto. Um novo envio tentará atualizar o registro.</p>}
                              {attributes.length > 0 && <div className="mt-4 border-t border-[#25362b] pt-4"><p className="mb-3 text-xs font-bold text-[#94a69b]">FICHA TÉCNICA ({attributes.length})</p><div className="grid gap-2 sm:grid-cols-2">{attributes.map((attribute, index) => <div key={`${String(attribute.id || attribute.name)}-${index}`} className="rounded-lg bg-[#111b14] px-3 py-2"><p className="text-xs text-[#718079]">{String(attribute.name || attribute.id || "Atributo")}</p><p className="mt-1 text-sm text-[#e4eee7]">{String(attribute.value_name || attribute.valueName || attribute.value_id || "—")}</p></div>)}</div></div>}
                            </div>
                            <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-[#718079]">Mensagem capturada</p><div className="max-h-56 overflow-auto rounded-xl border border-[#27322b] bg-[#080c09] p-3"><WhatsAppMessage text={product.messageExcerpt || "Mensagem não armazenada."} /></div></div>
                            {product.errorMessage && <div className="rounded-xl border border-[#66532e] bg-[#241d0c] p-3 text-sm text-[#e6c47d]">{product.errorMessage}</div>}
                            <details className="rounded-xl border border-[#27322b] bg-[#080c09] open:bg-[#060906]"><summary className="cursor-pointer px-3 py-3 text-sm font-semibold text-[#b7c4bc]">Ver registro bruto (JSON)</summary><div className="border-t border-[#27322b] p-3"><Button variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(JSON.stringify({ ...product, productData: enrichedData }, null, 2)); toast.success("JSON copiado."); }} className="mb-3 border-[#34423a] bg-[#111813] text-white"><Copy /> Copiar JSON</Button><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all text-xs leading-5 text-[#8fd9a4]">{JSON.stringify({ ...product, productData: enrichedData }, null, 2)}</pre></div></details>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="ml-api" id="consulta-api-ml">
              <div className="space-y-5 rounded-3xl bg-[#f4f6f8] p-4 text-[#243447] sm:p-6">
                <section className="overflow-hidden rounded-2xl border border-[#dfe5eb] bg-white shadow-[0_8px_30px_rgba(31,54,76,.08)]">
                  <div className="border-b border-[#e8edf1] bg-[linear-gradient(110deg,#fff9cf,#fff_62%)] p-5 sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div><div className="mb-2 flex items-center gap-2 text-sm font-extrabold text-[#8b7600]"><Database className="size-5" /> API OFICIAL DO MERCADO LIVRE</div><h2 className="text-2xl font-black text-[#1b2b3a]">Consultar todos os dados disponíveis</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#667788]">Informe o ID do anúncio, ID de catálogo ou a URL. A consulta combina anúncio, preço vigente, tabela de preços, promoções, vendedor e categoria.</p></div>
                      <div className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${catalogCredentials.mercadoLivreConfigured ? "bg-[#e8f8ef] text-[#138244]" : "bg-[#fff3cd] text-[#856404]"}`}>{catalogCredentials.mercadoLivreConfigured ? "● OAuth conectado" : catalogCredentials.mercadoLivreAppConfigured ? "○ Aplicativo configurado" : "○ Configuração pendente"}</div>
                    </div>
                  </div>
                  <div className="space-y-4 p-5 sm:p-6">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                      <Input value={mlApiProductInput} onChange={(event) => setMlApiProductInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void lookupMercadoLivreApiProduct(); }} placeholder="Ex.: MLB7608133762 ou cole a URL completa" className="h-12 border-[#d8e0e6] bg-white text-[#253545]" />
                      <Button onClick={() => void lookupMercadoLivreApiProduct()} disabled={mlApiProductLoading} className="h-12 bg-[#087bd3] px-6 font-extrabold text-white hover:bg-[#076bb7]">{mlApiProductLoading ? <LoaderCircle className="animate-spin" /> : <Search />} Consultar pela API</Button>
                    </div>
                    <div className="flex flex-col gap-3 rounded-xl border border-[#dce4e9] bg-[#f7f9fb] p-4 text-xs leading-5 text-[#607180] sm:flex-row sm:items-center sm:justify-between"><div><strong className="text-[#263746]">Redirect URI do aplicativo</strong><p className="mt-1 break-all font-mono">/api/oauth/mercadolivre/callback no domínio publicado</p></div>{!catalogCredentials.mercadoLivreConfigured && <Button onClick={() => void connectMercadoLivre()} disabled={mercadoLivreConnecting} className="shrink-0 bg-[#ffe600] font-extrabold text-[#231f00] hover:bg-[#fff05a]">{mercadoLivreConnecting ? <LoaderCircle className="animate-spin" /> : <ExternalLink />} Conectar Mercado Livre</Button>}</div>
                  </div>
                </section>

                {mlApiProductError && <div className="rounded-xl border border-[#f1c8c8] bg-[#fff2f2] p-4 text-sm text-[#a13b3b]"><div className="flex items-start gap-3"><CircleAlert className="mt-0.5 size-5 shrink-0" /><div><p className="font-bold">A consulta não foi concluída</p><p className="mt-1 leading-6">{mlApiProductError}</p></div></div></div>}

                {mlApiProductResult && (() => {
                  const item = mlApiProductResult.product;
                  const detailRows: Array<[string, unknown]> = [
                    ["ID do anúncio", item.itemId], ["ID de catálogo", item.catalogProductId], ["Condição", item.condition], ["Categoria", item.categoryName || item.categoryId],
                    ["Vendedor", item.seller], ["ID do vendedor", item.sellerId], ["Reputação", item.sellerReputation], ["Loja oficial", item.officialStore],
                    ["Estoque disponível", item.availableQuantity], ["Quantidade vendida", item.soldQuantity], ["Frete grátis", item.freeShipping ? "Sim" : "Não"], ["Envio Full", item.full ? "Sim" : "Não"],
                    ["Tipo logístico", item.logisticType], ["Garantia", item.warranty], ["Parcelamento", item.installments], ["Origem do preço", item.priceSource],
                    ["ID do preço", item.priceId], ["Atualização do preço", item.priceUpdatedAt], ["Tipo de promoção", item.promotionType], ["ID da promoção", item.promotionId],
                    ["Cupom", item.coupon], ["Posição entre mais vendidos", item.bestSellerPosition], ["Tags", item.tags], ["Termos de venda", item.saleTerms],
                  ].filter((row) => row[1] !== null && row[1] !== undefined && row[1] !== "");
                  return <div className="space-y-5">
                    <section className="grid gap-5 rounded-2xl border border-[#dfe5eb] bg-white p-5 shadow-[0_8px_30px_rgba(31,54,76,.07)] lg:grid-cols-[260px_minmax(0,1fr)]">
                      <div className="aspect-square overflow-hidden rounded-2xl border border-[#e1e7ec] bg-white p-4">{item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center"><ShoppingBag className="size-12 text-[#9ba8b3]" /></div>}</div>
                      <div className="min-w-0"><div className="flex flex-wrap gap-2"><Badge className="bg-[#ffe600] text-[#231f00]">Mercado Livre</Badge><Badge className="bg-[#e8f8ef] text-[#138244]">Consulta {new Date(mlApiProductResult.checkedAt).toLocaleString("pt-BR")}</Badge></div><h3 className="mt-4 text-2xl font-black leading-tight text-[#1d2f3f]">{item.title}</h3><div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2">{item.originalPrice && item.originalPrice > (item.price || 0) ? <span className="text-base text-[#8b98a3] line-through">{formatMoney(item.originalPrice, item.currency || "BRL")}</span> : null}<span className="text-4xl font-black text-[#087bd3]">{formatMoney(item.price, item.currency || "BRL")}</span>{item.discountPercentage ? <Badge className="bg-[#16a85b] text-white">-{item.discountPercentage}%</Badge> : null}</div><div className="mt-5 flex flex-wrap gap-2">{item.url && <Button asChild variant="outline" className="border-[#9bc8e7] bg-[#eef8ff] text-[#086fac]"><a href={item.url} target="_blank" rel="noreferrer"><ExternalLink /> Abrir produto</a></Button>}<Button onClick={() => { setPromotionInput(item.url || item.itemId || item.id); setActiveTab("generate"); toast.info("Produto enviado para Gerar promoção."); }} className="bg-[#24c75a] font-extrabold text-[#04140a] hover:bg-[#46df75]"><Sparkles /> Usar em Gerar promoção</Button></div></div>
                    </section>

                    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                      <Card className="border-[#dfe5eb] bg-white text-[#243447] shadow-none"><CardHeader><CardTitle>Dados estruturados</CardTitle><CardDescription>Somente campos efetivamente devolvidos ou derivados dos endpoints oficiais.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{detailRows.map(([label, value]) => <div key={label} className="rounded-xl border border-[#e1e7ec] bg-[#f8fafb] p-3"><p className="text-[11px] font-black uppercase tracking-[.08em] text-[#788794]">{label}</p><p className="mt-2 break-words text-sm font-semibold leading-5 text-[#263746]">{productDataValue(value)}</p></div>)}</CardContent></Card>
                      <div className="space-y-4"><Card className="border-[#dfe5eb] bg-white text-[#243447] shadow-none"><CardHeader><CardTitle className="text-base">Fontes consultadas</CardTitle></CardHeader><CardContent className="space-y-2">{mlApiProductResult.endpoints.map((endpoint) => <div key={endpoint.key} className="flex items-center justify-between gap-3 rounded-lg border border-[#e1e7ec] px-3 py-2 text-sm"><span>{endpoint.label}</span><span className={`font-black ${endpoint.available ? "text-[#138244]" : "text-[#9a6a00]"}`}>{endpoint.available ? "Disponível" : "Não retornou"}</span></div>)}</CardContent></Card><Card className="border-[#dbe6ee] bg-[#eef7fd] text-[#243447] shadow-none"><CardContent className="space-y-2 p-4 text-xs leading-5 text-[#4f6575]">{mlApiProductResult.notes.map((note) => <p key={note}>• {note}</p>)}</CardContent></Card></div>
                    </section>

                    {item.attributes?.length ? <Card className="border-[#dfe5eb] bg-white text-[#243447] shadow-none"><CardHeader><CardTitle>Ficha técnica ({item.attributes.length})</CardTitle></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{item.attributes.map((attribute, index) => <div key={`${String(attribute.id || attribute.name)}-${index}`} className="rounded-xl border border-[#e1e7ec] bg-[#f8fafb] p-3"><p className="text-xs text-[#788794]">{String(attribute.name || attribute.id || "Atributo")}</p><p className="mt-1 text-sm font-semibold">{String(attribute.value_name || attribute.valueName || attribute.value_id || "—")}</p></div>)}</CardContent></Card> : null}

                    <details className="rounded-2xl border border-[#dfe5eb] bg-white text-[#243447]"><summary className="cursor-pointer px-5 py-4 font-extrabold">Resposta completa da API (JSON)</summary><div className="border-t border-[#e1e7ec] p-4"><Button variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(JSON.stringify(mlApiProductResult, null, 2)); toast.success("JSON copiado."); }} className="mb-3 border-[#9bc8e7] bg-[#eef8ff] text-[#086fac]"><Copy /> Copiar JSON</Button><pre className="max-h-[560px] overflow-auto whitespace-pre-wrap break-all rounded-xl bg-[#0b1510] p-4 text-xs leading-5 text-[#8ff0aa]">{JSON.stringify(mlApiProductResult, null, 2)}</pre></div></details>
                  </div>;
                })()}
              </div>
            </TabsContent>

            <TabsContent value="discovery" id="consultar-produtos" className="promobit-catalog rounded-3xl bg-[#f4f6f8] p-3 text-[#243447] sm:p-5">
              <Card className="mb-5 overflow-hidden border-[#31543b] bg-[#0b100d] shadow-none">
                <CardHeader className="border-b border-[#27322b] bg-[linear-gradient(110deg,rgba(36,199,90,.12),transparent_62%)]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#24c75a] text-[#04140a]"><Smartphone className="size-5" /></div><div><CardTitle className="text-xl">Coletor pelo navegador</CardTitle><CardDescription className="mt-1 max-w-2xl">Abre o Chrome no seu computador e lê exatamente o preço, cupom, estoque e oferta que aparecem na página do produto.</CardDescription></div></div>
                    <Badge className={localCollectorConnected ? "w-fit border border-[#2d8a4b] bg-[#153520] text-[#8af3a5]" : "w-fit border border-[#5b4930] bg-[#241d0c] text-[#e6c47d]"}>{localCollectorConnected ? "Coletor conectado" : "Coletor local parado"}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <label className="block space-y-2 text-sm font-semibold">URL completa ou código MLB/MLBU<Input value={localCollectorInput} onChange={(event) => setLocalCollectorInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void collectProductFromBrowser(); }} placeholder="https://www.mercadolivre.com.br/... ou MLBU3142068675" className="h-12 border-[#34423a] bg-[#080c09]" /></label>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <Button onClick={() => void collectProductFromBrowser()} disabled={localCollectorLoading} className="h-12 rounded-xl bg-[#24c75a] font-extrabold text-[#04140a] hover:bg-[#46df75]">{localCollectorLoading ? <LoaderCircle className="animate-spin" /> : <Search />} {localCollectorLoading ? "Lendo a página aberta..." : "Abrir Chrome e extrair dados"}</Button>
                    <Button variant="outline" onClick={() => void checkLocalCollector(true)} className="h-12 border-[#34423a] bg-[#111813] text-white hover:bg-[#19231c]"><RefreshCw /> Testar conexão</Button>
                  </div>
                  <Button asChild variant="outline" className="h-12 w-full border-[#31543b] bg-[#0d1d12] text-[#8af3a5] hover:bg-[#153520]"><a href="http://127.0.0.1:8765" target="_blank" rel="noreferrer"><ExternalLink /> Abrir o painel local (modo mais confiável)</a></Button>
                  <details className="rounded-xl border border-[#27322b] bg-[#080c09] px-4 py-3 text-sm"><summary className="cursor-pointer font-semibold">Como iniciar no computador</summary><ol className="mt-3 list-decimal space-y-2 pl-5 leading-6 text-[#94a69b]"><li>Abra a pasta <code>local-collector</code> do projeto e dê dois cliques em <code>iniciar-coletor.cmd</code>.</li><li>Cadastre a URL e o token na aba <strong>Credenciais</strong>.</li><li>Mantenha aberto o Chrome dedicado do coletor. O Mercado Livre não respondeu de forma confiável no modo invisível.</li></ol><p className="mt-3 text-xs leading-5 text-[#718079]">A sessão fica apenas no seu computador. O coletor agora reconhece os cartões assim que aparecem e não aguarda o carregamento infinito da página.</p></details>
                  {localCollectorError && <div className="rounded-xl border border-[#784235] bg-[#21110e] p-3 text-sm leading-6 text-[#ffb0a7]">{localCollectorError}</div>}
                  {localCollectorResult && <div className="rounded-xl border border-[#31543b] bg-[#0b1710] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-[#8af3a5]">Última leitura concluída</p><p className="text-xs text-[#718079]">{localCollectorResult.capturedAt ? new Date(localCollectorResult.capturedAt).toLocaleString("pt-BR") : "agora"}</p></div><div className="mt-3 grid gap-2 sm:grid-cols-3">{[["Preço no Pix", localCollectorResult.pixPrice != null ? formatMoney(localCollectorResult.pixPrice, localCollectorResult.currency || "BRL") : "—"], ["Preço normal", localCollectorResult.standardPrice != null ? formatMoney(localCollectorResult.standardPrice, localCollectorResult.currency || "BRL") : "—"], ["Preço anterior", localCollectorResult.originalPrice != null ? formatMoney(localCollectorResult.originalPrice, localCollectorResult.currency || "BRL") : "—"]].map(([label, value]) => <div key={label} className="rounded-lg bg-[#111813] p-3"><p className="text-xs text-[#718079]">{label}</p><p className="mt-1 font-bold text-white">{value}</p></div>)}</div><p className="mt-3 text-xs leading-5 text-[#94a69b]">O produto completo foi aberto no modal abaixo, com imagem, IDs, vendedor, estoque, parcelas e ficha técnica.</p></div>}
                </CardContent>
              </Card>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-5">
                  <Card className="border-[#27322b] bg-[#0b100d] shadow-none">
                    <CardHeader className="border-b border-[#27322b]"><CardTitle className="text-xl">Central de ofertas</CardTitle><CardDescription>Busque por nome, cole um link ou informe um MLB ID. O painel cruza anúncio, preço atual, oferta vencedora, vendedor e ficha técnica.</CardDescription></CardHeader>
                    <CardContent className="space-y-4 pt-5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-2 text-sm font-semibold">Loja<div className="flex h-10 items-center rounded-md border border-[#34423a] bg-[#080c09] px-3">Mercado Livre</div></label>
                        <label className="space-y-2 text-sm font-semibold">Ordenar<NativeSelect value={catalogSort} onChange={(event) => setCatalogSort(event.target.value)}><NativeSelectOption value="">Relevância</NativeSelectOption>{catalogSorts.map((sort) => { const value = typeof sort === "string" ? sort : sort.id; const label = typeof sort === "string" ? sort : sort.name; return <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>; })}</NativeSelect></label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-2 text-sm font-semibold">Categoria oficial<NativeSelect value={catalogCategory} onChange={(event) => { const value = event.target.value; setCatalogCategory(value); setCatalogSubcategory(""); setMercadoLivreSubcategories([]); if (value) void loadMercadoLivreCategories(value); }}><NativeSelectOption value="">Todas as categorias</NativeSelectOption>{mercadoLivreCategories.map((category) => <NativeSelectOption key={category.id} value={category.id}>{category.name}</NativeSelectOption>)}</NativeSelect></label>
                        <label className="space-y-2 text-sm font-semibold">Subcategoria<NativeSelect value={catalogSubcategory} onChange={(event) => setCatalogSubcategory(event.target.value)} disabled={!catalogCategory || !mercadoLivreSubcategories.length}><NativeSelectOption value="">Todas as subcategorias</NativeSelectOption>{mercadoLivreSubcategories.map((category) => <NativeSelectOption key={category.id} value={category.id}>{category.name}</NativeSelectOption>)}</NativeSelect></label>
                      </div>
                      <label className="block space-y-2 text-sm font-semibold">Produto, link ou ID<div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#718079]" /><Input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void searchCatalog(); }} placeholder="Ex.: notebook, link do produto ou MLB123456789" className="h-12 border-[#34423a] bg-[#080c09] pl-10" /></div></label>
                      <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-2 text-sm font-semibold">Preço mínimo<Input type="number" min="0" value={catalogMinPrice} onChange={(event) => setCatalogMinPrice(event.target.value)} placeholder="R$ 0" className="h-11 border-[#34423a] bg-[#080c09]" /></label><label className="space-y-2 text-sm font-semibold">Preço máximo<Input type="number" min="0" value={catalogMaxPrice} onChange={(event) => setCatalogMaxPrice(event.target.value)} placeholder="Sem limite" className="h-11 border-[#34423a] bg-[#080c09]" /></label></div>
                      <label className="block space-y-2 text-sm font-semibold">Qualidade da oferta<NativeSelect value={catalogQuality} onChange={(event) => setCatalogQuality(event.target.value)}><NativeSelectOption value="all">Todas</NativeSelectOption><NativeSelectOption value="priced">Somente com preço confirmado</NativeSelectOption><NativeSelectOption value="good_deal">Boas ofertas</NativeSelectOption><NativeSelectOption value="free_shipping">Frete grátis</NativeSelectOption><NativeSelectOption value="full">Envio Full</NativeSelectOption><NativeSelectOption value="official_store">Loja oficial</NativeSelectOption></NativeSelect></label>
                      <Button onClick={() => void searchCatalog()} disabled={catalogSearching} className="h-12 w-full rounded-xl bg-[#24c75a] font-bold text-[#04140a] hover:bg-[#46df75]">{catalogSearching ? <LoaderCircle className="animate-spin" /> : <Search />} {catalogSearching ? "Cruzando dados oficiais..." : catalogQuery.trim() ? "Buscar ofertas" : "Ver recomendações"}</Button>
                      {catalogError && <div className="rounded-xl border border-[#784235] bg-[#21110e] p-3 text-sm leading-6 text-[#ffb0a7]">{catalogError}</div>}
                      {catalogWarning && <div className="flex items-start gap-3 rounded-xl border border-[#66532e] bg-[#241d0c] p-3 text-sm leading-6 text-[#e6c47d]"><CircleAlert className="mt-1 size-4 shrink-0" /><div><p className="font-bold">Por que nenhum preço apareceu?</p><p className="mt-1">A API de catálogo devolveu produtos e imagens, mas não uma oferta vencedora. A API de preços bloqueou anúncios de outros vendedores e a leitura da vitrine pediu validação dos cookies salvos. Por segurança, o painel não inventa nem reaproveita preço antigo.</p><p className="mt-2">{catalogWarning} Vá em <strong>Credenciais</strong>, cole uma exportação recente dos cookies e salve; a próxima busca tentará novamente automaticamente.</p></div></div>}
                    </CardContent>
                  </Card>

                  {mercadoLivreCategories.length > 0 && <div className="flex gap-2 overflow-x-auto pb-1">{[{ id: "", name: "Geral" }, ...mercadoLivreCategories].map((category) => <button key={category.id || "general"} type="button" onClick={() => { setCatalogCategory(category.id); setCatalogSubcategory(""); setMercadoLivreSubcategories([]); if (category.id) void loadMercadoLivreCategories(category.id); }} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${catalogCategory === category.id ? "border-[#36d96b] bg-[#16351f] text-[#8af3a5]" : "border-[#34423a] bg-[#0b100d] text-[#b6c4bb] hover:border-[#52705c]"}`}>{category.name}</button>)}</div>}
                  {catalogItems.length > 0 && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{catalogItems.map((item) => (
                    <Card key={item.id} className="group overflow-hidden border-[#27322b] bg-[#0b100d] shadow-none transition hover:border-[#3e5948]">
                      <div className="relative aspect-square bg-white p-2">{item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="h-full w-full object-contain" loading="lazy" /> : <div className="grid h-full place-items-center"><ShoppingBag className="size-7 text-[#607267]" /></div>}{item.bestSellerPosition && <div className="absolute left-2 top-2 rounded-full bg-[#ffe600] px-2 py-1 text-[10px] font-black text-[#231f00]">#{item.bestSellerPosition} mais vendido</div>}</div>
                      <CardContent className="space-y-2.5 p-3"><div className="flex flex-wrap gap-1.5"><Badge className={catalogSearchStore === "amazon" ? "bg-[#ff9900] text-[#231500]" : "bg-[#ffe600] text-[#231f00]"}>{catalogSearchStore === "amazon" ? "Amazon" : item.source === "web_search" ? "Marketplace" : item.source === "item" ? "Anúncio" : item.source === "buy_box" ? "Oferta" : item.source === "best_seller" ? "Mais vendido" : "Catálogo"}</Badge>{item.discountPercentage ? <Badge className="bg-[#24c75a] text-[#04140a]">-{item.discountPercentage}%</Badge> : null}{item.coupon && <Badge className="bg-[#3a2154] text-[#dcb6ff]">Cupom</Badge>}{item.full && <Badge className="border border-[#365078] bg-[#14233a] text-[#9bc4ff]">Full</Badge>}</div><h3 className="line-clamp-3 min-h-[3.75rem] text-sm font-bold leading-5">{item.title}</h3><div>{item.originalPrice && item.originalPrice > (item.price || 0) ? <p className="text-xs text-[#718079] line-through">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: item.currency || "BRL" }).format(item.originalPrice)}</p> : null}<p className="text-xl font-extrabold text-[#62ef8b]">{item.price != null ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: item.currency || "BRL" }).format(item.price) : "Preço indisponível"}</p></div><div className="text-[11px] text-[#94a69b]"><p className="truncate">{item.soldQuantity != null ? `${item.soldQuantity} vendidos` : item.itemId || item.catalogProductId || item.id}</p>{item.freeShipping && <p className="font-semibold text-[#8af3a5]">Frete grátis</p>}</div><div className="grid grid-cols-2 gap-1.5"><Button size="sm" onClick={() => void prepareCatalogOffer(item)} disabled={item.price == null || offerPreparing} className="bg-[#24c75a] px-2 font-bold text-[#04140a] hover:bg-[#46df75]"><Send /> Preparar</Button>{item.url ? <Button asChild size="sm" variant="outline" className="border-[#34423a] bg-[#111813] px-2 text-white hover:bg-[#19231c]"><a href={item.url} target="_blank" rel="noreferrer"><ExternalLink /> Abrir</a></Button> : <Button size="sm" variant="outline" disabled>Abrir</Button>}</div><Button size="sm" onClick={() => void prepareCatalogOffer(item)} variant="ghost" className="h-8 w-full text-xs text-[#9fb0a5] hover:bg-[#121b15] hover:text-white"><Database /> Dados + histórico</Button></CardContent>
                    </Card>
                  ))}</div>}
                </div>

                <div className="space-y-5">
                  <Card className="border-[#27322b] bg-[#0b100d] shadow-none"><CardHeader><CardTitle className="text-base">Filtros disponíveis</CardTitle><CardDescription>São atualizados a cada busca conforme a categoria e a loja.</CardDescription></CardHeader><CardContent>{catalogFilterLabels(catalogFilters).length ? <div className="flex flex-wrap gap-2">{catalogFilterLabels(catalogFilters).map((label) => <Badge key={label} className="border border-[#35513e] bg-[#102018] text-[#dff7e5]">{label}</Badge>)}</div> : <p className="text-sm leading-6 text-[#94a69b]">Faça uma consulta para ver categorias, marcas, condição, frete, faixa de preço e outros refinamentos retornados pela loja.</p>} {catalogFilters ? <details className="mt-4 rounded-xl border border-[#27322b] bg-[#080c09]"><summary className="cursor-pointer px-3 py-3 text-sm font-semibold">Ver filtros completos (JSON)</summary><pre className="max-h-72 overflow-auto border-t border-[#27322b] p-3 text-xs leading-5 text-[#8fd9a4]">{JSON.stringify(catalogFilters, null, 2)}</pre></details> : null}</CardContent></Card>

                </div>
              </div>
              <Dialog open={Boolean(selectedCatalogItem)} onOpenChange={(open) => { if (!open) setSelectedCatalogItem(null); }}>
                <DialogContent className="product-detail-modal max-h-[94vh] overflow-y-auto border-[#d9e1e7] bg-white text-[#243447] sm:max-w-5xl">
                  {selectedCatalogItem && <>
                    <DialogHeader><div className="mb-2 flex flex-wrap gap-2"><Badge className="bg-[#ffe600] text-[#231f00]">{selectedCatalogItem.source === "item" ? "Anúncio oficial" : selectedCatalogItem.source === "best_seller" ? "Mais vendido" : selectedCatalogItem.source === "buy_box" ? "Oferta vencedora" : "Produto"}</Badge>{selectedCatalogItem.discountPercentage ? <Badge className="bg-[#24c75a] text-[#04140a]">{selectedCatalogItem.discountPercentage}% OFF</Badge> : null}{selectedCatalogItem.full && <Badge className="bg-[#14233a] text-[#9bc4ff]">Full</Badge>}</div><DialogTitle className="pr-7 text-xl leading-7">{selectedCatalogItem.title}</DialogTitle><DialogDescription>Revise os dados e personalize exatamente como a oferta será enviada.</DialogDescription></DialogHeader>
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]"><div className="aspect-square overflow-hidden rounded-xl bg-white p-3">{selectedCatalogItem.imageUrl ? <img src={selectedCatalogItem.imageUrl} alt={selectedCatalogItem.title} className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center"><ShoppingBag className="size-10 text-[#607267]" /></div>}</div><div className="space-y-3"><div className="rounded-xl border border-[#244b31] bg-[#0d1b12] p-4"><p className="text-xs font-semibold text-[#8fa096]">Preço vigente no marketplace</p><p className="mt-1 text-3xl font-black text-[#62ef8b]">{selectedCatalogItem.price == null ? "Sem oferta ativa" : formatMoney(selectedCatalogItem.price, selectedCatalogItem.currency || "BRL")}</p>{selectedCatalogItem.originalPrice && selectedCatalogItem.originalPrice > (selectedCatalogItem.price || 0) ? <div className="mt-2 flex flex-wrap items-center gap-2"><p className="text-sm text-[#8a9a90] line-through">{formatMoney(selectedCatalogItem.originalPrice, selectedCatalogItem.currency || "BRL")}</p><Badge className="bg-[#24c75a] text-[#04140a]">Economia de {formatMoney(selectedCatalogItem.originalPrice - (selectedCatalogItem.price || 0), selectedCatalogItem.currency || "BRL")}</Badge></div> : null}<p className="mt-2 text-[11px] text-[#718079]">Fonte: {selectedCatalogItem.priceSource === "sale_price" ? "preço de venda oficial" : selectedCatalogItem.priceSource === "prices" ? "lista oficial de preços" : selectedCatalogItem.priceSource === "buy_box" ? "oferta vencedora" : "catálogo"}{selectedCatalogItem.priceUpdatedAt ? ` · ${new Date(selectedCatalogItem.priceUpdatedAt).toLocaleString("pt-BR")}` : ""}</p></div><div className="grid grid-cols-2 gap-2 text-sm">{[["Item", selectedCatalogItem.itemId], ["Catálogo", selectedCatalogItem.catalogProductId], ["Categoria", selectedCatalogItem.categoryName || selectedCatalogItem.categoryId], ["Vendedor", selectedCatalogItem.seller], ["Reputação", selectedCatalogItem.sellerReputation], ["Estoque", selectedCatalogItem.availableQuantity], ["Vendidos", selectedCatalogItem.soldQuantity], ["Garantia", selectedCatalogItem.warranty]].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-[#111813] p-3"><p className="text-xs text-[#718079]">{label}</p><p className="mt-1 break-words font-semibold">{value == null ? "—" : String(value)}</p></div>)}</div></div></div>
                        <PriceHistoryPanel item={selectedCatalogItem} />
                        <div className="rounded-xl border border-[#27322b] bg-[#0d1310] p-4"><p className="text-xs text-[#718079]">Promoção detectada</p><p className="mt-1 font-semibold">{selectedCatalogItem.promotionType || "Nenhuma promoção informada"}</p>{selectedCatalogItem.promotionId && <p className="mt-1 break-all text-xs text-[#94a69b]">{selectedCatalogItem.promotionId}</p>}</div>
                        {selectedCatalogItem.reviews?.length ? <div><div className="mb-3 flex items-end justify-between gap-3"><div><p className="font-bold">Primeiras avaliações</p><p className="mt-1 text-xs text-[#718079]">{selectedCatalogItem.reviews.length} de {selectedCatalogItem.reviewsTotal || "várias"} opiniões públicas, com fotos e vídeos ligados a cada texto.</p></div></div><div className="grid gap-3 sm:grid-cols-2">{selectedCatalogItem.reviews.slice(0, 10).map((review, index) => <article key={`${review.position || index}-${review.text || "mídia"}`} className="rounded-xl border border-[#27322b] bg-[#0d1310] p-3"><div className="flex items-center justify-between gap-2 text-xs"><span className="text-[#ffe45f]">{"★".repeat(Math.round(review.rating || 0))}{"☆".repeat(Math.max(0, 5 - Math.round(review.rating || 0)))}</span><span className="text-[#718079]">{[...new Set([review.country, review.date].filter(Boolean))].join(" · ")}</span></div><p className="mt-2 text-sm leading-6 text-[#dce9df]">{review.text || "Avaliação publicada somente com mídia."}</p>{review.videos?.length ? <div className="mt-3 grid grid-cols-2 gap-1.5">{review.videos.map((url) => <video key={url} src={url} controls preload="metadata" className="aspect-video w-full rounded-lg bg-black object-cover" />)}</div> : null}{review.images?.length ? <div className="mt-3 grid grid-cols-4 gap-1.5">{review.images.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="Foto enviada nesta avaliação" loading="lazy" className="aspect-square w-full rounded-lg object-cover" /></a>)}</div> : null}{review.usefulCount ? <p className="mt-2 text-xs text-[#718079]">{review.usefulCount} pessoas acharam útil</p> : null}</article>)}</div></div> : null}
                        {selectedCatalogItem.attributes?.length ? <div><p className="mb-3 text-sm font-bold text-[#b7c4bc]">Ficha técnica ({selectedCatalogItem.attributes.length})</p><div className="grid gap-2 sm:grid-cols-2">{selectedCatalogItem.attributes.slice(0, 40).map((attribute, index) => <div key={`${String(attribute.id || attribute.name)}-${index}`} className="rounded-lg border border-[#27322b] bg-[#0d1310] px-3 py-2"><p className="text-xs text-[#718079]">{String(attribute.name || attribute.id || "Atributo")}</p><p className="mt-1 text-sm font-medium">{String(attribute.value_name || attribute.valueName || attribute.value_id || "—")}</p></div>)}</div></div> : null}
                        <details className="rounded-xl border border-[#27322b] bg-[#080c09]"><summary className="cursor-pointer px-3 py-3 text-sm font-semibold">Resposta completa da API</summary><div className="border-t border-[#27322b] p-3"><Button variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(JSON.stringify(selectedCatalogItem, null, 2)); toast.success("Dados copiados."); }} className="mb-3 border-[#34423a] bg-[#111813] text-white"><Copy /> Copiar JSON</Button><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all text-xs leading-5 text-[#8fd9a4]">{JSON.stringify(selectedCatalogItem, null, 2)}</pre></div></details>
                      </div>
                      <div className="space-y-4 lg:sticky lg:top-0 lg:self-start"><div className="rounded-2xl border border-[#31543b] bg-[#0b1710] p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-bold text-[#8af3a5]">Mensagem para o WhatsApp</p><p className="mt-1 text-xs leading-5 text-[#94a69b]">Edite livremente antes de enviar.</p></div>{offerPreparing && <LoaderCircle className="size-5 animate-spin text-[#62ef8b]" />}</div><Textarea value={offerMessage} onChange={(event) => setOfferMessage(event.target.value)} rows={10} className="mt-4 min-h-56 resize-y border-[#34423a] bg-[#070b08] leading-6" /><div className="mt-4 space-y-3"><label className="space-y-2 text-sm font-semibold">Grupo de destino<NativeSelect value={offerDestination} onChange={(event) => setOfferDestination(event.target.value)}><NativeSelectOption value="">Escolha um grupo</NativeSelectOption>{destinationGroups.map((destination) => <NativeSelectOption key={destination.JID} value={destination.JID}>{destination.Name}</NativeSelectOption>)}</NativeSelect></label><div className="flex items-center justify-between rounded-xl border border-[#27322b] bg-[#080c09] p-3"><div><p className="text-sm font-semibold">Enviar foto oficial</p><p className="mt-1 text-xs text-[#718079]">Usa a imagem extraída da loja.</p></div><Switch checked={offerIncludeImage} onCheckedChange={setOfferIncludeImage} disabled={!selectedCatalogItem.imageUrl} aria-label="Enviar foto oficial" /></div><div className="grid gap-2 sm:grid-cols-2"><Button variant="outline" onClick={() => { void navigator.clipboard.writeText(offerMessage); toast.success("Mensagem copiada."); }} className="border-[#34423a] bg-[#111813] text-white"><Copy /> Copiar</Button><Button onClick={() => void sendPreparedOffer()} disabled={offerSending || offerPreparing || !offerDestination || !offerMessage.trim()} className="bg-[#24c75a] font-extrabold text-[#04140a] hover:bg-[#46df75]">{offerSending ? <LoaderCircle className="animate-spin" /> : <Send />} Enviar agora</Button></div></div></div></div>
                    </div>
                  </>}
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="ranking" id="ranking-de-quedas">
              <div className="space-y-5 rounded-3xl bg-[#f4f6f8] p-4 text-[#243447] sm:p-6">
                <section className="overflow-hidden rounded-2xl border border-[#cfe0d6] bg-white shadow-[0_8px_30px_rgba(31,54,76,.08)]">
                  <div className="bg-[linear-gradient(115deg,#092d20,#116b3d_58%,#17a85b)] p-5 text-white sm:p-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                      <div><div className="mb-2 flex items-center gap-2 text-sm font-black text-[#89f4ae]"><TrendingDown className="size-5" /> PREÇO REAL, COM HISTÓRICO</div><h2 className="text-2xl font-black">Ranking das maiores quedas de hoje</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#d4f4df]">Compara o preço efetivo atual — incluindo cupom confirmado — com a última medição anterior ao dia. Só entram produtos com pelo menos duas medições reais.</p></div>
                      <div className="flex flex-wrap gap-2"><Button onClick={() => void loadPriceDropRanking()} disabled={rankingLoading} variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">{rankingLoading ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} Recalcular</Button></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-5 lg:grid-cols-4">
                    {[["Quedas reais hoje", rankingStats.totalDrops], ["Em menor preço histórico", rankingStats.historicalLows], ["Queda média", `${rankingStats.averageDrop.toFixed(1)}%`], ["Maior queda", `${rankingStats.biggestDrop.toFixed(1)}%`]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-[#dfe6eb] bg-[#f8fafb] p-3"><p className="text-xs font-bold text-[#71808d]">{label}</p><p className="mt-1 text-2xl font-black text-[#116b3d]">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</p></div>)}
                  </div>
                </section>

                <section className="rounded-2xl border border-[#d9e2e8] bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h3 className="flex items-center gap-2 text-lg font-black"><RefreshCw className="size-5 text-[#087bd3]" /> Atualizar todos os preços agora</h3><p className="mt-1 max-w-3xl text-sm leading-6 text-[#667788]">Abre os produtos no Chrome do coletor, confirma preço e cupons e atualiza o ranking. O modo de 5 abas é mais rápido, mas tem maior chance de o Mercado Livre pedir CAPTCHA.</p></div><div className="flex flex-wrap items-end gap-2"><label className="space-y-1 text-xs font-bold text-[#5f7180]">Abas por lote<NativeSelect value={String(verificationBatchSize)} onChange={(event) => setVerificationBatchSize(Number(event.target.value) === 1 ? 1 : 5)} disabled={catalogVerification.running} className="h-10 min-w-36 border-[#d8e0e6] bg-white text-[#253545]"><NativeSelectOption value="1">1 aba (seguro)</NativeSelectOption><NativeSelectOption value="5">5 abas (rápido)</NativeSelectOption></NativeSelect></label>{catalogVerification.running ? <Button onClick={pauseCatalogVerification} className="h-10 bg-[#e7a51b] font-black text-[#291d00] hover:bg-[#f1b62d]"><Pause /> Pausar</Button> : catalogVerification.paused && catalogVerification.completed < catalogVerification.total ? <Button onClick={() => void verifyAllCatalogedProducts(true)} className="h-10 bg-[#087bd3] font-black text-white hover:bg-[#076bb7]"><Play /> Continuar</Button> : <Button onClick={() => void verifyAllCatalogedProducts(false)} className="h-10 bg-[#087bd3] font-black text-white hover:bg-[#076bb7]"><Play /> Verificar todos</Button>}</div></div>
                  {(catalogVerification.running || catalogVerification.completed > 0 || catalogVerification.message) && <div className="mt-4 rounded-xl border border-[#d9e5ec] bg-[#f5f9fc] p-4"><div className="flex items-center justify-between gap-3 text-xs font-bold"><span>{catalogVerification.message || "Preparando..."}</span><span>{catalogVerification.completed.toLocaleString("pt-BR")} / {catalogVerification.total.toLocaleString("pt-BR")}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#dfe8ee]"><div className="h-full rounded-full bg-[#18a65a] transition-all" style={{ width: `${catalogVerification.total ? Math.min(100, catalogVerification.completed / catalogVerification.total * 100) : 0}%` }} /></div><div className="mt-3 flex flex-wrap gap-3 text-xs text-[#60717e]"><span className="font-bold text-[#138244]">{catalogVerification.updated} atualizados</span><span>{catalogVerification.failed} falharam</span>{catalogVerification.currentTitle && <span className="min-w-0 truncate">Agora: {catalogVerification.currentTitle}</span>}</div></div>}
                </section>

                <section className="rounded-2xl border border-[#dfe5eb] bg-white p-5 shadow-sm"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#82909a]" /><Input value={rankingSearch} onChange={(event) => setRankingSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void loadPriceDropRanking(); }} placeholder="Buscar no ranking por produto ou MLB" className="h-11 border-[#d8e0e6] bg-white pl-10 text-[#253545]" /></div><NativeSelect value={rankingCategory} onChange={(event) => setRankingCategory(event.target.value)} className="h-11 border-[#d8e0e6] bg-white text-[#253545]"><NativeSelectOption value="Todas">Todos os nichos</NativeSelectOption>{catalogedCategories.map((item) => <NativeSelectOption key={item.category} value={item.category}>{item.category}</NativeSelectOption>)}</NativeSelect><Button onClick={() => void loadPriceDropRanking()} className="h-11 bg-[#138244] font-black text-white hover:bg-[#0f6f38]"><Search /> Filtrar</Button></div></section>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rankedProducts.map((item, index) => <button key={item.id} type="button" onClick={() => void openCatalogedProduct(item)} className="group overflow-hidden rounded-2xl border border-[#dce3e8] bg-white text-left shadow-[0_6px_22px_rgba(31,54,76,.07)] transition hover:-translate-y-1 hover:border-[#55ad7b] hover:shadow-[0_14px_32px_rgba(31,54,76,.14)]"><div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 p-4"><div className="relative aspect-square rounded-xl bg-white p-1">{item.imageUrl ? <img src={item.imageUrl} alt={item.title} loading="lazy" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center"><ShoppingBag className="size-9 text-[#9ba8b3]" /></div>}<span className="absolute -left-1 -top-1 grid size-8 place-items-center rounded-full bg-[#102f21] text-xs font-black text-white">#{index + 1}</span></div><div className="min-w-0"><div className="flex flex-wrap gap-1.5"><Badge className="bg-[#dff7e8] text-[#087b3a]">Caiu {item.dropPercent.toFixed(1)}%</Badge>{item.historicalLow && <Badge className="bg-[#ffe04b] text-[#251f00]">Menor histórico</Badge>}</div><h3 className="mt-2 line-clamp-3 text-sm font-black leading-5 text-[#263746]">{item.title}</h3><p className="mt-1 text-xs font-bold text-[#71808d]">{item.category} · {item.historyCount} medições</p></div></div><div className="grid grid-cols-3 border-t border-[#edf1f4] bg-[#fafcfd] text-center"><div className="p-3"><p className="text-[10px] font-bold uppercase text-[#81909b]">Antes</p><p className="mt-1 text-sm font-black text-[#687985] line-through">{formatMoney(item.referencePrice)}</p></div><div className="border-x border-[#edf1f4] p-3"><p className="text-[10px] font-bold uppercase text-[#81909b]">Agora</p><p className="mt-1 text-sm font-black text-[#138244]">{formatMoney(item.currentPrice)}</p></div><div className="p-3"><p className="text-[10px] font-bold uppercase text-[#81909b]">Economia</p><p className="mt-1 text-sm font-black text-[#087bd3]">{formatMoney(item.saving)}</p></div></div></button>)}</div>
                {!rankingLoading && !rankedProducts.length && <div className="rounded-2xl border border-dashed border-[#cbd5dc] bg-white p-12 text-center"><TrendingDown className="mx-auto mb-3 size-10 text-[#97a8b5]" /><p className="font-bold">Nenhuma queda confirmada hoje</p><p className="mt-1 text-sm text-[#71808d]">Clique em “Verificar todos” para criar novas medições e comparar com o histórico anterior.</p></div>}
              </div>
            </TabsContent>

            <TabsContent value="monitoring" id="radar-de-ofertas">
              <div className="space-y-5 rounded-3xl bg-[#f4f6f8] p-4 text-[#243447] sm:p-6">
                <section className="rounded-2xl border border-[#dfe5eb] bg-white p-5 shadow-[0_8px_30px_rgba(31,54,76,.08)] sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-2 flex items-center gap-2 text-sm font-extrabold text-[#138244]"><ShoppingBag className="size-5" /> CATÁLOGO PERSISTENTE</div><h2 className="text-2xl font-black text-[#1b2b3a]">Produtos encontrados pelos monitoramentos</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#667788]">O catálogo guarda também produtos sem desconto para formar o preço-base e detectar quedas futuras. O envio aos grupos aceita somente produtos com desconto válido e preço anterior confirmado.</p></div><Button onClick={() => void loadCatalogedProducts()} disabled={catalogedLoading} className="bg-[#138244] font-extrabold text-white hover:bg-[#0f6f38]">{catalogedLoading ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} Atualizar catálogo</Button></div>
                  <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-6">
                    {[
                      ["Produtos", catalogedStats.total],
                      ["Categorias", catalogedStats.categoryCount],
                      ["Com preço", catalogedStats.withPrice],
                      ["Com desconto válido", catalogedStats.withDiscount],
                      ["Frete grátis", catalogedStats.withFreeShipping],
                      ["Medições", catalogedStats.historyPoints],
                    ].map(([label, value]) => <div key={label} className="rounded-xl border border-[#dfe6eb] bg-[#f8fafb] p-3"><p className="text-xs font-bold text-[#71808d]">{label}</p><p className="mt-1 text-2xl font-black text-[#173a28]">{Number(value).toLocaleString("pt-BR")}</p></div>)}
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#82909a]" /><Input value={catalogedSearch} onChange={(event) => setCatalogedSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void loadCatalogedProducts(); }} placeholder="Buscar por nome ou código MLB" className="h-11 border-[#d8e0e6] bg-white pl-10 text-[#253545]" /></div><NativeSelect value={catalogedCategory} onChange={(event) => setCatalogedCategory(event.target.value)} className="h-11 border-[#d8e0e6] bg-white text-[#253545]"><NativeSelectOption value="Todas">Todas as categorias</NativeSelectOption>{catalogedCategories.map((item) => <NativeSelectOption key={item.category} value={item.category}>{item.category} ({Number(item.total)})</NativeSelectOption>)}</NativeSelect></div>
                </section>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{catalogedProducts.map((item) => <button key={item.id} type="button" onClick={() => void openCatalogedProduct(item)} className="group overflow-hidden rounded-2xl border border-[#dce3e8] bg-white text-left shadow-[0_6px_22px_rgba(31,54,76,.07)] transition hover:-translate-y-1 hover:border-[#8fc5aa] hover:shadow-[0_14px_32px_rgba(31,54,76,.14)]"><div className="relative aspect-[4/3] bg-white p-4">{item.imageUrl ? <img src={item.imageUrl} alt={item.title} loading="lazy" className="h-full w-full object-contain transition group-hover:scale-[1.025]" /> : <div className="grid h-full place-items-center"><ShoppingBag className="size-10 text-[#9ba8b3]" /></div>}<span className="absolute left-3 top-3 rounded-full bg-[#173a28] px-3 py-1 text-[11px] font-black text-[#8df3aa]">{item.category}</span></div><div className="space-y-3 border-t border-[#edf1f4] p-4"><h3 className="line-clamp-3 min-h-[3.75rem] text-sm font-bold leading-5 text-[#263746]">{item.title}</h3><div>{item.originalPrice && item.originalPrice > (item.currentPrice || 0) ? <p className="text-xs text-[#8b98a3] line-through">{formatMoney(item.originalPrice)}</p> : null}<p className="text-2xl font-black text-[#138244]">{formatMoney(item.currentPrice)}</p></div><div className="flex flex-wrap gap-1.5">{item.discountPercentage ? <Badge className="bg-[#ffe04b] text-[#251f00]">-{item.discountPercentage}%</Badge> : null}{item.rating ? <Badge className="bg-[#e8f2fb] text-[#17689f]">★ {item.rating}</Badge> : null}{item.freeShipping ? <Badge className="bg-[#e8f8ef] text-[#138244]">Frete grátis</Badge> : null}</div><p className="text-xs font-extrabold text-[#087bd3]">Ver dados, histórico e enviar →</p></div></button>)}</div>
                {!catalogedProducts.length && <div className="rounded-2xl border border-dashed border-[#cbd5dc] bg-white p-12 text-center"><ShoppingBag className="mx-auto mb-3 size-10 text-[#97a8b5]" /><p className="font-bold">O catálogo ainda está vazio</p><p className="mt-1 text-sm text-[#71808d]">Na próxima pesquisa de cada operação, os produtos encontrados serão salvos aqui automaticamente.</p></div>}
              </div>
              <Dialog open={Boolean(catalogedSelected)} onOpenChange={(open) => { if (!open) setCatalogedSelected(null); }}>
                <DialogContent className="promozap-light max-h-[92vh] overflow-y-auto border-[#d7e1da] bg-white text-[#17221b] sm:max-w-4xl">{catalogedSelected ? <><DialogHeader><DialogTitle className="pr-8 text-xl">{catalogedSelected.title}</DialogTitle><DialogDescription>{catalogedSelected.category} · {catalogedSelected.productCode || catalogedSelected.id}</DialogDescription></DialogHeader><div className="grid gap-5 md:grid-cols-[280px_minmax(0,1fr)]"><div className="rounded-2xl border border-[#dce4e9] bg-white p-4">{catalogedSelected.imageUrl ? <img src={catalogedSelected.imageUrl} alt={catalogedSelected.title} className="aspect-square w-full object-contain" /> : <ShoppingBag className="mx-auto size-16 text-[#9ba8b3]" />}</div><div className="space-y-4"><div className="flex flex-wrap items-end gap-3">{catalogedSelected.originalPrice && catalogedSelected.originalPrice > (catalogedSelected.currentPrice || 0) ? <span className="text-sm text-[#8b98a3] line-through">{formatMoney(catalogedSelected.originalPrice)}</span> : null}<span className="text-4xl font-black text-[#138244]">{formatMoney(catalogedSelected.currentPrice)}</span>{catalogedSelected.discountPercentage ? <Badge className="bg-[#ffe04b] text-[#251f00]">-{catalogedSelected.discountPercentage}%</Badge> : null}</div><div className="grid grid-cols-2 gap-2 text-sm">{[["Avaliação", catalogedSelected.rating ? `★ ${catalogedSelected.rating}` : "—"],["Frete", catalogedSelected.freeShipping ? "Grátis" : "Não informado"],["Primeira leitura", catalogedSelected.firstSeenAt ? new Date(catalogedSelected.firstSeenAt).toLocaleString("pt-BR") : "—"],["Última leitura", catalogedSelected.lastSeenAt ? new Date(catalogedSelected.lastSeenAt).toLocaleString("pt-BR") : "—"]].map(([label,value]) => <div key={label} className="rounded-xl border border-[#dce4e9] bg-[#f8fafb] p-3"><p className="text-xs text-[#71808d]">{label}</p><p className="mt-1 font-bold">{value}</p></div>)}</div><div><p className="mb-2 text-sm font-black">Histórico de preços observado</p><div className="max-h-44 space-y-2 overflow-y-auto rounded-xl border border-[#dce4e9] bg-[#f8fafb] p-3">{catalogedPriceHistory.length ? catalogedPriceHistory.map((point, index) => <div key={`${point.observedAt}-${index}`} className="flex items-center justify-between gap-3 text-xs"><span className="text-[#71808d]">{new Date(point.observedAt).toLocaleString("pt-BR")}</span><span className="font-black text-[#138244]">{formatMoney(point.price)}</span></div>) : <p className="text-xs text-[#71808d]">O primeiro preço foi salvo. Novas alterações aparecerão aqui.</p>}</div></div><Button onClick={() => { const url = catalogedSelected.productUrl || catalogedSelected.url || ""; setCatalogedSelected(null); setActiveTab("generate"); void generatePromotionPreview(url); }} className="w-full bg-[#24c75a] font-extrabold text-[#04140a] hover:bg-[#46df75]"><Send /> Preparar e escolher grupo</Button></div></div></> : null}</DialogContent>
              </Dialog>
              {false && <div className="space-y-5 rounded-3xl bg-[#f4f6f8] p-4 text-[#243447] sm:p-6">
                <section className="overflow-hidden rounded-2xl border border-[#dfe5eb] bg-white shadow-[0_8px_30px_rgba(31,54,76,.08)]">
                  <div className="border-b border-[#e8edf1] bg-[linear-gradient(110deg,#eef8ff,#fff_58%)] p-5 sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="mb-2 flex items-center gap-2 text-sm font-extrabold text-[#0874c9]"><Radar className="size-5" /> MONITORAMENTO EM TEMPO QUASE REAL</div><h2 className="text-2xl font-black text-[#1b2b3a]">Novas ofertas do dia</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#667788]">O coletor abre a vitrine pública do Mercado Livre em intervalos regulares, compara IDs já vistos e destaca somente novidades que atendem aos seus filtros.</p></div><div className={`rounded-full px-4 py-2 text-sm font-bold ${monitoringActive ? "bg-[#e8f8ef] text-[#138244]" : "bg-[#edf1f4] text-[#687785]"}`}>{monitoringActive ? "● Radar ativo" : "○ Radar pausado"}</div></div>
                  </div>
                  <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-5">
                    <label className="space-y-2 text-sm font-bold">Categoria<NativeSelect value={monitoringCategory} onChange={(event) => setMonitoringCategory(event.target.value)} className="border-[#d8e0e6] bg-white text-[#253545]"><NativeSelectOption value="Geral">Geral</NativeSelectOption>{mercadoLivreCategories.map((category) => <NativeSelectOption key={category.id} value={category.name}>{category.name}</NativeSelectOption>)}</NativeSelect></label>
                    <label className="space-y-2 text-sm font-bold">Desconto mínimo<NativeSelect value={monitoringMinDiscount} onChange={(event) => setMonitoringMinDiscount(event.target.value)} className="border-[#d8e0e6] bg-white text-[#253545]"><NativeSelectOption value="0">Qualquer</NativeSelectOption><NativeSelectOption value="10">10% ou mais</NativeSelectOption><NativeSelectOption value="20">20% ou mais</NativeSelectOption><NativeSelectOption value="30">30% ou mais</NativeSelectOption><NativeSelectOption value="40">40% ou mais</NativeSelectOption></NativeSelect></label>
                    <label className="space-y-2 text-sm font-bold">Atualizar a cada<NativeSelect value={monitoringIntervalMinutes} onChange={(event) => setMonitoringIntervalMinutes(event.target.value)} className="border-[#d8e0e6] bg-white text-[#253545]"><NativeSelectOption value="1">1 minuto</NativeSelectOption><NativeSelectOption value="2">2 minutos</NativeSelectOption><NativeSelectOption value="5">5 minutos</NativeSelectOption><NativeSelectOption value="10">10 minutos</NativeSelectOption></NativeSelect></label>
                    <Button onClick={() => setMonitoringActive((value) => !value)} className={`h-[42px] self-end font-extrabold ${monitoringActive ? "bg-[#263746] text-white hover:bg-[#34495a]" : "bg-[#087bd3] text-white hover:bg-[#076bb7]"}`}>{monitoringLoading ? <LoaderCircle className="animate-spin" /> : <Radar />} {monitoringActive ? "Pausar radar" : "Iniciar radar"}</Button>
                  </div>
                </section>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-xl font-black">Ofertas detectadas</h3><p className="mt-1 text-sm text-[#6d7d8a]">Clique no produto para abrir a janela completa e enviar ao seu grupo.</p></div><p className="text-xs font-semibold text-[#758592]">{monitoringLastScan ? `Última leitura: ${new Date(monitoringLastScan).toLocaleString("pt-BR")}` : "Aguardando a primeira leitura"}</p></div>
                {monitoringError && <div className="rounded-xl border border-[#f1c8c8] bg-[#fff2f2] p-4 text-sm text-[#a13b3b]">{monitoringError}</div>}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{monitoringDeals.map((item) => <button key={item.id} type="button" onClick={() => openMonitoredDeal(item)} className="group overflow-hidden rounded-2xl border border-[#dce3e8] bg-white text-left shadow-[0_6px_22px_rgba(31,54,76,.07)] transition hover:-translate-y-1 hover:border-[#8fc5ea] hover:shadow-[0_14px_32px_rgba(31,54,76,.14)]"><div className="relative aspect-[4/3] bg-white p-4">{item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="h-full w-full object-contain transition group-hover:scale-[1.025]" /> : <div className="grid h-full place-items-center"><ShoppingBag className="size-10 text-[#9ba8b3]" /></div>}<div className="absolute left-3 top-3 rounded-full bg-[#12a55c] px-3 py-1 text-xs font-black text-white">{item.discountPercentage ? `-${item.discountPercentage}%` : `${item.dealScore || 0} pts`}</div></div><div className="space-y-3 border-t border-[#edf1f4] p-4"><h4 className="line-clamp-3 min-h-[3.75rem] text-sm font-bold leading-5 text-[#263746]">{item.title}</h4><div>{item.originalPrice && item.originalPrice > (item.price || 0) ? <p className="text-xs text-[#8b98a3] line-through">{formatMoney(item.originalPrice)}</p> : null}<p className="text-2xl font-black text-[#087bd3]">{formatMoney(item.price)}</p></div><div className="flex flex-wrap gap-1.5">{item.scoreReasons?.slice(0, 2).map((reason) => <span key={reason} className="rounded-md bg-[#eef2f5] px-2 py-1 text-[11px] text-[#617180]">{reason}</span>)}</div><p className="text-xs font-extrabold text-[#087bd3]">Ver oferta e enviar →</p></div></button>)}</div>
                {!monitoringDeals.length && <div className="rounded-2xl border border-dashed border-[#cbd5dc] bg-white p-12 text-center"><Radar className="mx-auto mb-3 size-10 text-[#97a8b5]" /><p className="font-bold">Nenhuma leitura feita ainda</p><p className="mt-1 text-sm text-[#71808d]">Ligue o coletor local e clique em “Iniciar radar”.</p></div>}
                <p className="rounded-xl border border-[#dbe6ee] bg-[#eef7fd] p-4 text-xs leading-5 text-[#4f6575]"><strong>Limite técnico:</strong> isto é uma varredura periódica, não um webhook do Mercado Livre. Ela funciona enquanto o coletor e esta página estiverem abertos. Intervalos muito curtos podem acionar validações do marketplace; 2 a 5 minutos é o uso mais seguro.</p>
              </div>}
            </TabsContent>

            <TabsContent value="templates" id="layout-das-mensagens">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                <Card className="border-[#dce4e9] bg-white text-[#243447] shadow-[0_10px_35px_rgba(31,54,76,.08)]">
                  <CardHeader><CardTitle className="flex items-center gap-2 text-xl"><LayoutTemplate className="size-5 text-[#087bd3]" /> Biblioteca de layouts</CardTitle><CardDescription>Salve até 10 modelos e troque o formato da mensagem com um clique.</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <label className="space-y-2 text-sm font-bold">Modelo ativo<NativeSelect value={activeOfferTemplateId} onChange={(event) => selectOfferTemplate(event.target.value)} className="border-[#d8e0e6] bg-white text-[#253545]">{offerTemplates.map((preset) => <NativeSelectOption key={preset.id} value={preset.id}>{preset.name}</NativeSelectOption>)}</NativeSelect></label>
                      <label className="space-y-2 text-sm font-bold">Nome do modelo<Input value={offerTemplateName} onChange={(event) => setOfferTemplateName(event.target.value.slice(0, 40))} maxLength={40} placeholder="Ex.: Oferta relâmpago" className="h-11 border-[#d8e0e6] bg-white text-[#253545]" /></label>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-[#dce4e9] bg-[#f6f9fb] px-3 py-2 text-sm"><span><strong>{offerTemplates.length}</strong> de 10 modelos salvos</span><span className="text-xs text-[#6e7e8b]">O selecionado será usado nas próximas ofertas</span></div>
                    <Textarea value={offerTemplate} onChange={(event) => setOfferTemplate(event.target.value)} rows={16} className="min-h-[390px] border-[#d8e0e6] bg-[#fbfcfd] font-mono text-sm leading-6 text-[#263746]" />
                    <div className="flex flex-wrap gap-2"><Button onClick={saveOfferTemplate} className="bg-[#087bd3] font-extrabold text-white hover:bg-[#076bb7]"><Check /> Salvar alterações</Button><Button variant="outline" onClick={saveOfferTemplateAsNew} disabled={offerTemplates.length >= 10} className="border-[#9bc8e7] bg-[#eef8ff] text-[#086fac]"><Plus /> Salvar como novo</Button><Button variant="outline" onClick={deleteOfferTemplate} disabled={offerTemplates.length <= 1} className="border-[#efcaca] bg-white text-[#a83c3c]"><X /> Excluir</Button><Button variant="outline" onClick={() => setOfferTemplate(defaultOfferTemplate)} className="border-[#cfd8df] bg-white text-[#263746]"><RefreshCw /> Restaurar texto padrão</Button></div>
                    {templateSavedAt && <p className="text-xs text-[#6e7e8b]">Salvo em {new Date(templateSavedAt).toLocaleString("pt-BR")}.</p>}
                  </CardContent>
                </Card>
                <div className="space-y-5"><Card className="border-[#dce4e9] bg-white text-[#243447] shadow-none"><CardHeader><CardTitle className="text-base">Variáveis disponíveis</CardTitle><CardDescription>Clique em uma variável para copiá-la.</CardDescription></CardHeader><CardContent className="space-y-2">{offerTemplateVariables.map(([variable, description]) => <button key={variable} type="button" onClick={() => { void navigator.clipboard.writeText(variable); toast.success(`${variable} copiada.`); }} className="w-full rounded-xl border border-[#e0e6eb] bg-[#f8fafb] p-3 text-left hover:border-[#8fc5ea] hover:bg-[#f1f8fd]"><code className="text-xs font-black text-[#0874c9]">{variable}</code><p className="mt-1 text-xs leading-5 text-[#6d7c89]">{description}</p></button>)}</CardContent></Card><Card className="border-[#dce4e9] bg-[#f4f9fd] text-[#243447] shadow-none"><CardHeader><CardTitle className="text-base">Como os campos opcionais funcionam</CardTitle></CardHeader><CardContent className="text-sm leading-6 text-[#5e6f7d]">Prefira as variáveis que começam com <code>linha_</code>. Quando não houver preço anterior, desconto ou frete, a linha inteira some sem deixar espaço vazio.</CardContent></Card></div>
              </div>
            </TabsContent>

            <TabsContent value="coupons" id="cupons">
              <div className="space-y-5 text-[#203142]">
                <Card className="border-[#d6e3ec] bg-white shadow-none">
                  <CardHeader className="border-b border-[#e4ebf0]"><CardTitle className="flex items-center gap-2 text-lg"><TicketPercent className="size-5 text-[#087bd3]" /> Cupons do Mercado Livre</CardTitle><CardDescription>O coletor aplica o código na sua conta, guarda a confirmação e identifica em quais produtos ele pode ser usado.</CardDescription></CardHeader>
                  <CardContent className="space-y-4 pt-5">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <Input value={couponDraft} onChange={(event) => setCouponDraft(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void applyManagedCoupon(); } }} placeholder="Digite o código, ex.: TCMPD19" maxLength={30} className="h-11 border-[#ccd8e1] bg-white font-black uppercase text-[#203142]" />
                      <Button onClick={() => void applyManagedCoupon()} disabled={couponApplying || !couponDraft.trim()} className="h-11 bg-[#087bd3] font-extrabold text-white hover:bg-[#076bb7]">{couponApplying ? <LoaderCircle className="animate-spin" /> : <TicketPercent />} Aplicar cupom</Button>
                      <Button onClick={() => void refreshManagedCoupons()} disabled={couponRefreshing} variant="outline" className="h-11 border-[#9bc8e7] bg-[#eef8ff] text-[#086fac]">{couponRefreshing ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} Atualizar conta</Button>
                    </div>
                    {couponError && <div className="rounded-xl border border-[#efcaca] bg-[#fff4f3] p-3 text-sm text-[#a83c3c]">{couponError}</div>}
                    <div className="rounded-xl border border-[#cde7d7] bg-[#f1fbf5] p-4 text-xs leading-5 text-[#456253]">Ao preparar uma oferta, o coletor abre “Ver cupons disponíveis”, compara compra mínima, desconto e limite. O código só entra na mensagem quando foi confirmado e realmente corresponde ao produto.</div>
                  </CardContent>
                </Card>
                <div className="grid gap-4 lg:grid-cols-2">
                  {managedCoupons.length === 0 ? <Card className="border-dashed border-[#cbd8e1] bg-white shadow-none lg:col-span-2"><CardContent className="grid min-h-40 place-items-center text-center text-sm text-[#687987]">Nenhum cupom salvo. Digite um código acima para o coletor aplicar e identificar.</CardContent></Card> : managedCoupons.map((coupon) => (
                    <Card key={coupon.id || coupon.code} className="border-[#d6e3ec] bg-white shadow-none">
                      <CardContent className="space-y-3 p-5">
                        <div className="flex items-start justify-between gap-3"><div><Badge className="bg-[#e8f4ff] font-black text-[#0874c9]">{coupon.code}</Badge><h3 className="mt-2 font-black">{coupon.title || coupon.confirmationMessage || "Cupom aplicado"}</h3></div><Switch checked={coupon.active} onCheckedChange={(active) => setManagedCoupons((current) => current.map((item) => item.code === coupon.code ? { ...item, active } : item))} /></div>
                        {coupon.confirmationMessage && <p className="rounded-lg bg-[#f1fbf5] p-3 text-xs leading-5 text-[#456253]">{coupon.confirmationMessage}</p>}
                        <div className="grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-[#f7f9fb] p-3"><span className="text-[#758593]">Benefício</span><strong className="mt-1 block">{coupon.discountType === "percent" ? `${coupon.discountValue || 0}% OFF` : coupon.discountValue ? formatMoney(coupon.discountValue) : "Conforme o produto"}</strong></div><div className="rounded-lg bg-[#f7f9fb] p-3"><span className="text-[#758593]">Compra mínima</span><strong className="mt-1 block">{coupon.minimumPurchase ? formatMoney(coupon.minimumPurchase) : "Não informada"}</strong></div></div>
                        <div className="flex items-center justify-between"><span className={`text-xs font-bold ${coupon.active ? "text-[#138244]" : "text-[#7b8790]"}`}>{coupon.active ? "Ativo para as ofertas" : "Ignorado pelo painel"}</span><Button variant="ghost" size="sm" onClick={() => setManagedCoupons((current) => current.filter((item) => item.code !== coupon.code))} className="text-[#a83c3c] hover:bg-[#fff1f0] hover:text-[#8f2f2f]"><X /> Remover</Button></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="credentials" id="credenciais">
              <div className="space-y-5">
                <Card className="border-[#d6e3ec] bg-white text-[#203142] shadow-none">
                  <CardContent className="flex items-center justify-between gap-4 p-5"><span><span className="flex items-center gap-2 text-sm font-black"><TicketPercent className="size-4 text-[#087bd3]" /> Priorizar produtos com cupom</span><span className="mt-1 block text-xs leading-5 text-[#687987]">Quando houver opções elegíveis com cupom, o sorteio automático escolhe somente entre elas. Se não houver, continua com as demais ofertas.</span></span><Switch checked={prioritizeCouponProducts} onCheckedChange={setPrioritizeCouponProducts} /></CardContent>
                </Card>
                <div className="grid gap-5 xl:grid-cols-2">
                  <Card className="overflow-hidden border-[#27322b] bg-[#0b100d] shadow-none">
                    <CardHeader className="border-b border-[#27322b]"><CardTitle className="flex items-center gap-2 text-lg"><Smartphone className="size-5 text-[#62ef8b]" /> UAZAPI</CardTitle><CardDescription>Instância usada para monitorar e publicar nos grupos.</CardDescription></CardHeader>
                    <CardContent className="space-y-4 pt-5">
                      <label className="block space-y-2 text-sm font-semibold">URL do servidor<Input value={whatsapp.serverUrl} onChange={(event) => setWhatsapp((value) => ({ ...value, serverUrl: event.target.value }))} placeholder="https://free.uazapi.com" className="h-11 border-[#34423a] bg-[#080c09]" /></label>
                      <label className="block space-y-2 text-sm font-semibold"><span className="flex items-center justify-between"><span>Instance Token</span><button type="button" onClick={() => setWhatsappTokenVisible((value) => !value)} className="flex items-center gap-1.5 text-xs text-[#62ef8b]">{whatsappTokenVisible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}{whatsappTokenVisible ? "Ocultar" : "Mostrar"}</button></span><Input type={whatsappTokenVisible ? "text" : "password"} value={whatsapp.instanceToken} onChange={(event) => { setWhatsapp((value) => ({ ...value, instanceToken: event.target.value })); setWhatsappConnected(false); }} placeholder="Cole o token da instância" className="h-11 border-[#34423a] bg-[#080c09] font-mono text-sm" /></label>
                      <div className="flex flex-wrap gap-2"><Button onClick={() => void testWhatsappConnection()} disabled={whatsappTesting} className="bg-[#24c75a] font-bold text-[#04140a] hover:bg-[#46df75]">{whatsappTesting ? <LoaderCircle className="animate-spin" /> : <BadgeCheck />} Testar conexão</Button><Button onClick={() => void setupUazapiWebhook()} disabled={webhookSettingUp || (!whatsapp.instanceToken && !whatsappConnected)} variant="outline" className="border-[#2e7041] bg-[#112a19] text-[#8ef1aa]">{webhookSettingUp ? <LoaderCircle className="animate-spin" /> : <Webhook />} Ativar webhook</Button></div>
                      <p className="text-xs leading-5 text-[#94a69b]">Salvamento automático neste navegador. Estado: <strong className={whatsappConnected ? "text-[#62ef8b]" : "text-[#e6c47d]"}>{whatsappConnected ? `conectado · ${groups.length} grupos` : "aguardando teste"}</strong>.</p>
                    </CardContent>
                  </Card>

                  <Card className="border-[#27322b] bg-[#0b100d] shadow-none">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Link2 className="size-5 text-[#62ef8b]" /> Afiliados</CardTitle><CardDescription>Identificadores aplicados automaticamente ao gerar promoções.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><label className="space-y-2 text-sm font-semibold">Tag do Mercado Livre<Input value={affiliate.mercadoLivreLabel} onChange={(event) => setAffiliate((value) => ({ ...value, mercadoLivreLabel: event.target.value }))} placeholder="promozap" className="h-11 border-[#34423a] bg-[#080c09]" /></label><label className="flex h-11 items-center gap-2 rounded-xl border border-[#34423a] px-3 text-sm"><Switch checked={affiliate.mercadoLivreEnabled} onCheckedChange={(mercadoLivreEnabled) => setAffiliate((value) => ({ ...value, mercadoLivreEnabled }))} /> Ativo</label></div>
                      <label className="block space-y-2 text-sm font-semibold">Domínio de redirecionamento<Input value={affiliate.redirectDomain} onChange={(event) => setAffiliate((value) => ({ ...value, redirectDomain: event.target.value }))} placeholder="https://go.promozap.com.br" className="h-11 border-[#34423a] bg-[#080c09]" /></label>
                      <Button onClick={() => void saveAffiliate()} disabled={saving} className="bg-[#24c75a] font-bold text-[#04140a] hover:bg-[#46df75]">{saving ? <LoaderCircle className="animate-spin" /> : <BadgeCheck />} Salvar afiliados</Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-5">
                  <Card className="border-[#27322b] bg-[#0b100d] shadow-none">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Database className="size-5 text-[#62ef8b]" /> APIs de catálogo</CardTitle><CardDescription>Credenciais para consulta estruturada de produtos.</CardDescription></CardHeader>
                    <CardContent className="space-y-3">
                      <Input value={mercadoLivreClientId} onChange={(event) => setMercadoLivreClientId(event.target.value)} placeholder="Mercado Livre Client ID" className="h-11 border-[#34423a] bg-[#080c09]" />
                      <Input type="password" value={mercadoLivreClientSecret} onChange={(event) => setMercadoLivreClientSecret(event.target.value)} placeholder="Mercado Livre Client Secret" className="h-11 border-[#34423a] bg-[#080c09]" />
                      <Input type="password" value={mercadoLivreAccessToken} onChange={(event) => setMercadoLivreAccessToken(event.target.value)} placeholder="Access Token temporário (opcional)" className="h-11 border-[#34423a] bg-[#080c09]" />
                      <div className="flex flex-wrap gap-2"><Button onClick={() => void saveCatalogCredentials()} disabled={catalogCredentialsSaving} variant="outline" className="border-[#2e7041] bg-[#112a19] text-[#8ef1aa]">{catalogCredentialsSaving ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />} Salvar APIs</Button><Button onClick={() => void connectMercadoLivre()} disabled={mercadoLivreConnecting} className="bg-[#ffe600] font-bold text-[#231f00] hover:bg-[#fff05a]">{mercadoLivreConnecting ? <LoaderCircle className="animate-spin" /> : <ExternalLink />} Conectar Mercado Livre</Button></div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-[#27322b] bg-[#0b100d] shadow-none">
                  <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><PackageSearch className="size-5 text-[#62ef8b]" /> Coletor local</CardTitle><CardDescription>Endereço e token do navegador que extrai preço, cupom e avaliações.</CardDescription></CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"><label className="space-y-2 text-sm font-semibold">URL do coletor<Input value={localCollectorUrl} onChange={(event) => setLocalCollectorUrl(event.target.value)} placeholder="http://127.0.0.1:8765" className="h-11 border-[#34423a] bg-[#080c09]" /></label><label className="space-y-2 text-sm font-semibold">Token do coletor<Input type="password" value={localCollectorToken} onChange={(event) => setLocalCollectorToken(event.target.value)} placeholder="Token exibido no coletor" className="h-11 border-[#34423a] bg-[#080c09]" /></label><Button onClick={() => void checkLocalCollector(true)} variant="outline" className="h-11 border-[#2e7041] bg-[#112a19] text-[#8ef1aa]"><RefreshCw /> Testar</Button></CardContent>
                </Card>

                <Card className="border-[#d6e3ec] bg-white text-[#203142] shadow-none">
                  <CardHeader className="border-b border-[#e4ebf0]"><CardTitle className="flex items-center gap-2 text-lg"><MessageCircleMore className="size-5 text-[#087bd3]" /> Atendimento privado por IA</CardTitle><CardDescription>Responde dúvidas recebidas no privado do número conectado, usando as ofertas realmente enviadas.</CardDescription></CardHeader>
                  <CardContent className="space-y-5 pt-5">
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#cfe0eb] bg-[#f7fbfe] p-4"><span><span className="block text-sm font-black">Responder mensagens privadas</span><span className="mt-1 block text-xs leading-5 text-[#687987]">A IA identifica os últimos produtos enviados, conversa com contexto e repete o link correto depois de responder. A chave é salva imediatamente.</span></span><Switch checked={privateAssistantSettings.enabled} disabled={privateAssistantSaving || !privateAssistantConfigured} onCheckedChange={(enabled) => { const next = { ...privateAssistantSettings, enabled }; setPrivateAssistantSettings(next); void savePrivateAssistantSettings(next); }} /></div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-sm font-bold">Modelo<NativeSelect value={privateAssistantSettings.model} onChange={(event) => setPrivateAssistantSettings((current) => ({ ...current, model: event.target.value as PrivateAssistantSettings["model"] }))} className="border-[#ccd8e1] bg-white text-[#203142]"><NativeSelectOption value="gpt-6-luna">GPT-6 Luna · econômico</NativeSelectOption><NativeSelectOption value="gpt-6.1-sol">GPT-6.1 Sol · mais preciso</NativeSelectOption><NativeSelectOption value="gpt-6-astra">GPT-6 Astra · premium</NativeSelectOption></NativeSelect></label>
                      <label className="space-y-2 text-sm font-bold">Tempo mínimo “digitando…”<NativeSelect value={String(privateAssistantSettings.typingDelayMs)} onChange={(event) => setPrivateAssistantSettings((current) => ({ ...current, typingDelayMs: Number(event.target.value) }))} className="border-[#ccd8e1] bg-white text-[#203142]"><NativeSelectOption value="1200">1,2 segundos</NativeSelectOption><NativeSelectOption value="2400">2,4 segundos · natural</NativeSelectOption><NativeSelectOption value="3500">3,5 segundos</NativeSelectOption><NativeSelectOption value="5000">5 segundos</NativeSelectOption></NativeSelect></label>
                    </div>
                    <div className="rounded-xl border border-[#cde7d7] bg-[#f1fbf5] p-4 text-xs leading-5 text-[#456253]"><strong>Como funciona:</strong> ao receber “esse celular tem NFC?”, ele relaciona a pergunta às ofertas recentes. Se houver dúvida, pergunta “você está falando do produto X?”. Depois da resposta, sempre envia novamente o link daquela oferta. O indicador “digitando…” aparece durante um tempo proporcional ao tamanho da resposta.</div>
                    <div className="rounded-xl border border-[#ead9b0] bg-[#fff9ea] p-4 text-xs leading-5 text-[#6f5b27]">A IA combina o histórico da conversa, os dados do catálogo e uma pesquisa silenciosa pelo modelo exato. Ela responde somente com fatos úteis confirmados, sem mostrar fontes ou bastidores ao cliente. O contato pode escrever <strong>parar</strong> a qualquer momento.</div>
                    <div className="flex flex-wrap items-center gap-3"><Button onClick={() => void savePrivateAssistantSettings()} disabled={privateAssistantSaving || !privateAssistantConfigured} className="bg-[#087bd3] font-extrabold text-white hover:bg-[#076bb7]">{privateAssistantSaving ? <LoaderCircle className="animate-spin" /> : <Check />} Salvar atendimento</Button><span className={`text-xs font-bold ${privateAssistantConfigured ? "text-[#138244]" : "text-[#b5473a]"}`}>{privateAssistantConfigured ? "OpenAI configurada" : "Configure a OpenAI no servidor"}</span></div>
                  </CardContent>
                </Card>

                <Card className="border-[#d6e3ec] bg-white text-[#203142] shadow-none">
                  <CardHeader className="border-b border-[#e4ebf0]"><CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="size-5 text-[#087bd3]" /> CTA inteligente</CardTitle><CardDescription>Cria uma frase curta para cada produto. A chave fica somente no servidor e frases repetidas usam o cache.</CardDescription></CardHeader>
                  <CardContent className="space-y-5 pt-5">
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#dce5eb] bg-[#f6f9fb] p-4"><span><span className="block text-sm font-black">Gerar conteúdo com IA</span><span className="mt-1 block text-xs text-[#687987]">Usado tanto no envio manual quanto nos monitoramentos automáticos.</span></span><Switch checked={aiCtaSettings.enabled} onCheckedChange={(enabled) => setAiCtaSettings((current) => ({ ...current, enabled }))} /></div>
                    <div className="grid gap-3 rounded-2xl border border-[#cfe0eb] bg-[#f7fbfe] p-4 md:grid-cols-2">
                      <button type="button" onClick={() => setAiCtaSettings((current) => ({ ...current, generationMode: "cta" }))} className={`rounded-xl border p-4 text-left transition ${aiCtaSettings.generationMode === "cta" ? "border-[#087bd3] bg-[#eaf6ff] shadow-[0_0_0_2px_rgba(8,123,211,.12)]" : "border-[#d8e3ea] bg-white hover:border-[#9bc8e7]"}`}><span className="block text-sm font-black">CTA curto · recomendado</span><span className="mt-1 block text-xs leading-5 text-[#687987]">Uma frase de impacto acima do seu template atual. Mais barato e previsível.</span></button>
                      <button type="button" onClick={() => setAiCtaSettings((current) => ({ ...current, generationMode: "full-copy" }))} className={`rounded-xl border p-4 text-left transition ${aiCtaSettings.generationMode === "full-copy" ? "border-[#7c3aed] bg-[#f5f0ff] shadow-[0_0_0_2px_rgba(124,58,237,.12)]" : "border-[#d8e3ea] bg-white hover:border-[#bba7e8]"}`}><span className="block text-sm font-black">Mensagem completa por IA · teste</span><span className="mt-1 block text-xs leading-5 text-[#687987]">Cria toda a copy humanizada, formatada e termina com o link curto destacado.</span></button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="space-y-2 text-sm font-bold">Modelo<NativeSelect value={aiCtaSettings.model} onChange={(event) => setAiCtaSettings((current) => ({ ...current, model: event.target.value as AiCtaSettings["model"] }))} className="border-[#ccd8e1] bg-white text-[#203142]"><NativeSelectOption value="gpt-6-luna">GPT-6 Luna · econômico</NativeSelectOption><NativeSelectOption value="gpt-6.1-sol">GPT-6.1 Sol · avançado</NativeSelectOption><NativeSelectOption value="gpt-6-astra">GPT-6 Astra · premium</NativeSelectOption></NativeSelect></label>
                      <label className="space-y-2 text-sm font-bold">Estilo<NativeSelect value={aiCtaSettings.style} onChange={(event) => setAiCtaSettings((current) => ({ ...current, style: event.target.value as AiCtaSettings["style"] }))} className="border-[#ccd8e1] bg-white text-[#203142]"><NativeSelectOption value="direto">Direto e popular</NativeSelectOption><NativeSelectOption value="urgencia">Urgência moderada</NativeSelectOption><NativeSelectOption value="bem-humorado">Bem-humorado</NativeSelectOption><NativeSelectOption value="elegante">Elegante</NativeSelectOption></NativeSelect></label>
                      <label className="space-y-2 text-sm font-bold">Máximo de palavras<Input type="number" min={4} max={15} value={aiCtaSettings.maxWords} onChange={(event) => setAiCtaSettings((current) => ({ ...current, maxWords: Number(event.target.value) }))} className="h-11 border-[#ccd8e1] bg-white text-[#203142]" /><span className="block text-[11px] font-normal leading-4 text-[#687987]">Recomendado: 10. Frases maiores são refeitas, nunca cortadas.</span></label>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="flex items-center justify-between gap-4 rounded-xl border border-[#dce5eb] bg-[#f6f9fb] p-4"><span><span className="block text-sm font-black">Enfeitar com emoji</span><span className="mt-1 block text-xs text-[#687987]">A IA escolhe um emoji relacionado ao produto.</span></span><Switch checked={aiCtaSettings.emoji} onCheckedChange={(emoji) => setAiCtaSettings((current) => ({ ...current, emoji }))} /></label>
                      <label className="space-y-2 text-sm font-bold">Formatação no WhatsApp<NativeSelect value={aiCtaSettings.formatting} onChange={(event) => setAiCtaSettings((current) => ({ ...current, formatting: event.target.value as AiCtaSettings["formatting"] }))} className="border-[#ccd8e1] bg-white text-[#203142]"><NativeSelectOption value="plain">Texto normal</NativeSelectOption><NativeSelectOption value="bold">Negrito</NativeSelectOption><NativeSelectOption value="italic">Itálico</NativeSelectOption><NativeSelectOption value="bold-italic">Negrito + itálico</NativeSelectOption></NativeSelect></label>
                    </div>
                    <div className="rounded-xl border border-[#cde7d7] bg-[#f1fbf5] p-3 text-xs leading-5 text-[#456253]">Servidor: <strong className={aiCtaConfigured ? "text-[#138244]" : "text-[#b5473a]"}>{aiCtaConfigured ? "chave configurada" : "aguardando chave"}</strong> · <strong>{aiCtaCacheEntries}</strong> conteúdo(s) salvos. O cache é permanente e só é descartado quando você usa o botão abaixo.</div>
                    <div className="rounded-2xl border border-[#dbe4ea] bg-white p-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-black">Comparação estimada de custo</p><p className="mt-1 text-xs text-[#687987]">Estimativa conservadora; o valor real varia com título, dados e resposta.</p></div><Badge className="w-fit bg-[#e8f4ff] text-[#0874c9]">por 10.000 gerações</Badge></div>
                      {(() => { const rates = { "gpt-6-luna": { input: .1, output: .5 }, "gpt-6.1-sol": { input: 2, output: 10 }, "gpt-6-astra": { input: 10, output: 50 } }[aiCtaSettings.model]; const estimate = (input: number, output: number) => ((input * rates.input + output * rates.output) / 1_000_000 * 10_000); const shortCost = estimate(220, 18); const fullCost = estimate(330, 130); return <div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#dce5eb] bg-[#f8fafb] p-3"><p className="text-xs font-bold text-[#607180]">CTA curto</p><p className="mt-1 text-2xl font-black text-[#138244]">US$ {shortCost.toFixed(2)}</p><p className="text-[11px] text-[#7a8995]">≈ US$ {(shortCost / 10_000).toFixed(6)} por geração</p></div><div className="rounded-xl border border-[#dfd4f4] bg-[#faf7ff] p-3"><p className="text-xs font-bold text-[#6d4aa2]">Mensagem completa</p><p className="mt-1 text-2xl font-black text-[#7c3aed]">US$ {fullCost.toFixed(2)}</p><p className="text-[11px] text-[#806d9d]">≈ {(fullCost / shortCost).toFixed(1)}× o CTA curto · cache custa US$ 0</p></div></div>; })()}
                    </div>
                    <div className="flex flex-wrap gap-2"><Button onClick={saveAiCtaSettings} className="bg-[#087bd3] font-extrabold text-white hover:bg-[#076bb7]"><Check /> Salvar configuração</Button><Button onClick={() => void testAiCta()} disabled={aiCtaTesting || !aiCtaConfigured} variant="outline" className="border-[#9bc8e7] bg-[#eef8ff] text-[#086fac]">{aiCtaTesting ? <LoaderCircle className="animate-spin" /> : <Sparkles />} Testar frase</Button><Button onClick={() => void resetAiCtaCache()} disabled={aiCtaResetting || aiCtaCacheEntries === 0} variant="outline" className="border-[#efcaca] bg-white text-[#a83c3c]">{aiCtaResetting ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} Limpar cache</Button></div>
                    <p className="text-xs leading-5 text-[#687987]">O CTA aparece no topo. Se o modelo contém <code>{"{{linha_cta_ia}}"}</code>, ele entra nessa posição; modelos antigos sem a variável recebem a frase automaticamente no início.</p>
                  </CardContent>
                </Card>

                <Card className="border-[#d6e3ec] bg-white text-[#203142] shadow-none">
                  <CardHeader className="border-b border-[#e4ebf0]"><CardTitle className="flex items-center gap-2 text-lg"><MessageCircleMore className="size-5 text-[#087bd3]" /> Imagem, carrossel e botão</CardTitle><CardDescription>Controle a apresentação visual das ofertas. Todas as preferências ficam salvas neste navegador.</CardDescription></CardHeader>
                  <CardContent className="space-y-5 pt-5">
                    <div className="grid gap-5 rounded-2xl border border-[#cfe0eb] bg-[#f7fbfe] p-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
                      <div className="space-y-4">
                        <label className="flex items-center justify-between gap-4"><span><span className="block text-sm font-black">Preview personalizado DesconteX</span><span className="mt-1 block text-xs leading-5 text-[#687987]">Monta uma imagem horizontal com foto oficial, desconto, avaliação, quantidade vendida e a sua marca. Ela aparece como preview leve do link, sem enviar outra foto para a galeria do celular.</span></span><Switch checked={brandedPreviewEnabled} onCheckedChange={updateBrandedPreviewEnabled} /></label>
                        <label className="block space-y-2 text-sm font-bold">Layout padrão dos envios manuais<NativeSelect value={brandedPreviewStyle} onChange={(event) => updateBrandedPreviewStyle(event.target.value as OfferPreviewStyle)} className="h-11 border-[#ccd8e1] bg-white text-[#203142]"><NativeSelectOption value="classic">Informativo — layout atual salvo</NativeSelectOption><NativeSelectOption value="focus">Produto em destaque — foto maior</NativeSelectOption></NativeSelect></label>
                        <div className={`rounded-xl border px-3 py-2 text-xs leading-5 ${brandedPreviewEnabled && carouselEnabled ? "border-[#ead69d] bg-[#fff9e8] text-[#745c1c]" : brandedPreviewEnabled ? "border-[#bce1ca] bg-[#effaf3] text-[#27633c]" : "border-[#dce5eb] bg-white text-[#687987]"}`}>{brandedPreviewEnabled && carouselEnabled ? "O preview está ligado, mas o carrossel tem prioridade. Desligue o carrossel para usar esta imagem." : brandedPreviewEnabled ? "Ativo: será usado nos envios simples; se a montagem falhar, a foto oficial continua sendo usada." : "Desligado: o envio simples mantém a foto oficial como antes."}</div>
                      </div>
                      <div className="relative mx-auto aspect-[40/21] w-full max-w-[380px] overflow-hidden rounded-2xl border border-[#d8e3ea] bg-gradient-to-br from-[#f7fcff] via-white to-[#e5f6ff] shadow-sm">
                        <div className="absolute -right-8 -top-10 size-40 rounded-full bg-[#075ff7]/[.06]" />
                        <div className="absolute -bottom-16 -left-8 size-40 rounded-full bg-[#06cce3]/[.07]" />
                        <div className="absolute left-3 top-3 z-10 rounded-xl bg-gradient-to-r from-[#075ff7] to-[#06aee8] px-3 py-1.5 text-xs font-black text-white shadow">-35% OFF</div>
                        <Image src="/descontex-logo.png" width={170} height={57} alt="DesconteX" className="absolute right-3 top-2 z-10 h-auto w-28 object-contain drop-shadow-sm" />
                        <div className="absolute inset-x-0 bottom-8 top-9 grid place-items-center"><ShoppingBag className="size-20 text-[#93aabd]" strokeWidth={1.25} /></div>
                        <div className="absolute bottom-3 left-3 z-10 rounded-full bg-[#071a3a] px-3 py-1.5 text-xs font-black text-[#ffd84d] shadow">★★★★★ 4,8</div>
                        <div className="absolute bottom-3 right-3 z-10 rounded-full bg-gradient-to-r from-[#075ff7] to-[#06cce3] px-3 py-1.5 text-xs font-black text-white shadow">+10 mil vendidos</div>
                        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-[#075ff7] via-[#087bd3] to-[#06cce3]" />
                      </div>
                    </div>
                    <div className="grid gap-4 rounded-xl border border-[#dce5eb] bg-[#f6f9fb] p-4 md:grid-cols-[minmax(0,1fr)_280px] md:items-center">
                      <label className="flex items-center justify-between gap-4"><span><span className="block text-sm font-bold">Enviar com carrossel</span><span className="mt-1 block text-xs leading-5 text-[#687987]">Desligado: usa envio simples. Ligado: acrescenta até quatro avaliações com mídia e substitui o preview personalizado.</span></span><Switch checked={carouselEnabled} onCheckedChange={updateCarouselEnabled} /></label>
                      <label className="space-y-2 text-sm font-bold">Texto do botão<NativeSelect value={carouselButtonLabel} onChange={(event) => updateCarouselButtonLabel(event.target.value)} disabled={!carouselEnabled} className="border-[#ccd8e1] bg-white text-[#203142]">{Array.from(new Set(["VER OFERTA", ...buttonSettings.labels])).map((label) => <NativeSelectOption key={label} value={label}>{label}</NativeSelectOption>)}</NativeSelect></label>
                    </div>
                    <div><p className="mb-2 text-sm font-bold">Frases disponíveis para o botão</p><div className="flex flex-wrap gap-2">{buttonSettings.labels.map((label, index) => <div key={`${label}-${index}`} className="flex items-center gap-2 rounded-full border border-[#b9d4e5] bg-[#eef8ff] py-1.5 pl-3 pr-1.5 text-sm font-semibold text-[#185879]"><span>{label}</span><button type="button" onClick={() => setButtonSettings((current) => ({ ...current, labels: current.labels.filter((_, itemIndex) => itemIndex !== index) }))} className="grid size-6 place-items-center rounded-full hover:bg-[#dbeef9]"><X className="size-3.5" /></button></div>)}</div></div>
                    <div className="flex flex-col gap-2 sm:flex-row"><Input value={buttonDraft} onChange={(event) => setButtonDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addButtonLabel(); } }} maxLength={25} placeholder="Ex.: GARANTA AQUI" className="h-11 border-[#ccd8e1] bg-white text-[#203142]" /><Button onClick={addButtonLabel} variant="outline" className="border-[#9bc8e7] bg-[#eef8ff] text-[#086fac]"><Plus /> Adicionar</Button><Button onClick={() => void saveButtonSettings()} disabled={buttonSettingsSaving} className="bg-[#087bd3] font-bold text-white hover:bg-[#076bb7]">{buttonSettingsSaving ? <LoaderCircle className="animate-spin" /> : <BadgeCheck />} Salvar frases</Button></div>
                    <p className="text-xs leading-5 text-[#687987]">O preview personalizado e o carrossel são opções independentes, mas o carrossel tem prioridade quando ambos estiverem ligados.</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="logs" id="logs">
              <Card className="overflow-hidden border-[#27322b] bg-[#080c09] text-white shadow-none">
                <CardHeader className="grid gap-3 border-b border-[#27322b] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div><CardTitle className="flex items-center gap-2 text-lg"><ScrollText className="size-5 text-[#62ef8b]" /> Log provisório da UAZAPI</CardTitle><CardDescription className="mt-1 text-[#94a69b]">Atualiza automaticamente a cada seis segundos.</CardDescription></div>
                  <Button onClick={() => void loadAutomationLogs()} disabled={logsLoading} variant="outline" className="h-10 rounded-lg border-[#34423a] bg-[#111813] text-white hover:bg-[#19231c]"><RefreshCw className={logsLoading ? "animate-spin" : ""} /> Atualizar</Button>
                </CardHeader>
                <CardContent className="max-h-[520px] space-y-2 overflow-y-auto p-3 sm:p-4">
                  {logsLoading && automationLogs.length === 0 ? (
                    <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-[#94a69b]"><LoaderCircle className="size-5 animate-spin text-[#62ef8b]" /> Carregando eventos...</div>
                  ) : automationLogs.length === 0 ? (
                    <div className="flex min-h-40 flex-col items-center justify-center text-center"><ScrollText className="mb-3 size-8 text-[#536158]" /><p className="font-semibold">Nenhum evento recebido ainda</p><p className="mt-1 text-sm text-[#94a69b]">Ative o webhook e envie um link em um grupo-fonte.</p></div>
                  ) : automationLogs.map((entry) => (
                    <div key={entry.id} className="grid gap-2 rounded-xl border border-[#27322b] bg-[#0d1310] p-3 sm:grid-cols-[116px_minmax(0,1fr)_auto] sm:items-start">
                      <span className={`w-fit rounded-full border px-2 py-1 text-xs font-bold ${entry.level === "success" ? "border-[#2d7543] bg-[#12301c] text-[#7cf399]" : entry.level === "error" ? "border-[#784235] bg-[#2a1612] text-[#ff9b92]" : entry.level === "warning" ? "border-[#6e5d25] bg-[#29220b] text-[#f0d274]" : "border-[#3b4b41] bg-[#18201b] text-[#b8c6bc]"}`}>{entry.stage}</span>
                      <div className="min-w-0"><p className="text-sm font-medium leading-6 text-[#eef6f0]">{entry.message}</p>{entry.groupJid && <p className="mt-1 truncate text-xs text-[#7f9085]">Grupo: {entry.groupJid}</p>}</div>
                      <time className="text-xs text-[#738078]">{new Date(entry.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </div>
      </div>
    </main>
  );
}
