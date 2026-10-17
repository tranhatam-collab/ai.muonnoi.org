import {readFile,writeFile,mkdir,mkdtemp,realpath} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {isDeepStrictEqual as same} from 'node:util';
import {sha256,verifyPilotDelivery} from './pilot-delivery.mjs';
import {createRecordChecker} from './commercial-records.mjs';
import {createCommercialRehearsal} from './rehearse-commercial.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const fail=code=>{throw new Error(code);};
const exactKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&same(Object.keys(value).sort(),keys.toSorted());
const actualKeys=['accepted_orders','gross_paid_vnd','refunds_vnd','payment_fees_vnd','net_settled_vnd','other_actual_costs_vnd'];
const supportFiles={'P-BRIEF':'source-sample.md','P-CAL14':'calendar.csv','P-RIGHTS':'review.json','P-HANDOFF':'README.md'};

// This fixture prepares review of a real local snapshot; it never approves that snapshot.
export function createPilotHandoffFixture(workbook,manifestSha256){
  if(!/^[a-f0-9]{64}$/.test(manifestSha256))fail('TRUSTED_MANIFEST_DIGEST_REQUIRED');
  const rehearsal=createCommercialRehearsal(workbook);
  const qualification=structuredClone(rehearsal.traces.qualification.at(-1));
  const proposal=structuredClone(rehearsal.traces.proposal.at(-1));
  const order={id:'DEMO-HANDOFF-ORDER-001',proposal_id:proposal.proposal_id,proposal_version:proposal.version,offer_id:proposal.offer_id,scope_acceptance_ref:proposal.scope_acceptance_ref,amount_vnd:proposal.proposed_amount_vnd,currency:proposal.currency};
  const acceptance={...structuredClone(workbook.record_templates.acceptance),status:'REVIEWING',offer_id:proposal.offer_id,scope_version:proposal.version,scope_acceptance_ref:proposal.scope_acceptance_ref,manifest_ref:'sha256:'+manifestSha256,reviewer_role:qualification.reviewer_role};
  const reconciliation={...structuredClone(workbook.record_templates.reconciliation),offer_id:proposal.offer_id,proposal_ref:proposal.proposal_id,order_ref:order.id,proposed_amount_vnd:proposal.proposed_amount_vnd,accepted_order_amount_vnd:order.amount_vnd};
  return {schema:1,kind:'PILOT_HANDOFF_REHEARSAL_ONLY',fictional:true,qualification,proposal,order,acceptance,reconciliation};
}

