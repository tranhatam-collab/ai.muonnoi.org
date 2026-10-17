import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,mkdtemp,lstat,readdir,realpath} from 'node:fs/promises';
import {resolve,dirname,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const json=value=>JSON.stringify(value,null,2)+'\n';
export const sha256=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new Error(message);};
const validPath=path=>typeof path==='string'&&path.length<=160&&/^[A-Za-z0-9._/-]+$/.test(path)&&!path.startsWith('/')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..');
const moneyKeys=['approved_asset_count','published_asset_count','opted_in_inquiries','qualified_leads','accepted_orders','reconciled_cash_vnd'];
const sourceNames=['operations/data/pilot-sample.json','operations/data/pilot-commercial-workbook.json','operations/pilot-sample.md'];

export function renderPilotDelivery(sourceTexts,provenance){
  const [sampleText,workbookText,sourceMarkdown]=sourceTexts;
  const sample=JSON.parse(sampleText),workbook=JSON.parse(workbookText);
  if(!/^[a-f0-9]{40}$/.test(provenance?.head)||!['CLEAN','DIRTY'].includes(provenance?.working_tree))fail('SOURCE_PROVENANCE_REQUIRED');
  if(sample.fictional!==true||sample.status!=='DRAFT_ONLY'||sample.offer_id!=='studio-pilot-14d'||sample.assets?.length!==12||sample.calendar?.length!==14)fail('FICTIONAL_PILOT_ONLY');
  if(workbook.status!=='DRAFT_NOT_SENT'||moneyKeys.some(key=>sample.metrics?.[key]!==null)||sample.metrics?.source_status!=='NOT_CONNECTED')fail('REAL_OUTCOME_NOT_ALLOWED');
  const scope=workbook.offer_scopes?.find(row=>row.offer_id===sample.offer_id);
  if(!scope||scope.status!=='DRAFT_NOT_SENT'||scope.content_asset_count!==12||!Array.isArray(scope.asset_ids)||scope.asset_ids.length!==12)fail('PILOT_SCOPE_REQUIRED');
  const formatMap={caption:['P-C',4],short_video:['P-V',4],carousel:['P-K',3],article:['P-A',1]};
  const counts={};const seen=new Set();const mapping=[];const files={};
  for(const asset of sample.assets){
    if(!/^MG\d{2}$/.test(asset.id)||seen.has(asset.id)||!formatMap[asset.format]||typeof asset.title!=='string'||typeof asset.content!=='string'||asset.content.length<300||asset.status!=='DRAFT_ONLY'||asset.approved_at!==null||asset.publication_receipt!==null)fail('INVALID_DRAFT_ASSET');
    if(!sample.claim_registry||!Array.isArray(asset.claims)||!asset.claims.length||asset.claims.some(id=>!Object.hasOwn(sample.claim_registry,id)))fail('UNKNOWN_CLAIM');
    seen.add(asset.id);counts[asset.format]=(counts[asset.format]||0)+1;
    const scopeId=formatMap[asset.format][0]+String(counts[asset.format]).padStart(2,'0');
    const path=`drafts/${asset.id}.md`;
    mapping.push({sample_id:asset.id,scope_id:scopeId,path,format:asset.format});
    files[path]=`# ${asset.id} — ${asset.title}\n\nMã scope: ${scopeId} · DRAFT_ONLY · MẪU HƯ CẤU CHƯA PHÁT HÀNH\n\nClaim cần review: ${asset.claims.join(', ')}. Đây là bản chữ/kịch bản; chưa có ảnh hoặc video thành phẩm.\n\n${asset.content}\n`;
  }
  if(Object.entries(formatMap).some(([format,[,count]])=>counts[format]!==count)||new Set(scope.asset_ids).size!==12||mapping.some(row=>!scope.asset_ids.includes(row.scope_id)))fail('SCOPE_FORMAT_MISMATCH');
  const scheduled=new Set();
  for(const [index,day] of sample.calendar.entries()){
    if(day.day!==index+1||typeof day.review_requirement!=='string'||!day.review_requirement||day.asset_id!==null&&(!seen.has(day.asset_id)||scheduled.has(day.asset_id)))fail('INVALID_CALENDAR');
    if(day.asset_id)scheduled.add(day.asset_id);
  }
  if(scheduled.size!==12)fail('INCOMPLETE_CALENDAR');
  const acceptance=workbook.record_templates?.acceptance;
  if(acceptance?.status!=='NOT_REVIEWED'||['offer_id','scope_version','scope_acceptance_ref','manifest_ref','delivery_receipt_ref','reviewer_role','environment_ref','acceptance_ref','accepted_at'].some(key=>acceptance[key]!==null)||!Array.isArray(acceptance.verification_refs)||acceptance.verification_refs.length||!Array.isArray(acceptance.open_revision_ids)||acceptance.open_revision_ids.length)fail('ACCEPTANCE_MUST_BE_BLANK');
  // Spreadsheet text cells must not become formulae when the CSV is opened.
  const cell=value=>{const text=String(value??'');return '"'+(/^[\s]*[=+@-]/u.test(text)?"'"+text:text).replaceAll('"','""')+'"';};
  files['calendar.csv']=[['day','illustrative_date','sample_id','scope_id','activity','suggested_local_time','review_requirement'],...sample.calendar.map(day=>[day.day,day.illustrative_date,day.asset_id,mapping.find(row=>row.sample_id===day.asset_id)?.scope_id,day.activity,day.suggested_local_time,day.review_requirement])].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
  files['review.json']=json({status:'NOT_REVIEWED',fictional:true,claim_registry:sample.claim_registry,assets:mapping.map(row=>({...row,review_status:'PENDING',rights_status:'UNVERIFIED',reviewer:null,approval_receipt:null,publication_receipt:null}))});
  files['acceptance.json']=json({...acceptance,offer_id:sample.offer_id});
  files['scope.json']=json({fictional:true,status:'DRAFT_NOT_SENT',scope,mapping,delivery_receipt:null});
  files['metrics.json']=json(sample.metrics);
  files['source-sample.md']=sourceMarkdown;
  files['README.md']=`# Bộ bàn giao minh họa — Studio Pilot\n\n**MẪU HƯ CẤU · LOCAL_DEMO_NOT_DELIVERED.** Chưa giao khách, chưa nghiệm thu, chưa xuất bản và chưa có giao dịch.\n\nGồm 12 bản chữ: 4 caption, 4 kịch bản video, 3 carousel và 1 bài dài; lịch minh họa 14 ngày. Không có ảnh/video thành phẩm. Giá trong scope chỉ là giá đề xuất.\n\n- [Nội dung và brief nguồn](source-sample.md)\n- [Scope và ánh xạ mã bàn giao](scope.json)\n- [Lịch minh họa](calendar.csv)\n- [Phiếu review nguồn và quyền](review.json)\n- [Phiếu nghiệm thu trống](acceptance.json)\n- [Chỉ số chưa có nguồn](metrics.json)\n\n${mapping.map(row=>`- [${row.sample_id} / ${row.scope_id}](${row.path})`).join('\n')}\n\nKiểm tra SHA-256 của manifest bằng giá trị đã giữ ở receipt độc lập. Hash chỉ xác nhận tính toàn vẹn so với receipt đó, không chứng minh tác quyền, chất lượng, việc gửi hay thu tiền. Muốn sửa phải tạo phiên bản mới; không sửa bộ snapshot rồi coi receipt cũ còn hiệu lực.\n\nTrước sử dụng thật: thay dữ kiện hư cấu bằng nguồn đã xác minh; bổ sung quyền ảnh/video, người duyệt, phạm vi được chấp nhận và điểm đến có quyền. Không thêm thông tin khách hàng vào Git.\n`;
  const manifest={schema:1,kind:'MUONNOI_PILOT_DELIVERY_DEMO',status:'LOCAL_DEMO_NOT_DELIVERED',fictional:true,source:{head:provenance.head,working_tree:provenance.working_tree,inputs:sourceNames.map((path,i)=>({path,sha256:sha256(sourceTexts[i])}))},asset_count:12,calendar_days:14,delivery_receipt:null,acceptance_receipt:null,reconciled_cash_vnd:null,files:Object.keys(files).sort().map(path=>({path,bytes:Buffer.byteLength(files[path]),sha256:sha256(files[path])}))};
  const manifestText=json(manifest);
  return {files:{...files,'manifest.json':manifestText},manifestSha256:sha256(manifestText),assetCount:12};
}

