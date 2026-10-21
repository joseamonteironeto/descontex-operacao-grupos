CREATE TABLE IF NOT EXISTS private_assistant_settings (
  id INTEGER PRIMARY KEY NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL DEFAULT 'gpt-6-luna',
  typing_delay_ms INTEGER NOT NULL DEFAULT 2400,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO private_assistant_settings (id, enabled, model, typing_delay_ms, updated_at)
VALUES (1, 0, 'gpt-6-luna', 2400, CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS private_assistant_conversations (
  chat_jid TEXT PRIMARY KEY NOT NULL,
  history_json TEXT NOT NULL DEFAULT '[]',
  active_product_id TEXT,
  active_product_title TEXT,
  active_product_url TEXT,
  opted_out INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS private_assistant_conversations_updated_idx
ON private_assistant_conversations(updated_at DESC);
