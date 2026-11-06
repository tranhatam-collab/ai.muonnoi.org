CREATE TABLE IF NOT EXISTS mobile_push_tokens (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  token         TEXT NOT NULL UNIQUE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL CHECK(platform IN ('ios', 'android')),
  source        TEXT NOT NULL DEFAULT 'capacitor',
  first_seen_at INTEGER NOT NULL,
  last_seen_at  INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mobile_push_tokens_user
ON mobile_push_tokens(user_id, platform);

CREATE INDEX IF NOT EXISTS idx_mobile_push_tokens_last_seen
ON mobile_push_tokens(last_seen_at DESC);