export async function writePilotDelivery(parent,bundle){
  await mkdir(parent,{recursive:true,mode:0o700});
  const directory=await mkdtemp(resolve(parent,'pilot-'));
  for(const [path,contents]of Object.entries(bundle.files)){
    if(!validPath(path))fail('UNSAFE_ARTIFACT_PATH');
    await mkdir(dirname(resolve(directory,path)),{recursive:true,mode:0o700});
    await writeFile(resolve(directory,path),contents,{flag:'wx',mode:0o600});
  }
  return directory;
}

export async function verifyPilotDelivery(directory,expectedManifestSha256){
  if(!/^[a-f0-9]{64}$/.test(expectedManifestSha256))fail('TRUSTED_MANIFEST_DIGEST_REQUIRED');
  if(!(await lstat(directory)).isDirectory())fail('ARTIFACT_DIRECTORY_REQUIRED');
  const manifestPath=resolve(directory,'manifest.json');const stat=await lstat(manifestPath);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size>100000)fail('INVALID_MANIFEST_FILE');
  const manifestBytes=await readFile(manifestPath);
  if(sha256(manifestBytes)!==expectedManifestSha256)fail('MANIFEST_DIGEST_MISMATCH');
  const manifest=JSON.parse(manifestBytes);
  if(manifest.schema!==1||manifest.kind!=='MUONNOI_PILOT_DELIVERY_DEMO'||manifest.status!=='LOCAL_DEMO_NOT_DELIVERED'||manifest.fictional!==true||manifest.asset_count!==12||manifest.calendar_days!==14||manifest.delivery_receipt!==null||manifest.acceptance_receipt!==null||manifest.reconciled_cash_vnd!==null||!Array.isArray(manifest.files)||manifest.files.length!==19)fail('INVALID_DEMO_MANIFEST');
  const expected=new Set(['manifest.json']);const directories=new Set();
  for(const entry of manifest.files){
    if(!validPath(entry.path)||expected.has(entry.path)||!Number.isSafeInteger(entry.bytes)||entry.bytes<0||entry.bytes>2000000||!/^[a-f0-9]{64}$/.test(entry.sha256))fail('INVALID_MANIFEST_ENTRY');
    expected.add(entry.path);const parts=entry.path.split('/');parts.pop();for(let i=1;i<=parts.length;i++)directories.add(parts.slice(0,i).join('/'));
  }
  const found=new Set();
  async function walk(path=''){
    for(const entry of await readdir(resolve(directory,path),{withFileTypes:true})){
      const name=path?path+'/'+entry.name:entry.name;
      if(entry.isSymbolicLink())fail('SYMLINK_NOT_ALLOWED');
      if(entry.isDirectory()){if(!directories.has(name))fail('EXTRA_ARTIFACT_DIRECTORY');await walk(name);}
      else if(entry.isFile()){if(!expected.has(name))fail('EXTRA_ARTIFACT_FILE');found.add(name);}
      else fail('UNSUPPORTED_ARTIFACT_FILE');
    }
  }
  await walk();
  if(found.size!==expected.size)fail('MISSING_ARTIFACT_FILE');
  for(const entry of manifest.files){
    const file=resolve(directory,entry.path);const metadata=await lstat(file);
    if(!metadata.isFile()||metadata.nlink!==1||metadata.size!==entry.bytes)fail('ARTIFACT_SIZE_OR_TYPE_MISMATCH');
    if(sha256(await readFile(file))!==entry.sha256)fail('ARTIFACT_DIGEST_MISMATCH');
  }
  return {status:'VERIFIED_LOCAL_INTEGRITY_ONLY',manifestSha256:expectedManifestSha256,files:found.size,assets:manifest.asset_count,delivery_receipt:null,reconciled_cash_vnd:null};
}

