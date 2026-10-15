import test from 'node:test';import assert from 'node:assert/strict';import {readFile,mkdtemp} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {Miniflare} from '../workers/revenueops/node_modules/miniflare/dist/src/index.js';import {studioDb} from '../tools/studio-db.mjs';
test('workerd + local D1: real router, session roles, atomic publish and persistence',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'muonnoi-studio-d1-'));const source=await readFile('.local/api-worker.mjs','utf8');
 const opts={telemetry:{enabled:false},resourcePersistencePath:join(temp,'state'),workers:[{config:{name:'studio-test',compatibilityDate:'2026-10-15',manifest:{mainModule:'worker.js',modules:{'worker.js':{type:'esm',contents:source}}},env:{iai_flow_db:{type:'d1',id:'studio-fixture'},APP_ORIGIN:{type:'text',value:'https://ai.muonnoi.org'},STUDIO_PUBLISH_ENABLED:{type:'text',value:'true'}}}}]};
 let mf=new Miniflare(opts);const fixture=studioDb();
 try{
  const db=await mf.getD1Database('iai_flow_db');
  for(const row of fixture.db.prepare("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END,rowid").all())await db.prepare(row.sql).run();
  for(const row of fixture.db.prepare('SELECT id,email,name,role,status FROM users').all())await db.prepare('INSERT INTO users(id,email,name,role,status) VALUES(?1,?2,?3,?4,?5)').bind(row.id,row.email,row.name,row.role,row.status).run();
  for(const [role,userId]of [['writer',1],['reviewer',2]])await db.prepare('INSERT INTO sessions VALUES(?1,?2,?3,?4)').bind(fixture.sessions[role],userId,Date.now(),Date.now()+86400000).run();
  const call=(path,body,role='writer')=>mf.dispatchFetch('https://local/api/publishing/'+path,{method:body?'POST':'GET',headers:{Origin:'https://ai.muonnoi.org','Content-Type':'application/json',Cookie:'ai_muonnoi_session='+fixture.sessions[role]},body:body?JSON.stringify(body):undefined});
  const created=await call('drafts',{title:'Bài thử workerd D1',body:'Bản thử cô lập, không xuất bản lên môi trường thật.',topic:'Kinh nghiệm sống',format:'article',sources:['https://example.org/source'],rightsConfirmed:true,aiAssisted:true,requestKey:crypto.randomUUID()});assert.equal(created.status,201,await created.clone().text());
  const draft=(await created.json()).data;
  assert.equal((await call(`drafts/${draft.id}/submit`,{version:1})).status,200);
  assert.equal((await call(`drafts/${draft.id}/review`,{version:1,decision:'approve',note:'Đã kiểm tra dữ liệu thử nghiệm cô lập.'},'reviewer')).status,200);
  const responses=await Promise.all(Array.from({length:6},()=>call(`drafts/${draft.id}/publish`,{version:1})));
  for(const r of responses)assert.equal(r.status,200,await r.clone().text());
  assert.equal((await db.prepare('SELECT COUNT(*) n FROM posts').first()).n,1);assert.equal((await db.prepare('SELECT is_verified FROM posts').first()).is_verified,0);assert.ok((await db.prepare('SELECT body FROM posts').first()).body.includes('https://example.org/source'));
  assert.equal((await db.prepare('SELECT post_count FROM topics').first()).post_count,1);
  await mf.dispose();mf=new Miniflare(opts);
  const read=await call('drafts/'+draft.id);assert.equal(read.status,200);assert.equal((await read.json()).data.state,'PUBLISHED');
 }finally{fixture.close();await mf.dispose();}
});
