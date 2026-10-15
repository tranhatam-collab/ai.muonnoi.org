import test from 'node:test';
import assert from 'node:assert/strict';
import { agents,portfolioScenario,scenario,vietnamDay,validateDay,money,scoreFinance,portfolioScore,attributeReceipts,expansionAllowance } from '../src/domain.ts';
const sources=Object.fromEntries(['bank','fees','costs','refunds','reserves','allocation'].map(k=>[k,{complete:true,reference:'fixture:'+k}]));
function input(id='A01',net=1000000){return {agentId:id,day:'2026-10-15',receiptsVnd:net+100,feesVnd:100,costsVnd:0,refundsVnd:0,reserveIncreaseVnd:0,reserveReleaseVnd:0,sources};}
test('10 separate targets total 55 million; base assumptions independently reproduce report',()=>{
 assert.equal(agents.length,10);assert.equal(agents.reduce((n,a)=>n+a.targetVnd,0),55000000);
 const s=portfolioScenario();assert.deepEqual([s.orders,s.grossVnd,s.variableVnd,s.fixedVnd,s.netVnd,s.qaHours],[59,131803000,65662750,2750000,63390250,25.2]);
 assert.deepEqual(s.rows.map(a=>a.orders),[11,9,7,6,6,5,5,4,3,3]);assert.equal(s.evidence,'SCENARIO_ONLY');
});
test('downside keeps whole orders and applies all fixed costs',()=>{const s=portfolioScenario(.5,-1000);assert.equal(s.orders,26);assert.equal(s.netVnd,18821300);});
test('invalid scenario knobs and non-positive margins are rejected',()=>{assert.throws(()=>scenario(agents[0],NaN));assert.throws(()=>scenario(agents[0],1,9999));});
test('Vietnam calendar rolls at 17:00 UTC and rejects normalized impossible days',()=>{assert.equal(vietnamDay(new Date('2026-10-14T17:00:00Z')),'2026-10-15');assert.equal(vietnamDay(new Date('2026-10-14T16:59:59Z')),'2026-10-14');for(const d of ['2026-02-30','2026-99-99','15-10-2026'])assert.throws(()=>validateDay(d));});
test('monetary values require safe integer VND',()=>{for(const x of [-1,.5,NaN,Infinity,'100',Number.MAX_SAFE_INTEGER+1])assert.throws(()=>money(x));});
test('every missing evidence source leaves score and net unknown, never zero',()=>{
 assert.equal(scoreFinance().netVnd,null);
 for(const k of Object.keys(sources)){const i=input();i.sources={...sources,[k]:{complete:false,reference:'fixture'}};assert.equal(scoreFinance(i).score,null);}
});
test('net deducts fees, costs, refunds and reserve changes; scores never round to a hit',()=>{
 const i=input('A01',1000000);Object.assign(i,{costsVnd:100,refundsVnd:200,reserveIncreaseVnd:300,reserveReleaseVnd:100});
 assert.equal(scoreFinance(i).netVnd,999500);assert.equal(scoreFinance(i).state,'MISS');assert.ok(scoreFinance(i).score<100);
 assert.equal(scoreFinance(input('A01',2000000)).score,100);assert.equal(scoreFinance({...input(),receiptsVnd:0}).score,0);
});
test('portfolio hit cannot conceal individual misses; mixed day and duplicate agent rejected',()=>{
 const inputs=agents.map(a=>input(a.id,a.targetVnd));inputs[0]=input('A01',0);inputs[9]=input('A10',12000000);
 const s=portfolioScore(inputs);assert.equal(s.portfolioHit,true);assert.equal(s.allAgentsHit,false);
 assert.equal(portfolioScore(inputs.slice(1)).netVnd,null);assert.throws(()=>portfolioScore([input(),input()]));
 assert.throws(()=>portfolioScore([input(),{...input('A02'),day:'2026-10-14'}]));
});
test('one provider reference cannot be attributed twice across agents; tests and self purchases excluded',()=>{
 const r={provider:'test-provider',channel:'bank',reference:'ref1',amountVnd:100,isTest:false,selfPurchase:false,allocations:[{agentId:'A01',amountVnd:100}]};
 assert.equal(attributeReceipts([r]).A01,100);assert.throws(()=>attributeReceipts([r,{...r,allocations:[{agentId:'A02',amountVnd:100}]}]));
 assert.equal(attributeReceipts([{...r,isTest:true}]).A01,0);assert.equal(attributeReceipts([{...r,selfPurchase:true}]).A01,0);
 assert.throws(()=>attributeReceipts([{...r,amountVnd:101}]));
});
test('expansion is limited by verified surplus, approved cash and prior reservations',()=>{
 assert.equal(expansionAllowance(null,1000000,100000,100000,0),null);
 assert.equal(expansionAllowance(1500000,1000000,0,1000000,0),0);
 assert.equal(expansionAllowance(1500000,1000000,1000000,1000000,0),150000);
 assert.equal(expansionAllowance(1500000,1000000,1000000,1000000,100000),50000);
 assert.equal(expansionAllowance(900000,1000000,1000000,1000000,0),0);
});
