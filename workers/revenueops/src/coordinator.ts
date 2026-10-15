import { agents, agentById, defaultPolicy, DomainError, ensure, exactKeys, money, requireRole, text, vietnamDay } from './domain.ts';
import type { Actor, Policy } from './domain.ts';
import { schema } from './storage.ts';
import type { Store } from './storage.ts';

type Reservation = { id: string; agent_id: string; day: string; category: string; amount_vnd: number; status: string };
type Job = { id: string; agent_id: string; day: string; state: string; draft: string; reason: string; reservation_id: string | null };
type Work = { id: string; agent_id: string; creator_id: string; worker_id: string; reviewer_id: string | null;
  finance_id: string | null; amount_vnd: number; state: string; agreement_ref: string; deadline: string; brief: string; artifact_sha256: string | null; reservation_id: string };
export type AiBinding = { run(model: string, options: { messages: {role: string; content: string}[]; max_tokens: number }): Promise<unknown> };

export class Coordinator {
  store: Store; policy: Policy; clock: () => Date;
  constructor(store: Store, policy: Policy = defaultPolicy, clock: () => Date = () => new Date()) {
    this.store=store; this.policy=policy; this.clock=clock; store.exec(schema);
  }
  audit(event: string, actor: Actor, id: string, detail: string) {
    this.store.exec('INSERT INTO audit(event,actor_id,entity_id,detail,created_at) VALUES(?,?,?,?,?)',event,actor.id,id,detail,this.clock().toISOString());
  }
  stopped() {
    const stored=this.store.rows<{value:string}>("SELECT value FROM settings WHERE key='kill_switch'")[0];
    return this.policy.emergencyStop || stored?.value==='true';
  }
  stop(actor: Actor) {
    requireRole(actor,['owner']);
    this.store.transaction(()=>{
      this.store.exec("INSERT INTO settings VALUES('kill_switch','true') ON CONFLICT(key) DO UPDATE SET value='true'");
      this.audit('EMERGENCY_STOP',actor,'portfolio','AI and hiring stopped; existing obligations preserved');
    });
    return { stopped:true };
  }
  reserve(id: string, agentId: string, amountVnd: number, category: 'ai'|'workforce', actor: Actor): Reservation {
    text(id,150); agentById(agentId); money(amountVnd); ensure(amountVnd>0,'ZERO_ESTIMATE');
    const now=this.clock(); const day=vietnamDay(now);
    return this.store.transaction(()=>{
      const old=this.store.rows<Reservation>('SELECT * FROM reservations WHERE id=?',id)[0];
      if(old) {
        ensure(old.agent_id===agentId && old.amount_vnd===amountVnd && old.category===category && old.day===day,'IDEMPOTENCY_CONFLICT');
        return old;
      }
      ensure(!this.stopped(),'EMERGENCY_STOP');
      ensure(this.policy.approvalRef && this.policy.budgetStartsAt && this.policy.budgetExpiresAt,'BUDGET_NOT_APPROVED');
      ensure(now>=new Date(this.policy.budgetStartsAt) && now<new Date(this.policy.budgetExpiresAt),'BUDGET_EXPIRED');
      const total=this.store.rows<{used:number}>("SELECT COALESCE(SUM(amount_vnd),0) AS used FROM reservations WHERE status!='RELEASED'")[0].used;
      const agent=this.store.rows<{used:number}>("SELECT COALESCE(SUM(amount_vnd),0) AS used FROM reservations WHERE agent_id=? AND day=? AND status!='RELEASED'",agentId,day)[0].used;
      ensure(total+amountVnd<=money(this.policy.portfolioBudgetVnd),'PORTFOLIO_BUDGET_EXCEEDED');
      ensure(agent+amountVnd<=money(this.policy.agentDailyBudgetVnd),'AGENT_BUDGET_EXCEEDED');
      this.store.exec('INSERT INTO reservations VALUES(?,?,?,?,?,?,?,?)',id,agentId,day,category,amountVnd,'HELD',this.policy.approvalRef,now.toISOString());
      this.audit('BUDGET_RESERVED',actor,id,`${category}:${amountVnd}`);
      return this.store.rows<Reservation>('SELECT * FROM reservations WHERE id=?',id)[0];
    });
  }
  planDay(actor: Actor) {
    requireRole(actor,['owner','manager']); const day=vietnamDay(this.clock());
    this.store.transaction(()=>{
      for(const a of agents) {
        const id=`daily:${day}:${a.id}`;
        if(this.store.rows('SELECT id FROM jobs WHERE id=?',id).length) continue;
        const draft=`${a.id} · ${a.name}\nViệc tiếp theo: ${a.nextAction}\nĐầu ra: bản nháp có nguồn và checklist; chưa gửi khách/chưa đăng.\nMục tiêu ${a.targetVnd} VND/ngày cần đối soát; hiện chưa có nguồn tài chính.\nCần người phụ trách duyệt sản phẩm và kênh trước khi tiếp cận khách.`;
        this.store.exec('INSERT INTO jobs(id,agent_id,day,state,draft,reason,reservation_id,created_at) VALUES(?,?,?,?,?,?,?,?)',id,a.id,day,'DRAFT',draft,'AWAITING_PRODUCT_AND_CHANNEL_APPROVAL',null,this.clock().toISOString());
        this.audit('DAILY_DRAFT_CREATED',actor,id,'deterministic; no AI or external calls');
      }
    });
    return this.jobs(day);
  }
  jobs(day?: string) {
    return day?this.store.rows<Job>('SELECT * FROM jobs WHERE day=? ORDER BY agent_id',day):this.store.rows<Job>('SELECT * FROM jobs ORDER BY day DESC, agent_id LIMIT 100');
  }
  async generate(agentId: string, actor: Actor, ai?: AiBinding) {
    requireRole(actor,['owner','manager']);agentById(agentId);
    ensure(this.policy.aiEnabled && !this.stopped(),'AI_DISABLED',423);
    ensure(this.policy.maxCallsPerAgentDay===1,'UNSUPPORTED_CALL_POLICY');
    ensure(ai,'AI_BINDING_MISSING',503);
    this.planDay(actor); const day=vietnamDay(this.clock()); const id=`daily:${day}:${agentId}`;
    const a=agentById(agentId);
    this.store.transaction(()=>{
      const job=this.store.rows<Job>('SELECT * FROM jobs WHERE id=?',id)[0];
      ensure(job.state==='DRAFT','ALREADY_ATTEMPTED');
      this.reserve(id,agentId,this.policy.estimatedMaxCallCostVnd,'ai',actor);
      this.store.exec("UPDATE jobs SET state='GENERATING',reservation_id=? WHERE id=?",id,id);
      this.audit('AI_CALL_STARTED',actor,id,this.policy.model);
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // Only server-owned, non-personal catalog facts enter the model; no customer inputs/tools.
      const result=await Promise.race([
        ai.run(this.policy.model,{messages:[
          {role:'system',content:'Viết tiếng Việt. Chỉ tạo bản nháp kế hoạch sản phẩm; không bịa doanh thu, khách hàng hoặc nguồn. Không gọi công cụ, không tự cấp quyền, không xác nhận tiền. Ghi rõ thông tin còn thiếu. Trả JSON duy nhất: {"draft":"...","uncertainties":["..."]}.'},
          {role:'user',content:JSON.stringify({agentId:a.id,product:a.name,scope:a.scope,nextAction:a.nextAction})}
        ],max_tokens:this.policy.maxOutputTokens}),
        new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new DomainError('PROVIDER_TIMEOUT')),this.policy.providerTimeoutMs);})
      ]);
      this.store.exec("UPDATE reservations SET status='SPENT' WHERE id=?",id);
      ensure(result && typeof result==='object' && 'response' in result && typeof result.response==='string','MODEL_RESPONSE_INVALID');
      let parsed: unknown;
      try {parsed=JSON.parse(result.response);} catch {throw new DomainError('MODEL_JSON_INVALID');}
      exactKeys(parsed,['draft','uncertainties']);
      const draft=text(parsed.draft,12000);
      ensure(Array.isArray(parsed.uncertainties) && parsed.uncertainties.length<=20 && parsed.uncertainties.every(x=>typeof x==='string' && x.length<=500),'MODEL_SCHEMA_INVALID');
      this.store.transaction(()=>{
        this.store.exec("UPDATE jobs SET state='REVIEW',draft=?,reason='HUMAN_REVIEW_REQUIRED' WHERE id=?",draft,id);
        this.audit('AI_DRAFT_REQUIRES_REVIEW',actor,id,'output untrusted; no publication or financial evidence');
      });
    } catch(error) {
      this.store.transaction(()=>{
        this.store.exec("UPDATE reservations SET status='UNKNOWN' WHERE id=? AND status='HELD'",id);
        this.store.exec("UPDATE jobs SET state='REVIEW',reason=? WHERE id=?",error instanceof DomainError?error.code:'PROVIDER_ERROR',id);
        this.audit('AI_ATTEMPT_CLOSED',actor,id,'no automatic retry; reservation retained until provider reconciliation');
      });
    } finally {if(timer)clearTimeout(timer);}
    return this.store.rows<Job>('SELECT * FROM jobs WHERE id=?',id)[0];
  }
  offerWork(payload: Record<string,unknown>, actor: Actor) {
    requireRole(actor,['owner','manager']);
    exactKeys(payload,['id','agentId','workerId','amountVnd','agreementRef','brief','deadline']);
    ensure(this.policy.hiringEnabled && !this.stopped(),'HIRING_DISABLED',423);
    const id=text(payload.id,120), agentId=text(payload.agentId), workerId=text(payload.workerId),
      amount=money(payload.amountVnd), agreement=text(payload.agreementRef),brief=text(payload.brief,5000),deadline=text(payload.deadline);
    ensure(Number.isFinite(Date.parse(deadline)) && Date.parse(deadline)>this.clock().valueOf(),'INVALID_DEADLINE',400);
    ensure(actor.id!==workerId,'SELF_ASSIGNMENT');agentById(agentId);
    return this.store.transaction(()=>{
      const old=this.store.rows<Work>('SELECT * FROM work_orders WHERE id=?',id)[0];
      if(old){ensure(old.creator_id===actor.id && old.worker_id===workerId && old.amount_vnd===amount && old.agent_id===agentId && old.agreement_ref===agreement && old.brief===brief && old.deadline===deadline,'IDEMPOTENCY_CONFLICT');return old;}
      this.reserve(`work:${id}`,agentId,amount,'workforce',actor);
      this.store.exec('INSERT INTO work_orders(id,agent_id,creator_id,worker_id,amount_vnd,state,agreement_ref,brief,deadline,reservation_id) VALUES(?,?,?,?,?,?,?,?,?,?)',id,agentId,actor.id,workerId,amount,'OFFERED',agreement,brief,deadline,`work:${id}`);
      this.audit('WORK_OFFERED',actor,id,'funded; acceptance required; no transfer');
      return this.store.rows<Work>('SELECT * FROM work_orders WHERE id=?',id)[0];
    });
  }
  transitionWork(id: string, action: string, payload: Record<string,unknown>, actor: Actor) {
    return this.store.transaction(()=>{
      const w=this.store.rows<Work>('SELECT * FROM work_orders WHERE id=?',id)[0];ensure(w,'WORK_NOT_FOUND',404);
      if(action==='accept') {
        requireRole(actor,['worker']);exactKeys(payload,['agreementRef']);
        ensure(actor.id===w.worker_id,'FORBIDDEN',403);ensure(w.state==='OFFERED','WRONG_STATE');
        ensure(this.clock()<new Date(w.deadline),'OFFER_EXPIRED');ensure(payload.agreementRef===w.agreement_ref,'AGREEMENT_MISMATCH');
        this.store.exec("UPDATE work_orders SET state='ACCEPTED' WHERE id=?",id);
      } else if(action==='submit') {
        requireRole(actor,['worker']);exactKeys(payload,['artifactSha256']);
        ensure(actor.id===w.worker_id,'FORBIDDEN',403);ensure(['ACCEPTED','REVISION'].includes(w.state),'WRONG_STATE');
        ensure(typeof payload.artifactSha256==='string' && /^[a-f0-9]{64}$/.test(payload.artifactSha256),'INVALID_ARTIFACT',400);
        this.store.exec("UPDATE work_orders SET state='SUBMITTED',artifact_sha256=? WHERE id=?",payload.artifactSha256,id);
      } else if(action==='review') {
        requireRole(actor,['reviewer']);exactKeys(payload,['decision','evidenceRef']);
        ensure(actor.id!==w.worker_id && actor.id!==w.creator_id,'INDEPENDENT_REVIEW_REQUIRED');
        ensure(w.state==='SUBMITTED','WRONG_STATE');text(payload.evidenceRef);ensure(['accept','revise','dispute'].includes(String(payload.decision)),'INVALID_DECISION',400);
        this.store.exec('UPDATE work_orders SET state=?,reviewer_id=? WHERE id=?',payload.decision==='accept'?'QA_ACCEPTED':payload.decision==='revise'?'REVISION':'DISPUTE',actor.id,id);
      } else if(action==='payable') {
        requireRole(actor,['finance']);exactKeys(payload,['evidenceRef']);text(payload.evidenceRef);
        ensure(![w.worker_id,w.creator_id,w.reviewer_id].includes(actor.id),'INDEPENDENT_FINANCE_REQUIRED');ensure(w.state==='QA_ACCEPTED','WRONG_STATE');
        this.store.exec("UPDATE work_orders SET state='PAYABLE_NOT_PAID',finance_id=? WHERE id=?",actor.id,id);
      } else throw new DomainError('UNKNOWN_ACTION',404);
      this.audit('WORK_'+action.toUpperCase(),actor,id,JSON.stringify(payload));
      return this.store.rows<Work>('SELECT * FROM work_orders WHERE id=?',id)[0];
    });
  }
  work(actor: Actor) {
    if(actor.role==='worker')return this.store.rows<Work>('SELECT * FROM work_orders WHERE worker_id=?',actor.id);
    requireRole(actor,['owner','manager','reviewer','finance']);return this.store.rows<Work>('SELECT * FROM work_orders ORDER BY id LIMIT 100');
  }
  report(actor: Actor) {
    requireRole(actor,['owner','manager','finance','reviewer']);
    return { day:vietnamDay(this.clock()),mode:'LOCAL_FOUNDATION',release:'HOLD',aiProvider:'Cloudflare Workers AI',
      policy:{...this.policy,emergencyStop:this.stopped()},actuals:{netVnd:null,score:null,portfolioHit:null,allAgentsHit:null,status:'UNKNOWN',reason:'NO_APPROVED_FINANCE_IMPORTER'},
      agents:agents.map(a=>({...a,netVnd:null,score:null,state:'UNKNOWN'})),jobs:this.jobs(),
      reservations:this.store.rows<Reservation>('SELECT * FROM reservations ORDER BY created_at DESC LIMIT 100'),
      audit:this.store.rows('SELECT * FROM audit ORDER BY sequence DESC LIMIT 100') };
  }
}
