import {readFile,writeFile,mkdir,mkdtemp,realpath} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {isDeepStrictEqual as same} from 'node:util';
import {sha256,verifyPilotDelivery} from './pilot-delivery.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const fail=code=>{throw new Error(code);};
const actualKeys=['accepted_orders','gross_paid_vnd','refunds_vnd','payment_fees_vnd','net_settled_vnd','other_actual_costs_vnd'];
const supportFiles=[['P-BRIEF','source-sample.md'],['P-CAL14','calendar.csv'],['P-RIGHTS','review.json'],['P-HANDOFF','README.md']];
const blankAcceptance={status:'NOT_REVIEWED',offer_id:'studio-pilot-14d',scope_version:null,scope_acceptance_ref:null,manifest_ref:null,delivery_receipt_ref:null,reviewer_role:null,verification_refs:[],environment_ref:null,open_revision_ids:[],acceptance_ref:null,accepted_at:null};

function note(change,deliverableId){
  if(change==='UNCHANGED')return {response_code:'FICTIONAL_NOTE_UNCHANGED_STILL_PENDING',response_text:deliverableId+': byte không đổi so với phiên bản đối chiếu. Vẫn chờ review; comment này không tạo nghiệm thu.'};
  if(change==='BYTE_CHANGED')return {response_code:'FICTIONAL_NOTE_BYTES_CHANGED_REREVIEW',response_text:deliverableId+': byte đã khác phiên bản đối chiếu. Cần review lại; comment này không tạo nghiệm thu.'};
  fail('UNKNOWN_CHANGE');
}

async function loadVerified(directory,digest){
  if(!/^[a-f0-9]{64}$/.test(digest))fail('TRUSTED_MANIFEST_DIGEST_REQUIRED');
  const integrity=await verifyPilotDelivery(directory,digest);
  const manifestBytes=await readFile(resolve(directory,'manifest.json'));
  if(sha256(manifestBytes)!==digest)fail('MANIFEST_CHANGED_DURING_READ');
  const manifest=JSON.parse(manifestBytes);
  async function readEntry(path){
    const entry=manifest.files.find(row=>row.path===path);
    if(!entry)fail('REQUIRED_ARTIFACT_FILE_MISSING');
    const bytes=await readFile(resolve(directory,path));
    if(bytes.length!==entry.bytes||sha256(bytes)!==entry.sha256)fail('ARTIFACT_CHANGED_DURING_READ');
    return {entry,bytes};
  }
  return {integrity,manifest,readEntry};
}

function assertBlankAcceptance(value){
  if(!same(value,blankAcceptance))fail('BLANK_ACCEPTANCE_REQUIRED');
}

function assertPendingReview(value){
  if(value?.fictional!==true||value.status!=='NOT_REVIEWED'||!Array.isArray(value.assets)||value.assets.length!==12)fail('REVIEW_STATE_NOT_PENDING');
  if(value.assets.some(row=>row.review_status!=='PENDING'||row.rights_status!=='UNVERIFIED'||row.reviewer!==null||row.approval_receipt!==null||row.publication_receipt!==null))fail('REVIEW_STATE_NOT_PENDING');
}

function assertNullMetrics(value){
  const keys=['approved_asset_count','published_asset_count','opted_in_inquiries','qualified_leads','accepted_orders','reconciled_cash_vnd'];
  if(!value||keys.some(key=>value[key]!==null)||value.source_status!=='NOT_CONNECTED')fail('ACTUALS_NOT_ALLOWED');
}

