import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm,mkdir,symlink,link,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {renderPilotDelivery,writePilotDelivery,verifyPilotDelivery,sha256} from '../tools/pilot-delivery.mjs';

const sources=await Promise.all(['operations/data/pilot-sample.json','operations/data/pilot-commercial-workbook.json','operations/pilot-sample.md'].map(path=>readFile(new URL('../'+path,import.meta.url),'utf8')));
const provenance={head:'1234567890123456789012345678901234567890',working_tree:'CLEAN'};
const render=()=>renderPilotDelivery(sources,provenance);
function withSource(change){
  const sample=JSON.parse(sources[0]),workbook=JSON.parse(sources[1]);change(sample,workbook);
  return [JSON.stringify(sample),JSON.stringify(workbook),sources[2]];
}
async function fixture(t){
  const parent=await mkdtemp(join(tmpdir(),'muonnoi-pilot-test-'));
  t.after(()=>rm(parent,{recursive:true,force:true}));
  const bundle=render();const directory=await writePilotDelivery(parent,bundle);
  return {parent,bundle,directory,digest:bundle.manifestSha256};
}

test('complete fictional delivery is deterministic and does not create real outcomes',()=>{
  const bundle=render();assert.deepEqual(bundle,render());assert.equal(Object.keys(bundle.files).length,20);
  const scope=JSON.parse(bundle.files['scope.json']);
  assert.equal(scope.mapping.length,12);assert.equal(new Set(scope.mapping.map(row=>row.scope_id)).size,12);
  assert.deepEqual(scope.mapping.map(row=>row.scope_id).sort(),scope.scope.asset_ids.toSorted());
  const sample=JSON.parse(sources[0]);
  for(const row of scope.mapping)assert.ok(bundle.files[row.path].includes(sample.assets.find(asset=>asset.id===row.sample_id).content));
  const manifest=JSON.parse(bundle.files['manifest.json']);
  assert.equal(manifest.delivery_receipt,null);assert.equal(manifest.acceptance_receipt,null);assert.equal(manifest.reconciled_cash_vnd,null);
  assert.equal(JSON.parse(bundle.files['acceptance.json']).status,'NOT_REVIEWED');
  assert.ok(JSON.parse(bundle.files['review.json']).assets.every(row=>row.review_status==='PENDING'&&row.approval_receipt===null&&row.publication_receipt===null));
  for(const [key,value]of Object.entries(JSON.parse(bundle.files['metrics.json'])))if(key!=='source_status')assert.equal(value,null);
  assert.equal(bundle.files['calendar.csv'].trimEnd().split('\r\n').length,15);
});

test('source and worktree changes invalidate the independently retained digest',()=>{
  const clean=render();
  const dirty=renderPilotDelivery(sources,{...provenance,working_tree:'DIRTY'});
  const changed=renderPilotDelivery(withSource(sample=>sample.assets[0].content+='\nBản sửa minh họa.'),provenance);
  assert.notEqual(clean.manifestSha256,dirty.manifestSha256);assert.notEqual(clean.manifestSha256,changed.manifestSha256);
  assert.throws(()=>renderPilotDelivery(sources,{head:'unknown',working_tree:'CLEAN'}),/SOURCE_PROVENANCE_REQUIRED/);
});

test('refuses non-fictional, approved, published, paid or pre-accepted records',()=>{
  for(const change of [
    s=>s.fictional=false,s=>s.assets[0].approved_at='2026-10-17',s=>s.assets[0].publication_receipt='receipt',
    s=>s.metrics.reconciled_cash_vnd=0,s=>s.metrics.accepted_orders=1,
    (s,w)=>w.record_templates.acceptance.acceptance_ref='receipt',
    (s,w)=>w.record_templates.acceptance.manifest_ref='old-manifest',
    (s,w)=>w.record_templates.acceptance.verification_refs=['old-review']
  ])assert.throws(()=>renderPilotDelivery(withSource(change),provenance));
});

test('refuses unknown claims, duplicate drafts and incomplete scope or calendar',()=>{
  for(const change of [
    s=>s.assets[0].claims=['NO_SOURCE'],s=>s.assets[1].id=s.assets[0].id,s=>s.assets[0].format='finished_video',
    s=>s.calendar[1].asset_id=s.calendar[0].asset_id,s=>s.calendar[0].asset_id=null,
    s=>s.calendar[0].asset_id='',s=>s.calendar[0].day=2,
    (s,w)=>w.offer_scopes.find(row=>row.offer_id==='studio-pilot-14d').asset_ids.pop()
  ])assert.throws(()=>renderPilotDelivery(withSource(change),provenance));
});

test('calendar escapes spreadsheet formulae and embedded quotes',()=>{
  const bundle=renderPilotDelivery(withSource(sample=>sample.calendar[0].review_requirement=' =HYPERLINK("untrusted","click")'),provenance);
  assert.ok(bundle.files['calendar.csv'].includes('"\' =HYPERLINK(""untrusted"",""click"")"'));
});

