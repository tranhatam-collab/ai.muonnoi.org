import test from 'node:test';import assert from 'node:assert/strict';
import { Miniflare } from 'miniflare';import { mkdtemp,readFile } from 'node:fs/promises';import { tmpdir } from 'node:os';import { join } from 'node:path';
test('workerd: actual Durable Object SQLite persists, deduplicates concurrent plans and keeps live actions locked',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'revenueops-workerd-'));
 const source=await readFile(new URL('../dist/worker.js',import.meta.url),'utf8');
 const opts={resourcePersistencePath:join(temp,'state'),telemetry:{enabled:false},workers:[{config:{
  name:'revenueops-test',compatibilityDate:'2026-10-15',
  manifest:{mainModule:'worker.js',modules:{'worker.js':{type:'esm',contents:source}}},
  env:{COORDINATOR:{type:'durable-object',worker:'revenueops-test',exportName:'RevenueCoordinator'}},
  exports:{RevenueCoordinator:{type:'durable-object',storage:'sqlite'}}
 }}]};
 let mf=new Miniflare(opts);
 const access=async()=>{const namespace=await mf.getDurableObjectNamespace('COORDINATOR');return namespace.get(namespace.idFromName('portfolio-v1'));};
 const call=async(name,payload={})=>{const stub=await access();return stub.fetch('https://internal',{method:'POST',body:JSON.stringify({name,payload,actor:{id:'test-owner',role:'owner'}})});};
 try {
  assert.equal((await mf.dispatchFetch('https://test/api/health')).status,200);
  assert.equal((await mf.dispatchFetch('https://test/api/report')).status,503);
  const responses=await Promise.all(Array.from({length:8},()=>call('daily')));
  for(const response of responses){assert.equal(response.status,200);assert.equal((await response.json()).length,10);}
  let report=await(await call('report')).json();assert.equal(report.jobs.length,10);assert.equal(report.actuals.netVnd,null);assert.equal(report.reservations.length,0);
  assert.equal((await call('generate',{agentId:'A01'})).status,423);
  assert.equal((await call('stop')).status,200);await mf.dispose();mf=new Miniflare(opts);
  report=await(await call('report')).json();assert.equal(report.jobs.length,10);assert.equal(report.policy.emergencyStop,true);assert.equal(report.audit.filter(e=>e.event==='EMERGENCY_STOP').length,1);
 } finally {await mf.dispose();}
});
