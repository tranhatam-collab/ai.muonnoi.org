import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRecordChecker,checkRecordTransition} from '../tools/commercial-records.mjs';
import {createCommercialRehearsal} from '../tools/rehearse-commercial.mjs';

const workbook=JSON.parse(await readFile(new URL('../operations/data/pilot-commercial-workbook.json',import.meta.url),'utf8'));
const check=createRecordChecker(workbook),rehearsal=createCommercialRehearsal(workbook);
const record=(kind,index=-1)=>structuredClone(rehearsal.traces[kind].at(index));
const bad=(result,code)=>{assert.equal(result.valid,false);if(code)assert.ok(result.errors.some(error=>error.code===code),JSON.stringify(result));};

test('all five blank templates are valid pending records, without real outcomes',()=>{
  for(const [kind,value]of Object.entries(workbook.record_templates))assert.equal(check(kind,value).valid,true,kind);
  assert.equal(rehearsal.fictional,true);assert.equal(rehearsal.external_actions,0);
  assert.ok(Object.values(rehearsal.actuals).every(value=>value===null));
  assert.equal(Object.values(rehearsal.traces).reduce((n,rows)=>n+rows.length-1,0),16);
  assert.equal(rehearsal.expected_rejections.length,8);
});

test('rehearsal is deterministic and preserves the workbook and templates',()=>{
  const before=JSON.stringify(workbook);assert.deepEqual(createCommercialRehearsal(workbook),rehearsal);
  assert.equal(JSON.stringify(workbook),before);
  const changed=structuredClone(workbook);changed.example_pilot_proposal.fictional=false;
  assert.throws(()=>createCommercialRehearsal(changed),/FICTIONAL_WORKBOOK_REQUIRED/);
  const populated=structuredClone(workbook);populated.record_templates.qualification.brief_ref='non-demo-input';
  assert.throws(()=>createCommercialRehearsal(populated),/NOT_BLANK_TEMPLATE/);
});

test('fails closed on unsupported schema keywords, types, refs and cycles',()=>{
  for(const change of [
    w=>w.record_schemas.$defs.acceptance.anyOf=[],
    w=>w.record_schemas.$defs.acceptance.properties.status.type='boolean',
    w=>w.record_schemas.$defs.acceptance.properties.status.$ref='https://example.invalid/schema',
    w=>w.record_schemas.$defs.nullable_text.$ref='#/$defs/nullable_text',
    w=>w.record_schemas.$defs.acceptance.properties.accepted_at.format='custom'
  ]){const changed=structuredClone(workbook);change(changed);assert.throws(()=>createRecordChecker(changed),/UNSUPPORTED_SCHEMA/);}
});

test('rejects missing and additional fields without echoing their values',()=>{
  const missing=record('acceptance');delete missing.manifest_ref;bad(check('acceptance',missing),'REQUIRED');
  const extra={...record('acceptance'),private_contact:'do-not-print-this'};const result=check('acceptance',extra);
  bad(result,'ADDITIONAL_PROPERTY');assert.ok(!JSON.stringify(result).includes('do-not-print-this'));
  assert.throws(()=>check('unknown',{}),/UNKNOWN_RECORD_KIND/);
});

test('rejects whitespace refs, fractional/unsafe VND, negative gross and duplicate refs',()=>{
  for(const patch of [{settlement_ref:' '},{gross_paid_vnd:1.5},{gross_paid_vnd:Number.MAX_SAFE_INTEGER+1},{gross_paid_vnd:-1},{transaction_refs:['DEMO-X','DEMO-X']}])bad(check('reconciliation',{...record('reconciliation'),...patch}));
});

