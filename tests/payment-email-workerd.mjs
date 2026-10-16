import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Miniflare } from '../workers/revenueops/node_modules/miniflare/dist/src/index.js';

async function signature(secret, body) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

test('workerd + local D1 keeps a failed callback retryable and processes one signed event once', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'muonnoi-payment-d1-'));
  const source = await readFile('.local/api-worker.mjs', 'utf8');
  const secret = 'workerd-test-secret';
  const options = {
    telemetry: { enabled: false },
    resourcePersistencePath: join(temp, 'state'),
    workers: [{
      config: {
        name: 'payment-test', compatibilityDate: '2026-10-15',
        manifest: { mainModule: 'worker.js', modules: { 'worker.js': { type: 'esm', contents: source } } },
        env: {
          iai_flow_db: { type: 'd1', id: 'payment-fixture' },
          PAYMENT_WEBHOOK_SECRET: { type: 'text', value: secret },
          APP_ORIGIN: { type: 'text', value: 'https://ai.muonnoi.org' }
        }
      }
    }]
  };
  const mf = new Miniflare(options);
  try {
    const db = await mf.getD1Database('iai_flow_db');
    await db.exec(`
      CREATE TABLE payment_intents (id TEXT PRIMARY KEY, user_id TEXT, amount INTEGER, currency TEXT, purpose TEXT, status TEXT, completed_at TEXT, updated_at TEXT);
      CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, name TEXT);
      CREATE TABLE payment_webhook_log (id TEXT PRIMARY KEY, provider TEXT, event_type TEXT, event_id TEXT, intent_id TEXT, status TEXT, processed_at TEXT, created_at TEXT);
      CREATE TABLE payment_webhook_receipts (event_id TEXT PRIMARY KEY, provider TEXT, intent_id TEXT, payload_hash TEXT, received_at TEXT);
      INSERT INTO payment_intents (id, user_id, amount, currency, purpose, status) VALUES ('pi_1', NULL, 1500000, 'VND', 'studio-pilot', 'pending');
    `);
    const body = JSON.stringify({ event_id: 'evt_paid_1', event_type: 'payment.completed', intent_id: 'pi_1', provider: 'payos' });
    const call = async () => mf.dispatchFetch('https://local/api/webhook/payment', {
      method: 'POST', body, headers: { 'X-Signature': await signature(secret, body) }
    });

    const failed = await call();
    assert.equal(failed.status, 500, await failed.clone().text());
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM payment_webhook_receipts').first()).n, 0);
    assert.equal((await db.prepare("SELECT status FROM payment_intents WHERE id = 'pi_1'").first()).status, 'pending');

    await db.exec('ALTER TABLE payment_webhook_log ADD COLUMN payload_hash TEXT;');
    assert.equal((await call()).status, 200);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM payment_webhook_receipts').first()).n, 1);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM payment_webhook_log').first()).n, 1);
    assert.equal((await db.prepare("SELECT status FROM payment_intents WHERE id = 'pi_1'").first()).status, 'completed');

    const replay = await call();
    assert.equal(replay.status, 200);
    assert.deepEqual(await replay.json(), { ok: true, data: { replayed: true } });
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM payment_webhook_log').first()).n, 1);
  } finally {
    await mf.dispose();
  }
});