test('writes a separate snapshot each time and verifies all twenty files',async t=>{
  const {parent,bundle,directory,digest}=await fixture(t);const second=await writePilotDelivery(parent,bundle);
  assert.notEqual(directory,second);
  const result=await verifyPilotDelivery(directory,digest);
  assert.equal(result.status,'VERIFIED_LOCAL_INTEGRITY_ONLY');assert.equal(result.files,20);assert.equal(result.assets,12);
  assert.equal(result.delivery_receipt,null);assert.equal(result.reconciled_cash_vnd,null);
  assert.deepEqual(result,await verifyPilotDelivery(second,digest));
});

test('requires an independent digest and rejects changed manifest bytes',async t=>{
  const {directory,digest}=await fixture(t);
  await assert.rejects(verifyPilotDelivery(directory),/TRUSTED_MANIFEST_DIGEST_REQUIRED/);
  await assert.rejects(verifyPilotDelivery(directory,'0'.repeat(64)),/MANIFEST_DIGEST_MISMATCH/);
  const path=join(directory,'manifest.json');await writeFile(path,(await readFile(path,'utf8'))+' ');
  await assert.rejects(verifyPilotDelivery(directory,digest),/MANIFEST_DIGEST_MISMATCH/);
});

test('rejects a same-size content edit that preserves filenames and manifest',async t=>{
  const {directory,digest}=await fixture(t);const path=join(directory,'drafts/MG01.md');
  const bytes=await readFile(path);bytes[0]=bytes[0]===35?36:35;await writeFile(path,bytes);
  await assert.rejects(verifyPilotDelivery(directory,digest),/ARTIFACT_DIGEST_MISMATCH/);
});

test('rejects missing content',async t=>{
  const {directory,digest}=await fixture(t);await rm(join(directory,'drafts/MG01.md'));
  await assert.rejects(verifyPilotDelivery(directory,digest),/MISSING_ARTIFACT_FILE/);
});

test('rejects unlisted files',async t=>{
  const {directory,digest}=await fixture(t);await writeFile(join(directory,'extra.txt'),'unreviewed');
  await assert.rejects(verifyPilotDelivery(directory,digest),/EXTRA_ARTIFACT_FILE/);
});

test('rejects unlisted directories even when empty',async t=>{
  const {directory,digest}=await fixture(t);await mkdir(join(directory,'unreviewed'));
  await assert.rejects(verifyPilotDelivery(directory,digest),/EXTRA_ARTIFACT_DIRECTORY/);
});

test('rejects symbolic links instead of reading another file or directory',async t=>{
  const {parent,directory,digest}=await fixture(t);const path=join(directory,'drafts/MG01.md');
  await rm(path);await symlink(join(directory,'drafts/MG02.md'),path);
  await assert.rejects(verifyPilotDelivery(directory,digest),/SYMLINK_NOT_ALLOWED/);
  const alias=join(parent,'alias');await symlink(directory,alias);
  await assert.rejects(verifyPilotDelivery(alias,digest),/ARTIFACT_DIRECTORY_REQUIRED/);
});

test('rejects hard-linked payloads that could change through another name',async t=>{
  const {parent,directory,digest}=await fixture(t);
  await link(join(directory,'drafts/MG01.md'),join(parent,'other-name.md'));
  await assert.rejects(verifyPilotDelivery(directory,digest),/ARTIFACT_SIZE_OR_TYPE_MISMATCH/);
});

test('rejects unsafe or duplicate paths even with a newly supplied manifest digest',async t=>{
  const {directory,bundle}=await fixture(t);
  for(const path of ['../outside','/tmp/outside','drafts/../../outside','drafts//extra','drafts/./extra','drafts\\extra','manifest.json','acceptance.json']){
    const manifest=JSON.parse(bundle.files['manifest.json']);manifest.files[0].path=path;
    const text=JSON.stringify(manifest);await writeFile(join(directory,'manifest.json'),text);
    await assert.rejects(verifyPilotDelivery(directory,sha256(text)),/INVALID_MANIFEST_ENTRY/);
  }
});

test('rejects incompatible counts and real-world outcomes in manifest',async t=>{
  const {directory,bundle}=await fixture(t);
  for(const change of [m=>m.asset_count=13,m=>m.calendar_days=30,m=>m.fictional=false,m=>m.delivery_receipt='sent',m=>m.reconciled_cash_vnd=0]){
    const manifest=JSON.parse(bundle.files['manifest.json']);change(manifest);
    const text=JSON.stringify(manifest);await writeFile(join(directory,'manifest.json'),text);
    await assert.rejects(verifyPilotDelivery(directory,sha256(text)),/INVALID_DEMO_MANIFEST/);
  }
});

test('a separate copied snapshot can be restored and verified without changing the original',async t=>{
  const {parent,directory,digest}=await fixture(t);const restored=join(parent,'restored');
  await cp(directory,restored,{recursive:true,errorOnExist:true,force:false});
  assert.deepEqual(await verifyPilotDelivery(restored,digest),await verifyPilotDelivery(directory,digest));
  await writeFile(join(restored,'metrics.json'),'{}');
  await assert.rejects(verifyPilotDelivery(restored,digest),/ARTIFACT_SIZE_OR_TYPE_MISMATCH/);
  assert.equal((await verifyPilotDelivery(directory,digest)).files,20);
});
