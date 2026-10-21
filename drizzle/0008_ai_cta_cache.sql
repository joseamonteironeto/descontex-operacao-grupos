CREATE TABLE IF NOT EXISTS ai_cta_cache (
  cache_key TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  model TEXT NOT NULL,
  style TEXT NOT NULL,
  cta TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_cta_cache_product_idx ON ai_cta_cache(product_id, created_at DESC);
