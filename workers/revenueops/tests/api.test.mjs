import test from 'node:test';import assert from 'node:assert/strict';
import { route,command } from '../src/api.ts';import { authenticate } from '../src/auth.ts';
import { localStore } from '../tools/local-store.mjs';import { Coordinator } from '../src/coordinator.ts';
const owner={id:'owner',role:'owner'};const c=new Coordinator(localStore());
const services={authenticate:async()=>owner,dispatch:async(name,data,actor)=>command(c,name,data,actor),assets:async()=>new Response('<h1>Fixture shell</h1>')};
const req=(path,body,origin='https://revenue.example')=>new Request('https://revenue.example'+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json','Origin':origin},body:JSON.stringify(body)});
test('public catalog is locked, original A01 price cannot be overridden',async()=>{const r=await route(req('/api/catalog'),services);const data=await r.json();assert.equal(data.products[0].priceVnd,149000);assert.equal(data.checkoutEnabled,false);assert.equal((await route(req('/api/checkout',{priceVnd:1}),services)).status,423);});
test('protected report requires signed identity, not role-bearing headers or body',async()=>{
 const locked={...services,authenticate:r=>authenticate(r,{issuer:'https://test.cloudflareaccess.com',audience:'test',rolesJson:'{}'})};
 const r=await route(new Request('https://revenue.example/api/report',{headers:{'X-Role':'owner','X-Email':'owner@example.test'}}),locked);assert.equal(r.status,401);
 const forged=await route(req('/api/run-daily',{actor:{id:'owner',role:'owner'}}),services);assert.equal(forged.status,400);
});
test('cross-origin POST and oversized/malformed JSON fail before mutation',async()=>{
 assert.equal((await route(req('/api/run-daily',{},'https://attacker.example'),services)).status,403);
 assert.equal((await route(req('/api/run-daily',{x:'x'.repeat(17000)}),services)).status,413);
 const bad=new Request('https://revenue.example/api/run-daily',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://revenue.example'},body:'{invalid'});assert.equal((await route(bad,services)).status,400);
});
test('report -> create plans -> read exactly 10 plans, AI remains disabled',async()=>{
 assert.equal((await(await route(req('/api/report'),services)).json()).actuals.netVnd,null);
 const response=await route(req('/api/run-daily',{}),services);assert.equal(response.status,200);assert.equal((await response.json()).length,10);
 const report=await(await route(req('/api/report'),services)).json();assert.equal(report.jobs.length,10);assert.equal(report.policy.aiEnabled,false);
 assert.equal((await route(req('/api/generate',{agentId:'A01'}),services)).status,423);
});
test('public asset routes never expose private source, paid products, env or SQLite',async()=>{
 for(const path of ['/private/products/A01.html','/.env','/.local/revenueops.sqlite','/config/policy.json','/src/worker.ts','/docs/evidence/intake.json'])assert.equal((await route(req(path),services)).status,404);
 const r=await route(req('/console'),services);assert.equal(r.status,200);assert.ok(r.headers.get('Content-Security-Policy').includes("frame-ancestors 'none'"));assert.equal(r.headers.get('Cache-Control'),'no-store');
});
test('worker identity cannot access finance report or plan day',async()=>{
 const restricted={...services,authenticate:async()=>({id:'worker',role:'worker'})};assert.equal((await route(req('/api/report'),restricted)).status,403);assert.equal((await route(req('/api/run-daily',{}),restricted)).status,403);
});
