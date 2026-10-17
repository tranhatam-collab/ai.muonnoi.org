import {readFile,writeFile,mkdir,mkdtemp,realpath} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRecordChecker,checkRecordTransition} from './commercial-records.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
export function createCommercialRehearsal(workbook){
  if(workbook.status!=='DRAFT_NOT_SENT'||workbook.example_pilot_proposal?.fictional!==true)throw new Error('FICTIONAL_WORKBOOK_REQUIRED');
  const check=createRecordChecker(workbook),traces={},denials=[];
  for(const [kind,record]of Object.entries(workbook.record_templates)){
    const result=check(kind,record);if(!result.valid)throw new Error('INVALID_BLANK_TEMPLATE:'+kind);
    const constants={status:kind==='acceptance'?'NOT_REVIEWED':kind==='reconciliation'?'PENDING_RECONCILIATION':'DRAFT_NOT_SENT',currency:'VND',fit:'NOT_ASSESSED',classification:'NOT_ASSESSED'};
    for(const [key,value]of Object.entries(record))if(Object.hasOwn(constants,key)?value!==constants[key]:Array.isArray(value)?value.length!==0:value!==null)throw new Error('NOT_BLANK_TEMPLATE:'+kind);
    traces[kind]=[structuredClone(record)];
  }
  const step=(kind,patch)=>{
    const before=traces[kind].at(-1),after={...before,...patch};
    const result=checkRecordTransition(check,kind,before,after);
    if(!result.valid)throw new Error('INVALID_DEMO_TRANSITION:'+kind+':'+JSON.stringify(result.errors));
    traces[kind].push(after);
  };
  const deny=(id,kind,before,after)=>{
    const result=checkRecordTransition(check,kind,before,after);
    if(result.valid)throw new Error('EXPECTED_REJECTION:'+id);
    denials.push({id,errors:result.errors});
  };
  const scope=workbook.offer_scopes.find(row=>row.offer_id==='studio-pilot-14d');
  const offer_id=scope.offer_id;
  step('qualification',{status:'NEEDS_INPUT',brief_ref:'DEMO-BRIEF-001',intake_receipt_ref:'DEMO-INTAKE-001',missing_inputs:['DEMO-RIGHTS-MISSING']});
  step('qualification',{status:'QUALIFIED_FOR_SCOPING',offer_id,consent_ref:'DEMO-CONSENT-001',managed_destination_ref:'DEMO-DESTINATION-001',needs_summary:'Tình huống hư cấu: chuẩn bị 12 nội dung chữ cho bộ sổ tay mẫu.',source_rights_ref:'DEMO-RIGHTS-001',reviewer_role:'DEMO-REVIEWER',capacity_check_ref:'DEMO-CAPACITY-001',fit:'WITHIN_SCOPE',missing_inputs:[]});
  step('proposal',{status:'REVIEWED_FOR_SEND',proposal_id:'DEMO-PROPOSAL-001',offer_id,version:'1.0',brief_ref:'DEMO-BRIEF-001',proposed_amount_vnd:scope.proposed_price_vnd,deliverable_ids:[...scope.asset_ids,...scope.support_deliverables],formats_agreed:'DEMO: chỉ chữ và kịch bản, chưa gồm ảnh/video thành phẩm',revision_basis:scope.revision_basis,target_offset_days:14});
  step('proposal',{status:'SENT_UNCONFIRMED'});
  deny('unknown_send_cannot_reset','proposal',traces.proposal.at(-1),{...traces.proposal.at(-1),status:'DRAFT_NOT_SENT'});
  step('proposal',{status:'SENT_CONFIRMED',sent_receipt_ref:'DEMO-SEND-001'});
  step('proposal',{status:'SCOPE_ACCEPTED',scope_acceptance_ref:'DEMO-SCOPE-001',confirmed_inputs_ref:'DEMO-INPUTS-001',capacity_check_ref:'DEMO-CAPACITY-001',actual_start_date:'2026-10-17',actual_due_date:'2026-10-31'});
  step('acceptance',{status:'REVIEWING',offer_id,scope_version:'1.0',scope_acceptance_ref:'DEMO-SCOPE-001',manifest_ref:'DEMO-MANIFEST-001',reviewer_role:'DEMO-REVIEWER'});
  step('acceptance',{status:'REVISION_REQUESTED',open_revision_ids:['DEMO-REVISION-001']});
  step('revision',{status:'RECEIVED',revision_id:'DEMO-REVISION-001',asset_id:'P-C01',from_version:'1.0',feedback_ref:'DEMO-FEEDBACK-001'});
  step('revision',{status:'IN_REVIEW',classification:'WITHIN_SCOPE'});
  step('revision',{status:'RESOLVED',to_version:'1.1',change_summary:'DEMO: rút gọn câu kết theo feedback hư cấu.',claim_review_ref:'DEMO-CLAIM-REVIEW-001',reviewer_role:'DEMO-REVIEWER',resolution_ref:'DEMO-RESOLUTION-001'});
  step('acceptance',{status:'REVIEWING',open_revision_ids:[],manifest_ref:'DEMO-MANIFEST-002'});
  step('acceptance',{status:'ACCEPTED',delivery_receipt_ref:'DEMO-DELIVERY-002',verification_refs:['DEMO-REVIEW-002','DEMO-RIGHTS-002'],acceptance_ref:'DEMO-ACCEPTANCE-002',accepted_at:'2026-10-31T10:00:00+07:00'});
  step('reconciliation',{status:'DISCREPANCY',offer_id,proposal_ref:'DEMO-PROPOSAL-001',order_ref:'DEMO-ORDER-001',period_start:'2026-10-17',period_end:'2026-10-31',proposed_amount_vnd:scope.proposed_price_vnd,accepted_order_amount_vnd:scope.proposed_price_vnd,discrepancies:['DEMO-SETTLEMENT-MISSING']});
  const incomplete=traces.reconciliation.at(-1);
  deny('missing_settlement_cannot_reconcile','reconciliation',incomplete,{...incomplete,status:'RECONCILED',discrepancies:[]});
  step('reconciliation',{status:'PENDING_RECONCILIATION',discrepancies:[]});
  step('reconciliation',{status:'RECONCILED',transaction_refs:['DEMO-TXN-001'],provider_event_refs:['DEMO-EVENT-001'],settlement_ref:'DEMO-SETTLEMENT-001',gross_paid_vnd:scope.proposed_price_vnd,refunds_vnd:0,payment_fees_vnd:15000,net_settled_vnd:scope.proposed_price_vnd-15000,reconciled_at:'2026-11-01T10:00:00+07:00',reconciliation_receipt_ref:'DEMO-RECONCILIATION-001'});
  const accepted=traces.acceptance.at(-1),reconciled=traces.reconciliation.at(-1);
  deny('accepted_manifest_cannot_be_replaced','acceptance',accepted,{...accepted,manifest_ref:'DEMO-MANIFEST-OTHER'});
  deny('acceptance_requires_delivery','acceptance',traces.acceptance.at(-2),{...accepted,delivery_receipt_ref:null});
  deny('open_revision_blocks_acceptance','acceptance',traces.acceptance.at(-2),{...accepted,open_revision_ids:['DEMO-OPEN-001']});
  deny('duplicate_transaction_ref','reconciliation',traces.reconciliation.at(-2),{...reconciled,transaction_refs:['DEMO-TXN-001','DEMO-TXN-001']});
  deny('wrong_settlement_sum','reconciliation',traces.reconciliation.at(-2),{...reconciled,net_settled_vnd:scope.proposed_price_vnd});
  deny('unknown_fee_cannot_be_zero','reconciliation',traces.reconciliation.at(-2),{...reconciled,payment_fees_vnd:null});
  return {kind:'COMMERCIAL_REHEARSAL_ONLY',fictional:true,scope:'LOCAL_RECORD_PREFLIGHT_ONLY',external_actions:0,traces,expected_rejections:denials,actuals:{accepted_orders:null,gross_paid_vnd:null,refunds_vnd:null,payment_fees_vnd:null,net_settled_vnd:null,other_actual_costs_vnd:null},limit:'All DEMO refs and simulation money are fabricated fixtures. Valid records do not verify consent, rights, delivery, acceptance, provider events, identity or real cash.'};
}

