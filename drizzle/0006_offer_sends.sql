CREATE TABLE `offer_sends` (
  `id` text PRIMARY KEY NOT NULL,
  `product_id` text NOT NULL,
  `product_title` text,
  `product_url` text,
  `destination_jid` text NOT NULL,
  `destination_name` text,
  `monitor_id` text,
  `send_mode` text DEFAULT 'manual' NOT NULL,
  `sent_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_offer_sends_product_sent` ON `offer_sends` (`product_id`,`sent_at`);
--> statement-breakpoint
CREATE INDEX `idx_offer_sends_destination_sent` ON `offer_sends` (`destination_jid`,`sent_at`);
