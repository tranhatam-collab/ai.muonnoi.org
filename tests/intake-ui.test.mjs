import test from 'node:test';
import assert from 'node:assert/strict';
import {IntakeSession,normalize,JOURNAL} from '../offers/brief/intake.js';
const brief = () => ({name:'Bộ nội dung thử nghiệm',offer_id:'studio-pilot-14d',business:'Cửa hàng sổ tay giả định',audience:'Người thích viết tay',objective:'Trình bày cách sử dụng sổ mỗi ngày',deliverables:'12 bản nháp và lịch 14 ngày',source_notes:'Tư liệu giả định; không phải khách hàng thật.',reviewer_name:'Chủ cửa hàng',rights_confirmed:true,contact:''});
function storage() { const entries = new Map();return {getItem:key=>entries.get(key)||null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)}; }
function accepted(payload, overrides={}) {return {status:201,body:{ok:true,actor_id:payload.expected_actor_id,data:{...payload,id:crypto.randomUUID(),state:'RECEIVED',created_at:Date.now(),...overrides},replayed:false}};}
test('offline validation bounds and normalizes input without fabricating receipts',()=>{
  assert.equal(normalize({...brief(),name:'  A valid brief  '}).name,'A valid brief');
  for (const change of [{rights_confirmed:false},{offer_id:'free-money'},{name:'a'},{business:'x'.repeat(2001)},{source_notes:'secret\u0000hidden'}]) assert.throws(()=>normalize({...brief(),...change}));
  assert.equal(new IntakeSession(storage()).receipt,null);
});
test('lost response: retry uses immutable key/payload and stores no private body',async()=>{
  const store=storage();const session=new IntakeSession(store);let sent;
  await assert.rejects(session.submit(brief(),'actor-a',async body=>{sent=body;throw new Error('timeout');}),/timeout/);
  assert.equal(session.journal.state,'pending');assert.equal(session.locked,true);
  const journal=JSON.parse(store.getItem(JOURNAL));assert.deepEqual(Object.keys(journal).sort(),['actor_id','hash','key','state']);
  assert.equal(store.getItem(JOURNAL).includes('Cửa hàng'),false);
  await assert.rejects(session.submit({...brief(),objective:'Changed payload after an unknown result'},'actor-a',()=>assert.fail('must not send')),/PENDING_PAYLOAD_CHANGED/);
  const row=await session.submit(brief(),'actor-a',async body=>{assert.deepEqual(body,sent);return accepted(body);});
  assert.equal(session.journal.id,row.id);assert.equal(session.journal.state,'accepted');
  await assert.rejects(session.submit(brief(),'actor-a',()=>assert.fail('duplicate submit')),/ALREADY_RECEIVED/);
});
test('reload preserves unresolved key, prevents changed payload, and reconciles only matching receipt',async()=>{
  const store=storage();const original=new IntakeSession(store);let receipt;
  await assert.rejects(original.submit(brief(),'actor-a',async body=>{receipt=accepted(body).body.data;throw new Error('lost');}));
  const reloaded=new IntakeSession(store);
  assert.throws(()=>reloaded.startNew(),/PENDING_RECONCILIATION/);
  await assert.rejects(reloaded.submit({...brief(),name:'Another brief'},'actor-a',()=>assert.fail()),/PENDING_PAYLOAD_CHANGED/);
  assert.equal(await reloaded.reconcile([{...receipt,name:'Other payload'}],'actor-a'),null);
  assert.equal(await reloaded.reconcile([{...receipt,request_key:crypto.randomUUID()}],'actor-a'),null);
  assert.equal((await reloaded.reconcile([receipt],'actor-a')).id,receipt.id);
  reloaded.startNew();assert.equal(store.getItem(JOURNAL),null);assert.equal(reloaded.locked,false);
});
test('only exact valid 200/201 receipt counts as received',async()=>{
  const replies=[{status:200,body:{ok:true}},{status:202,body:{ok:true}},{status:500,body:{ok:false,error:'STORAGE_ERROR'}}];
  for(const reply of replies){const session=new IntakeSession(storage());await assert.rejects(session.submit(brief(),'actor-a',async()=>reply));assert.equal(session.journal.state,'pending');assert.equal(session.receipt,null);}
  for(const change of [{state:'PAID'},{request_key:crypto.randomUUID()},{name:'different request'},{id:'invalid'},{created_at:null}]){const session=new IntakeSession(storage());await assert.rejects(session.submit(brief(),'actor-a',async body=>accepted(body,change)));assert.equal(session.journal.state,'pending');}
});
test('definite first rejection unlocks edits, rejection after unknown outcome preserves reconciliation',async()=>{
  const session=new IntakeSession(storage());
  await assert.rejects(session.submit(brief(),'actor-a',async()=>({status:401,body:{ok:false,error:'LOGIN_REQUIRED'}})),/LOGIN_REQUIRED/);
  assert.equal(session.journal,null);assert.equal(session.locked,false);
  await assert.rejects(session.submit(brief(),'actor-a',async()=>{throw new Error('timeout');}));
  const key=session.journal.key;
  await assert.rejects(session.submit(brief(),'actor-a',async()=>({status:401,body:{ok:false,error:'LOGIN_REQUIRED'}})));
  assert.equal(session.journal.key,key);assert.equal(session.journal.state,'pending');
});
test('storage failure sends nothing; malformed journal fails closed',async()=>{
  const store={getItem:()=>null,setItem:()=>{throw new Error('quota');}};
  await assert.rejects(new IntakeSession(store).submit(brief(),'actor-a',()=>assert.fail('must not send')),/STORAGE_UNAVAILABLE/);
  const broken=new IntakeSession({getItem:()=>'{bad'});assert.equal(broken.storageError,true);
  await assert.rejects(broken.submit(brief(),'actor-a',()=>assert.fail('must not send')),/STORAGE_UNAVAILABLE/);
});
test('a double click while sending cannot create a second outbound request',async()=>{
  const session=new IntakeSession(storage());let finish,started;const began=new Promise(resolve=>{started=resolve;});
  const first=session.submit(brief(),'actor-a',body=>new Promise(resolve=>{finish=()=>resolve(accepted(body));started();}));
  await assert.rejects(session.submit(brief(),'actor-a',()=>assert.fail('racing hash')),/REQUEST_IN_FLIGHT/);
  await began;
  await assert.rejects(session.submit(brief(),'actor-a',()=>assert.fail('double send')),/REQUEST_IN_FLIGHT/);
  finish();await first;
});
test('switching accounts after an ambiguous send cannot copy the pending brief to the new account',async()=>{
  const store=storage();const session=new IntakeSession(store);let pending;
  await assert.rejects(session.submit(brief(),'actor-a',async body=>{pending=body;throw new Error('lost response');}));
  const reloaded=new IntakeSession(store);
  await assert.rejects(reloaded.submit(brief(),'actor-b',()=>assert.fail('must not send private brief')),/ACTOR_MISMATCH/);
  await assert.rejects(reloaded.reconcile([accepted(pending).body.data],'actor-b'),/ACTOR_MISMATCH/);
  await assert.rejects(reloaded.submit(brief(),'actor-a',async body=>({...accepted(body),body:{...accepted(body).body,actor_id:'actor-b'}})),/UNCONFIRMED/);
  const row=await reloaded.submit(brief(),'actor-a',async body=>{assert.equal(body.expected_actor_id,'actor-a');assert.equal(body.request_key,pending.request_key);return accepted(body);});
  assert.equal(reloaded.journal.id,row.id);
});