export async function verifyPilotHandoff(directory,trustedManifestSha256,workbookText,caseFile){
  const integrity=await verifyPilotDelivery(directory,trustedManifestSha256);
  const manifestBytes=await readFile(resolve(directory,'manifest.json'));
  if(sha256(manifestBytes)!==trustedManifestSha256)fail('MANIFEST_CHANGED_DURING_READ');
  const manifest=JSON.parse(manifestBytes),workbook=JSON.parse(workbookText);
  const input=manifest.source?.inputs?.filter(row=>row.path==='operations/data/pilot-commercial-workbook.json');
  if(input?.length!==1||input[0].sha256!==sha256(workbookText))fail('WORKBOOK_SOURCE_MISMATCH');
  const payloads=await Promise.all(['scope.json','review.json','acceptance.json','metrics.json'].map(async path=>{
    const entry=manifest.files.find(row=>row.path===path);if(!entry)fail('REQUIRED_ARTIFACT_FILE_MISSING');
    const bytes=await readFile(resolve(directory,path));
    if(bytes.length!==entry.bytes||sha256(bytes)!==entry.sha256)fail('ARTIFACT_CHANGED_DURING_READ');
    return JSON.parse(bytes);
  }));
  const [scopeEnvelope,review,blankAcceptance,metrics]=payloads;
  const scope=workbook.offer_scopes.find(row=>row.offer_id==='studio-pilot-14d');
  if(!scope||scopeEnvelope.fictional!==true||scopeEnvelope.status!=='DRAFT_NOT_SENT'||scopeEnvelope.delivery_receipt!==null||!same(scopeEnvelope.scope,scope))fail('ARTIFACT_SCOPE_MISMATCH');
  const mapping=scopeEnvelope.mapping;
  if(!Array.isArray(mapping)||mapping.length!==12||new Set(mapping.map(row=>row.sample_id)).size!==12||!same(mapping.map(row=>row.scope_id).sort(),scope.asset_ids.toSorted()))fail('ASSET_MAPPING_MISMATCH');
  const formatPrefixes={caption:'P-C',short_video:'P-V',carousel:'P-K',article:'P-A'};
  for(const row of mapping){
    if(!/^MG\d{2}$/.test(row.sample_id)||row.path!==`drafts/${row.sample_id}.md`||!Object.hasOwn(formatPrefixes,row.format)||!row.scope_id.startsWith(formatPrefixes[row.format])||!manifest.files.some(file=>file.path===row.path))fail('ASSET_MAPPING_MISMATCH');
  }
  const expectedReview=mapping.map(row=>({...row,review_status:'PENDING',rights_status:'UNVERIFIED',reviewer:null,approval_receipt:null,publication_receipt:null}));
  if(review.fictional!==true||review.status!=='NOT_REVIEWED'||!same(review.assets,expectedReview)||!same(blankAcceptance,{...workbook.record_templates.acceptance,offer_id:scope.offer_id}))fail('ARTIFACT_REVIEW_STATE_MISMATCH');
  const expectedMetrics={approved_asset_count:null,published_asset_count:null,opted_in_inquiries:null,qualified_leads:null,accepted_orders:null,reconciled_cash_vnd:null,source_status:'NOT_CONNECTED'};
  if(!same(metrics,expectedMetrics))fail('ARTIFACT_ACTUALS_NOT_NULL');
  if(!exactKeys(caseFile,['schema','kind','fictional','qualification','proposal','order','acceptance','reconciliation'])||caseFile.schema!==1||caseFile.kind!=='PILOT_HANDOFF_REHEARSAL_ONLY'||caseFile.fictional!==true)fail('FICTIONAL_CASE_REQUIRED');
  const {qualification:q,proposal:p,order:o,acceptance:a,reconciliation:r}=caseFile;
  const check=createRecordChecker(workbook);
  for(const kind of ['qualification','proposal','acceptance','reconciliation'])if(!check(kind,caseFile[kind]).valid)fail('INVALID_CASE_RECORD:'+kind);
  if(!exactKeys(o,['id','proposal_id','proposal_version','offer_id','scope_acceptance_ref','amount_vnd','currency'])||typeof o.id!=='string'||!o.id.startsWith('DEMO-')||!Number.isSafeInteger(o.amount_vnd)||o.amount_vnd<0)fail('INVALID_DEMO_ORDER');
  if(q.status!=='QUALIFIED_FOR_SCOPING'||p.status!=='SCOPE_ACCEPTED'||a.status!=='REVIEWING'||r.status!=='PENDING_RECONCILIATION')fail('REVIEW_ONLY_CASE_REQUIRED');
  if([q,p,o,a,r].some(row=>row.offer_id!==scope.offer_id))fail('CROSS_RECORD_OFFER_MISMATCH');
  if(q.brief_ref!==p.brief_ref||q.capacity_check_ref!==p.capacity_check_ref||q.reviewer_role!==a.reviewer_role)fail('QUALIFICATION_LINK_MISMATCH');
  if(o.proposal_id!==p.proposal_id||r.proposal_ref!==p.proposal_id||r.order_ref!==o.id)fail('ORDER_PROPOSAL_LINK_MISMATCH');
  if(o.proposal_version!==p.version||a.scope_version!==p.version||[o,a].some(row=>row.scope_acceptance_ref!==p.scope_acceptance_ref))fail('SCOPE_VERSION_LINK_MISMATCH');
  if(o.currency!==p.currency||r.currency!==p.currency||o.amount_vnd!==p.proposed_amount_vnd||r.proposed_amount_vnd!==p.proposed_amount_vnd||r.accepted_order_amount_vnd!==o.amount_vnd)fail('ORDER_AMOUNT_LINK_MISMATCH');
  if(p.proposed_amount_vnd!==scope.proposed_price_vnd||p.revision_basis!==scope.revision_basis||p.target_offset_days!==14)fail('PROPOSAL_SCOPE_TERMS_MISMATCH');
  if(a.manifest_ref!=='sha256:'+trustedManifestSha256)fail('ACCEPTANCE_MANIFEST_MISMATCH');
  if(a.verification_refs.length||a.open_revision_ids.length||a.delivery_receipt_ref!==null||a.acceptance_ref!==null||a.accepted_at!==null)fail('UNREVIEWED_ARTIFACT_CANNOT_BE_ACCEPTED');
  if(actualKeys.filter(key=>key!=='accepted_orders').some(key=>r[key]!==null)||r.transaction_refs.length||r.provider_event_refs.length||r.settlement_ref!==null||r.reconciliation_receipt_ref!==null||r.reconciled_at!==null||r.discrepancies.length)fail('NO_REAL_OUTCOMES_IN_HANDOFF_REHEARSAL');
  if(!same(scope.support_deliverables.toSorted(),Object.keys(supportFiles).sort()))fail('UNSUPPORTED_SUPPORT_SCOPE');
  const coverage=[...mapping.map(row=>({deliverable_id:row.scope_id,path:row.path})),...Object.entries(supportFiles).map(([deliverable_id,path])=>({deliverable_id,path}))].map(row=>{
    const file=manifest.files.find(file=>file.path===row.path);if(!file)fail('DELIVERABLE_FILE_MISSING');
    return {...row,sha256:file.sha256,bytes:file.bytes,status:'DRAFT_REQUIRES_REVIEW'};
  });
  if(!same(coverage.map(row=>row.deliverable_id).sort(),p.deliverable_ids.toSorted()))fail('PROPOSAL_ARTIFACT_COVERAGE_MISMATCH');
  return {kind:'PILOT_HANDOFF_REHEARSAL_ONLY',fictional:true,status:'VERIFIED_LOCAL_LINKS_ONLY',review_gate:'REVIEW_REQUIRED',integrity,artifact_source:manifest.source,case_sha256:sha256(JSON.stringify(caseFile)),coverage,external_actions:0,actuals:Object.fromEntries(actualKeys.map(key=>[key,null])),limits:'Checks local bytes and cross-record consistency only. Fictional scope/order refs are not customer consent or evidence. The bundle remains unreviewed and undelivered.'};
}

