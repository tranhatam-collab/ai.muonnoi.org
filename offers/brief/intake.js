export const OFFERS = ['studio-pilot-14d', 'creator-studio-monthly', 'team-growth-studio-monthly', 'b2b-workflow-setup'];
const limits = {name:[4,120], business:[10,2000], audience:[5,1000], objective:[10,2000], deliverables:[10,3000], source_notes:[0,4000], reviewer_name:[2,120], contact:[0,200]};
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export const JOURNAL = 'muonnoi.intake.receipt.v1';
export function normalize(value) {
  if (!value || typeof value !== 'object' || !OFFERS.includes(value.offer_id) || value.rights_confirmed !== true) throw new Error('INVALID_BRIEF');
  const result = {};
  for (const [key,[min,max]] of Object.entries(limits)) {
    const raw = value[key] ?? (key === 'contact' ? '' : undefined);
    if (typeof raw !== 'string') throw new Error('INVALID_BRIEF');
    const text = raw.trim();
    if (text.length < min || text.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text)) throw new Error('INVALID_BRIEF');
    result[key] = text;
  }
  result.offer_id = value.offer_id; result.rights_confirmed = true;
  return result;
}
async function fingerprint(payload) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
  return Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2,'0')).join('');
}
function validJournal(value) {
  return value && typeof value.actor_id === 'string' && value.actor_id.length > 0 && value.actor_id.length <= 120 && UUID.test(value.key) && /^[a-f0-9]{64}$/.test(value.hash) && ['pending','accepted'].includes(value.state) && (value.state !== 'accepted' || UUID.test(value.id));
}
// Only the random request key, fingerprint and receipt ID persist. Customer input stays in memory.
export class IntakeSession {
  constructor(storage) {
    this.storage = storage; this.pending = null; this.busy = false; this.receipt = null;
    this.journal = null; this.storageError = false;
    try {
      const raw = storage.getItem(JOURNAL);
      if (raw) { const value = JSON.parse(raw); if (!validJournal(value)) throw new Error('INVALID_JOURNAL'); this.journal = value; }
    } catch { this.storageError = true; }
  }
  get locked() { return this.busy || Boolean(this.pending) || this.journal?.state === 'accepted'; }
  save(value) {
    if (this.storageError) throw new Error('STORAGE_UNAVAILABLE');
    try { this.storage.setItem(JOURNAL, JSON.stringify(value)); this.journal = value; }
    catch { this.storageError = true; throw new Error('STORAGE_UNAVAILABLE'); }
  }
  async submit(value, actorId, send) {
    if (this.busy) throw new Error('REQUEST_IN_FLIGHT');
    if (this.journal?.state === 'accepted') throw new Error('ALREADY_RECEIVED');
    if (typeof actorId !== 'string' || !actorId || actorId.length > 120) throw new Error('LOGIN_REQUIRED');
    if (this.journal && this.journal.actor_id !== actorId) throw new Error('ACTOR_MISMATCH');
    this.busy = true;
    try {
      const payload = normalize(value); const hash = await fingerprint(payload);
      if (this.journal && this.journal.hash !== hash) throw new Error('PENDING_PAYLOAD_CHANGED');
      const hadPending = Boolean(this.journal);
      const key = this.journal?.key || crypto.randomUUID();
      this.save({key, hash, state:'pending', actor_id:actorId});
      this.pending = Object.freeze({...payload, request_key:key, expected_actor_id:actorId});
      const response = await send(this.pending);
      if (![200,201].includes(response.status) || response.body?.ok !== true) {
        // Only a definite rejection of the first attempt can unlock edits.
        if (!hadPending && [400,401,403,413,415,429].includes(response.status) && response.body?.ok === false) {
          this.storage.removeItem(JOURNAL); this.journal = null; this.pending = null;
        }
        const code = typeof response.body?.error === 'string' ? response.body.error : 'UNCONFIRMED';
        throw new Error(code);
      }
      const row = response.body.data;
      if (response.body.actor_id !== actorId || !row || row.request_key !== key || row.state !== 'RECEIVED' || !UUID.test(row.id) || !Number.isFinite(row.created_at) || await fingerprint(normalize(row)) !== hash) throw new Error('UNCONFIRMED');
      this.save({key, hash, state:'accepted', id:row.id, actor_id:actorId}); this.receipt = row;
      return row;
    } finally { this.busy = false; }
  }
  async reconcile(rows, actorId) {
    if (!this.journal || !Array.isArray(rows)) return null;
    if (this.journal.actor_id !== actorId) throw new Error('ACTOR_MISMATCH');
    const row = rows.find(row => row?.request_key === this.journal.key);
    if (!row || row.state !== 'RECEIVED' || !UUID.test(row.id) || !Number.isFinite(row.created_at) || await fingerprint(normalize(row)) !== this.journal.hash) return null;
    this.save({...this.journal, state:'accepted', id:row.id}); this.receipt = row; this.pending = null;
    return row;
  }
  startNew() {
    if (this.busy || this.journal?.state === 'pending') throw new Error('PENDING_RECONCILIATION');
    this.storage.removeItem(JOURNAL); this.journal = null; this.pending = null; this.receipt = null;
  }
}
