import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { agents,defaultPolicy,portfolioScenario } from '../src/domain.ts';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);let checked=0;
for(const dir of ['src','public','tools','tests']){
 for(const name of await readdir(new URL(dir+'/',root))){
  if(!/\.(?:ts|mjs|js)$/.test(name))continue;
  const result=spawnSync(process.execPath,['--check',fileURLToPath(new URL(dir+'/'+name,root))],{encoding:'utf8'});
  if(result.status!==0){process.stderr.write(result.stderr);process.exit(1);}checked++;
 }
}
assert.equal(agents.length,10);assert.equal(new Set(agents.map(a=>a.id)).size,10);
assert.equal(agents.reduce((s,a)=>s+a.targetVnd,0),55000000);
assert.equal(defaultPolicy.portfolioBudgetVnd,0);assert.equal(defaultPolicy.aiEnabled,false);
assert.equal(defaultPolicy.schedulerEnabled,false);assert.equal(defaultPolicy.hiringEnabled,false);
assert.equal(defaultPolicy.checkoutEnabled,false);assert.equal(defaultPolicy.publishingEnabled,false);
assert.equal(defaultPolicy.emergencyStop,true);
assert.deepEqual([portfolioScenario().orders,portfolioScenario().grossVnd,portfolioScenario().netVnd],[59,131803000,63390250]);
const config=JSON.parse(await readFile(new URL('wrangler.jsonc',root),'utf8'));
assert.equal(config.ai,undefined);assert.deepEqual(config.triggers.crons,[]);assert.equal(config.workers_dev,false);
console.log(`Syntax checked ${checked} files; 10-Agent registry and zero-budget policy validated. No network/provider calls.`);
