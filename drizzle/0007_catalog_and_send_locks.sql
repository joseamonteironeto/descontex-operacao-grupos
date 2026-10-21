CREATE TABLE `catalog_products` (
  `id` text PRIMARY KEY NOT NULL,
  `store` text DEFAULT 'mercadolivre' NOT NULL,
  `category` text DEFAULT 'Geral' NOT NULL,
  `product_code` text,
  `title` text NOT NULL,
  `image_url` text,
  `product_url` text NOT NULL,
  `current_price` real,
  `previous_price` real,
  `original_price` real,
  `discount_percentage` integer DEFAULT 0 NOT NULL,
  `free_shipping` integer DEFAULT 0 NOT NULL,
  `rating` real,
  `sold_text` text,
  `payload_json` text,
  `first_seen_at` text NOT NULL,
  `last_seen_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_catalog_products_category_seen` ON `catalog_products` (`category`,`last_seen_at`);
--> statement-breakpoint
CREATE INDEX `idx_catalog_products_title` ON `catalog_products` (`title`);
--> statement-breakpoint
CREATE TABLE `catalog_price_history` (
  `id` text PRIMARY KEY NOT NULL,
  `product_id` text NOT NULL,
  `price` real,
  `original_price` real,
  `observed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_catalog_price_product_observed` ON `catalog_price_history` (`product_id`,`observed_at`);
--> statement-breakpoint
CREATE TABLE `offer_send_locks` (
  `monitor_id` text NOT NULL,
  `product_key` text NOT NULL,
  `locked_at` text NOT NULL,
  `expires_at` text NOT NULL,
  PRIMARY KEY (`monitor_id`,`product_key`)
);
--> statement-breakpoint
CREATE INDEX `idx_offer_send_locks_expires` ON `offer_send_locks` (`expires_at`);
--> statement-breakpoint
ALTER TABLE `offer_sends` ADD `product_key` text;
--> statement-breakpoint
CREATE INDEX `idx_offer_sends_monitor_key_sent` ON `offer_sends` (`monitor_id`,`product_key`,`sent_at`);
