import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Miniflare } from '../workers/revenueops/node_modules/miniflare/dist/src/index.js';

const origin = 'https://ai.muonnoi.org';
const privateMarker = 'PRIVATE_BRIEF_FIXTURE_ONLY';
const brief = () => ({ request_key: crypto.randomUUID(), expected_actor_id: 'owner', name: 'Brief triage thử nghiệm', offer_id: 'studio-pilot-14d', business: 'Doanh nghiệp tổng hợp cho thử nghiệm.', audience: 'Người đọc thử nghiệm', objective: 'Chuẩn bị nội dung có kiểm duyệt.', deliverables: '12 bản nháp và lịch 14 ngày.', source_notes: privateMarker, reviewer_name: 'Người duyệt thử', rights_confirmed: true });
const sharing = (version, enabled, extra = {}) => ({ expected_actor_id: 'owner', request_key: crypto.randomUUID(), version, share_with_studio: enabled, ...extra });
const transition = (version, status, extra = {}) => ({ expected_actor_id: 'operator', request_key: crypto.randomUUID(), version, status, customer_message: 'Thông điệp chỉ dành cho khách hàng.', ...extra });
async function applyMigration(db, filename) {
  const source = await readFile(filename, 'utf8'); let statement = '';
  for (const line of source.split('\n')) {
    if (!line.trim() || line.trim().startsWith('--')) continue;
    statement += line + '\n';
    if (/^CREATE TRIGGER/i.test(statement.trim()) ? /END;\s*$/.test(statement) : /;\s*$/.test(statement)) {
      await db.prepare(statement).run(); statement = '';
    }
  }
  assert.equal(statement.trim(), '');
}

