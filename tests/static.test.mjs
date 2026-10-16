import test from 'node:test';import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';
test('Pages output contains curated website files and excludes worker source, private plans and runtime data',async()=>{
 const manifest=JSON.parse(await readFile('.local/site-manifest.json','utf8'));
 assert.ok(manifest.files.includes('studio/index.html'));assert.ok(manifest.files.includes('assets/api.js'));assert.ok(manifest.files.includes('assets/login.js'));assert.ok(manifest.files.includes('docs/index.html'));
 assert.ok(!manifest.files.some(path=>/^(workers|tools|tests|private|\.git|\.local)\//.test(path)||(/docs\//.test(path)&&path!=='docs/index.html')));
 assert.equal(JSON.parse(await readFile('wrangler.json','utf8')).pages_build_output_dir,'dist/site');
 assert.ok(!(await readdir('dist/site')).includes('workers'));
});

test('login loads only same-origin scripts so the published CSP can execute its handlers',async()=>{
 const login=await readFile('login/index.html','utf8');
 assert.match(login,/<script src="\/assets\/login\.js"><\/script>/);
 assert.equal((login.match(/<script(?![^>]*\bsrc=)[^>]*>/g)||[]).length,0);
});
