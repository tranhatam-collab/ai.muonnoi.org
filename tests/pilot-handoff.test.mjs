import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {renderPilotDelivery,writePilotDelivery,sha256} from '../tools/pilot-delivery.mjs';
import {createPilotHandoffFixture,verifyPilotHandoff} from '../tools/pilot-handoff.mjs';

const sources=await Promise.all(['operations/data/pilot-sample.json','operations/data/pilot-commercial-workbook.json','operations/pilot-sample.md'].map(path=>readFile(new URL('../'+path,import.meta.url),'utf8')));
const workbook=JSON.parse(sources[1]);
async function fixture(t){
  const parent=await mkdtemp(join(tmpdir(),'pilot-handoff-test-'));t.after(()=>rm(parent,{recursive:true,force:true}));
  const bundle=renderPilotDelivery(sources,{head:'1'.repeat(40),working_tree:'CLEAN'});
  const directory=await writePilotDelivery(parent,bundle),digest=bundle.manifestSha256;
  const records=createPilotHandoffFixture(workbook,digest);
  return {directory,digest,records,verify:(next=records,text=sources[1],hash=digest)=>verifyPilotHandoff(directory,hash,text,next)};
}

// A deliberately replaced trusted digest tests structural checks independently of byte integrity.
async function replaceArtifact(f,path,change){
  const payload=JSON.parse(await readFile(join(f.directory,path),'utf8'));change(payload);
  const bytes=JSON.stringify(payload,null,2)+'\n';await writeFile(join(f.directory,path),bytes);
  const manifest=JSON.parse(await readFile(join(f.directory,'manifest.json'),'utf8'));
  const entry=manifest.files.find(row=>row.path===path);entry.sha256=sha256(bytes);entry.bytes=Buffer.byteLength(bytes);
  const text=JSON.stringify(manifest,null,2)+'\n';await writeFile(join(f.directory,'manifest.json'),text);
  const digest=sha256(text),records=structuredClone(f.records);records.acceptance.manifest_ref='sha256:'+digest;
  return ()=>verifyPilotHandoff(f.directory,digest,sources[1],records);
}

test('binds twelve content assets and four support documents without accepting or earning',async t=>{
  const f=await fixture(t),before=await readFile(join(f.directory,'manifest.json'));
  const result=await f.verify();assert.equal(result.status,'VERIFIED_LOCAL_LINKS_ONLY');
  assert.equal(result.review_gate,'REVIEW_REQUIRED');assert.equal(result.coverage.length,16);
  assert.equal(result.coverage.filter(row=>row.path.startsWith('drafts/')).length,12);
  assert.equal(new Set(result.coverage.map(row=>row.deliverable_id)).size,16);
  assert.ok(result.coverage.every(row=>/^[a-f0-9]{64}$/.test(row.sha256)&&row.status==='DRAFT_REQUIRES_REVIEW'));
  assert.ok(Object.values(result.actuals).every(value=>value===null));assert.equal(result.external_actions,0);
  assert.deepEqual(await readFile(join(f.directory,'manifest.json')),before);
  assert.equal(JSON.parse(await readFile(join(f.directory,'acceptance.json'))).status,'NOT_REVIEWED');
});

test('requires the independent digest and catches a same-length content edit',async t=>{
  const f=await fixture(t);await assert.rejects(f.verify(f.records,sources[1],'0'.repeat(64)),/MANIFEST_DIGEST_MISMATCH/);
  const path=join(f.directory,'drafts/MG01.md'),bytes=await readFile(path);bytes[0]=36;await writeFile(path,bytes);
  await assert.rejects(f.verify(),/ARTIFACT_DIGEST_MISMATCH/);
});

test('rejects missing deliverables before checking records',async t=>{
  const f=await fixture(t);await rm(join(f.directory,'calendar.csv'));
  await assert.rejects(f.verify(),/MISSING_ARTIFACT_FILE/);
});

test('rejects a changed workbook even if its parsed business values look the same',async t=>{
  const f=await fixture(t);await assert.rejects(f.verify(f.records,sources[1]+'\n'),/WORKBOOK_SOURCE_MISMATCH/);
});

test('rejects a receipt for a different manifest',async t=>{
  const f=await fixture(t);f.records.acceptance.manifest_ref='sha256:'+'a'.repeat(64);
  await assert.rejects(f.verify(),/ACCEPTANCE_MANIFEST_MISMATCH/);
});

test('rejects mixed proposal/order identity and version',async t=>{
  const f=await fixture(t);
  for(const [field,value,code]of [['proposal_id','DEMO-OTHER',/ORDER_PROPOSAL_LINK_MISMATCH/],['proposal_version','2.0',/SCOPE_VERSION_LINK_MISMATCH/],['scope_acceptance_ref','DEMO-OTHER',/SCOPE_VERSION_LINK_MISMATCH/]]){
    const records=structuredClone(f.records);records.order[field]=value;await assert.rejects(f.verify(records),code);
  }
});

