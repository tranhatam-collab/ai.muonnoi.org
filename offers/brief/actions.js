const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const statuses=['IN_REVIEW','NEEDS_INFORMATION','PROPOSAL_READY','DECLINED'];
export const STATUS_LABELS={RECEIVED:'Đã nhận',IN_REVIEW:'Đang xem xét',NEEDS_INFORMATION:'Cần bổ sung thông tin',PROPOSAL_READY:'Có đề xuất phạm vi để xem',DECLINED:'Chưa phù hợp'};
export function canonicalAction(value){
 if(!value||!uuid.test(value.brief_id)||!Number.isSafeInteger(value.version)||value.version<0)throw new Error('INVALID_ACTION');
 if(value.action==='SHARE'||value.action==='REVOKE'){
  if(value.share_with_studio!==(value.action==='SHARE'))throw new Error('INVALID_ACTION');
  return {brief_id:value.brief_id,action:value.action,version:value.version,share_with_studio:value.share_with_studio};
 }
 if(value.action!=='TRIAGE'||!statuses.includes(value.status)||typeof value.customer_message!=='string')throw new Error('INVALID_ACTION');
 const message=value.customer_message.trim();
 if(message.length<8||message.length>2000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(message))throw new Error('INVALID_ACTION');
 return {brief_id:value.brief_id,action:'TRIAGE',version:value.version,status:value.status,customer_message:message};
}
async function fingerprint(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),byte=>byte.toString(16).padStart(2,'0')).join('');}
function metadata(item,parked=false){
 const allowed=['actor_id','brief_id','action','version','hash','request_key','outcome',item?.action==='TRIAGE'?'status':'share_with_studio'];
 if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).some(key=>!allowed.includes(key))||!uuid.test(item.request_key)||!uuid.test(item.brief_id)||typeof item.actor_id!=='string'||!item.actor_id||item.actor_id.length>120||!['SHARE','REVOKE','TRIAGE'].includes(item.action)||!Number.isSafeInteger(item.version)||item.version<0||!/^[a-f0-9]{64}$/.test(item.hash)||!(parked?item.outcome==='pending':['pending','confirmed'].includes(item.outcome)))throw new Error('INVALID_JOURNAL');
 if(item.action==='TRIAGE'?!['IN_REVIEW','NEEDS_INFORMATION','PROPOSAL_READY','DECLINED'].includes(item.status):item.share_with_studio!==(item.action==='SHARE'))throw new Error('INVALID_JOURNAL');
 return Object.freeze({actor_id:item.actor_id,brief_id:item.brief_id,action:item.action,version:item.version,hash:item.hash,request_key:item.request_key,outcome:item.outcome,...(item.action==='TRIAGE'?{status:item.status}:{share_with_studio:item.share_with_studio})});
}
function archiveMetadata(items){
 if(!Array.isArray(items)||items.length>100)throw new Error('INVALID_JOURNAL');
 const safe=items.map(item=>metadata(item,true));
 if(new Set(safe.map(item=>item.brief_id)).size!==safe.length||new Set(safe.map(item=>item.actor_id+'|'+item.request_key)).size!==safe.length)throw new Error('INVALID_JOURNAL');
 return Object.freeze(safe);
}
function sameOperation(first,second){return first.actor_id===second.actor_id&&first.brief_id===second.brief_id&&first.request_key===second.request_key&&first.hash===second.hash&&first.action===second.action&&first.version===second.version&&first.status===second.status&&first.share_with_studio===second.share_with_studio;}
// The journal contains IDs, enums and a hash; never persist customer messages or brief contents.
export class ActionJournal{
 constructor(storage,namespace){
  this.storage=storage;this.key='muonnoi.intake.'+namespace+'.v1';this.archiveKey=this.key+'.parked';this.journal=null;this.pending=null;this.parked=Object.freeze([]);this.busy=false;this.storageError=false;
  try{
   const raw=storage.getItem(this.key);if(raw)this.journal=metadata(JSON.parse(raw));
   const archived=storage.getItem(this.archiveKey);if(archived)this.parked=archiveMetadata(JSON.parse(archived));
   // A crash between the two durable writes can leave an exact duplicate. The active record wins safely.
   const duplicate=this.parked.find(item=>item.brief_id===this.journal?.brief_id);
   if(duplicate){if(!sameOperation(duplicate,this.journal))throw new Error('INVALID_JOURNAL');this.saveArchive(this.parked.filter(item=>item!==duplicate));}
  }
  catch{this.storageError=true;}
 }
 save(item){if(this.storageError)throw new Error('STORAGE_UNAVAILABLE');try{const safe=metadata(item);this.storage.setItem(this.key,JSON.stringify(safe));this.journal=safe;}catch{this.storageError=true;throw new Error('STORAGE_UNAVAILABLE');}}
 saveArchive(items){if(this.storageError)throw new Error('STORAGE_UNAVAILABLE');try{const safe=archiveMetadata(items);this.storage.setItem(this.archiveKey,JSON.stringify(safe));this.parked=safe;}catch{this.storageError=true;throw new Error('STORAGE_UNAVAILABLE');}}
 park(){
  if(this.busy)throw new Error('REQUEST_IN_FLIGHT');
  if(this.storageError)throw new Error('STORAGE_UNAVAILABLE');
  if(this.journal?.outcome!=='pending')throw new Error('NO_PENDING_ACTION');
  const item=metadata(this.journal,true),existing=this.parked.find(row=>row.brief_id===item.brief_id);
  if(existing&&!sameOperation(existing,item))throw new Error('PARKED_ACTION_PENDING');
  this.saveArchive(existing?this.parked:[...this.parked,item]);
  try{this.storage.removeItem(this.key);}catch{this.storageError=true;throw new Error('STORAGE_UNAVAILABLE');}
  this.journal=null;this.pending=null;return item;
 }
 resume(briefId,actorId){
  if(this.busy)throw new Error('REQUEST_IN_FLIGHT');
  if(this.storageError)throw new Error('STORAGE_UNAVAILABLE');
  const item=this.parked.find(row=>row.brief_id===briefId);
  if(!item)return null;
  if(actorId!==item.actor_id)throw new Error('ACTOR_MISMATCH');
  if(this.journal?.outcome==='pending'&&!sameOperation(this.journal,item))throw new Error('PENDING_ACTION_CHANGED');
  // Persist the active retry before removing its archived copy; neither failure can lose its request key.
  this.save(item);this.pending=null;
  this.saveArchive(this.parked.filter(row=>row!==item));
  return item;
 }
 matches(receipt){const j=this.journal;return Boolean(j&&receipt&&receipt.actor_id===j.actor_id&&receipt.request_key===j.request_key&&receipt.action===j.action&&receipt.before_version===j.version&&receipt.version===j.version+1&&receipt.payload_hash===j.hash&&uuid.test(receipt.id)&&Number.isFinite(receipt.created_at));}
 async submit(value,actorId,send){
  if(this.busy)throw new Error('REQUEST_IN_FLIGHT');
  if(typeof actorId!=='string'||!actorId||actorId.length>120)throw new Error('LOGIN_REQUIRED');
  const hadPending=this.journal?.outcome==='pending';
  if(hadPending&&this.journal.actor_id!==actorId)throw new Error('ACTOR_MISMATCH');
  this.busy=true;
  try{
   const action=canonicalAction(value);
   if(this.parked.some(item=>item.brief_id===action.brief_id))throw new Error('PARKED_ACTION_PENDING');
   const hash=await fingerprint(action);
   if(hadPending&&hash!==this.journal.hash)throw new Error('PENDING_ACTION_CHANGED');
   const requestKey=hadPending?this.journal.request_key:crypto.randomUUID();
   const journal={actor_id:actorId,brief_id:action.brief_id,action:action.action,version:action.version,hash,request_key:requestKey,outcome:'pending',...(action.action==='TRIAGE'?{status:action.status}:{share_with_studio:action.share_with_studio})};
   this.save(journal);this.pending=Object.freeze(action);
   const {brief_id,action:kind,...fields}=action;
   const payload={...fields,expected_actor_id:actorId,request_key:requestKey};
   const path=kind==='TRIAGE'?`/intake/operator/briefs/${brief_id}/triage`:`/intake/briefs/${brief_id}/sharing`;
   const response=await send(path,payload);
   if(response.status!==200||response.body?.ok!==true){
    if(!hadPending&&response.body?.ok===false&&[400,401,403,404,409,413,415,429].includes(response.status)&&response.body.error!=='REQUEST_KEY_CONFLICT'){
     this.storage.removeItem(this.key);this.journal=null;this.pending=null;
    }
    throw new Error(typeof response.body?.error==='string'?response.body.error:'UNCONFIRMED');
   }
   if(response.body.actor_id!==actorId||response.body.data?.id!==brief_id||!this.matches(response.body.receipt))throw new Error('UNCONFIRMED');
   this.save({...journal,outcome:'confirmed'});this.pending=null;return response.body;
  }finally{this.busy=false;}
 }
 reconcile(briefId,actorId,history){
  if(this.journal?.outcome!=='pending'||this.journal.brief_id!==briefId)return null;
  if(actorId!==this.journal.actor_id)throw new Error('ACTOR_MISMATCH');
  const receipt=Array.isArray(history)?history.find(row=>this.matches(row)):null;
  if(receipt){this.save({...this.journal,outcome:'confirmed'});this.pending=null;}
  return receipt || null;
 }
}
