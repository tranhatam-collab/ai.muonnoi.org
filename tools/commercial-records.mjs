// Local preflight only. A populated ref is not evidence that a provider or person verified it.
import {isDeepStrictEqual} from 'node:util';
const kinds=['qualification','proposal','acceptance','revision','reconciliation'];
const keywords=new Set(['$schema','$defs','$ref','type','enum','const','minLength','minimum','format','items','uniqueItems','required','properties','additionalProperties']);
const present=value=>typeof value==='string'&&value.trim().length>0;
const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const datetime=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&date(value.slice(0,10))&&Number.isFinite(Date.parse(value))&&!value.slice(11).startsWith('24:');
const same=isDeepStrictEqual;

// Intentionally supports only keywords in the repository's closed record schemas.
// Fail on new/unsupported schema constructs instead of silently approving records.
export function createRecordChecker(workbook){
  const schema=workbook.record_schemas;
  function resolveRef(ref){
    if(typeof ref!=='string'||!/^#\/\$defs\/[a-z_]+$/.test(ref)||!Object.hasOwn(schema.$defs,ref.slice(8)))throw new Error('UNSUPPORTED_SCHEMA_REF');
    return schema.$defs[ref.slice(8)];
  }
  function inspect(node,ancestors=new Set()){
    if(!node||typeof node!=='object'||Array.isArray(node)||ancestors.has(node))throw new Error('UNSUPPORTED_SCHEMA');
    const next=new Set(ancestors).add(node);
    for(const key of Object.keys(node))if(!keywords.has(key))throw new Error('UNSUPPORTED_SCHEMA_KEYWORD');
    if(node.$ref)inspect(resolveRef(node.$ref),next);
    if(node.type){for(const type of [].concat(node.type))if(!['string','integer','null','array','object'].includes(type))throw new Error('UNSUPPORTED_SCHEMA_TYPE');}
    if(node.format&&!['date','date-time'].includes(node.format))throw new Error('UNSUPPORTED_SCHEMA_FORMAT');
    if(node.additionalProperties!==undefined&&node.additionalProperties!==false)throw new Error('UNSUPPORTED_SCHEMA_ADDITIONAL_PROPERTIES');
    if(node.items)inspect(node.items,next);
    for(const child of Object.values(node.properties||{}))inspect(child,next);
    for(const child of Object.values(node.$defs||{}))inspect(child,next);
  }
  inspect(schema);
  for(const kind of kinds)if(!schema.$defs[kind])throw new Error('MISSING_RECORD_SCHEMA');

  function shape(node,value,path,errors){
    const add=code=>errors.push({path,code});
    if(node.$ref)shape(resolveRef(node.$ref),value,path,errors);
    if(node.enum&&!node.enum.some(option=>same(option,value)))add('ENUM');
    if(Object.hasOwn(node,'const')&&!same(node.const,value))add('CONST');
    const matches=type=>type==='null'?value===null:type==='integer'?Number.isSafeInteger(value):type==='array'?Array.isArray(value):type==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):typeof value===type;
    if(node.type&&!([].concat(node.type)).some(matches)){add('TYPE');return;}
    if(typeof value==='string'){
      if(node.minLength!==undefined&&(!value.trim()||[...value].length<node.minLength))add('MIN_LENGTH');
      if(node.format==='date'&&!date(value)||node.format==='date-time'&&!datetime(value))add('FORMAT');
    }
    if(typeof value==='number'&&node.minimum!==undefined&&value<node.minimum)add('MINIMUM');
    if(Array.isArray(value)){
      if(node.uniqueItems&&new Set(value.map(item=>JSON.stringify(item))).size!==value.length)add('DUPLICATE');
      if(node.items)value.forEach((item,index)=>shape(node.items,item,path+'['+index+']',errors));
    }
    if(value!==null&&typeof value==='object'&&!Array.isArray(value)){
      for(const key of node.required||[])if(!Object.hasOwn(value,key))errors.push({path:path+'.'+key,code:'REQUIRED'});
      if(node.additionalProperties===false&&Object.keys(value).some(key=>!Object.hasOwn(node.properties||{},key)))add('ADDITIONAL_PROPERTY');
      for(const [key,child]of Object.entries(node.properties||{}))if(Object.hasOwn(value,key))shape(child,value[key],path+'.'+key,errors);
    }
  }

  return function checkRecord(kind,record){
    if(!kinds.includes(kind))throw new Error('UNKNOWN_RECORD_KIND');
    const errors=[];shape(schema.$defs[kind],record,kind,errors);
    if(errors.length)return {valid:false,errors,scope:'LOCAL_RECORD_PREFLIGHT_ONLY'};
    const need=(fields,code='EVIDENCE_REF_REQUIRED')=>{for(const key of fields)if(record[key]===null||typeof record[key]==='string'&&!present(record[key])||Array.isArray(record[key])&&!record[key].length)errors.push({path:kind+'.'+key,code});};
    const forbid=fields=>{for(const key of fields)if(record[key]!==null)errors.push({path:kind+'.'+key,code:'PREMATURE_RECEIPT'});};
    const issue=code=>errors.push({path:kind,code});
    if(kind==='qualification'&&record.status==='QUALIFIED_FOR_SCOPING'){
      need(['brief_ref','intake_receipt_ref','consent_ref','managed_destination_ref','offer_id','needs_summary','source_rights_ref','reviewer_role','capacity_check_ref']);
      if(record.fit!=='WITHIN_SCOPE'||record.missing_inputs.length)issue('QUALIFICATION_INCOMPLETE');
    }
    if(kind==='proposal'){
      if(record.status!=='DRAFT_NOT_SENT')need(['proposal_id','offer_id','version','brief_ref','proposed_amount_vnd','deliverable_ids','formats_agreed','revision_basis','target_offset_days']);
      const scope=workbook.offer_scopes.find(row=>row.offer_id===record.offer_id);
      if(record.status!=='DRAFT_NOT_SENT'&&scope){
        const expected=[...scope.asset_ids,...scope.support_deliverables].sort();
        if(!same(record.deliverable_ids.toSorted(),expected))issue('DELIVERABLE_SCOPE_MISMATCH');
      }
      if(['SENT_CONFIRMED','SCOPE_ACCEPTED'].includes(record.status))need(['sent_receipt_ref']);else forbid(['sent_receipt_ref']);
      if(record.status==='SCOPE_ACCEPTED')need(['scope_acceptance_ref','confirmed_inputs_ref','capacity_check_ref','actual_start_date','actual_due_date']);else forbid(['scope_acceptance_ref','actual_start_date','actual_due_date']);
      if(record.actual_start_date&&record.actual_due_date&&record.actual_due_date<record.actual_start_date)issue('DATE_ORDER');
    }
    if(kind==='acceptance'){
      if(record.status!=='NOT_REVIEWED')need(['offer_id','scope_version','scope_acceptance_ref','manifest_ref','reviewer_role']);
      if(record.status==='REVISION_REQUESTED'&&!record.open_revision_ids.length)issue('REVISION_REF_REQUIRED');
      if(record.status==='ACCEPTED'){
        need(['delivery_receipt_ref','verification_refs','acceptance_ref','accepted_at']);
        if(record.open_revision_ids.length)issue('OPEN_REVISIONS');
        if(record.offer_id==='b2b-workflow-setup')need(['environment_ref']);
      }else forbid(['acceptance_ref','accepted_at']);
    }
    if(kind==='revision'){
      if(record.status!=='DRAFT_NOT_SENT')need(['revision_id','asset_id','from_version','feedback_ref']);
      if(record.status==='RESOLVED'){
        need(['to_version','change_summary','claim_review_ref','reviewer_role','resolution_ref']);
        if(record.classification==='NOT_ASSESSED'||record.to_version===record.from_version)issue('REVISION_INCOMPLETE');
        // Scope-changing work needs a new accepted scope; this record has no field proving it.
        if(record.classification==='NEEDS_SCOPE_CHANGE')issue('NEW_SCOPE_REQUIRED');
      }else forbid(['resolution_ref']);
    }
    if(kind==='reconciliation'){
      if(record.period_start&&record.period_end&&record.period_end<record.period_start)issue('DATE_ORDER');
      const parts=['gross_paid_vnd','refunds_vnd','payment_fees_vnd'];
      if(parts.some(key=>record[key]===null)){
        if(record.net_settled_vnd!==null)issue('NET_WITH_UNKNOWN_COMPONENTS');
      }else{
        const expected=BigInt(record.gross_paid_vnd)-BigInt(record.refunds_vnd)-BigInt(record.payment_fees_vnd);
        if(record.net_settled_vnd!==null&&BigInt(record.net_settled_vnd)!==expected)issue('NET_MISMATCH');
      }
      if(record.status==='DISCREPANCY'&&!record.discrepancies.length)issue('DISCREPANCY_REQUIRED');
      if(record.status==='RECONCILED'){
        need(['offer_id','proposal_ref','order_ref','period_start','period_end','accepted_order_amount_vnd','transaction_refs','provider_event_refs','settlement_ref',...parts,'net_settled_vnd','reconciled_at','reconciliation_receipt_ref']);
        if(record.discrepancies.length)issue('OPEN_DISCREPANCIES');
        if(record.gross_paid_vnd!==record.accepted_order_amount_vnd)issue('ORDER_AMOUNT_MISMATCH');
      }else forbid(['reconciled_at','reconciliation_receipt_ref']);
    }
    return {valid:errors.length===0,errors,scope:'LOCAL_RECORD_PREFLIGHT_ONLY'};
  };
}

