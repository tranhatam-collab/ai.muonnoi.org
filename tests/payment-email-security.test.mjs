import test from 'node:test';
import assert from 'node:assert/strict';
import { handleEmailGetById, handleEmailSend, handlePaymentWebhook } from '../.local/payment-email-security.mjs';

function database({ replay = false, batchFails = false } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        bind(...values) {
          return {
            sql,
            values,
            async first() { return null; },
            async run() {
              calls.push({ sql, values });
              return { success: true };
            }
          };
        }
      };
    },
    async batch(statements) {
      if (batchFails) throw new Error('SIMULATED_D1_FAILURE');
      if (replay) throw new Error('UNIQUE constraint failed: payment_webhook_receipts.event_id');
      calls.push(...statements.map(({ sql, values }) => ({ sql, values })));
      return statements.map(() => ({ success: true }));
    }
  };
}

async function signature(secret, body) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

test('payment webhook fails closed before D1 when its secret or signature is unusable', async () => {
  const db = database();
  const body = JSON.stringify({ event_id: 'evt_1', event_type: 'ignored' });
  assert.equal((await handlePaymentWebhook(new Request('https://api.example/api/webhook/payment', { method: 'POST', body }), { iai_flow_db: db })).status, 503);
  assert.equal((await handlePaymentWebhook(new Request('https://api.example/api/webhook/payment', { method: 'POST', body }), { iai_flow_db: db, PAYMENT_WEBHOOK_SECRET: 'secret' })).status, 401);
  assert.equal((await handlePaymentWebhook(new Request('https://api.example/api/webhook/payment', { method: 'POST', body, headers: { 'X-Signature': '0' } }), { iai_flow_db: db, PAYMENT_WEBHOOK_SECRET: 'secret' })).status, 401);
  assert.equal(db.calls.length, 0);
});

test('a valid signed payment commits receipt, log and status together; a duplicate is a replay', async () => {
  const body = JSON.stringify({ event_id: 'evt_1', event_type: 'payment.completed', intent_id: 'pi_1', provider: 'payos' });
  const secret = 'secret';
  const signed = new Request('https://api.example/api/webhook/payment', { method: 'POST', body, headers: { 'X-Signature': await signature(secret, body) } });
  const db = database();
  assert.equal((await handlePaymentWebhook(signed, { iai_flow_db: db, PAYMENT_WEBHOOK_SECRET: secret })).status, 200);
  assert.match(db.calls[0].sql, /payment_webhook_receipts/);
  assert.match(db.calls[1].sql, /payment_webhook_log/);
  assert.match(db.calls[2].sql, /UPDATE payment_intents/);
  const replay = await handlePaymentWebhook(new Request('https://api.example/api/webhook/payment', { method: 'POST', body, headers: { 'X-Signature': await signature(secret, body) } }), { iai_flow_db: database({ replay: true }), PAYMENT_WEBHOOK_SECRET: secret });
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), { ok: true, data: { replayed: true } });
});

test('a failed atomic batch leaves the signed event eligible for a provider retry', async () => {
  const body = JSON.stringify({ event_id: 'evt_retry', event_type: 'ignored', provider: 'payos' });
  const secret = 'secret';
  const signedRequest = async () => new Request('https://api.example/api/webhook/payment', { method: 'POST', body, headers: { 'X-Signature': await signature(secret, body) } });
  await assert.rejects(handlePaymentWebhook(await signedRequest(), { iai_flow_db: database({ batchFails: true }), PAYMENT_WEBHOOK_SECRET: secret }), /SIMULATED_D1_FAILURE/);
  const retry = await handlePaymentWebhook(await signedRequest(), { iai_flow_db: database(), PAYMENT_WEBHOOK_SECRET: secret });
  assert.equal(retry.status, 200);
});

test('the internal email control plane rejects anonymous callers without a D1 write', async () => {
  const db = database();
  const request = new Request('https://api.example/api/email/send', { method: 'POST', body: JSON.stringify({ template_id: 'notice', recipient_ref: 'user_1' }), headers: { 'Content-Type': 'application/json' } });
  assert.equal((await handleEmailSend(request, { iai_flow_db: db })).status, 503);
  assert.equal((await handleEmailSend(request, { iai_flow_db: db, INTERNAL_EMAIL_TOKEN: 'internal' })).status, 401);
  assert.equal(db.calls.length, 0);
});

test('a scoped internal credential keeps queued mail and delivery lookup working', async () => {
  const db = database();
  const env = { iai_flow_db: db, INTERNAL_EMAIL_TOKEN: 'internal' };
  const send = await handleEmailSend(new Request('https://api.example/api/email/send', { method: 'POST', body: JSON.stringify({ template_id: 'notice', recipient_ref: 'user_1' }), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer internal' } }), env);
  assert.equal(send.status, 202);
  assert.ok(db.calls.some(call => call.sql.includes('email_deliveries')));
  assert.equal((await handleEmailGetById(new Request('https://api.example/api/email/ed_1'), env, 'ed_1')).status, 401);
  assert.equal((await handleEmailGetById(new Request('https://api.example/api/email/ed_1', { headers: { Authorization: 'Bearer internal' } }), env, 'ed_1')).status, 404);
});
