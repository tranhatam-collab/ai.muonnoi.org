// Does the payment-confirmation e-mail actually leave the Worker? (fireEmail is called without ctx.waitUntil)
import http from 'node:http';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const OPS = process.argv[2];
const { Miniflare } = await import(join(OPS, 'workers/revenueops/node_modules/miniflare/dist/src/index.js'));
const source = await readFile(join(OPS, '.local/api-worker.mjs'), 'utf8');
const mails = [];
const slowMs = Number(process.argv[3] || 0);                 // simulate a mail provider that takes slowMs to answer
const mailSrv = http.createServer((req, res) => { let b = ''; req.on('data', d => b += d); req.on('end', () => { mails.push(JSON.parse(b || '{}').to); setTimeout(() => { res.setHeader('content-type', 'application/json'); res.end('{"ok":true}'); }, slowMs); }); });
await new Promise(r => mailSrv.listen(0, '127.0.0.1', r));
const SECRET = 's';
const mf = new Miniflare({ telemetry: { enabled: false }, resourcePersistencePath: join(await mkdtemp(join(tmpdir(), 'audit-mail-')), 'state'),
  workers: [{ config: { name: 'audit-mail', compatibilityDate: '2026-10-15',
    manifest: { mainModule: 'worker.js', modules: { 'worker.js': { type: 'esm', contents: source } } },
    env: { iai_flow_db: { type: 'd1', id: 'audit-mail' }, PAYMENT_WEBHOOK_SECRET: { type: 'text', value: SECRET },
      MAIL_API_KEY: { type: 'text', value: 'k' }, MAIL_API_BASE_URL: { type: 'text', value: `http://127.0.0.1:${mailSrv.address().port}` },
      APP_ORIGIN: { type: 'text', value: 'https://ai.muonnoi.org' } } } }] });
try {
  const db = await mf.getD1Database('iai_flow_db');
  const sql = (await readFile(join(OPS, 'workers/api/migrations/0008_payment_email.sql'), 'utf8')).split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
  for (const s of sql.split(/;\s*\n/).map(x => x.trim()).filter(Boolean)) await db.prepare(s).run();
  await db.prepare(`CREATE TABLE payment_webhook_receipts (event_id TEXT PRIMARY KEY, provider TEXT NOT NULL, intent_id TEXT, payload_hash TEXT NOT NULL, received_at TEXT NOT NULL DEFAULT (datetime('now')))`).run();
  await db.prepare(`CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, name TEXT)`).run();
  await db.prepare(`INSERT INTO users VALUES ('u1','buyer@example.com','Buyer')`).run();
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const N = 8; let ok = 0;
  for (let i = 0; i < N; i++) {
    await db.prepare(`INSERT INTO payment_intents (id,idempotency_key,user_id,amount,currency,purpose,status,expires_at) VALUES (?,?,?,?,?,?,?,?)`).bind('pi_' + i, 'k' + i, 'u1', 100000, 'VND', 'x', 'pending', '2099').run();
    const body = JSON.stringify({ event_id: 'e' + i, event_type: 'payment.completed', intent_id: 'pi_' + i, provider: 'payos' });
    const sig = [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)))].map(b => b.toString(16).padStart(2, '0')).join('');
    const r = await mf.dispatchFetch('https://local/api/webhook/payment', { method: 'POST', body, headers: { 'X-Signature': sig } });
    if (r.status === 200) ok++;
  }
  await new Promise(r => setTimeout(r, 2500));
  console.log(JSON.stringify({ mail_provider_latency_ms: slowMs, webhooks_ok: ok, confirmation_mails_received_by_provider: mails.length, expected: N }));
} finally { await mf.dispose(); mailSrv.close(); }