test('rejects qualifications from a different brief or capacity assessment',async t=>{
  const f=await fixture(t);
  for(const field of ['brief_ref','capacity_check_ref','reviewer_role']){
    const records=structuredClone(f.records);records.qualification[field]='DEMO-OTHER';
    await assert.rejects(f.verify(records),/QUALIFICATION_LINK_MISMATCH/);
  }
});

test('rejects offer mismatches even with otherwise valid standalone records',async t=>{
  const f=await fixture(t);f.records.qualification.offer_id='creator-studio-monthly';
  await assert.rejects(f.verify(),/CROSS_RECORD_OFFER_MISMATCH/);
});

test('rejects mismatched amounts and currency across order and reconciliation',async t=>{
  const f=await fixture(t);
  for(const patch of [{amount_vnd:1},{currency:'USD'}]){
    const records=structuredClone(f.records);Object.assign(records.order,patch);
    await assert.rejects(f.verify(records),/ORDER_AMOUNT_LINK_MISMATCH/);
  }
});

test('matching cross-record prices still must match the snapshot scope terms',async t=>{
  const f=await fixture(t);f.records.proposal.proposed_amount_vnd=1;f.records.order.amount_vnd=1;
  f.records.reconciliation.proposed_amount_vnd=1;f.records.reconciliation.accepted_order_amount_vnd=1;
  await assert.rejects(f.verify(),/PROPOSAL_SCOPE_TERMS_MISMATCH/);
});

test('rejects a changed revision allowance or duration in the proposal',async t=>{
  const f=await fixture(t);
  for(const patch of [{revision_basis:'DEMO unlimited revisions'},{target_offset_days:1}]){
    const records=structuredClone(f.records);Object.assign(records.proposal,patch);
    await assert.rejects(f.verify(records),/PROPOSAL_SCOPE_TERMS_MISMATCH/);
  }
});

test('unreviewed package cannot inherit old review or delivery refs',async t=>{
  const f=await fixture(t);
  for(const patch of [{verification_refs:['DEMO-OLD']},{delivery_receipt_ref:'DEMO-OLD'}]){
    const records=structuredClone(f.records);Object.assign(records.acceptance,patch);
    await assert.rejects(f.verify(records),/UNREVIEWED_ARTIFACT_CANNOT_BE_ACCEPTED/);
  }
});

test('a structurally accepted record cannot approve this fictional unreviewed bundle',async t=>{
  const f=await fixture(t);Object.assign(f.records.acceptance,{status:'ACCEPTED',verification_refs:['DEMO-REVIEW'],delivery_receipt_ref:'DEMO-DELIVERY',acceptance_ref:'DEMO-ACCEPT',accepted_at:'2026-10-17T10:00:00Z'});
  await assert.rejects(f.verify(),/REVIEW_ONLY_CASE_REQUIRED/);
});

test('does not admit payment receipts or zero actuals into the pending rehearsal',async t=>{
  const f=await fixture(t);
  for(const patch of [{gross_paid_vnd:0},{other_actual_costs_vnd:0},{transaction_refs:['DEMO-TXN']},{settlement_ref:'DEMO-SETTLED'}]){
    const records=structuredClone(f.records);Object.assign(records.reconciliation,patch);
    await assert.rejects(f.verify(records),/NO_REAL_OUTCOMES_IN_HANDOFF_REHEARSAL/);
  }
});

test('rejects duplicate content mapping even under a newly supplied manifest digest',async t=>{
  const f=await fixture(t);const verify=await replaceArtifact(f,'scope.json',payload=>payload.mapping[1]=payload.mapping[0]);
  await assert.rejects(verify(),/ASSET_MAPPING_MISMATCH/);
});

test('rejects scope drift inside the package under a newly supplied digest',async t=>{
  const f=await fixture(t);const verify=await replaceArtifact(f,'scope.json',payload=>payload.scope.proposed_price_vnd=1);
  await assert.rejects(verify(),/ARTIFACT_SCOPE_MISMATCH/);
});

test('rejects premature approval markers inside the package',async t=>{
  const f=await fixture(t);const verify=await replaceArtifact(f,'review.json',payload=>payload.assets[0].approval_receipt='DEMO-APPROVED');
  await assert.rejects(verify(),/ARTIFACT_REVIEW_STATE_MISMATCH/);
});

test('rejects non-null actuals inside the package',async t=>{
  const f=await fixture(t);const verify=await replaceArtifact(f,'metrics.json',payload=>payload.reconciled_cash_vnd=0);
  await assert.rejects(verify(),/ARTIFACT_ACTUALS_NOT_NULL/);
});

test('rejects non-fictional or additional case data and never echoes it in errors',async t=>{
  const f=await fixture(t);
  await assert.rejects(f.verify({...f.records,fictional:false}),/FICTIONAL_CASE_REQUIRED/);
  await assert.rejects(f.verify({...f.records,customer_contact:'never-echo-private-data'}),error=>error.message==='FICTIONAL_CASE_REQUIRED');
});