test('validates calendar dates, timezones and chronological date ranges',()=>{
  for(const value of ['2026-02-30','2026-13-01','2026-1-01'])bad(check('reconciliation',{...record('reconciliation'),period_start:value}),'FORMAT');
  for(const value of ['2026-02-30T10:00:00Z','2026-10-31T10:00:00','2026-10-31T24:00:00Z','2026-10-31T10:00:00+99:00'])bad(check('acceptance',{...record('acceptance'),accepted_at:value}),'FORMAT');
  bad(check('reconciliation',{...record('reconciliation'),period_start:'2026-11-02'}),'DATE_ORDER');
  assert.equal(check('acceptance',{...record('acceptance'),accepted_at:'2028-02-29T10:00:00Z'}).valid,true);
});

test('qualification cannot advance without consent, rights, destination and capacity refs',()=>{
  for(const field of ['consent_ref','source_rights_ref','managed_destination_ref','capacity_check_ref'])bad(check('qualification',{...record('qualification'),[field]:null}),'EVIDENCE_REF_REQUIRED');
  bad(check('qualification',{...record('qualification'),missing_inputs:['DEMO-MISSING']}),'QUALIFICATION_INCOMPLETE');
});

test('proposal review requires the complete catalog scope, including support deliverables',()=>{
  const value=record('proposal',1);value.deliverable_ids.pop();bad(check('proposal',value),'DELIVERABLE_SCOPE_MISMATCH');
  bad(check('proposal',{...record('proposal',1),formats_agreed:null}),'EVIDENCE_REF_REQUIRED');
});

test('unknown send cannot be reset, change its content or claim a confirmed send without receipt',()=>{
  const unknown=record('proposal',2);
  bad(checkRecordTransition(check,'proposal',unknown,{...unknown,status:'DRAFT_NOT_SENT'}),'INVALID_TRANSITION');
  bad(checkRecordTransition(check,'proposal',unknown,{...unknown,proposed_amount_vnd:1}),'SENT_CONTENT_IMMUTABLE');
  bad(checkRecordTransition(check,'proposal',unknown,{...unknown,status:'SENT_CONFIRMED'}),'EVIDENCE_REF_REQUIRED');
  bad(check('proposal',{...unknown,sent_receipt_ref:'DEMO-PREMATURE'}),'PREMATURE_RECEIPT');
});

test('scope acceptance requires confirmed inputs, capacity, dates and the accepted version',()=>{
  for(const field of ['confirmed_inputs_ref','capacity_check_ref','actual_start_date','scope_acceptance_ref'])bad(check('proposal',{...record('proposal'),[field]:null}),'EVIDENCE_REF_REQUIRED');
  const before=record('proposal',3);bad(checkRecordTransition(check,'proposal',before,{...record('proposal'),version:'different'}),'IDENTITY_CHANGED');
});

test('cannot skip review to acceptance or claim acceptance with missing delivery or open revisions',()=>{
  bad(checkRecordTransition(check,'acceptance',record('acceptance',0),record('acceptance')),'INVALID_TRANSITION');
  bad(check('acceptance',{...record('acceptance'),delivery_receipt_ref:null}),'EVIDENCE_REF_REQUIRED');
  bad(check('acceptance',{...record('acceptance'),open_revision_ids:['DEMO-OPEN']}),'OPEN_REVISIONS');
});

test('B2B acceptance also requires an environment receipt',()=>{
  bad(check('acceptance',{...record('acceptance'),offer_id:'b2b-workflow-setup'}),'EVIDENCE_REF_REQUIRED');
  assert.equal(check('acceptance',{...record('acceptance'),offer_id:'b2b-workflow-setup',environment_ref:'DEMO-ENV-001'}).valid,true);
});

test('revised manifest returns through review and cannot inherit old verification or delivery refs',()=>{
  const before=record('acceptance',2),after=record('acceptance',3);
  assert.notEqual(before.manifest_ref,after.manifest_ref);
  assert.equal(checkRecordTransition(check,'acceptance',before,after).valid,true);
  for(const patch of [{verification_refs:['DEMO-STALE']},{delivery_receipt_ref:'DEMO-STALE'}])bad(checkRecordTransition(check,'acceptance',before,{...after,...patch}),'STALE_MANIFEST_EVIDENCE');
  bad(checkRecordTransition(check,'acceptance',record('acceptance',1),{...after}),'MANIFEST_CHANGE_REQUIRES_REVISION_REVIEW');
});