const transitions={
  qualification:{DRAFT_NOT_SENT:['NEEDS_INPUT','QUALIFIED_FOR_SCOPING'],NEEDS_INPUT:['QUALIFIED_FOR_SCOPING'],QUALIFIED_FOR_SCOPING:[]},
  proposal:{DRAFT_NOT_SENT:['REVIEWED_FOR_SEND'],REVIEWED_FOR_SEND:['DRAFT_NOT_SENT','SENT_UNCONFIRMED'],SENT_UNCONFIRMED:['SENT_CONFIRMED'],SENT_CONFIRMED:['SCOPE_ACCEPTED'],SCOPE_ACCEPTED:[]},
  acceptance:{NOT_REVIEWED:['REVIEWING'],REVIEWING:['REVISION_REQUESTED','ACCEPTED'],REVISION_REQUESTED:['REVIEWING'],ACCEPTED:[]},
  revision:{DRAFT_NOT_SENT:['RECEIVED'],RECEIVED:['IN_REVIEW'],IN_REVIEW:['RESOLVED'],RESOLVED:[]},
  reconciliation:{PENDING_RECONCILIATION:['DISCREPANCY','RECONCILED'],DISCREPANCY:['PENDING_RECONCILIATION'],RECONCILED:[]}
};
const identityFields={qualification:['brief_ref','intake_receipt_ref'],proposal:['proposal_id','offer_id','version','brief_ref'],acceptance:['offer_id','scope_version','scope_acceptance_ref'],revision:['revision_id','asset_id','from_version'],reconciliation:['offer_id','proposal_ref','order_ref','period_start','period_end','currency']};

