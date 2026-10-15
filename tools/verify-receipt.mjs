import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
await mkdir('.local/verification',{recursive:true});await mkdir('docs/evidence',{recursive:true});
const files=[];async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.name==='node_modules'||entry.name==='dist'||entry.name.startsWith('.'))continue;const path=dir+'/'+entry.name;if(entry.isDirectory())await walk(path);else if(/\.(ts|mjs|js|html|css|json|jsonc|toml|sql)$/.test(path))files.push(path);}}
for(const dir of ['studio','tools','tests','workers/api','workers/revenueops'])await walk(dir);
files.push('package.json','wrangler.json','index.html','.gitignore');files.sort();const digest=createHash('sha256');
for(const file of files)digest.update(file+'\0'+createHash('sha256').update(await readFile(file)).digest('hex')+'\n');
const tasks=[
 ['root-check','npm',['run','check']],['api-typecheck','npm',['run','typecheck:api']],['api-bundle','npm',['run','build:api']],
 ['publishing-sqlite',process.execPath,['--test','--test-reporter=tap','tests/publishing.test.mjs']],
 ['publishing-workerd-d1',process.execPath,['--test','--test-reporter=tap','tests/publishing-workerd.mjs']],
 ['public-build','npm',['run','build']],['public-exposure',process.execPath,['--test','--test-reporter=tap','tests/static.test.mjs']],
 ['ops-check','npm',['--prefix','workers/revenueops','run','check']],
 ['ops-unit','npm',['--prefix','workers/revenueops','test','--','--test-reporter=tap']],
 ['ops-typecheck','npm',['--prefix','workers/revenueops','run','typecheck']],['ops-dry-build','npm',['--prefix','workers/revenueops','run','build']],
 ['ops-workerd','npm',['--prefix','workers/revenueops','run','test:worker','--','--test-reporter=tap']]
];
const receipt={checkedAt:new Date().toISOString(),scope:'LOCAL_ONLY',sourceDigestSha256:digest.digest('hex'),sourceFiles:files,node:process.version,commands:[],deployment:'NOT_PERFORMED',aiCalls:0,socialPosts:0,remoteMigrations:0};
for(const [name,cmd,args]of tasks){const start=new Date().toISOString();const result=spawnSync(cmd,args,{encoding:'utf8',timeout:60000,env:{...process.env,WRANGLER_SEND_METRICS:'false'}});const output=(result.stdout||'')+(result.stderr||'');await writeFile('.local/verification/'+name+'.txt',output);const row={name,command:[cmd,...args].join(' '),startedAt:start,endedAt:new Date().toISOString(),exitCode:result.status,tests:null,pass:null,fail:null,cancelled:null,skipped:null,todo:null,log:'.local/verification/'+name+'.txt'};
 for(const key of ['tests','pass','fail','cancelled','skipped','todo']){const match=output.match(new RegExp('^(?:#|ℹ) '+key+' (\\d+)','m'));if(match)row[key]=Number(match[1]);}
 receipt.commands.push(row);console.log(JSON.stringify(row));if(result.status!==0){console.error(output);break;}}
await writeFile('docs/evidence/verification.json',JSON.stringify(receipt,null,2)+'\n');
if(receipt.commands.length!==tasks.length||receipt.commands.some(r=>r.exitCode!==0))process.exit(1);
