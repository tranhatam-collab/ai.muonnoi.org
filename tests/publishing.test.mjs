import test from 'node:test';import assert from 'node:assert/strict';
import {studioDb} from '../tools/studio-db.mjs';
import {handlePublishing,handlePosts,handleFlowAutoPost,handleN8nAutoPost,requestObject} from '../.local/publishing.mjs';
const origin='https://ai.muonnoi.org';const payload=()=>({title:'Một khu vườn nhỏ',body:'Chia sẻ cách trồng rau trên ban công, với trải nghiệm của chính tôi.',topic:'Đời sống & văn hóa',format:'guide',sources:['https://example.org/source'],rightsConfirmed:true,aiAssisted:true,requestKey:crypto.randomUUID()});
function setup(){
 const fixture=studioDb();const env={iai_flow_db:fixture.d1,APP_ORIGIN:origin,STUDIO_PUBLISH_ENABLED:'true'};
 const call=async(path='',body,role='writer',method='POST',requestOrigin=origin)=>handlePublishing(new Request('https://api.muonnoi.org/api/publishing/'+path,{method:body===undefined?'GET':method,headers:{'Content-Type':'application/json','Origin':requestOrigin,...(role?{Cookie:'ai_muonnoi_session='+fixture.sessions[role]}:{})},body:body===undefined?undefined:JSON.stringify(body)}),env);
 const create=async(data=payload())=>{const r=await call('drafts',data);assert.equal(r.status,201,JSON.stringify(await r.clone().json()));return(await r.json()).data;};
 const approved=async()=>{const d=await create();assert.equal((await call(`drafts/${d.id}/submit`,{version:1})).status,200);assert.equal((await call(`drafts/${d.id}/review`,{version:1,decision:'approve',note:'Đã kiểm tra nguồn và quyền sử dụng.'},'reviewer')).status,200);return d;};
 return{...fixture,env,call,create,approved};
}
test('arbitrary topics, all six formats and idempotent draft creation',async t=>{
 const f=setup();t.after(f.close);const data=payload();const d=await f.create(data);const replay=await f.create(data);assert.equal(d.id,replay.id);assert.equal(d.topic,'Đời sống & văn hóa');
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM publishing_drafts').get().n,1);
 assert.equal((await f.call('drafts',{...data,title:'Khác nội dung'})).status,409);
 const cap=await(await f.call('capabilities')).json();assert.equal(cap.formats.length,6);assert.equal(cap.aiEnabled,false);assert.equal(cap.budgetVnd,0);
});
test('authentication, suspended account, Origin and unknown fields fail closed',async t=>{
 const f=setup();t.after(f.close);
 assert.equal((await f.call('drafts',undefined,null)).status,401);assert.equal((await f.call('drafts',undefined,'inactive')).status,403);
 assert.equal((await f.call('drafts',payload(),'writer','POST','https://attacker.example')).status,403);
 assert.equal((await f.call('drafts',{...payload(),state:'APPROVED',role:'admin'})).status,400);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM publishing_drafts').get().n,0);
});
test('private drafts are visible only to author and database-authorized reviewer',async t=>{
 const f=setup();t.after(f.close);const d=await f.create();
 assert.equal((await f.call('drafts/'+d.id,undefined,'other')).status,404);
 assert.equal((await(await f.call('drafts',undefined,'other')).json()).data.length,0);
 assert.equal((await(await f.call('drafts',undefined,'reviewer')).json()).data.length,1);
 assert.equal((await f.call('drafts/'+d.id,{...payload(),version:1},'reviewer','PUT')).status,403);
});
test('rights and independent review are required, including admin authors',async t=>{
 const f=setup();t.after(f.close);const d=await f.create({...payload(),rightsConfirmed:false});
 assert.equal((await f.call(`drafts/${d.id}/submit`,{version:1})).status,400);
 f.db.prepare("UPDATE users SET role='admin' WHERE id=1").run();
 await f.call('drafts/'+d.id,{...payload(),version:1},'writer','PUT');await f.call(`drafts/${d.id}/submit`,{version:2});
 assert.equal((await f.call(`drafts/${d.id}/review`,{version:2,decision:'approve',note:'Tôi tự duyệt bài viết của mình.'})).status,403);
 assert.equal((await f.call(`drafts/${d.id}/publish`,{version:2})).status,409);
});
test('editing an approved draft invalidates approval and stale versions',async t=>{
 const f=setup();t.after(f.close);const d=await f.approved();
 const edit=await f.call('drafts/'+d.id,{...payload(),version:1},'writer','PUT');assert.equal(edit.status,200);
 const row=(await edit.json()).data;assert.equal(row.version,2);assert.equal(row.state,'DRAFT');assert.equal(row.reviewer_id,null);assert.equal(row.approved_version,null);
 assert.equal((await f.call(`drafts/${d.id}/publish`,{version:1})).status,409);assert.equal((await f.call(`drafts/${d.id}/publish`,{version:2})).status,409);
});
test('zero-budget publication gate holds even an approved version',async t=>{
 const f=setup();t.after(f.close);const d=await f.approved();f.env.STUDIO_PUBLISH_ENABLED='false';
 assert.equal((await f.call(`drafts/${d.id}/publish`,{version:1})).status,423);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM posts').get().n,0);
});
test('concurrent publish retries produce one post, one topic increment and no verification claim',async t=>{
 const f=setup();t.after(f.close);const d=await f.approved();
 const responses=await Promise.all(Array.from({length:8},()=>f.call(`drafts/${d.id}/publish`,{version:1})));
 assert.deepEqual(responses.map(r=>r.status),Array(8).fill(200));
 const posts=f.db.prepare('SELECT * FROM posts').all();assert.equal(posts.length,1);assert.equal(posts[0].is_verified,0);assert.equal(posts[0].is_ai,1);assert.equal(posts[0].post_type,'guide');assert.equal(posts[0].topic,'doi-song-van-hoa');assert.ok(posts[0].body.includes('Nguồn tham khảo:\nhttps://example.org/source'));
 assert.equal(f.db.prepare('SELECT post_count FROM topics').get().post_count,1);
 const audit=f.db.prepare("SELECT * FROM publishing_audit WHERE action='PUBLISH'").all();assert.equal(audit.length,1);assert.equal(audit[0].actor_id,1);
 assert.equal((await f.call('drafts/'+d.id,{...payload(),version:1},'writer','PUT')).status,409);
});
test('optimistic edits preserve exactly one winner and audit receipt',async t=>{
 const f=setup();t.after(f.close);const d=await f.create();
 const responses=await Promise.all([f.call('drafts/'+d.id,{...payload(),title:'Thay đổi một',version:1},'writer','PUT'),f.call('drafts/'+d.id,{...payload(),title:'Thay đổi hai',version:1},'writer','PUT')]);
 assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal(f.db.prepare("SELECT COUNT(*) n FROM publishing_audit WHERE action='EDIT'").get().n,1);
});
test('rejection clears approval and retains reviewer actor, append-only audit',async t=>{
 const f=setup();t.after(f.close);const d=await f.create();await f.call(`drafts/${d.id}/submit`,{version:1});
 const r=await f.call(`drafts/${d.id}/review`,{version:1,decision:'reject',note:'Cần bổ sung nguồn tham khảo rõ hơn.'},'reviewer');assert.equal(r.status,200);
 const row=(await r.json()).data;assert.equal(row.state,'DRAFT');assert.equal(row.reviewer_id,null);
 assert.equal(f.db.prepare("SELECT actor_id FROM publishing_audit WHERE action='REJECT'").get().actor_id,2);
 assert.throws(()=>f.db.exec('DELETE FROM publishing_audit'),/APPEND_ONLY/);assert.throws(()=>f.db.exec("UPDATE publishing_audit SET action='FAKE'"),/APPEND_ONLY/);
});
test('publish batch rolls back on storage failure without a false published state',async t=>{
 const f=setup();t.after(f.close);const d=await f.approved();
 f.db.exec("CREATE TRIGGER fail_post BEFORE INSERT ON posts BEGIN SELECT RAISE(ABORT,'TEST_FAILURE'); END;");
 assert.equal((await f.call(`drafts/${d.id}/publish`,{version:1})).status,503);
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM topics').get().n,0);assert.equal(f.db.prepare('SELECT state FROM publishing_drafts').get().state,'APPROVED');
});
test('invalid source protocol, oversized input and insufficient review note are rejected',async t=>{
 const f=setup();t.after(f.close);assert.equal((await f.call('drafts',{...payload(),sources:['javascript:alert(1)']})).status,400);
 assert.equal((await f.call('drafts',{...payload(),body:'x'.repeat(250000)})).status,413);
 const d=await f.create();await f.call(`drafts/${d.id}/submit`,{version:1});assert.equal((await f.call(`drafts/${d.id}/review`,{version:1,decision:'approve',note:'ok'},'reviewer')).status,400);
});
test('new publishing path makes no outbound calls; legacy bearer and Flow/n8n autopost are locked',async t=>{
 const f=setup();t.after(f.close);const saved=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('OUTBOUND_FORBIDDEN');};t.after(()=>{globalThis.fetch=saved;});
 const d=await f.approved();assert.equal((await f.call(`drafts/${d.id}/publish`,{version:1})).status,200);
 const request=new Request(origin+'/api/posts',{method:'POST',headers:{Authorization:'Bearer fixture'}});
 assert.equal((await handlePosts(request,f.env,{waitUntil(){throw Error('NO_BACKGROUND_WORK');}})).status,423);
 for(const fn of [handleFlowAutoPost,handleN8nAutoPost])assert.equal((await fn(request,f.env)).status,423);
 assert.equal(calls,0);
});

test('legacy JSON parsing safely handles primitives and malformed input',async()=>{
 for(const raw of ['null','42','[]','{broken'])assert.deepEqual(await requestObject(new Request('https://example.test',{method:'POST',body:raw})),{});
 assert.deepEqual(await requestObject(new Request('https://example.test',{method:'POST',body:'{"title":"Example"}'})),{title:'Example'});
});
