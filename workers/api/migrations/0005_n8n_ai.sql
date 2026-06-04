-- n8n connections
CREATE TABLE IF NOT EXISTS n8n_connections (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  name         TEXT NOT NULL DEFAULT 'My n8n',
  n8n_base_url TEXT NOT NULL,
  webhook_key  TEXT NOT NULL,
  is_active    INTEGER DEFAULT 1,
  created_at   INTEGER NOT NULL
);

-- n8n outbound webhooks
CREATE TABLE IF NOT EXISTS n8n_webhooks (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  connection_id  INTEGER REFERENCES n8n_connections(id),
  flow_id        INTEGER REFERENCES flows(id),
  name           TEXT NOT NULL DEFAULT 'Webhook',
  webhook_url    TEXT NOT NULL,
  trigger_event  TEXT NOT NULL,
  is_active      INTEGER DEFAULT 1,
  last_triggered INTEGER,
  created_at     INTEGER NOT NULL
);

-- n8n trigger log
CREATE TABLE IF NOT EXISTS n8n_trigger_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_id    INTEGER NOT NULL REFERENCES n8n_webhooks(id),
  payload_json  TEXT,
  status        TEXT,
  response_code INTEGER,
  triggered_at  INTEGER NOT NULL
);

-- AI jobs
CREATE TABLE IF NOT EXISTS ai_jobs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  job_type     TEXT NOT NULL,
  target_type  TEXT,
  target_id    INTEGER,
  status       TEXT DEFAULT 'pending',
  result_json  TEXT,
  triggered_by TEXT DEFAULT 'system',
  created_at   INTEGER NOT NULL,
  completed_at INTEGER
);

-- AI moderation queue
CREATE TABLE IF NOT EXISTS ai_moderation_queue (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id     INTEGER REFERENCES posts(id),
  comment_id  INTEGER REFERENCES comments(id),
  reason      TEXT,
  ai_score    REAL,
  status      TEXT DEFAULT 'pending',
  reviewed_by INTEGER REFERENCES users(id),
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_mod_status ON ai_moderation_queue(status, created_at DESC);
