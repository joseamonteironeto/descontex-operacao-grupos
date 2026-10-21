import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const groupConfigs = sqliteTable("group_configs", {
  jid: text("jid").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default("ignored"),
  category: text("category").notNull().default("geral"),
  destinationJid: text("destination_jid"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull(),
});

export const affiliateSettings = sqliteTable("affiliate_settings", {
  id: integer("id").primaryKey(),
  amazonTrackingId: text("amazon_tracking_id").notNull().default(""),
  mercadoLivreLabel: text("mercado_livre_label").notNull().default(""),
  redirectDomain: text("redirect_domain").notNull().default(""),
  amazonEnabled: integer("amazon_enabled", { mode: "boolean" }).notNull().default(true),
  mercadoLivreEnabled: integer("mercado_livre_enabled", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull(),
});

export const productEvents = sqliteTable("product_events", {
  id: text("id").primaryKey(),
  fingerprint: text("fingerprint").notNull().unique(),
  store: text("store").notNull().default("unknown"),
  productCode: text("product_code"),
  title: text("title"),
  imageUrl: text("image_url"),
  productDataJson: text("product_data_json"),
  dataSource: text("data_source"),
  sourceUrl: text("source_url").notNull(),
  resolvedUrl: text("resolved_url"),
  affiliateUrl: text("affiliate_url"),
  status: text("status").notNull().default("found"),
  sourceGroup: text("source_group"),
  destinationGroup: text("destination_group"),
  messageExcerpt: text("message_excerpt"),
  redirectCount: integer("redirect_count").notNull().default(0),
  occurrences: integer("occurrences").notNull().default(1),
  errorMessage: text("error_message"),
  foundAt: text("found_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  sentAt: text("sent_at"),
  updatedAt: text("updated_at").notNull(),
});

export const processedMessages = sqliteTable("processed_messages", {
  messageId: text("message_id").primaryKey(),
  groupJid: text("group_jid"),
  status: text("status").notNull().default("processing"),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const automationLogs = sqliteTable("automation_logs", {
  id: text("id").primaryKey(),
  level: text("level").notNull().default("info"),
  stage: text("stage").notNull(),
  message: text("message").notNull(),
  detailsJson: text("details_json"),
  groupJid: text("group_jid"),
  productId: text("product_id"),
  createdAt: text("created_at").notNull(),
});

export const offerSends = sqliteTable("offer_sends", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  productKey: text("product_key"),
  productTitle: text("product_title"),
  productUrl: text("product_url"),
  destinationJid: text("destination_jid").notNull(),
  destinationName: text("destination_name"),
  monitorId: text("monitor_id"),
  sendMode: text("send_mode").notNull().default("manual"),
  sentAt: text("sent_at").notNull(),
});

export const catalogProducts = sqliteTable("catalog_products", {
  id: text("id").primaryKey(),
  store: text("store").notNull().default("mercadolivre"),
  category: text("category").notNull().default("Geral"),
  productCode: text("product_code"),
  title: text("title").notNull(),
  imageUrl: text("image_url"),
  productUrl: text("product_url").notNull(),
  currentPrice: real("current_price"),
  previousPrice: real("previous_price"),
  originalPrice: real("original_price"),
  discountPercentage: integer("discount_percentage").notNull().default(0),
  freeShipping: integer("free_shipping", { mode: "boolean" }).notNull().default(false),
  rating: real("rating"),
  soldText: text("sold_text"),
  payloadJson: text("payload_json"),
  firstSeenAt: text("first_seen_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const catalogPriceHistory = sqliteTable("catalog_price_history", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  price: real("price"),
  originalPrice: real("original_price"),
  observedAt: text("observed_at").notNull(),
});

export const offerSendLocks = sqliteTable("offer_send_locks", {
  monitorId: text("monitor_id").notNull(),
  productKey: text("product_key").notNull(),
  lockedAt: text("locked_at").notNull(),
  expiresAt: text("expires_at").notNull(),
});

export const privateAssistantSettings = sqliteTable("private_assistant_settings", {
  id: integer("id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  model: text("model").notNull().default("gpt-6-luna"),
  typingDelayMs: integer("typing_delay_ms").notNull().default(2400),
  updatedAt: text("updated_at").notNull(),
});

export const privateAssistantConversations = sqliteTable("private_assistant_conversations", {
  chatJid: text("chat_jid").primaryKey(),
  historyJson: text("history_json").notNull().default("[]"),
  activeProductId: text("active_product_id"),
  activeProductTitle: text("active_product_title"),
  activeProductUrl: text("active_product_url"),
  optedOut: integer("opted_out", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull(),
});
