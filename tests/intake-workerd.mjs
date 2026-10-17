import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Miniflare } from '../workers/revenueops/node_modules/miniflare/dist/src/index.js';

const origin = 'https://ai.muonnoi.org';
const brief = (overrides = {}) => ({
  request_key: crypto.randomUUID(), expected_actor_id: 'user-writer', name: 'Pilot nội dung thử nghiệm', offer_id: 'studio-pilot-14d',
  business: 'Cửa hàng giả lập phục vụ thử nghiệm.', audience: 'Người đọc thử nghiệm',
  objective: 'Chuẩn bị bản nháp có kiểm duyệt.', deliverables: '12 bản nháp và một lịch 14 ngày.',
  source_notes: 'Dữ liệu tổng hợp, không phải thông tin khách hàng.', reviewer_name: 'Người duyệt thử',
  rights_confirmed: true, ...overrides
});

test('workerd + local D1: private intake authentication, immutable receipts and bounded persistence', async t => {
  const temp = await mkdtemp(join(tmpdir(), 'muonnoi-intake-d1-'));
  const source = await readFile('.local/api-worker.mjs', 'utf8');
  const sessions = Object.fromEntries(['writer', 'other', 'inactive', 'expired'].map(role => [role, crypto.randomUUID()]));
  const options = enabled => ({
    telemetry: { enabled: false }, resourcePersistencePath: join(temp, 'state'),
    workers: [{ config: {
      name: 'intake-test', compatibilityDate: '2026-10-15',
      manifest: { mainModule: 'worker.js', modules: { 'worker.js': { type: 'esm', contents: source } } },
      env: {
        iai_flow_db: { type: 'd1', id: 'intake-fixture' }, APP_ORIGIN: { type: 'text', value: origin },
        ...(enabled ? { STUDIO_INTAKE_ENABLED: { type: 'text', value: 'true' } } : {})
      }
    } }]
  });
  let mf = new Miniflare(options(false));
  const call = (path = 'briefs', body, settings = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (settings.origin !== null) headers.Origin = settings.origin ?? origin;
    if (settings.role !== null) headers.Cookie = 'ai_muonnoi_session=' + sessions[settings.role ?? 'writer'];
    return mf.dispatchFetch('https://local/api/intake/' + path, {
      method: settings.method ?? (body === undefined ? 'GET' : 'POST'),
      headers: { ...headers, ...settings.headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
    });
  };
  const expectError = async (response, status, error) => {
    assert.equal(response.status, status, await response.clone().text());
    assert.deepEqual(await response.json(), { ok: false, error });
  };
  const schema = new DatabaseSync(':memory:');
  let db;
  try {
    await t.test('defaults disabled without touching a missing database schema', async () => {
      const capability = await call('capabilities');
      assert.deepEqual(await capability.json(), {
        ok: true, intakeEnabled: false,
        offers: ['studio-pilot-14d', 'creator-studio-monthly', 'team-growth-studio-monthly', 'b2b-workflow-setup'], maxBriefsPerUser: 20
      });
      await expectError(await call('briefs', brief()), 503, 'INTAKE_DISABLED');
      await expectError(await call(), 503, 'INTAKE_DISABLED');
    });
    await mf.dispose(); mf = new Miniflare(options(true));
    db = await mf.getD1Database('iai_flow_db');
    await t.test('storage failure exposes no database details or accepted receipt', async () => {
      await expectError(await call('briefs', brief()), 503, 'INTAKE_STORAGE_UNAVAILABLE');
    });
    schema.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT,name TEXT,username TEXT,avatar_url TEXT,bio TEXT,role TEXT,is_verified INTEGER DEFAULT 0,status TEXT DEFAULT 'active');
      CREATE TABLE sessions(token TEXT PRIMARY KEY,user_id TEXT,created_at INTEGER,expires_at INTEGER);`);
    schema.exec(await readFile('workers/api/migrations/0010_studio_intake.sql', 'utf8'));
    for (const row of schema.prepare("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END,rowid").all()) {
      await db.prepare(row.sql).run();
    }
    for (const [id, role, status] of [['user-writer', 'member', 'active'], ['user-other', 'admin', 'active'], ['user-inactive', 'admin', 'suspended']]) {
      await db.prepare('INSERT INTO users(id,email,name,role,status) VALUES(?1,?2,?3,?4,?5)').bind(id, id + '@example.test', id, role, status).run();
    }
    for (const [role, id] of [['writer', 'user-writer'], ['other', 'user-other'], ['inactive', 'user-inactive'], ['expired', 'user-writer']]) {
      await db.prepare('INSERT INTO sessions VALUES(?1,?2,?3,?4)').bind(sessions[role], id, Date.now(), Date.now() + (role === 'expired' ? -1000 : 86400000)).run();
    }
    await t.test('session, account status and request origin are enforced', async () => {
      await expectError(await call('briefs', brief(), { role: null }), 401, 'LOGIN_REQUIRED');
      await expectError(await call('briefs', brief(), { role: 'expired' }), 401, 'LOGIN_REQUIRED');
      await expectError(await call('briefs', brief(), { role: 'inactive' }), 403, 'ACCOUNT_INACTIVE');
      await expectError(await call('briefs', undefined, { role: 'inactive' }), 403, 'ACCOUNT_INACTIVE');
      await expectError(await call('briefs', brief(), { origin: null }), 403, 'ORIGIN_REJECTED');
      await expectError(await call('briefs', brief(), { origin: 'https://untrusted.example' }), 403, 'ORIGIN_REJECTED');
      await expectError(await call('briefs', undefined, { origin: 'https://app.muonnoi.org' }), 403, 'ORIGIN_REJECTED');
      await expectError(await call('briefs', brief(), { method: 'PUT' }), 405, 'METHOD_NOT_ALLOWED');
      assert.equal((await db.prepare('SELECT COUNT(*) n FROM studio_intake_briefs').first()).n, 0);
    });
    await t.test('untrusted bodies are bounded, strictly validated and never accepted implicitly', async () => {
      await expectError(await call('briefs', brief(), { headers: { 'Content-Type': 'text/plain' } }), 415, 'JSON_REQUIRED');
      await expectError(await call('briefs', '{invalid'), 400, 'INVALID_JSON');
      await expectError(await call('briefs', 'null'), 400, 'INVALID_OBJECT');
      await expectError(await call('briefs', '[]'), 400, 'INVALID_OBJECT');
      await expectError(await call('briefs', brief({ author_id: 'user-other' })), 400, 'UNEXPECTED_FIELD');
      await expectError(await call('briefs', brief({ rights_confirmed: false })), 400, 'RIGHTS_CONFIRMATION_REQUIRED');
      await expectError(await call('briefs', brief({ rights_confirmed: 'true' })), 400, 'RIGHTS_CONFIRMATION_REQUIRED');
      await expectError(await call('briefs', brief({ offer_id: 'invented-offer' })), 400, 'OFFER_INVALID');
      await expectError(await call('briefs', brief({ request_key: '-'.repeat(36) })), 400, 'REQUEST_KEY_REQUIRED');
      await expectError(await call('briefs', brief({ expected_actor_id: undefined })), 400, 'EXPECTED_ACTOR_REQUIRED');
      await expectError(await call('briefs', brief({ expected_actor_id: '' })), 400, 'EXPECTED_ACTOR_REQUIRED');
      await expectError(await call('briefs', brief({ expected_actor_id: 123 })), 400, 'EXPECTED_ACTOR_REQUIRED');
      await expectError(await call('briefs', brief({ business: { text: 'object coercion' } })), 400, 'INVALID_BUSINESS');
      await expectError(await call('briefs', brief({ source_notes: 'Private\u0000data' })), 400, 'INVALID_SOURCE_NOTES');
      await expectError(await call('briefs', brief({ audience: 'x'.repeat(1001) })), 400, 'INVALID_AUDIENCE');
      await expectError(await call('briefs', brief({ contact: 'x'.repeat(201) })), 400, 'INVALID_CONTACT');
      await expectError(await call('briefs', brief({ source_notes: 'x'.repeat(25000) })), 413, 'BODY_TOO_LARGE');
      assert.equal((await db.prepare('SELECT COUNT(*) n FROM studio_intake_briefs').first()).n, 0);
    });
    let accepted;
    const original = brief({ source_notes: '<script>alert("fixture")</script>\n\'); DROP TABLE users; --' });
    await t.test('accepts durable plain-text data and deduplicates concurrent and lost-response retries', async () => {
      // Drop the first response body to model a client losing its receipt after the write succeeds.
      const lost = await call('briefs', original);
      assert.equal(lost.status, 201); await lost.body.cancel();
      await mf.dispose(); mf = new Miniflare(options(true)); db = await mf.getD1Database('iai_flow_db');
      const retry = await call('briefs', original);
      assert.equal(retry.status, 200);
      const result = await retry.json(); accepted = result.data;
      assert.equal(result.actor_id, 'user-writer');
      assert.equal(result.replayed, true); assert.equal(accepted.state, 'RECEIVED');
      assert.equal(accepted.source_notes, original.source_notes);
      assert.equal(accepted.contact, ''); assert.equal(accepted.rights_confirmed, true);
      assert.equal(retry.headers.get('Cache-Control'), 'no-store');
      assert.match(retry.headers.get('Content-Type'), /^application\/json/);
      assert.equal((await db.prepare('SELECT COUNT(*) n FROM users').first()).n, 3);
      const retries = await Promise.all(Array.from({ length: 6 }, () => call('briefs', { ...original, business: '  ' + original.business + '  ' })));
      for (const response of retries) {
        assert.equal(response.status, 200);
        assert.equal((await response.json()).data.id, accepted.id);
      }
      await expectError(await call('briefs', { ...original, objective: 'A different objective for this reused key.' }), 409, 'REQUEST_KEY_CONFLICT');
      assert.equal((await db.prepare('SELECT COUNT(*) n FROM studio_intake_briefs').first()).n, 1);
      await assert.rejects(db.prepare("UPDATE studio_intake_briefs SET payload_json='{}' WHERE id=?1").bind(accepted.id).run(), /INTAKE_IMMUTABLE/);
    });
    await t.test('only the author can retrieve a brief, including against an administrator', async () => {
      const own = await call('briefs/' + accepted.id);
      assert.equal(own.status, 200); const ownResult = await own.json();
      assert.equal(ownResult.data.id, accepted.id); assert.equal(ownResult.actor_id, 'user-writer');
      await expectError(await call('briefs/' + accepted.id, undefined, { role: 'other' }), 404, 'NOT_FOUND');
      assert.deepEqual((await (await call('briefs', undefined, { role: 'other' })).json()).data, []);
      const listResult = await (await call()).json(); assert.equal(listResult.actor_id, 'user-writer');
      const ownList = listResult.data;
      assert.equal(ownList.length, 1); assert.equal(ownList[0].id, accepted.id);
      // Another account can use the same client key without sharing data or receipts.
      const other = await call('briefs', { ...original, expected_actor_id: 'user-other', name: 'Another private client brief' }, { role: 'other' });
      assert.equal(other.status, 201); const otherResult = await other.json();
      assert.notEqual(otherResult.data.id, accepted.id); assert.equal(otherResult.actor_id, 'user-other');
    });
    await t.test('an account switch cannot copy or replay the previous account private request', async () => {
      const countBefore = (await db.prepare("SELECT COUNT(*) n FROM studio_intake_briefs WHERE author_id='user-other'").first()).n;
      await expectError(await call('briefs', original, { role: 'other' }), 403, 'ACTOR_MISMATCH');
      await expectError(await call('briefs', brief({ expected_actor_id: 'user-other' })), 403, 'ACTOR_MISMATCH');
      assert.equal((await db.prepare("SELECT COUNT(*) n FROM studio_intake_briefs WHERE author_id='user-other'").first()).n, countBefore);
      const ownerRetry = await call('briefs', original);
      assert.equal(ownerRetry.status, 200); const result = await ownerRetry.json();
      assert.equal(result.actor_id, 'user-writer'); assert.equal(result.data.id, accepted.id);
      assert.equal(Object.hasOwn(result.data, 'expected_actor_id'), false);
    });
    await t.test('concurrent submissions cannot exceed the per-user quota and existing retries remain available', async () => {
      const responses = await Promise.all(Array.from({ length: 25 }, () => call('briefs', brief())));
      assert.equal(responses.filter(response => response.status === 201).length, 19);
      assert.equal(responses.filter(response => response.status === 429).length, 6);
      for (const response of responses.filter(response => response.status === 429)) await expectError(response, 429, 'BRIEF_QUOTA_REACHED');
      assert.equal((await db.prepare("SELECT COUNT(*) n FROM studio_intake_briefs WHERE author_id='user-writer'").first()).n, 20);
      assert.equal((await call('briefs', original)).status, 200);
      await expectError(await call('briefs', { ...original, name: 'Conflict after reaching quota' }), 409, 'REQUEST_KEY_CONFLICT');
      assert.equal((await (await call()).json()).data.length, 20);
      const other = await call('briefs', brief({ expected_actor_id: 'user-other' }), { role: 'other' }); assert.equal(other.status, 201);
    });
  } finally {
    schema.close(); await mf.dispose();
  }
});
