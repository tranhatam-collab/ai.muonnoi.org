-- Migration: 0009_payment_webhook_receipts.sql
-- Description: Atomic replay receipts for signed payment-provider events.
-- This creates a new table so existing webhook logs are preserved unchanged.

CREATE TABLE IF NOT EXISTS payment_webhook_receipts (
  event_id     TEXT PRIMARY KEY,
  provider     TEXT NOT NULL,
  intent_id    TEXT,
  payload_hash TEXT NOT NULL,
  received_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pwr_intent ON payment_webhook_receipts(intent_id);