async function main(){
  const args=process.argv.slice(2);const parent=resolve(root,'.local/pilot-deliveries');
  if(args.length===0){
    const sourceTexts=await Promise.all(sourceNames.map(path=>readFile(resolve(root,path),'utf8')));
    const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
    const dirty=execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim();
    const bundle=renderPilotDelivery(sourceTexts,{head,working_tree:dirty?'DIRTY':'CLEAN'});
    await mkdir(parent,{recursive:true,mode:0o700});
    if(await realpath(parent)!==parent)fail('OUTPUT_SYMLINK_NOT_ALLOWED');
    const directory=await writePilotDelivery(parent,bundle);
    console.log(json({directory,...await verifyPilotDelivery(directory,bundle.manifestSha256)}));
  }else if(args.length===3&&args[0]==='--verify'){
    const directory=resolve(args[1]);const resolved=await realpath(directory);
    if(resolved!==directory||!relative(parent,directory)||relative(parent,directory).startsWith('..'+sep)||relative(parent,directory)==='..')fail('VERIFY_LOCAL_DELIVERIES_ONLY');
    console.log(json(await verifyPilotDelivery(directory,args[2])));
  }else fail('USAGE: node tools/pilot-delivery.mjs [--verify LOCAL_DELIVERY_DIRECTORY TRUSTED_MANIFEST_SHA256]');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
