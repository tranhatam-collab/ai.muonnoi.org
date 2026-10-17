import {readFile,writeFile,mkdir,mkdtemp,realpath} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {sha256,verifyPilotDelivery,writePilotDelivery} from './pilot-delivery.mjs';
import {comparePilotVersions} from './pilot-review.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const fail=code=>{throw new Error(code);};
const frozen=new Set(['acceptance.json','metrics.json']);
const actualKeys=['accepted_orders','gross_paid_vnd','refunds_vnd','payment_fees_vnd','net_settled_vnd','other_actual_costs_vnd'];

export async function revisePilotFromComments(baselineDirectory,baselineDigest,candidateDirectory,candidateDigest,outputParent){
  const baselineManifestPath=resolve(baselineDirectory,'manifest.json');
  const baselineAcceptancePath=resolve(baselineDirectory,'acceptance.json');
  const beforeManifest=await readFile(baselineManifestPath);
  const beforeAcceptance=await readFile(baselineAcceptancePath);
  const review=await comparePilotVersions(baselineDirectory,baselineDigest,candidateDirectory,candidateDigest);
  const overlays=[];
  for(const row of review.responses){
    if(row.change!=='BYTE_CHANGED')continue;
    if(frozen.has(row.path))fail('REVISION_CANNOT_TOUCH_ACCEPTANCE');
    overlays.push({path:row.path,candidate_sha256:row.candidate_sha256,deliverable_id:row.deliverable_id,response_code:row.response_code});
  }
  const scope=review.package_files.find(row=>row.path==='scope.json'&&row.change==='BYTE_CHANGED');
  if(scope)overlays.push({path:'scope.json',candidate_sha256:scope.candidate_sha256,deliverable_id:'SCOPE',response_code:'FICTIONAL_NOTE_BYTES_CHANGED_REREVIEW'});
  if(!overlays.length)fail('NO_BYTE_CHANGE_TO_REVISE');
  const baselineManifest=JSON.parse(beforeManifest);
  if(!Array.isArray(baselineManifest.files)||baselineManifest.files.length!==19)fail('INVALID_BASELINE_MANIFEST');
  const files={};
  for(const entry of baselineManifest.files){
    const bytes=await readFile(resolve(baselineDirectory,entry.path));
    if(sha256(bytes)!==entry.sha256)fail('BASELINE_CHANGED_DURING_REVISE');
    files[entry.path]=bytes;
  }
  for(const row of overlays){
    if(!Object.hasOwn(files,row.path))fail('REVISION_PATH_NOT_IN_BASELINE');
    const bytes=await readFile(resolve(candidateDirectory,row.path));
    if(sha256(bytes)!==row.candidate_sha256)fail('REVISION_SOURCE_MISMATCH');
    files[row.path]=bytes;
  }
  if(sha256(files['acceptance.json'])!==sha256(beforeAcceptance))fail('REVISION_TOUCHED_ACCEPTANCE');
  const metricsBaseline=baselineManifest.files.find(row=>row.path==='metrics.json');
  if(sha256(files['metrics.json'])!==metricsBaseline.sha256)fail('REVISION_TOUCHED_METRICS');
  const manifest={schema:1,kind:'MUONNOI_PILOT_DELIVERY_DEMO',status:'LOCAL_DEMO_NOT_DELIVERED',fictional:true,source:{...baselineManifest.source,revision_of:baselineDigest,revised_paths:overlays.map(row=>row.path).sort(),comment_codes:[...new Set(overlays.map(row=>row.response_code))].sort()},asset_count:12,calendar_days:14,delivery_receipt:null,acceptance_receipt:null,reconciled_cash_vnd:null,files:Object.keys(files).sort().map(path=>({path,bytes:Buffer.byteLength(files[path]),sha256:sha256(files[path])}))};
  const manifestText=JSON.stringify(manifest,null,2)+'\n';
  const manifestSha256=sha256(manifestText);
  const directory=await writePilotDelivery(outputParent,{files:{...files,'manifest.json':manifestText}});
  const integrity=await verifyPilotDelivery(directory,manifestSha256);
  if(!Buffer.from(await readFile(baselineManifestPath)).equals(beforeManifest)||!Buffer.from(await readFile(baselineAcceptancePath)).equals(beforeAcceptance))fail('BASELINE_MUTATED');
  const recompare=await comparePilotVersions(baselineDirectory,baselineDigest,directory,manifestSha256);
  const byteChanged=recompare.responses.filter(row=>row.change==='BYTE_CHANGED').map(row=>row.deliverable_id);
  if(recompare.acceptance_created!==false||recompare.package_files.find(row=>row.path==='acceptance.json').change!=='UNCHANGED')fail('REVISION_CREATED_ACCEPTANCE');
  return {kind:'PILOT_REVISION_SNAPSHOT_ONLY',fictional:true,status:'REVISION_REQUIRES_REVIEW',review_gate:'REVIEW_REQUIRED',acceptance_created:false,directory,manifest_sha256:manifestSha256,integrity,baseline_manifest_sha256:baselineDigest,revised_paths:overlays.map(row=>row.path).sort(),recompare_status:recompare.status,recompare_byte_changed:byteChanged,external_actions:0,actuals:Object.fromEntries(actualKeys.map(key=>[key,null])),limits:'A new local snapshot copies only files named by fictional BYTE_CHANGED comments. The previous snapshot and its blank acceptance stay untouched. This is not customer acceptance, publication, or payment.'};
}

