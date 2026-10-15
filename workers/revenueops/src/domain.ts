import catalogData from '../config/agents.json' with { type: 'json' };
import policyData from '../config/policy.json' with { type: 'json' };

export const agents = Object.freeze(catalogData.map(a => Object.freeze(a)));
export type Agent = typeof agents[number];
export type Policy = Omit<typeof policyData, 'approvalRef' | 'budgetStartsAt' | 'budgetExpiresAt'> & {
  approvalRef: string | null; budgetStartsAt: string | null; budgetExpiresAt: string | null;
};
export const defaultPolicy: Policy = Object.freeze(policyData);
export type Role = 'owner' | 'manager' | 'worker' | 'reviewer' | 'finance';
export type Actor = { id: string; role: Role };

export class DomainError extends Error {
  code: string;
  status: number;
  constructor(code: string, status = 409) { super(code); this.code = code; this.status = status; }
}
export function ensure(condition: unknown, code: string, status = 409): asserts condition {
  if (!condition) throw new DomainError(code, status);
}
export function agentById(id: string): Agent {
  const found = agents.find(a => a.id === id);
  ensure(found, 'UNKNOWN_AGENT', 400); return found;
}
export function money(value: unknown): number {
  ensure(typeof value === 'number' && Number.isSafeInteger(value) && value >= 0, 'INVALID_MONEY', 400);
  return value;
}
export function text(value: unknown, max = 500): string {
  ensure(typeof value === 'string' && value.trim().length > 0 && value.length <= max, 'INVALID_TEXT', 400);
  return value.trim();
}
export function exactKeys(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  ensure(value !== null && typeof value === 'object' && !Array.isArray(value), 'INVALID_BODY', 400);
  ensure(Object.keys(value).every(k => keys.includes(k)), 'UNEXPECTED_FIELD', 400);
}
export function requireRole(actor: Actor, roles: Role[]) {
  ensure(actor && typeof actor.id === 'string' && roles.includes(actor.role), 'FORBIDDEN', 403);
}
export function vietnamDay(now: Date = new Date()): string {
  ensure(Number.isFinite(now.valueOf()), 'INVALID_DATE', 400);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function validateDay(day: string): string {
  const parsed=new Date(day+'T00:00:00Z');
  ensure(/^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === day, 'INVALID_DAY', 400);
  return day;
}
export function scenario(agent: Agent, volumeFactor = 1, marginDeltaBps = 0) {
  ensure(Number.isFinite(volumeFactor) && volumeFactor >= 0 && volumeFactor <= 3, 'INVALID_VOLUME', 400);
  ensure(Number.isSafeInteger(marginDeltaBps) && Math.abs(marginDeltaBps) <= 3000, 'INVALID_MARGIN', 400);
  const baseMarginBps = 10000 - agent.variableCostBps;
  const marginBps = baseMarginBps + marginDeltaBps;
  ensure(marginBps > 0 && marginBps <= 10000, 'INVALID_MARGIN', 400);
  const baseOrders = Math.ceil((agent.targetVnd + agent.fixedDailyVnd) * 10000 / (agent.priceVnd * baseMarginBps));
  const orders = Math.floor(baseOrders * volumeFactor);
  const grossVnd = orders * agent.priceVnd;
  const variableVnd = Math.round(grossVnd * (10000 - marginBps) / 10000);
  return { agentId: agent.id, evidence: 'SCENARIO_ONLY', orders, grossVnd, variableVnd, fixedVnd: agent.fixedDailyVnd,
    netVnd: grossVnd - variableVnd - agent.fixedDailyVnd, qaMinutes: orders * agent.qaMinutes,
    funnelNeeded: Math.ceil(orders * 10000 / agent.conversionBps) };
}
export function portfolioScenario(volumeFactor = 1, marginDeltaBps = 0) {
  const rows = agents.map(a => scenario(a, volumeFactor, marginDeltaBps));
  return { evidence: 'SCENARIO_ONLY', rows, orders: rows.reduce((s,a) => s+a.orders,0),
    grossVnd: rows.reduce((s,a) => s+a.grossVnd,0), variableVnd: rows.reduce((s,a) => s+a.variableVnd,0),
    fixedVnd: rows.reduce((s,a) => s+a.fixedVnd,0), netVnd: rows.reduce((s,a) => s+a.netVnd,0),
    qaHours: rows.reduce((s,a) => s+a.qaMinutes,0)/60 };
}
export const evidenceKinds = ['bank', 'fees', 'costs', 'refunds', 'reserves', 'allocation'] as const;
export type FinanceInput = {
  agentId: string; day: string; receiptsVnd: number; feesVnd: number; costsVnd: number;
  refundsVnd: number; reserveIncreaseVnd: number; reserveReleaseVnd: number;
  sources: Partial<Record<typeof evidenceKinds[number], { complete: boolean; reference: string }>>;
};
// A calculation from trusted importer input; this function cannot authenticate bank evidence.
export function scoreFinance(input?: FinanceInput) {
  if (!input || evidenceKinds.some(k => !input.sources[k]?.complete || !input.sources[k]?.reference?.trim()))
    return { state: 'UNKNOWN', netVnd: null, score: null, calculationOnly: true };
  const a = agentById(input.agentId); validateDay(input.day);
  const netVnd = money(input.receiptsVnd) - money(input.feesVnd) - money(input.costsVnd)
    - money(input.refundsVnd) - money(input.reserveIncreaseVnd) + money(input.reserveReleaseVnd);
  ensure(Number.isSafeInteger(netVnd), 'MONEY_OVERFLOW', 400);
  return { state: netVnd >= a.targetVnd ? 'HIT' : 'MISS', netVnd,
    score: Math.min(100, Math.max(0, netVnd / a.targetVnd * 100)), calculationOnly: true };
}
export function expansionAllowance(netVnd: number | null, targetVnd: number, approvedVnd: number, freeCashVnd: number, alreadyReservedVnd: number) {
  [targetVnd, approvedVnd, freeCashVnd, alreadyReservedVnd].forEach(money);
  if (netVnd === null) return null;
  ensure(Number.isSafeInteger(netVnd), 'INVALID_MONEY', 400);
  return Math.max(0, Math.min(approvedVnd, freeCashVnd, Math.floor(Math.max(0, netVnd - targetVnd) * 30 / 100) - alreadyReservedVnd));
}
export function portfolioScore(inputs: FinanceInput[]) {
  ensure(new Set(inputs.map(x=>x.agentId)).size === inputs.length, 'DUPLICATE_AGENT', 400);
  inputs.forEach(i=>{agentById(i.agentId);validateDay(i.day);});
  ensure(new Set(inputs.map(i=>i.day)).size<=1,'MIXED_FINANCE_DAYS',400);
  const rows=agents.map(a=>({agentId:a.id,...scoreFinance(inputs.find(i=>i.agentId===a.id))}));
  const complete=rows.every(r=>r.netVnd!==null);
  const netVnd=complete ? rows.reduce((n,r)=>n+(r.netVnd ?? 0),0) : null;
  return {rows,netVnd,portfolioHit:netVnd===null?null:netVnd>=55000000,
    allAgentsHit:complete?rows.every(r=>r.state==='HIT'):null};
}
export function attributeReceipts(receipts: {provider:string;channel:string;reference:string;amountVnd:number;isTest:boolean;selfPurchase:boolean;allocations:{agentId:string;amountVnd:number}[]}[]) {
  const seen=new Set<string>();const totals=Object.fromEntries(agents.map(a=>[a.id,0]));
  for(const r of receipts){
    const key=JSON.stringify([text(r.provider),text(r.channel),text(r.reference)]);ensure(!seen.has(key),'DUPLICATE_TRANSACTION',400);seen.add(key);
    money(r.amountVnd);ensure(r.allocations.length>0,'ALLOCATION_REQUIRED',400);
    ensure(new Set(r.allocations.map(a=>a.agentId)).size===r.allocations.length,'DUPLICATE_ALLOCATION',400);
    let allocated=0;for(const a of r.allocations){agentById(a.agentId);allocated+=money(a.amountVnd);}
    ensure(allocated===r.amountVnd && Number.isSafeInteger(allocated),'ALLOCATION_MISMATCH',400);
    ensure(typeof r.isTest==='boolean' && typeof r.selfPurchase==='boolean','CLASSIFICATION_REQUIRED',400);
    if(!r.isTest && !r.selfPurchase)for(const a of r.allocations)totals[a.agentId]+=a.amountVnd;
  }
  ensure(Object.values(totals).every(Number.isSafeInteger),'MONEY_OVERFLOW',400);return totals;
}
