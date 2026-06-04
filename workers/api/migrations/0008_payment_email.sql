-- Migration: 0008_payment_email.sql
-- Description: Payment intent, webhook log, email delivery tables for muonnoi.org
-- Date: 2026-05-13
-- Note: Drops old incompatible payment_intents schema (was 0 rows, safe to replace)

DROP TABLE IF EXISTS payment_intents;

CREATE TABLE payment_intents (
  id              TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL,
  user_id         TEXT,
  amount          INTEGER NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'VND',
  purpose         TEXT NOT NULL DEFAULT 'membership',
  status          TEXT NOT NULL DEFAULT 'pending',
  provider        TEXT NOT NULL DEFAULT 'payos',
  provider_ref    TEXT,
  checkout_url    TEXT,
  return_url      TEXT,
  expires_at      TEXT NOT NULL,
  completed_at    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_pi_idem   ON payment_intents(idempotency_key);
CREATE INDEX        idx_pi_user   ON payment_intents(user_id);
CREATE INDEX        idx_pi_status ON payment_intents(status);

CREATE TABLE IF NOT EXISTS payment_webhook_log (
  id           TEXT PRIMARY KEY,
  provider     TEXT NOT NULL,
  event_type   TEXT NOT NULL,
  event_id     TEXT,
  intent_id    TEXT,
  payload_hash TEXT,
  status       TEXT NOT NULL DEFAULT 'received',
  processed_at TEXT,
  error        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pwl_event  ON payment_webhook_log(event_id);
CREATE INDEX IF NOT EXISTS idx_pwl_intent ON payment_webhook_log(intent_id);

CREATE TABLE IF NOT EXISTS email_deliveries (
  id              TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL,
  template_id     TEXT NOT NULL,
  locale          TEXT NOT NULL DEFAULT 'vi',
  purpose         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  provider        TEXT NOT NULL DEFAULT 'mail_iai_one',
  provider_msg_id TEXT,
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  sent_at         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ed_idem    ON email_deliveries(idempotency_key);
CREATE INDEX        IF NOT EXISTS idx_ed_status  ON email_deliveries(status);
CREATE INDEX        IF NOT EXISTS idx_ed_purpose ON email_deliveries(purpose);
