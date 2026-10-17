import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import api from '../.local/api-worker.mjs';
import { studioDb } from '../tools/studio-db.mjs';

test('numeric legacy user IDs remain canonical across brief creation, sharing and operator triage', async t => {
  const fixture = studioDb(); t.after(fixture.close);
  fixture.db.exec(await readFile('workers/api/migrations/0010_studio_intake.sql','utf8'));
  fixture.db.exec(await readFile('workers/api/migrations/0011_studio_triage.sql','utf8'));
  const origin = 'https://ai.muonnoi.org';
  const env = { iai_flow_db: fixture.d1, APP_ORIGIN: origin, STUDIO_INTAKE_ENABLED: 'true', STUDIO_TRIAGE_ENABLED: 'true', STUDIO_OPERATOR_IDS: '2' };
  const call = (path, body, role = 'writer') => api.fetch(new Request('https://api.muonnoi.org/api/intake/' + path, {
    method: body === undefined ? 'GET' : 'POST', headers: {Origin:origin,'Content-Type':'application/json',Cookie:'ai_muonnoi_session='+fixture.sessions[role]},
    body: body === undefined ? undefined : JSON.stringify(body)
  }), env, {});
  const payload = {request_key:crypto.randomUUID(),expected_actor_id:'1',name:'Numeric identity regression',offer_id:'studio-pilot-14d',business:'A synthetic fixture business',audience:'Synthetic readers',objective:'Verify canonical identity consistently',deliverables:'A locally verified receipt',source_notes:'',reviewer_name:'Fixture owner',rights_confirmed:true};
  const created = await call('briefs',payload); assert.equal(created.status,201,await created.clone().text());
  const receipt = await created.json(); const id = receipt.data.id;
  assert.equal(receipt.actor_id,'1');
  assert.equal(fixture.db.prepare('SELECT author_id FROM studio_intake_briefs WHERE id=?').get(id).author_id,'1');
  assert.equal((await call('briefs',payload)).status,200);
  const own = await call('briefs/'+id); assert.equal(own.status,200); assert.equal((await own.json()).actor_id,'1');
  const share = {expected_actor_id:'1',request_key:crypto.randomUUID(),version:0,share_with_studio:true};
  const shared = await call('briefs/'+id+'/sharing',share); assert.equal(shared.status,200,await shared.clone().text());
  assert.equal((await shared.json()).receipt.actor_id,'1');
  const queue = await call('operator/briefs',undefined,'reviewer'); assert.equal(queue.status,200);
  assert.equal((await queue.json()).data[0].id,id);
  const reviewed = await call('operator/briefs/'+id+'/triage',{expected_actor_id:'2',request_key:crypto.randomUUID(),version:1,status:'IN_REVIEW',customer_message:'Review started for synthetic fixture.'},'reviewer');
  assert.equal(reviewed.status,200,await reviewed.clone().text()); assert.equal((await reviewed.json()).receipt.actor_id,'2');
  assert.equal((await call('briefs/'+id+'/sharing',{...share,request_key:crypto.randomUUID(),version:2,share_with_studio:false})).status,200);
  assert.equal((await call('operator/briefs/'+id,undefined,'reviewer')).status,404);
  assert.equal((await call('briefs/'+id,undefined,'other')).status,404);
});
