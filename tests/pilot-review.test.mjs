import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {renderPilotDelivery,writePilotDelivery,sha256} from '../tools/pilot-delivery.mjs';
import {comparePilotVersions} from '../tools/pilot-review.mjs';

const sources=await Promise.all(['operations/data/pilot-sample.json','operations/data/pilot-commercial-workbook.json','operations/pilot-sample.md'].map(path=>readFile(new URL('../'+path,import.meta.url),'utf8')));

async function pair(t){
  const parent=await mkdtemp(join(tmpdir(),'pilot-review-test-'));
  t.after(()=>rm(parent,{recursive:true,force:true}));
  const baselineBundle=renderPilotDelivery(sources,{head:'a'.repeat(40),working_tree:'CLEAN'});
  const candidateBundle=renderPilotDelivery(sources,{head:'b'.repeat(40),working_tree:'CLEAN'});
  const baseline=await writePilotDelivery(parent,baselineBundle);
  const candidate=await writePilotDelivery(parent,candidateBundle);
  return {parent,baseline,candidate,baselineDigest:baselineBundle.manifestSha256,candidateDigest:candidateBundle.manifestSha256};
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

test('identical content across two versions emits sixteen pending comments and no acceptance',async t=>{
  const f=await pair(t);
  const before=await readFile(join(f.candidate,'acceptance.json'));
  const baselineManifest=await readFile(join(f.baseline,'manifest.json'));
  const result=await comparePilotVersions(f.baseline,f.baselineDigest,f.candidate,f.candidateDigest);
  assert.equal(result.status,'REVIEW_COMMENTS_ONLY');
  assert.equal(result.review_gate,'REVIEW_REQUIRED');
  assert.equal(result.acceptance_created,false);
  assert.equal(result.responses.length,16);
  assert.equal(result.responses.filter(row=>row.path.startsWith('drafts/')).length,12);
  assert.ok(result.responses.every(row=>row.change==='UNCHANGED'&&row.response_code==='FICTIONAL_NOTE_UNCHANGED_STILL_PENDING'&&row.approval_receipt===null&&row.acceptance_ref===null&&row.publication_receipt===null));
  assert.ok(Object.values(result.actuals).every(value=>value===null));
  assert.equal(result.external_actions,0);
  assert.equal(JSON.stringify(result).includes('ACCEPTED'),false);
  assert.deepEqual(await readFile(join(f.candidate,'acceptance.json')),before);
  assert.deepEqual(await readFile(join(f.baseline,'manifest.json')),baselineManifest);
});

test('a changed draft is commented by asset code and does not accept either snapshot',async t=>{
  const f=await pair(t);
  const digest=await retarget(f.candidate,'drafts/MG01.md',bytes=>Buffer.concat([bytes,Buffer.from('\n')]));
  const baselineAcceptance=await readFile(join(f.baseline,'acceptance.json'));
  const candidateAcceptance=await readFile(join(f.candidate,'acceptance.json'));
  const result=await comparePilotVersions(f.baseline,f.baselineDigest,f.candidate,digest);
  const changed=result.responses.filter(row=>row.change==='BYTE_CHANGED');
  assert.deepEqual(changed.map(row=>row.deliverable_id),['P-C01']);
  assert.equal(changed[0].path,'drafts/MG01.md');
  assert.equal(changed[0].response_code,'FICTIONAL_NOTE_BYTES_CHANGED_REREVIEW');
  assert.equal(result.responses.filter(row=>row.change==='UNCHANGED').length,15);
  assert.equal(result.acceptance_created,false);
  assert.deepEqual(await readFile(join(f.baseline,'acceptance.json')),baselineAcceptance);
  assert.deepEqual(await readFile(join(f.candidate,'acceptance.json')),candidateAcceptance);
});

test('acceptance drift is refused and is not turned into a review comment',async t=>{
  const f=await pair(t);
  const digest=await retarget(f.candidate,'acceptance.json',bytes=>{
    const payload=JSON.parse(bytes);payload.status='ACCEPTED';payload.accepted_at='2026-10-17T12:00:00Z';
    return Buffer.from(JSON.stringify(payload,null,2)+'\n');
  });
  await assert.rejects(comparePilotVersions(f.baseline,f.baselineDigest,f.candidate,digest),/ACCEPTANCE_DRIFT_NOT_A_REVIEW|BLANK_ACCEPTANCE_REQUIRED/);
});

test('a forged approval inside review.json is refused',async t=>{
  const f=await pair(t);
  const digest=await retarget(f.candidate,'review.json',bytes=>{
    const payload=JSON.parse(bytes);payload.assets[0].approval_receipt='DEMO-APPROVED';
    return Buffer.from(JSON.stringify(payload,null,2)+'\n');
  });
  await assert.rejects(comparePilotVersions(f.baseline,f.baselineDigest,f.candidate,digest),/REVIEW_STATE_NOT_PENDING/);
});

test('remapping an asset code is refused instead of commenting on the wrong code',async t=>{
  const f=await pair(t);
  const digest=await retarget(f.candidate,'scope.json',bytes=>{
    const payload=JSON.parse(bytes);payload.mapping[0].scope_id='P-C99';
    return Buffer.from(JSON.stringify(payload,null,2)+'\n');
  });
  await assert.rejects(comparePilotVersions(f.baseline,f.baselineDigest,f.candidate,digest),/SCOPE_IDENTITY_CHANGED/);
});

test('metrics drift cannot be recorded as a reviewed outcome',async t=>{
  const f=await pair(t);
  const digest=await retarget(f.candidate,'metrics.json',bytes=>{
    const payload=JSON.parse(bytes);payload.reconciled_cash_vnd=0;
    return Buffer.from(JSON.stringify(payload,null,2)+'\n');
  });
  await assert.rejects(comparePilotVersions(f.baseline,f.baselineDigest,f.candidate,digest),/METRICS_DRIFT_NOT_A_REVIEW|ACTUALS_NOT_ALLOWED/);
});

test('does not copy a snapshot into the other version',async t=>{
  const f=await pair(t);
  const baselineManifest=await readFile(join(f.baseline,'manifest.json'));
  await cp(f.candidate,join(f.parent,'untouched-check'),{recursive:true});
  await comparePilotVersions(f.baseline,f.baselineDigest,f.candidate,f.candidateDigest);
  assert.deepEqual(await readFile(join(f.baseline,'manifest.json')),baselineManifest);
});