export async function comparePilotVersions(baselineDirectory,baselineDigest,candidateDirectory,candidateDigest){
  const baseline=await loadVerified(baselineDirectory,baselineDigest);
  const candidate=await loadVerified(candidateDirectory,candidateDigest);
  if(!same(baseline.manifest.files.map(row=>row.path),candidate.manifest.files.map(row=>row.path)))fail('PACKAGE_PATHS_DIFFER');
  const acceptance=await Promise.all([baseline.readEntry('acceptance.json'),candidate.readEntry('acceptance.json')]);
  if(acceptance[0].entry.sha256!==acceptance[1].entry.sha256)fail('ACCEPTANCE_DRIFT_NOT_A_REVIEW');
  acceptance.forEach(row=>assertBlankAcceptance(JSON.parse(row.bytes)));
  const metrics=await Promise.all([baseline.readEntry('metrics.json'),candidate.readEntry('metrics.json')]);
  if(metrics[0].entry.sha256!==metrics[1].entry.sha256)fail('METRICS_DRIFT_NOT_A_REVIEW');
  metrics.forEach(row=>assertNullMetrics(JSON.parse(row.bytes)));
  const reviews=await Promise.all([baseline.readEntry('review.json'),candidate.readEntry('review.json')]);
  reviews.forEach(row=>assertPendingReview(JSON.parse(row.bytes)));
  const scopes=await Promise.all([baseline.readEntry('scope.json'),candidate.readEntry('scope.json')]);
  const parsedScopes=scopes.map(row=>JSON.parse(row.bytes));
  if(parsedScopes.some(row=>row?.fictional!==true||row.status!=='DRAFT_NOT_SENT'||row.delivery_receipt!==null||!Array.isArray(row.mapping)||row.mapping.length!==12))fail('SCOPE_IDENTITY_REQUIRED');
  const identity=row=>row.mapping.map(item=>({sample_id:item.sample_id,scope_id:item.scope_id,path:item.path,format:item.format}));
  if(!same(identity(parsedScopes[0]),identity(parsedScopes[1])))fail('SCOPE_IDENTITY_CHANGED');
  const byPath=(manifest,path)=>manifest.files.find(row=>row.path===path);
  const responses=identity(parsedScopes[0]).concat(supportFiles.map(([deliverable_id,path])=>({deliverable_id,path}))).map(row=>{
    const before=byPath(baseline.manifest,row.path),after=byPath(candidate.manifest,row.path);
    if(!before||!after)fail('DELIVERABLE_FILE_MISSING');
    const change=before.sha256===after.sha256&&before.bytes===after.bytes?'UNCHANGED':'BYTE_CHANGED';
    return {deliverable_id:row.scope_id||row.deliverable_id,path:row.path,change,baseline_sha256:before.sha256,candidate_sha256:after.sha256,...note(change,row.scope_id||row.deliverable_id),approval_receipt:null,acceptance_ref:null,publication_receipt:null};
  });
  if(responses.length!==16||responses.filter(row=>row.path.startsWith('drafts/')).length!==12)fail('REVIEW_COVERAGE_MISMATCH');
  if(responses.some(row=>row.approval_receipt!==null||row.acceptance_ref!==null||row.publication_receipt!==null||row.response_code.includes('ACCEPT')))fail('REVIEW_CANNOT_CREATE_ACCEPTANCE');
  const packagePaths=['scope.json','acceptance.json','metrics.json'];
  const package_files=packagePaths.map(path=>{
    const before=byPath(baseline.manifest,path),after=byPath(candidate.manifest,path);
    return {path,change:before.sha256===after.sha256?'UNCHANGED':'BYTE_CHANGED',baseline_sha256:before.sha256,candidate_sha256:after.sha256};
  });
  return {
    kind:'PILOT_VERSION_REVIEW_ONLY',
    fictional:true,
    status:'REVIEW_COMMENTS_ONLY',
    review_gate:'REVIEW_REQUIRED',
    acceptance_created:false,
    baseline:{directory:baselineDirectory,manifest_sha256:baselineDigest,integrity:baseline.integrity},
    candidate:{directory:candidateDirectory,manifest_sha256:candidateDigest,integrity:candidate.integrity},
    responses,
    package_files,
    external_actions:0,
    actuals:Object.fromEntries(actualKeys.map(key=>[key,null])),
    limits:'Fictional per-asset comments compare local bytes only. They do not review quality, accept delivery, publish, or record money.'
  };
}

async function confined(directory){
  const parent=resolve(root,'.local/pilot-deliveries');
  const resolved=resolve(directory),rel=relative(parent,resolved);
  if(!rel||rel==='..'||rel.startsWith('..'+sep)||await realpath(resolved)!==resolved)fail('LOCAL_DELIVERY_DIRECTORY_REQUIRED');
  return resolved;
}

async function main(){
  const args=process.argv.slice(2);
  if(args.length!==4)fail('USAGE: node tools/pilot-review.mjs BASELINE_DIRECTORY BASELINE_SHA256 CANDIDATE_DIRECTORY CANDIDATE_SHA256');
  const result=await comparePilotVersions(await confined(args[0]),args[1],await confined(args[2]),args[3]);
  const output=resolve(root,'.local/pilot-reviews');
  await mkdir(output,{recursive:true,mode:0o700});
  if(await realpath(output)!==output)fail('OUTPUT_SYMLINK_NOT_ALLOWED');
  const out=await mkdtemp(resolve(output,'review-'));
  result.verifier_source={head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),working_tree:execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim()?'DIRTY':'CLEAN'};
  const bytes=JSON.stringify(result,null,2)+'\n';
  await writeFile(resolve(out,'receipt.json'),bytes,{flag:'wx',mode:0o600});
  const changed=result.responses.filter(row=>row.change==='BYTE_CHANGED');
  const summary=`# So sánh phiên bản bàn giao Pilot — mẫu hư cấu\n\n**REVIEW_COMMENTS_ONLY · REVIEW_REQUIRED.** Đây là comment theo mã asset, không phải nghiệm thu, không giao khách và không có giao dịch.\n\nBaseline: ${result.baseline.manifest_sha256}\n\nCandidate: ${result.candidate.manifest_sha256}\n\n12 nội dung và 4 tài liệu hỗ trợ. Acceptance không được tạo.\n\n| Mã | Tệp | Thay đổi | Mã comment |\n|---|---|---|---|\n${result.responses.map(row=>`| ${row.deliverable_id} | ${row.path} | ${row.change} | ${row.response_code} |`).join('\n')}\n\nSố file đổi byte trong 16 hàng: ${changed.length}. Receipt SHA-256 ${sha256(bytes)}. Cả hai snapshot nguồn giữ nguyên.\n`;
  await writeFile(resolve(out,'README.md'),summary,{flag:'wx',mode:0o600});
  console.log(JSON.stringify({directory:out,receipt_sha256:sha256(bytes),status:result.status,review_gate:result.review_gate,acceptance_created:false,responses:result.responses.length,byte_changed:changed.length,external_actions:0,actuals:result.actuals},null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
