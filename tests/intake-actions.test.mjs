import test from 'node:test';import assert from 'node:assert/strict';
import {ActionJournal,canonicalAction} from '../offers/brief/actions.js';
const id=crypto.randomUUID();const share=()=>({brief_id:id,action:'SHARE',version:0,share_with_studio:true});
const triage=()=>({brief_id:id,action:'TRIAGE',version:1,status:'IN_REVIEW',customer_message:'Đã nhận yêu cầu, đang kiểm tra nguồn.'});
function storage(){const entries=new Map();return {getItem:key=>entries.get(key)||null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};}
function success(journal){const j=journal.journal;return {status:200,body:{ok:true,actor_id:j.actor_id,data:{id:j.brief_id,triage:{version:j.version+1}},receipt:{id:crypto.randomUUID(),actor_id:j.actor_id,request_key:j.request_key,action:j.action,before_version:j.version,version:j.version+1,payload_hash:j.hash,created_at:Date.now()}}};}
test('sharing and triage canonical payloads validate before any network call',()=>{
 assert.deepEqual(canonicalAction(share()),share());assert.equal(canonicalAction({...triage(),customer_message:'  A valid message  '}).customer_message,'A valid message');
 for(const value of [{...share(),version:-1},{...share(),share_with_studio:false},{...triage(),status:'PAID'},{...triage(),customer_message:'short'},{...triage(),customer_message:'secret\u0000text'},{...share(),brief_id:'invalid'}])assert.throws(()=>canonicalAction(value));
});
test('a lost sharing response retries one key and reconciles only exact immutable receipt',async()=>{
 const store=storage();const journal=new ActionJournal(store,'sharing');let receipt,key;
 await assert.rejects(journal.submit(share(),'owner',async(path,body)=>{assert.equal(path,`/intake/briefs/${id}/sharing`);key=body.request_key;receipt=success(journal).body.receipt;throw new Error('lost');}));
 const restored=new ActionJournal(store,'sharing');
 assert.equal(restored.reconcile(id,'owner',[{...receipt,payload_hash:'0'.repeat(64)}]),null);
 await assert.rejects(restored.submit({...share(),share_with_studio:false,action:'REVOKE'},'owner',()=>assert.fail()),/PENDING_ACTION_CHANGED/);
 await restored.submit(share(),'owner',async(path,body)=>{assert.equal(body.request_key,key);return success(restored);});
 assert.equal(restored.journal.outcome,'confirmed');
});
test('triage journal never persists customer message and history resolves an ambiguous write',async()=>{
 const store=storage();const journal=new ActionJournal(store,'triage');let receipt;
 await assert.rejects(journal.submit(triage(),'operator',async()=>{receipt=success(journal).body.receipt;throw new Error('timeout');}));
 assert.equal(store.getItem(journal.key).includes('Đã nhận'),false);assert.equal(store.getItem(journal.key).includes('customer_message'),false);
 const restored=new ActionJournal(store,'triage');assert.equal(restored.reconcile(id,'operator',[receipt]).request_key,receipt.request_key);assert.equal(restored.journal.outcome,'confirmed');
});
test('account switches cannot retry or reconcile another actor pending action',async()=>{
 const journal=new ActionJournal(storage(),'triage');let receipt;
 await assert.rejects(journal.submit(triage(),'operator-a',async()=>{receipt=success(journal).body.receipt;throw new Error('lost');}));
 await assert.rejects(journal.submit(triage(),'operator-b',()=>assert.fail()),/ACTOR_MISMATCH/);
 assert.throws(()=>journal.reconcile(id,'operator-b',[receipt]),/ACTOR_MISMATCH/);
});
test('false success, changed receipt, and persistence failure never confirm an operation',async()=>{
 for(const mutation of [reply=>({...reply,status:202}),reply=>({...reply,body:{...reply.body,actor_id:'different'}}),reply=>({...reply,body:{...reply.body,receipt:{...reply.body.receipt,payload_hash:'0'.repeat(64)}}})]){
  const journal=new ActionJournal(storage(),'sharing');await assert.rejects(journal.submit(share(),'owner',async()=>mutation(success(journal))));assert.equal(journal.journal.outcome,'pending');
 }
 const journal=new ActionJournal({getItem:()=>null,setItem:()=>{throw new Error('full');}},'sharing');await assert.rejects(journal.submit(share(),'owner',()=>assert.fail()),/STORAGE_UNAVAILABLE/);
});
test('first definitive conflict unlocks a fresh attempt; conflicts after timeout retain unresolved receipt',async()=>{
 const journal=new ActionJournal(storage(),'sharing');const denied=async()=>({status:409,body:{ok:false,error:'VERSION_CONFLICT'}});
 await assert.rejects(journal.submit(share(),'owner',denied));assert.equal(journal.journal,null);
 await assert.rejects(journal.submit(share(),'owner',async()=>{throw new Error('lost');}));
 await assert.rejects(journal.submit(share(),'owner',denied));assert.equal(journal.journal.outcome,'pending');
});
test('parallel clicks share one mutation and confirmed action can be followed by a new explicit action',async()=>{
 const journal=new ActionJournal(storage(),'sharing');let finish,started;const began=new Promise(resolve=>{started=resolve;});
 const first=journal.submit(share(),'owner',()=>new Promise(resolve=>{finish=()=>resolve(success(journal));started();}));
 await assert.rejects(journal.submit(share(),'owner',()=>assert.fail()),/REQUEST_IN_FLIGHT/);await began;finish();await first;
 const previous=journal.journal.request_key;await journal.submit({...share(),version:1,action:'REVOKE',share_with_studio:false},'owner',async()=>success(journal));assert.notEqual(journal.journal.request_key,previous);
});
test('parked ambiguous triage can yield to another brief, then resumes the exact original key',async()=>{
 const store=storage(),journal=new ActionJournal(store,'triage');const original=triage();let key;
 await assert.rejects(journal.submit(original,'operator',async(path,body)=>{key=body.request_key;throw new Error('lost');}));
 const parked=journal.park();assert.equal(parked.request_key,key);assert.equal(parked.outcome,'pending');assert.equal(journal.journal,null);assert.equal(journal.pending,null);assert.equal(journal.parked.length,1);
 assert.equal(store.getItem(journal.archiveKey).includes('customer_message'),false);assert.equal(store.getItem(journal.archiveKey).includes(original.customer_message),false);
 await assert.rejects(journal.submit(original,'operator',()=>assert.fail()),/PARKED_ACTION_PENDING/);
 const other={...triage(),brief_id:crypto.randomUUID()};await journal.submit(other,'operator',async()=>success(journal));assert.equal(journal.journal.outcome,'confirmed');
 const restored=new ActionJournal(store,'triage');const resumed=restored.resume(id,'operator');assert.equal(resumed.request_key,key);assert.equal(restored.pending,null);assert.equal(restored.parked.length,0);
 await restored.submit(original,'operator',async(path,body)=>{assert.equal(body.request_key,key);assert.equal(body.version,original.version);return success(restored);});
 assert.equal(restored.journal.outcome,'confirmed');
});
test('parking failure retains the pending request through archive-write or active-remove failure',async()=>{
 for(const failure of ['archive','remove']){
  const store=storage(),journal=new ActionJournal(store,'triage');await assert.rejects(journal.submit(triage(),'operator',async()=>{throw new Error('lost');}));
  const key=journal.journal.request_key;const originalSet=store.setItem,originalRemove=store.removeItem;
  if(failure==='archive')store.setItem=(name,value)=>{if(name===journal.archiveKey)throw new Error('full');originalSet(name,value);};
  else store.removeItem=name=>{if(name===journal.key)throw new Error('denied');originalRemove(name);};
  assert.throws(()=>journal.park(),/STORAGE_UNAVAILABLE/);assert.equal(journal.journal.request_key,key);assert.equal(journal.journal.outcome,'pending');assert.ok(journal.pending);
  assert.equal(JSON.parse(store.getItem(journal.key)).request_key,key);
  store.setItem=originalSet;store.removeItem=originalRemove;
  const recovered=new ActionJournal(store,'triage');assert.equal(recovered.storageError,false);assert.equal(recovered.journal.request_key,key);assert.equal(recovered.parked.length,0);
  await recovered.submit(triage(),'operator',async(path,body)=>{assert.equal(body.request_key,key);return success(recovered);});
 }
});
test('resume failure keeps either archived or active durable metadata and can recover after reload',async()=>{
 for(const failure of ['active','archive']){
  const store=storage(),journal=new ActionJournal(store,'triage');await assert.rejects(journal.submit(triage(),'operator',async()=>{throw new Error('lost');}));
  const key=journal.journal.request_key;journal.park();const originalSet=store.setItem;
  store.setItem=(name,value)=>{if(name===(failure==='active'?journal.key:journal.archiveKey))throw new Error('full');originalSet(name,value);};
  assert.throws(()=>journal.resume(id,'operator'),/STORAGE_UNAVAILABLE/);
  assert.equal(JSON.parse(store.getItem(journal.archiveKey))[0].request_key,key);
  if(failure==='archive')assert.equal(JSON.parse(store.getItem(journal.key)).request_key,key);
  store.setItem=originalSet;
  const recovered=new ActionJournal(store,'triage');assert.equal(recovered.storageError,false);
  if(recovered.parked.length)recovered.resume(id,'operator');
  assert.equal(recovered.journal.request_key,key);assert.equal(recovered.parked.length,0);
  await recovered.submit(triage(),'operator',async(path,body)=>{assert.equal(body.request_key,key);return success(recovered);});
 }
});
test('parked metadata remains account-bound and cannot overwrite another unresolved action',async()=>{
 const store=storage(),journal=new ActionJournal(store,'triage');await assert.rejects(journal.submit(triage(),'operator-a',async()=>{throw new Error('lost');}));
 const key=journal.journal.request_key;journal.park();
 assert.throws(()=>journal.resume(id,'operator-b'),/ACTOR_MISMATCH/);assert.equal(journal.journal,null);
 await assert.rejects(journal.submit(triage(),'operator-b',()=>assert.fail()),/PARKED_ACTION_PENDING/);
 const other={...triage(),brief_id:crypto.randomUUID()};await assert.rejects(journal.submit(other,'operator-a',async()=>{throw new Error('lost');}));
 const secondKey=journal.journal.request_key;assert.throws(()=>journal.resume(id,'operator-a'),/PENDING_ACTION_CHANGED/);assert.equal(journal.journal.request_key,secondKey);
 journal.park();assert.equal(journal.parked.length,2);journal.resume(id,'operator-a');assert.equal(journal.journal.request_key,key);
 assert.equal(journal.parked[0].request_key,secondKey);
});
test('malformed or message-bearing archive metadata fails closed without dispatch',async()=>{
 const originalStore=storage(),original=new ActionJournal(originalStore,'triage');await assert.rejects(original.submit(triage(),'operator',async()=>{throw new Error('lost');}));
 const item={...original.journal};
 for(const archived of [[{...item,customer_message:'Must never persist'}],[{...item,actor_id:'x'.repeat(121)}],[{...item,status:'PAID'}],[{...item,outcome:'confirmed'}],[item,item],{},[{...item,hash:'invalid'}]]){
  const store=storage();store.setItem(original.archiveKey,JSON.stringify(archived));const journal=new ActionJournal(store,'triage');assert.equal(journal.storageError,true);
  await assert.rejects(journal.submit({...triage(),brief_id:crypto.randomUUID()},'operator',()=>assert.fail()),/STORAGE_UNAVAILABLE/);
 }
 const store=storage();store.setItem(original.key,JSON.stringify(item));store.setItem(original.archiveKey,JSON.stringify([{...item,request_key:crypto.randomUUID()}]));
 assert.equal(new ActionJournal(store,'triage').storageError,true);
});