test('workerd + real D1: consent-bound operator triage, event receipts and atomic revocation', async t => {
  const temp = await mkdtemp(join(tmpdir(), 'muonnoi-triage-d1-'));
  const source = await readFile('.local/api-worker.mjs', 'utf8');
  const sessions = Object.fromEntries(['owner','other','operator','admin','suspended'].map(id => [id, crypto.randomUUID()]));
  const options = (triage = true, allowlist = 'operator') => ({
    telemetry: { enabled: false }, resourcePersistencePath: join(temp, 'state'),
    workers: [{ config: {
      name: 'triage-test', compatibilityDate: '2026-10-15',
      manifest: { mainModule: 'worker.js', modules: { 'worker.js': { type: 'esm', contents: source } } },
      env: {
        iai_flow_db: { type: 'd1', id: 'triage-fixture' }, APP_ORIGIN: { type: 'text', value: origin },
        STUDIO_INTAKE_ENABLED: { type: 'text', value: 'true' },
        ...(triage ? { STUDIO_TRIAGE_ENABLED: { type: 'text', value: 'true' } } : {}),
        ...(allowlist ? { STUDIO_OPERATOR_IDS: { type: 'text', value: allowlist } } : {})
      }
    } }]
  });
  let mf = new Miniflare(options(false)); let db = await mf.getD1Database('iai_flow_db');
  const restart = async (...args) => { await mf.dispose(); mf = new Miniflare(options(...args)); db = await mf.getD1Database('iai_flow_db'); };
  const call = (path, body, role = 'owner', headers = {}) => mf.dispatchFetch('https://local/api/intake/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', ...(role ? { Cookie: 'ai_muonnoi_session=' + sessions[role] } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const fail = async (response, status, error) => {
    assert.equal(response.status, status, await response.clone().text());
    const text = await response.text(); assert.equal(text.includes(privateMarker), false);
    assert.deepEqual(JSON.parse(text), { ok: false, error });
  };
  const ok = async response => { assert.equal(response.status, 200, await response.clone().text()); return response.json(); };
  const create = async () => {
    const body = brief(); const response = await call('briefs', body);
    assert.equal(response.status, 201, await response.clone().text()); return (await response.json()).data;
  };
  try {
    await db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT,name TEXT,username TEXT,avatar_url TEXT,bio TEXT,role TEXT,is_verified INTEGER DEFAULT 0,status TEXT DEFAULT 'active');
      CREATE TABLE sessions(token TEXT PRIMARY KEY,user_id TEXT,created_at INTEGER,expires_at INTEGER);`);
    await applyMigration(db, 'workers/api/migrations/0010_studio_intake.sql');
    for (const id of Object.keys(sessions)) {
      await db.prepare('INSERT INTO users(id,email,name,role,status) VALUES(?1,?2,?1,?3,?4)').bind(id,id+'@example.test',id === 'admin' ? 'admin' : 'member',id === 'suspended' ? 'suspended' : 'active').run();
      await db.prepare('INSERT INTO sessions VALUES(?1,?2,?3,?4)').bind(sessions[id],id,Date.now(),Date.now()+86400000).run();
    }
    const legacy = await create();
    await t.test('triage fails closed before flag or exact operator allowlist is configured', async () => {
      await fail(await call('operator/briefs', undefined, 'operator'), 503, 'TRIAGE_DISABLED');
      await fail(await call(`briefs/${legacy.id}/sharing`, sharing(0,true)), 503, 'TRIAGE_DISABLED');
      await applyMigration(db, 'workers/api/migrations/0011_studio_triage.sql');
      await restart(true, '');
      await fail(await call('operator/briefs', undefined, 'operator'), 403, 'OPERATOR_REQUIRED');
      await fail(await call('operator/briefs', undefined, 'admin'), 403, 'OPERATOR_REQUIRED');
      await restart(true, ' operator , suspended ');
      await fail(await call('operator/briefs', undefined, 'suspended'), 403, 'ACCOUNT_INACTIVE');
      await fail(await call('operator/briefs', undefined, null), 401, 'LOGIN_REQUIRED');
    });
    await t.test('migration preserves legacy private briefs and new briefs start unshared', async () => {
      const own = (await ok(await call('briefs/' + legacy.id))).data;
      assert.equal(own.triage.share_with_studio, false); assert.equal(own.triage.version, 0);
      assert.equal(own.triage.status, 'RECEIVED'); assert.deepEqual(own.triage.history, []);
      await fail(await call('operator/briefs/' + legacy.id, undefined, 'operator'), 404, 'NOT_FOUND');
      assert.deepEqual((await ok(await call('operator/briefs', undefined, 'operator'))).data, []);
      const fresh = await create();
      const ownFresh = (await ok(await call('briefs/' + fresh.id))).data;
      assert.equal(ownFresh.triage.share_with_studio, false); assert.equal(ownFresh.triage.version, 0);
      await fail(await call('operator/briefs/' + fresh.id, undefined, 'operator'), 404, 'NOT_FOUND');
    });
    let grant; let grantBody;
    await t.test('only owner can explicitly share; lost response and key reuse preserve one event', async () => {
      await fail(await call(`briefs/${legacy.id}/sharing`, sharing(0,true,{expected_actor_id:'other'}), 'other'), 404, 'NOT_FOUND');
      await fail(await call(`briefs/${legacy.id}/sharing`, sharing(0,true,{expected_actor_id:'other'})), 403, 'ACTOR_MISMATCH');
      await fail(await call(`briefs/${legacy.id}/sharing`, sharing(0,true), 'owner', {Origin:'https://evil.example'}), 403, 'ORIGIN_REJECTED');
      await fail(await call(`briefs/${legacy.id}/sharing`, sharing(0,true,{internal_note:'hidden'})), 400, 'UNEXPECTED_FIELD');
      grantBody = sharing(0,true);
      const lost = await call(`briefs/${legacy.id}/sharing`, grantBody);
      assert.equal(lost.status,200); await lost.body.cancel();
      await restart();
      grant = await ok(await call(`briefs/${legacy.id}/sharing`,grantBody));
      assert.equal(grant.replayed,true); assert.equal(grant.data.triage.version,1); assert.equal(grant.receipt.action,'SHARE');
      assert.equal(grant.receipt.actor_id,'owner'); assert.equal(grant.receipt.request_key,grantBody.request_key);
      assert.equal(grant.receipt.before_version,0); assert.equal(grant.receipt.version,1);
      const canonical = JSON.stringify({brief_id:legacy.id,action:'SHARE',version:0,share_with_studio:true});
      const hash = Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical))).toString('hex');
      assert.equal(grant.receipt.payload_hash,hash);
      assert.equal(Object.hasOwn(grant.receipt,'mutation_json'),false);
      await fail(await call(`briefs/${legacy.id}/sharing`,{...grantBody,share_with_studio:false}),409,'REQUEST_KEY_CONFLICT');
      await fail(await call(`briefs/${legacy.id}/sharing`,sharing(0,false)),409,'VERSION_CONFLICT');
      assert.equal((await db.prepare('SELECT COUNT(*) n FROM studio_intake_events WHERE brief_id=?1').bind(legacy.id).first()).n,1);
    });
    let reviewBody;
    await t.test('allowlisted operators see only consented input and follow the bounded transition graph', async () => {
      await fail(await call('operator/briefs',undefined,'admin'),403,'OPERATOR_REQUIRED');
      const queue = await ok(await call('operator/briefs',undefined,'operator'));
      assert.equal(queue.data.length,1); assert.equal(queue.data[0].id,legacy.id); assert.equal(Object.hasOwn(queue.data[0],'source_notes'),false);
      const full = await ok(await call('operator/briefs/'+legacy.id,undefined,'operator'));
      assert.equal(full.data.source_notes,privateMarker);
      await fail(await call(`operator/briefs/${legacy.id}/triage`,transition(1,'PROPOSAL_READY'),'operator'),409,'STATE_CONFLICT');
      await fail(await call(`operator/briefs/${legacy.id}/triage`,transition(1,'IN_REVIEW',{expected_actor_id:'owner'}),'operator'),403,'ACTOR_MISMATCH');
      await fail(await call(`operator/briefs/${legacy.id}/triage`,transition(1,'IN_REVIEW',{internal_note:'not allowed'}),'operator'),400,'UNEXPECTED_FIELD');
      await fail(await call(`operator/briefs/${legacy.id}/triage`,transition(1,'IN_REVIEW',{customer_message:'x'.repeat(2001)}),'operator'),400,'CUSTOMER_MESSAGE_REQUIRED');
      reviewBody = transition(1,'IN_REVIEW');
      const reviewed = await ok(await call(`operator/briefs/${legacy.id}/triage`,reviewBody,'operator'));
      assert.equal(reviewed.data.triage.version,2); assert.equal(reviewed.receipt.action,'TRIAGE');
      assert.equal((await ok(await call(`operator/briefs/${legacy.id}/triage`,reviewBody,'operator'))).replayed,true);
      await fail(await call(`operator/briefs/${legacy.id}/triage`,{...reviewBody,customer_message:'Different message on same key'},'operator'),409,'REQUEST_KEY_CONFLICT');
      await ok(await call(`operator/briefs/${legacy.id}/triage`,transition(2,'NEEDS_INFORMATION'),'operator'));
      await ok(await call(`operator/briefs/${legacy.id}/triage`,transition(3,'IN_REVIEW'),'operator'));
      await ok(await call(`operator/briefs/${legacy.id}/triage`,transition(4,'PROPOSAL_READY'),'operator'));
      await fail(await call(`operator/briefs/${legacy.id}/triage`,transition(5,'DECLINED'),'operator'),409,'STATE_CONFLICT');
      const own = (await ok(await call('briefs/'+legacy.id))).data;
      assert.equal(own.state,'RECEIVED'); assert.equal(own.triage.status,'PROPOSAL_READY');
      assert.equal(own.triage.history.length,5); assert.equal(own.triage.history[0].version,5);
      assert.equal(own.source_notes,privateMarker);
    });
    await t.test('revocation removes operator read and even old receipt replay access immediately', async () => {
      const revoked = await ok(await call(`briefs/${legacy.id}/sharing`,sharing(5,false)));
      assert.equal(revoked.data.triage.share_with_studio,false); assert.equal(revoked.data.triage.version,6);
      await fail(await call('operator/briefs/'+legacy.id,undefined,'operator'),404,'NOT_FOUND');
      await fail(await call(`operator/briefs/${legacy.id}/triage`,reviewBody,'operator'),404,'NOT_FOUND');
      assert.deepEqual((await ok(await call('operator/briefs',undefined,'operator'))).data,[]);
      const replay = await ok(await call(`briefs/${legacy.id}/sharing`,grantBody));
      assert.equal(replay.receipt.version,1); assert.equal(replay.data.triage.version,6); assert.equal(replay.data.triage.share_with_studio,false);
      assert.equal((await ok(await call('briefs/'+legacy.id))).data.triage.history.length,6);
      await ok(await call(`briefs/${legacy.id}/sharing`,sharing(6,true)));
      await fail(await call(`operator/briefs/${legacy.id}/triage`,transition(7,'IN_REVIEW'),'operator'),409,'STATE_CONFLICT');
      await ok(await call(`briefs/${legacy.id}/sharing`,sharing(7,false)));
    });
    await t.test('concurrent same-key changes replay once and stale contenders cannot bypass consent', async () => {
      const fresh = await create(); const grantRequest = sharing(0,true);
      const grants = await Promise.all(Array.from({length:6},()=>call(`briefs/${fresh.id}/sharing`,grantRequest)));
      const results = await Promise.all(grants.map(ok));
      assert.equal(results.filter(result=>!result.replayed).length,1);
      assert.equal(new Set(results.map(result=>result.receipt.id)).size,1);
      const races = await Promise.all(Array.from({length:6},()=>call(`operator/briefs/${fresh.id}/triage`,transition(1,'IN_REVIEW'),'operator')));
      assert.equal(races.filter(response=>response.status===200).length,1);
      assert.equal(races.filter(response=>response.status===409).length,5);
      const [revoke, triage] = await Promise.all([
        call(`briefs/${fresh.id}/sharing`,sharing(2,false)),
        call(`operator/briefs/${fresh.id}/triage`,transition(2,'NEEDS_INFORMATION'),'operator')
      ]);
      assert.equal([revoke,triage].filter(response=>response.status===200).length,1);
      const state = await db.prepare('SELECT * FROM studio_intake_state WHERE brief_id=?1').bind(fresh.id).first();
      assert.equal(state.version,3);
      if (revoke.status===200) {
        assert.equal(state.share_with_studio,0); assert.equal(state.status,'IN_REVIEW');
        assert.equal(triage.status,404);
      } else {
        assert.equal(revoke.status,409); assert.equal(state.status,'NEEDS_INFORMATION');
        await ok(await call(`briefs/${fresh.id}/sharing`,sharing(3,false)));
      }
      await fail(await call(`operator/briefs/${fresh.id}/triage`,transition(4,'IN_REVIEW'),'operator'),404,'NOT_FOUND');
    });
    await t.test('state-write failure rolls back the event; the exact retry later succeeds once', async () => {
      const fresh = await create(); await ok(await call(`briefs/${fresh.id}/sharing`,sharing(0,true)));
      const mutation = transition(1,'IN_REVIEW',{customer_message:'Injected local state failure'});
      await db.prepare("CREATE TRIGGER triage_test_failure BEFORE UPDATE ON studio_intake_state WHEN NEW.customer_message='Injected local state failure' BEGIN SELECT RAISE(ABORT,'PRIVATE_BRIEF_FIXTURE_ONLY'); END").run();
      await fail(await call(`operator/briefs/${fresh.id}/triage`,mutation,'operator'),503,'INTAKE_STORAGE_UNAVAILABLE');
      assert.equal((await db.prepare('SELECT COUNT(*) n FROM studio_intake_events WHERE brief_id=?1').bind(fresh.id).first()).n,1);
      assert.equal((await db.prepare('SELECT version FROM studio_intake_state WHERE brief_id=?1').bind(fresh.id).first()).version,1);
      await db.prepare('DROP TRIGGER triage_test_failure').run();
      const accepted = await ok(await call(`operator/briefs/${fresh.id}/triage`,mutation,'operator'));
      assert.equal(accepted.replayed,false); assert.equal(accepted.data.triage.version,2);
      await assert.rejects(db.prepare('DELETE FROM studio_intake_events WHERE id=?1').bind(accepted.receipt.id).run(),/INTAKE_EVENT_IMMUTABLE/);
      await assert.rejects(db.prepare("UPDATE studio_intake_briefs SET payload_json='{}' WHERE id=?1").bind(fresh.id).run(),/INTAKE_IMMUTABLE/);
    });
    await t.test('operator queue pages are capped at 50 and exclude unshared rows', async () => {
      // Additional synthetic database fixtures exercise pagination beyond per-user application quotas.
      for (let i=0;i<52;i++) {
        const id = crypto.randomUUID(); const payload = brief();
        await db.prepare("INSERT INTO studio_intake_briefs(id,author_id,request_key,payload_json,state,created_at) VALUES(?1,'other',?2,?3,'RECEIVED',?4)").bind(id,crypto.randomUUID(),JSON.stringify(payload),Date.now()).run();
        await db.prepare('UPDATE studio_intake_state SET share_with_studio=1 WHERE brief_id=?1').bind(id).run();
      }
      const first = await ok(await call('operator/briefs',undefined,'operator'));
      assert.equal(first.data.length,50); assert.equal(first.has_more,true); assert.equal(first.next_cursor,first.data.at(-1).id);
      const second = await ok(await call('operator/briefs?cursor='+first.next_cursor,undefined,'operator'));
      assert.equal(second.has_more,false); assert.equal(second.next_cursor,null);
      assert.equal(new Set([...first.data,...second.data].map(row=>row.id)).size,53);
      assert.equal([...first.data,...second.data].some(row=>row.id===legacy.id),false);
      await fail(await call('operator/briefs?cursor=invalid',undefined,'operator'),400,'CURSOR_INVALID');
    });
  } finally { await mf.dispose(); }
});
