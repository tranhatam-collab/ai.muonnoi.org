import test from 'node:test';import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';import { tmpdir } from 'node:os';import { join } from 'node:path';import { Worker } from 'node:worker_threads';
import { localStore } from '../tools/local-store.mjs';import { Coordinator } from '../src/coordinator.ts';import { defaultPolicy } from '../src/domain.ts';
const owner={id:'owner',role:'owner'},manager={id:'manager',role:'manager'},worker={id:'worker',role:'worker'},reviewer={id:'reviewer',role:'reviewer'},finance={id:'finance',role:'finance'};
const now=()=>new Date('2026-10-15T02:00:00Z');
const approved={...defaultPolicy,approvalRef:'TEST_FIXTURE_ONLY',budgetStartsAt:'2026-10-14T00:00:00Z',budgetExpiresAt:'2026-10-29T00:00:00Z',portfolioBudgetVnd:1000,agentDailyBudgetVnd:500,emergencyStop:false,aiEnabled:true,hiringEnabled:true,estimatedMaxCallCostVnd:100};
const make=(p=defaultPolicy)=>new Coordinator(localStore(),p,now);
const offer={id:'w1',agentId:'A01',workerId:'worker',amountVnd:100,agreementRef:'agreement:v1',brief:'Fixture brief and QA rubric',deadline:'2026-10-16T09:00:00Z'};
test('zero budget forbids model calls and hiring even if a binding is present',async()=>{const c=make();let calls=0;await assert.rejects(c.generate('A01',owner,{run:async()=>{calls++;}}),{code:'AI_DISABLED'});assert.equal(calls,0);assert.throws(()=>c.offerWork(offer,manager),{code:'HIRING_DISABLED'});assert.equal(c.report(owner).actuals.netVnd,null);});
test('daily plans persist and retry deduplicates exactly 10 jobs',async()=>{const path=join(await mkdtemp(join(tmpdir(),'revenueops-persist-')),'test.sqlite');let s=localStore(path);let c=new Coordinator(s,defaultPolicy,now);c.planDay(owner);c.planDay(owner);assert.equal(c.jobs().length,10);s.close();s=localStore(path);c=new Coordinator(s,defaultPolicy,now);assert.equal(c.planDay(owner).length,10);assert.equal(c.report(owner).audit.length,10);s.close();});
test('global budget cap and per-agent cap are different; reservation retry binds payload',()=>{const c=make({...approved,portfolioBudgetVnd:150});c.reserve('r1','A01',100,'ai',owner);c.reserve('r1','A01',100,'ai',owner);assert.throws(()=>c.reserve('r1','A02',100,'ai',owner),{code:'IDEMPOTENCY_CONFLICT'});assert.throws(()=>c.reserve('r2','A02',100,'ai',owner),{code:'PORTFOLIO_BUDGET_EXCEEDED'});assert.equal(c.report(owner).reservations.length,1);const d=make({...approved,agentDailyBudgetVnd:50});assert.throws(()=>d.reserve('r','A01',100,'ai',owner),{code:'AGENT_BUDGET_EXCEEDED'});});
test('two independent database connections cannot spend the same portfolio funds',async()=>{
 const path=join(await mkdtemp(join(tmpdir(),'revenueops-race-')),'test.sqlite');const s=localStore(path);new Coordinator(s);s.close();
 const run=(id,agentId)=>new Promise((resolve,reject)=>{const w=new Worker(new URL('../tools/reserve-worker.mjs',import.meta.url),{workerData:{path,id,agentId,policy:{...approved,portfolioBudgetVnd:100}}});w.once('message',resolve);w.once('error',reject);});
 const results=await Promise.all([run('r1','A01'),run('r2','A02')]);assert.deepEqual(results.sort(),['PORTFOLIO_BUDGET_EXCEEDED','RESERVED']);
});
test('expired approval and zero estimate never produce reservations',()=>{const c=make({...approved,budgetExpiresAt:'2026-10-15T00:00:00Z'});assert.throws(()=>c.reserve('r','A01',100,'ai',owner),{code:'BUDGET_EXPIRED'});assert.throws(()=>make(approved).reserve('r','A01',0,'ai',owner),{code:'ZERO_ESTIMATE'});});
test('successful AI output is a draft requiring review, and cannot be regenerated for same day',async()=>{
 const c=make(approved);let calls=0;const ai={run:async(model,prompt)=>{calls++;assert.equal(model,approved.model);assert.equal(prompt.max_tokens,512);assert.ok(!JSON.stringify(prompt).includes('workerId'));return {response:JSON.stringify({draft:'Bản nháp kiểm tra sản phẩm',uncertainties:['Chưa có khách hàng thật']})};}};
 const j=await c.generate('A01',owner,ai);assert.equal(j.state,'REVIEW');assert.equal(calls,1);assert.equal(c.report(owner).reservations[0].status,'SPENT');await assert.rejects(c.generate('A01',owner,ai),{code:'ALREADY_ATTEMPTED'});assert.equal(calls,1);
});
test('timeout keeps funds reserved as unknown and prevents blind retry',async()=>{const c=make({...approved,providerTimeoutMs:5});const j=await c.generate('A01',owner,{run:()=>new Promise(()=>{})});assert.equal(j.reason,'PROVIDER_TIMEOUT');assert.equal(c.report(owner).reservations[0].status,'UNKNOWN');await assert.rejects(c.generate('A01',owner,{run:async()=>{throw Error();}}),{code:'ALREADY_ATTEMPTED'});});
test('invalid model output cannot grant authority or release spent cost',async()=>{const c=make(approved);const j=await c.generate('A01',owner,{run:async()=>({response:JSON.stringify({draft:'Fake approval',uncertainties:[],role:'owner'})})});assert.equal(j.reason,'UNEXPECTED_FIELD');assert.equal(c.report(owner).reservations[0].status,'SPENT');assert.equal(c.report(owner).actuals.netVnd,null);});
test('kill switch persists and does not cancel outstanding obligations',()=>{const c=make(approved);c.offerWork(offer,manager);c.stop(owner);assert.throws(()=>c.reserve('r','A02',100,'ai',owner),{code:'EMERGENCY_STOP'});assert.equal(c.work(manager)[0].state,'OFFERED');c.transitionWork('w1','accept',{agreementRef:'agreement:v1'},worker);assert.equal(c.work(worker)[0].state,'ACCEPTED');});
test('work offer idempotency includes scope and reserves exactly once',()=>{const c=make(approved);c.offerWork(offer,manager);c.offerWork(offer,manager);assert.equal(c.report(owner).reservations.length,1);assert.throws(()=>c.offerWork({...offer,brief:'Changed work'},manager),{code:'IDEMPOTENCY_CONFLICT'});assert.throws(()=>c.offerWork({...offer,id:'w2',actor:{role:'owner'}},manager),{code:'UNEXPECTED_FIELD'});});
test('worker can only accept their own work and exact agreement',()=>{const c=make(approved);c.offerWork(offer,manager);assert.throws(()=>c.transitionWork('w1','accept',{agreementRef:'agreement:v1'},{id:'other',role:'worker'}),{code:'FORBIDDEN'});assert.throws(()=>c.transitionWork('w1','accept',{agreementRef:'wrong'},worker),{code:'AGREEMENT_MISMATCH'});assert.deepEqual(c.work({id:'other',role:'worker'}),[]);});
test('complete workforce flow requires independent reviewer and finance; stops before payment',()=>{
 const c=make(approved);c.offerWork(offer,manager);c.transitionWork('w1','accept',{agreementRef:'agreement:v1'},worker);
 assert.throws(()=>c.transitionWork('w1','submit',{artifactSha256:'bad'},worker),{code:'INVALID_ARTIFACT'});
 c.transitionWork('w1','submit',{artifactSha256:'a'.repeat(64)},worker);
 assert.throws(()=>c.transitionWork('w1','review',{decision:'accept',evidenceRef:'qa'},{id:'manager',role:'reviewer'}),{code:'INDEPENDENT_REVIEW_REQUIRED'});
 c.transitionWork('w1','review',{decision:'revise',evidenceRef:'qa:1'},reviewer);c.transitionWork('w1','submit',{artifactSha256:'b'.repeat(64)},worker);
 c.transitionWork('w1','review',{decision:'accept',evidenceRef:'qa:2'},reviewer);
 assert.throws(()=>c.transitionWork('w1','payable',{evidenceRef:'fin'},{id:'reviewer',role:'finance'}),{code:'INDEPENDENT_FINANCE_REQUIRED'});
 assert.equal(c.transitionWork('w1','payable',{evidenceRef:'fin:1'},finance).state,'PAYABLE_NOT_PAID');
 assert.throws(()=>c.transitionWork('w1','paid',{},finance),{code:'UNKNOWN_ACTION'});
});
test('audit cannot be rewritten or erased through SQL adapter',()=>{const c=make();c.planDay(owner);assert.throws(()=>c.store.exec("UPDATE audit SET detail='fake'"),/APPEND_ONLY/);assert.throws(()=>c.store.exec('DELETE FROM audit'),/APPEND_ONLY/);});