async function main(){
  const args=process.argv.slice(2);
  if(args.length!==2)fail('USAGE: node tools/pilot-handoff.mjs LOCAL_DELIVERY_DIRECTORY TRUSTED_MANIFEST_SHA256');
  const directory=resolve(args[0]),parent=resolve(root,'.local/pilot-deliveries'),rel=relative(parent,directory);
  if(!rel||rel==='..'||rel.startsWith('..'+sep)||await realpath(directory)!==directory)fail('LOCAL_DELIVERY_DIRECTORY_REQUIRED');
  const workbookText=await readFile(resolve(root,'operations/data/pilot-commercial-workbook.json'),'utf8');
  const caseFile=createPilotHandoffFixture(JSON.parse(workbookText),args[1]);
  const result=await verifyPilotHandoff(directory,args[1],workbookText,caseFile);
  const output=resolve(root,'.local/pilot-handoffs');await mkdir(output,{recursive:true,mode:0o700});
  if(await realpath(output)!==output)fail('OUTPUT_SYMLINK_NOT_ALLOWED');
  const out=await mkdtemp(resolve(output,'handoff-'));
  result.verifier_source={head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),working_tree:execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim()?'DIRTY':'CLEAN'};
  result.artifact_directory=directory;
  const bytes=JSON.stringify({result,case:caseFile},null,2)+'\n';
  await writeFile(resolve(out,'receipt.json'),bytes,{flag:'wx',mode:0o600});
  const summary=`# Đối chiếu bàn giao Pilot — mẫu hư cấu\n\n**VERIFIED_LOCAL_LINKS_ONLY · REVIEW_REQUIRED.** Đã đối chiếu hash và liên kết hồ sơ, chưa duyệt nội dung, chưa giao khách và chưa có giao dịch.\n\nArtifact nguồn: ${directory}\n\nManifest SHA-256: ${args[1]}\n\n12 nội dung chính + 4 tài liệu hỗ trợ (không cộng thành 16 nội dung bán). Mỗi file dưới đây còn chờ review.\n\n| Mã phạm vi | Tệp | SHA-256 |\n|---|---|---|\n${result.coverage.map(row=>`| ${row.deliverable_id} | ${row.path} | ${row.sha256} |`).join('\n')}\n\nReceipt: receipt.json; SHA-256 ${sha256(bytes)}. Tất cả actuals giữ null. Các ref DEMO trong hồ sơ là dữ liệu mô phỏng, không phải biên nhận ngoài hệ thống. Snapshot nguồn không bị chỉnh sửa.\n`;
  await writeFile(resolve(out,'README.md'),summary,{flag:'wx',mode:0o600});
  console.log(JSON.stringify({directory:out,receipt_sha256:sha256(bytes),status:result.status,review_gate:result.review_gate,content_assets:12,support_documents:4,external_actions:0,actuals:result.actuals},null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
