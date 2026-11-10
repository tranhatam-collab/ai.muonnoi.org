// Executable evidence for the API audit. Runs the REAL bundled Worker (built from the ops branch) under
// workerd (Miniflare) with a LOCAL throw-away D1. Nothing here touches any real service or database.
import http from 'node:http';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const OPS = process.argv[2];
const { Miniflare } = await import(join(OPS, 'workers/revenueops/node_modules/miniflare/dist/src/index.js'));
const source = await readFile(join(OPS, '.local/api-worker.mjs'), 'utf8');

// fake payment provider (what pay.iai.one would be), records what the Worker sends it
const providerCalls = [];
const provider = http.createServer((req, res) => {
  let b = ''; req.on('data', d => b += d); req.on('end', () => {
    providerCalls.push({ path: req.url, auth: req.headers.authorization, body: JSON.parse(b || '{}') });
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ checkout_url: 'https://pay.example/checkout/abc', session_id: 'ses_1' }));
  });
});
await new Promise(r => provider.listen(0, '127.0.0.1', r));
const providerUrl = `http://127.0.0.1:${provider.address().port}`;

const SECRET = 'repro-webhook-secret';
const temp = await mkdtemp(join(tmpdir(), 'audit-repro-'));
const mf = new Miniflare({
  telemetry: { enabled: false },
  resourcePersistencePath: join(temp, 'state'),
  workers: [{ config: {
    name: 'audit-repro', compatibilityDate: '2026-10-15',
    manifest: { mainModule: 'worker.js', modules: { 'worker.js': { type: 'esm', contents: source } } },
    env: {
      iai_flow_db: { type: 'd1', id: 'audit-fixture' },
      PAYMENT_WEBHOOK_SECRET: { type: 'text', value: SECRET },
      PAY_IAI_ONE_API_KEY: { type: 'text', value: 'fake-provider-key' },
      PAY_IAI_ONE_BASE_URL: { type: 'text', value: providerUrl },
      APP_ORIGIN: { type: 'text', value: 'https://ai.muonnoi.org' },
      COOKIE_SECURE: { type: 'text', value: 'true' },
      APP_DOMAIN: { type: 'text', value: 'api.muonnoi.org' },
    },
  } }],
});
const out = {};
const sig = async body => {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(body)))].map(b => b.toString(16).padStart(2, '0')).join('');
};
try {
  const db = await mf.getD1Database('iai_flow_db');
  const runSql = async file => {
    const sql = (await readFile(join(OPS, 'workers/api/migrations', file), 'utf8')).split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
    for (const stmt of sql.split(/;\s*\n/).map(s => s.trim()).filter(Boolean)) await db.prepare(stmt).run();
  };
  await runSql('0008_payment_email.sql');            // REAL payment schema from the repo
  await runSql('0009_payment_webhook_receipts.sql'); // REAL receipts schema from the repo
  // auth tables: the end-state that migration 0006 is meant to produce (0006 itself cannot run from scratch)
  for (const s of [
    `CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT, password TEXT NOT NULL DEFAULT '', password_hash TEXT, username TEXT, avatar_url TEXT, bio TEXT, role TEXT NOT NULL DEFAULT 'member', is_verified INTEGER DEFAULT 0, password_salt TEXT, password_algo TEXT, status TEXT NOT NULL DEFAULT 'active', created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE sessions (token TEXT PRIMARY KEY, user_id TEXT, created_at INTEGER, expires_at INTEGER)`,
    `CREATE TABLE rate_limits (key TEXT PRIMARY KEY, hits INTEGER NOT NULL DEFAULT 0, reset_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  ]) await db.prepare(s).run();

  const call = (path, init = {}) => mf.dispatchFetch('https://local' + path, init);
  const login = (email, password, ip) => call('/api/login', { method: 'POST', headers: { 'content-type': 'application/json', Origin: 'https://ai.muonnoi.org', 'CF-Connecting-IP': ip }, body: JSON.stringify({ email, password }) });

  // R1: legacy plaintext-password fallback + the literal password seeded by migration 0003
  await db.prepare(`INSERT INTO users (id,email,name,password,role,is_verified,status) VALUES ('u_admin','admin@ai.muonnoi.org','AI Admin','seeded-admin-pending-hash','admin',1,'active')`).run();
  const r1 = await login('admin@ai.muonnoi.org', 'seeded-admin-pending-hash', '203.0.113.9');
  const r1body = await r1.json();
  const cookie = (r1.headers.get('set-cookie') || '').split(';')[0];
  const me = await call('/api/me', { headers: { Cookie: cookie, Origin: 'https://ai.muonnoi.org' } });
  const row = await db.prepare(`SELECT length(password) AS plain_len, password_algo FROM users WHERE id='u_admin'`).first();
  out.R1_seed_admin_plaintext_login = { login_status: r1.status, role: r1body.data?.role, me_status: me.status, me_role: (await me.json()).data?.role, row_after: row };

  // R2: login rate limit is keyed by e-mail only
  const victim = 'victim@example.com';
  const st = [];
  for (let i = 0; i < 12; i++) st.push((await login(victim, 'wrong-' + i, `198.51.100.${i + 1}`)).status);   // 12 different IPs
  out.R2a_same_email_from_12_different_ips = st;
  const emails = [];
  for (let i = 0; i < 30; i++) emails.push((await login(`user${i}@example.com`, 'guess', '198.51.100.250')).status); // 30 emails, ONE ip
  out.R2b_30_distinct_emails_from_one_ip = [...new Set(emails)];

  // R3: payment webhook behaviour
  const intents = [['pi_a', 1500000], ['pi_b', 1500000], ['pi_c', 1500000]];
  for (const [id, amt] of intents) await db.prepare(`INSERT INTO payment_intents (id,idempotency_key,amount,currency,purpose,status,expires_at) VALUES (?,?,?,?,?,?,?)`).bind(id, 'idem_' + id, amt, 'VND', 'studio-pilot', 'pending', '2099-01-01').run();
  const hook = async payload => { const body = JSON.stringify(payload); const r = await call('/api/webhook/payment', { method: 'POST', body, headers: { 'X-Signature': await sig(body) } }); return { status: r.status, body: await r.json().catch(() => null) }; };
  const status = async id => (await db.prepare('SELECT status FROM payment_intents WHERE id=?').bind(id).first())?.status ?? null;
  const unknown = await hook({ event_id: 'evt_unknown', event_type: 'payment.completed', intent_id: 'pi_does_not_exist', provider: 'payos' });
  out.R3a_completed_event_for_unknown_intent = { response: unknown, receipts: (await db.prepare('SELECT COUNT(*) n FROM payment_webhook_receipts').first()).n, intent_rows: (await db.prepare(`SELECT COUNT(*) n FROM payment_intents WHERE id='pi_does_not_exist'`).first()).n };
  await hook({ event_id: 'evt_b1', event_type: 'payment.completed', intent_id: 'pi_b', provider: 'payos' });
  const afterCompleted = await status('pi_b');
  await hook({ event_id: 'evt_b2', event_type: 'payment.failed', intent_id: 'pi_b', provider: 'payos' });
  out.R3b_late_failed_event_after_completed = { after_completed: afterCompleted, after_late_failed: await status('pi_b') };
  await hook({ event_id: 'evt_c1', event_type: 'payment.completed', intent_id: 'pi_c', provider: 'payos', amount: 1000, currency: 'VND' });
  out.R3c_completed_event_with_amount_1000_for_1500000_intent = { intent_amount: 1500000, payload_amount: 1000, resulting_status: await status('pi_c') };

  // R4: create-intent is anonymous and trusts amount / returnUrl from the body
  const ci = await call('/api/payment/create-intent', { method: 'POST', headers: { 'content-type': 'application/json', 'Idempotency-Key': 'attack-1' }, body: JSON.stringify({ amount: 1, currency: 'vnd', purpose: 'studio-pilot', returnUrl: 'https://evil.example/phish' }) });
  const cib = await ci.json();
  const got = await call('/api/payment/' + cib.data.paymentId);
  out.R4_create_intent_anonymous = { status: ci.status, amount_sent_to_provider: providerCalls.at(-1)?.body.amount, success_url_sent_to_provider: providerCalls.at(-1)?.body.success_url, anonymous_GET_status: got.status, anonymous_GET_exposes: Object.keys((await got.json()).data) , intent_id_shape: cib.data.paymentId.replace(/[a-z0-9]/g, 'x') };
} finally { await mf.dispose(); provider.close(); }
console.log(JSON.stringify(out, null, 2));