async function main(){
  if(process.argv.length!==2)throw new Error('NO_CUSTOMER_INPUT_SUPPORTED');
  const path='operations/data/pilot-commercial-workbook.json';const text=await readFile(resolve(root,path),'utf8');
  const receipt=createCommercialRehearsal(JSON.parse(text));
  const sha256=value=>createHash('sha256').update(value).digest('hex');
  receipt.source={path,sha256:sha256(text),head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),working_tree:execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim()?'DIRTY':'CLEAN'};
  const parent=resolve(root,'.local/commercial-rehearsals');await mkdir(parent,{recursive:true,mode:0o700});
  if(await realpath(parent)!==parent)throw new Error('OUTPUT_SYMLINK_NOT_ALLOWED');
  const directory=await mkdtemp(resolve(parent,'rehearsal-')),bytes=JSON.stringify(receipt,null,2)+'\n';
  await writeFile(resolve(directory,'receipt.json'),bytes,{flag:'wx',mode:0o600});
  console.log(JSON.stringify({directory,sha256:sha256(bytes),kind:receipt.kind,simulated_transitions:Object.values(receipt.traces).reduce((n,rows)=>n+rows.length-1,0),expected_rejections:receipt.expected_rejections.length,external_actions:0,actuals:receipt.actuals},null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
