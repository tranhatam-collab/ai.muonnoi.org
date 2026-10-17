import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {renderPilotDelivery,writePilotDelivery,sha256} from '../tools/pilot-delivery.mjs';
import {revisePilotFromComments} from '../tools/pilot-revise.mjs';

const sources=await Promise.all(['operations/data/pilot-sample.json','operations/data/pilot-commercial-workbook.json','operations/pilot-sample.md'].map(path=>readFile(new URL('../'+path,import.meta.url),'utf8')));

async function pair(t){
  const parent=await mkdtemp(join(tmpdir(),'pilot-revise-test-'));
  t.after(()=>rm(parent,{recursive:true,force:true}));
  const baselineBundle=renderPilotDelivery(sources,{head:'a'.repeat(40),working_tree:'CLEAN'});
  const candidateBundle=renderPilotDelivery(sources,{head:'b'.repeat(40),working_tree:'CLEAN'});
  return {parent,baseline:await writePilotDelivery(parent,baselineBundle),candidate:await writePilotDelivery(parent,candidateBundle),baselineDigest:baselineBundle.manifestSha256,candidateDigest:candidateBundle.manifestSha256,output:join(parent,'out')};
}

async function retarget(directory,path,mutate){
  const full=join(directory,path);
  const next=mutate(Buffer.from(await readFile(full)));
  await writeFile(full,next);
  const manifest=JSON.parse(await readFile(join(directory,'manifest.json'),'utf8'));
  const entry=manifest.files.find(row=>row.path===path);
  entry.sha256=sha256(next);entry.bytes=Buffer.byteLength(next);
  const text=JSON.stringify(manifest,null,2)+'\n';
  await writeFile(join(directory,'manifest.json'),text);
  return sha256(text);
}

test('a changed draft becomes a new snapshot and the old acceptance stays byte-identical',async t=>{
  const f=await pair(t);
  const digest=await retarget(f.candidate,'drafts/MG01.md',bytes=>Buffer.concat([bytes,Buffer.from('\n')]));
  const beforeManifest=await readFile(join(f.baseline,'manifest.json'));
  const beforeAcceptance=await readFile(join(f.baseline,'acceptance.json'));
  const result=await revisePilotFromComments(f.baseline,f.baselineDigest,f.candidate,digest,f.output);
  assert.equal(result.status,'REVISION_REQUIRES_REVIEW');
  assert.equal(result.acceptance_created,false);
  assert.deepEqual(result.revised_paths,['drafts/MG01.md']);
  assert.deepEqual(result.recompare_byte_changed,['P-C01']);
  assert.equal(result.recompare_status,'REVIEW_COMMENTS_ONLY');
  assert.deepEqual(await readFile(join(f.baseline,'manifest.json')),beforeManifest);
  assert.deepEqual(await readFile(join(f.baseline,'acceptance.json')),beforeAcceptance);
  assert.deepEqual(await readFile(join(result.directory,'acceptance.json')),beforeAcceptance);
  assert.ok(Object.values(result.actuals).every(value=>value===null));
  assert.equal(JSON.stringify(result).includes('ACCEPTED'),false);
});

test('identical content does not mint a revision snapshot',async t=>{
  const f=await pair(t);
  await assert.rejects(revisePilotFromComments(f.baseline,f.baselineDigest,f.candidate,f.candidateDigest,f.output),/NO_BYTE_CHANGE_TO_REVISE/);
  await assert.rejects(readdir(f.output));
});

test('acceptance drift is refused before any new snapshot is written',async t=>{
  const f=await pair(t);
  const before=await readFile(join(f.baseline,'acceptance.json'));
  const digest=await retarget(f.candidate,'acceptance.json',bytes=>{
    const payload=JSON.parse(bytes);payload.status='ACCEPTED';payload.accepted_at='2026-10-17T16:00:00Z';
    return Buffer.from(JSON.stringify(payload,null,2)+'\n');
  });
  await assert.rejects(revisePilotFromComments(f.baseline,f.baselineDigest,f.candidate,digest,f.output),/ACCEPTANCE_DRIFT_NOT_A_REVIEW/);
  assert.deepEqual(await readFile(join(f.baseline,'acceptance.json')),before);
  await assert.rejects(readdir(f.output));
});

test('a scope byte change is carried forward without remapping asset codes',async t=>{
  const f=await pair(t);
  const digest=await retarget(f.candidate,'scope.json',bytes=>{
    const payload=JSON.parse(bytes);payload.scope.proposed_price_vnd=payload.scope.proposed_price_vnd;
    payload.note='fictional-byte';
    return Buffer.from(JSON.stringify(payload,null,2)+'\n');
  });
  const result=await revisePilotFromComments(f.baseline,f.baselineDigest,f.candidate,digest,f.output);
  assert.deepEqual(result.revised_paths,['scope.json']);
  assert.deepEqual(result.recompare_byte_changed,[]);
  const revised=JSON.parse(await readFile(join(result.directory,'scope.json'),'utf8'));
  assert.equal(revised.mapping[0].scope_id,'P-C01');
  assert.equal(revised.note,'fictional-byte');
});