test('final records cannot be rewritten or reopened under the same identity',()=>{
  for(const kind of ['proposal','acceptance','revision','reconciliation']){
    const final=record(kind);assert.equal(checkRecordTransition(check,kind,final,structuredClone(final)).valid,true);
    assert.equal(checkRecordTransition(check,kind,final,Object.fromEntries(Object.entries(final).reverse())).valid,true);
  }
  bad(checkRecordTransition(check,'acceptance',record('acceptance'),{...record('acceptance'),manifest_ref:'DEMO-CHANGED'}),'FINAL_RECORD_IMMUTABLE');
  bad(checkRecordTransition(check,'reconciliation',record('reconciliation'),{...record('reconciliation'),other_actual_costs_vnd:0}),'FINAL_RECORD_IMMUTABLE');
});

test('resolved revision requires a changed version and scope-changing work cannot auto-resolve',()=>{
  bad(check('revision',{...record('revision'),to_version:'1.0'}),'REVISION_INCOMPLETE');
  bad(check('revision',{...record('revision'),classification:'NEEDS_SCOPE_CHANGE'}),'NEW_SCOPE_REQUIRED');
  bad(check('revision',{...record('revision'),claim_review_ref:null}),'EVIDENCE_REF_REQUIRED');
});

test('unverified components remain null and cannot produce a net amount',()=>{
  const blank=record('reconciliation',0);bad(check('reconciliation',{...blank,net_settled_vnd:0}),'NET_WITH_UNKNOWN_COMPONENTS');
  bad(check('reconciliation',{...record('reconciliation'),payment_fees_vnd:null}),'NET_WITH_UNKNOWN_COMPONENTS');
  assert.equal(check('reconciliation',blank).valid,true);
});

test('reconciled record requires provider, transaction, settlement and reconciliation refs',()=>{
  for(const field of ['settlement_ref','reconciliation_receipt_ref','order_ref','reconciled_at'])bad(check('reconciliation',{...record('reconciliation'),[field]:null}),'EVIDENCE_REF_REQUIRED');
  for(const field of ['transaction_refs','provider_event_refs'])bad(check('reconciliation',{...record('reconciliation'),[field]:[]}),'EVIDENCE_REF_REQUIRED');
});

test('partial payment and unresolved discrepancies cannot be called reconciled',()=>{
  bad(check('reconciliation',{...record('reconciliation'),gross_paid_vnd:1000000,net_settled_vnd:985000}),'ORDER_AMOUNT_MISMATCH');
  bad(check('reconciliation',{...record('reconciliation'),discrepancies:['DEMO-OPEN']}),'OPEN_DISCREPANCIES');
  bad(check('reconciliation',{...record('reconciliation',0),status:'DISCREPANCY'}),'DISCREPANCY_REQUIRED');
});

test('settlement uses exact integer arithmetic and allows a sourced negative net',()=>{
  const base=record('reconciliation');bad(check('reconciliation',{...base,net_settled_vnd:1500000}),'NET_MISMATCH');
  assert.equal(check('reconciliation',{...base,refunds_vnd:1500000,payment_fees_vnd:15000,net_settled_vnd:-15000}).valid,true);
  const max=Number.MAX_SAFE_INTEGER;
  assert.equal(check('reconciliation',{...base,gross_paid_vnd:max,accepted_order_amount_vnd:max,refunds_vnd:max,payment_fees_vnd:1,net_settled_vnd:-1}).valid,true);
});

test('checking a transition does not mutate either input',()=>{
  const before=record('acceptance',3),after=record('acceptance'),saved=JSON.stringify([before,after]);
  checkRecordTransition(check,'acceptance',before,after);assert.equal(JSON.stringify([before,after]),saved);
});