async function confined(directory){
  const parent=resolve(root,'.local/pilot-deliveries');
  const resolved=resolve(directory),rel=relative(parent,resolved);
  if(!rel||rel==='..'||rel.startsWith('..'+sep)||await realpath(resolved)!==resolved)fail('LOCAL_DELIVERY_DIRECTORY_REQUIRED');
  return resolved;
}

async function main(){
  const args=process.argv.slice(2);
  if(args.length!==4)fail('USAGE: node tools/pilot-revise.mjs BASELINE_DIRECTORY BASELINE_SHA256 CANDIDATE_DIRECTORY CANDIDATE_SHA256');
  const parent=resolve(root,'.local/pilot-deliveries');
  await mkdir(parent,{recursive:true,mode:0o700});
  if(await realpath(parent)!==parent)fail('OUTPUT_SYMLINK_NOT_ALLOWED');
  const result=await revisePilotFromComments(await confined(args[0]),args[1],await confined(args[2]),args[3],parent);
  const output=resolve(root,'.local/pilot-revisions');
  await mkdir(output,{recursive:true,mode:0o700});
  if(await realpath(output)!==output)fail('OUTPUT_SYMLINK_NOT_ALLOWED');
  const out=await mkdtemp(resolve(output,'revision-'));
  result.verifier_source={head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),working_tree:execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim()?'DIRTY':'CLEAN'};
  const bytes=JSON.stringify(result,null,2)+'\n';
  await writeFile(resolve(out,'receipt.json'),bytes,{flag:'wx',mode:0o600});
  const summary=`# Phiên bản bàn giao mới từ comment byte — mẫu hư cấu\n\n**REVISION_REQUIRES_REVIEW.** Snapshot mới chỉ nhận các file được comment BYTE_CHANGED. Acceptance của snapshot cũ không đổi và không được tạo nghiệm thu.\n\nBaseline: ${result.baseline_manifest_sha256}\n\nSnapshot mới: ${result.directory}\n\nManifest SHA-256: ${result.manifest_sha256}\n\nĐối chiếu lại: ${result.recompare_status}; file đổi byte: ${result.recompare_byte_changed.join(', ')||'không có'}.\n\nReceipt SHA-256 ${sha256(bytes)}. Actuals giữ null.\n`;
  await writeFile(resolve(out,'README.md'),summary,{flag:'wx',mode:0o600});
  console.log(JSON.stringify({directory:result.directory,receipt:out,manifest_sha256:result.manifest_sha256,status:result.status,acceptance_created:false,revised_paths:result.revised_paths,recompare_byte_changed:result.recompare_byte_changed,external_actions:0,actuals:result.actuals},null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