export function checkRecordTransition(checkRecord,kind,before,after){
  const prior=checkRecord(kind,before),next=checkRecord(kind,after);
  if(!prior.valid||!next.valid)return {valid:false,errors:[...prior.errors,...next.errors],scope:'LOCAL_RECORD_PREFLIGHT_ONLY'};
  const errors=[];const allowed=transitions[kind][before.status];
  if(before.status!==after.status&&!allowed.includes(after.status))errors.push({path:kind,code:'INVALID_TRANSITION'});
  if(!allowed.length&&!same(before,after))errors.push({path:kind,code:'FINAL_RECORD_IMMUTABLE'});
  for(const key of identityFields[kind])if(before[key]!==null&&!same(before[key],after[key]))errors.push({path:kind+'.'+key,code:'IDENTITY_CHANGED'});
  if(kind==='acceptance'&&before.manifest_ref!==null&&before.manifest_ref!==after.manifest_ref){
    if(before.status!=='REVISION_REQUESTED'||after.status!=='REVIEWING')errors.push({path:kind,code:'MANIFEST_CHANGE_REQUIRES_REVISION_REVIEW'});
    if(after.verification_refs.length||after.delivery_receipt_ref!==null||after.acceptance_ref!==null||after.accepted_at!==null)errors.push({path:kind,code:'STALE_MANIFEST_EVIDENCE'});
  }
  if(kind==='proposal'&&['SENT_UNCONFIRMED','SENT_CONFIRMED','SCOPE_ACCEPTED'].includes(before.status)){
    for(const key of ['proposed_amount_vnd','deliverable_ids','formats_agreed','revision_basis','target_offset_days'])if(!same(before[key],after[key]))errors.push({path:kind+'.'+key,code:'SENT_CONTENT_IMMUTABLE'});
  }
  return {valid:errors.length===0,errors,scope:'LOCAL_RECORD_PREFLIGHT_ONLY'};
}
