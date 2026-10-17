import type { Env } from '../env'
import { json } from '../lib/response'
import { getCurrentUser } from '../security/session'

const offers = ['studio-pilot-14d', 'creator-studio-monthly', 'team-growth-studio-monthly', 'b2b-workflow-setup']
const maxBriefs = 20
const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i
class IntakeError extends Error {
  constructor(public code: string, public status = 400) { super(code) }
}
function requireValue(condition: unknown, code: string, status = 400): asserts condition {
  if (!condition) throw new IntakeError(code, status)
}
async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  requireValue(request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() === 'application/json', 'JSON_REQUIRED', 415)
  const reader = request.body?.getReader()
  requireValue(reader, 'BODY_REQUIRED')
  const chunks: Uint8Array[] = []; let size = 0
  while (true) {
    const part = await reader.read(); if (part.done) break
    size += part.value.byteLength
    if (size > 24000) { await reader.cancel(); throw new IntakeError('BODY_TOO_LARGE', 413) }
    chunks.push(part.value)
  }
  const bytes = new Uint8Array(size); let offset = 0
  for (const part of chunks) { bytes.set(part, offset); offset += part.length }
  let value: unknown
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) }
  catch { throw new IntakeError('INVALID_JSON') }
  requireValue(value && typeof value === 'object' && !Array.isArray(value), 'INVALID_OBJECT')
  return value as Record<string, unknown>
}
function briefOf(value: Record<string, unknown>) {
  const fields = ['request_key', 'expected_actor_id', 'name', 'offer_id', 'business', 'audience', 'objective', 'deliverables', 'source_notes', 'reviewer_name', 'rights_confirmed', 'contact']
  requireValue(Object.keys(value).every(key => fields.includes(key)), 'UNEXPECTED_FIELD')
  function text(key: string, min: number, max: number, optional = false) {
    const raw = value[key]
    if (raw === undefined && optional) return ''
    requireValue(typeof raw === 'string', `INVALID_${key.toUpperCase()}`)
    const normalized = raw.trim()
    requireValue(normalized.length >= min && normalized.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(normalized), `INVALID_${key.toUpperCase()}`)
    return normalized
  }
  requireValue(typeof value.request_key === 'string' && uuid.test(value.request_key), 'REQUEST_KEY_REQUIRED')
  requireValue(typeof value.expected_actor_id === 'string' && value.expected_actor_id.length >= 1 && value.expected_actor_id.length <= 120, 'EXPECTED_ACTOR_REQUIRED')
  requireValue(typeof value.offer_id === 'string' && offers.includes(value.offer_id), 'OFFER_INVALID')
  requireValue(value.rights_confirmed === true, 'RIGHTS_CONFIRMATION_REQUIRED')
  const payload = {
    name: text('name', 4, 120), offer_id: value.offer_id,
    business: text('business', 10, 2000), audience: text('audience', 5, 1000),
    objective: text('objective', 10, 2000), deliverables: text('deliverables', 10, 3000),
    source_notes: text('source_notes', 0, 4000), reviewer_name: text('reviewer_name', 2, 120),
    rights_confirmed: true, contact: text('contact', 0, 200, true)
  }
  return { requestKey: value.request_key.toLowerCase(), expectedActor: value.expected_actor_id, payload: JSON.stringify(payload) }
}
type BriefRow = { id: string; request_key: string; payload_json: string; state: 'RECEIVED'; created_at: number }
const columns = 'id,request_key,payload_json,state,created_at'
function output(row: BriefRow) {
  return { id: row.id, request_key: row.request_key, ...JSON.parse(row.payload_json), state: row.state, created_at: row.created_at }
}

type TriageState = { brief_id: string; version: number; share_with_studio: number; status: string; customer_message: string; updated_at: number }
type IntakeEvent = { id: string; actor_id: string; request_key: string; mutation_json: string; payload_hash: string; action: string; before_version: number; version: number; share_with_studio: number; status: string; customer_message: string; created_at: number }
const eventColumns = 'id,actor_id,request_key,mutation_json,payload_hash,action,before_version,version,share_with_studio,status,customer_message,created_at'
function stateOutput(state: TriageState) {
  return { version: state.version, share_with_studio: state.share_with_studio === 1, status: state.status, customer_message: state.customer_message, updated_at: state.updated_at }
}
function eventOutput(event: IntakeEvent) {
  const { mutation_json, ...safe } = event
  return { ...safe, share_with_studio: event.share_with_studio === 1 }
}
async function triageState(db: D1Database, id: string, consentRequired = false): Promise<TriageState> {
  const state = await db.prepare('SELECT * FROM studio_intake_state WHERE brief_id=?1 AND (?2=0 OR share_with_studio=1)').bind(id, consentRequired ? 1 : 0).first<TriageState>()
  requireValue(state, consentRequired ? 'NOT_FOUND' : 'INTAKE_STORAGE_UNAVAILABLE', consentRequired ? 404 : 503)
  return state
}
async function triageOutput(db: D1Database, id: string, history = false, consentRequired = false) {
  const state = await triageState(db, id, consentRequired)
  if (!history) return stateOutput(state)
  const events = await db.prepare(`SELECT ${eventColumns} FROM studio_intake_events WHERE brief_id=?1 ORDER BY version DESC LIMIT 101`).bind(id).all<IntakeEvent>()
  // Recheck consent after collecting history so a revoked request cannot return its earlier body snapshot.
  if (consentRequired) await triageState(db, id, true)
  return { ...stateOutput(state), history: (events.results || []).slice(0, 100).map(eventOutput), history_has_more: (events.results || []).length > 100 }
}
async function mutationOf(request: Request, actorId: string, briefId: string, sharing: boolean) {
  const value = await bodyOf(request)
  const allowed = sharing ? ['request_key','expected_actor_id','version','share_with_studio'] : ['request_key','expected_actor_id','version','status','customer_message']
  requireValue(Object.keys(value).every(key => allowed.includes(key)), 'UNEXPECTED_FIELD')
  requireValue(typeof value.expected_actor_id === 'string' && value.expected_actor_id.length > 0 && value.expected_actor_id.length <= 120, 'EXPECTED_ACTOR_REQUIRED')
  requireValue(value.expected_actor_id === actorId, 'ACTOR_MISMATCH', 403)
  requireValue(typeof value.request_key === 'string' && uuid.test(value.request_key), 'REQUEST_KEY_REQUIRED')
  requireValue(Number.isSafeInteger(value.version) && (value.version as number) >= 0, 'VERSION_REQUIRED')
  const version = value.version as number
  let action: string; let targetShare: number | null = null; let targetStatus: string | null = null; let message: string | null = null; let canonical: string
  if (sharing) {
    requireValue(typeof value.share_with_studio === 'boolean', 'SHARING_REQUIRED')
    targetShare = value.share_with_studio ? 1 : 0; action = targetShare ? 'SHARE' : 'REVOKE'
    canonical = JSON.stringify({ brief_id: briefId, action, version, share_with_studio: value.share_with_studio })
  } else {
    requireValue(typeof value.status === 'string' && ['IN_REVIEW','NEEDS_INFORMATION','PROPOSAL_READY','DECLINED'].includes(value.status), 'STATUS_INVALID')
    requireValue(typeof value.customer_message === 'string', 'CUSTOMER_MESSAGE_REQUIRED')
    message = value.customer_message.trim()
    requireValue(message.length >= 8 && message.length <= 2000 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(message), 'CUSTOMER_MESSAGE_REQUIRED')
    action = 'TRIAGE'; targetStatus = value.status
    canonical = JSON.stringify({ brief_id: briefId, action, version, status: targetStatus, customer_message: message })
  }
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical)))
  const hash = Array.from(digest, value => value.toString(16).padStart(2, '0')).join('')
  return { key: value.request_key.toLowerCase(), version, action, targetShare, targetStatus, message, canonical, hash }
}
async function mutateTriage(request: Request, env: Env, actorId: string, briefId: string, sharing: boolean) {
  const db = env.iai_flow_db
  // Owner access is checked before reading an event receipt; operator access always requires current consent.
  if (sharing) {
    requireValue(await db.prepare('SELECT id FROM studio_intake_briefs WHERE id=?1 AND author_id=?2').bind(briefId, actorId).first(), 'NOT_FOUND', 404)
  }
  const initial = await triageState(db, briefId, !sharing)
  const mutation = await mutationOf(request, actorId, briefId, sharing)
  const lookup = () => db.prepare(`SELECT ${eventColumns} FROM studio_intake_events WHERE actor_id=?1 AND request_key=?2`).bind(actorId, mutation.key).first<IntakeEvent>()
  const existing = await lookup()
  if (existing) {
    requireValue(existing.mutation_json === mutation.canonical, 'REQUEST_KEY_CONFLICT', 409)
    return { data: { id: briefId, triage: await triageOutput(db, briefId, true, !sharing) }, receipt: eventOutput(existing), replayed: true }
  }
  requireValue(initial.version === mutation.version, 'VERSION_CONFLICT', 409)
  if (sharing) requireValue(initial.share_with_studio !== mutation.targetShare, 'STATE_CONFLICT', 409)
  else {
    const transitions: Record<string, string[]> = { RECEIVED: ['IN_REVIEW'], IN_REVIEW: ['NEEDS_INFORMATION','PROPOSAL_READY','DECLINED'], NEEDS_INFORMATION: ['IN_REVIEW'] }
    requireValue(transitions[initial.status]?.includes(mutation.targetStatus!), 'STATE_CONFLICT', 409)
  }
  const eventId = crypto.randomUUID(); const now = Date.now()
  const targetShare = mutation.targetShare ?? initial.share_with_studio
  const targetStatus = mutation.targetStatus ?? initial.status
  const message = mutation.message ?? initial.customer_message
  // D1 batch is one transaction. Consent, version and active actor are checked in the write itself.
  await db.batch([
    db.prepare(`INSERT INTO studio_intake_events(id,brief_id,actor_id,request_key,mutation_json,payload_hash,action,before_version,version,share_with_studio,status,customer_message,created_at)
      SELECT ?1,s.brief_id,?2,?3,?4,?5,?6,s.version,s.version+1,?7,?8,?9,?10
      FROM studio_intake_state s JOIN studio_intake_briefs b ON b.id=s.brief_id
      WHERE s.brief_id=?11 AND s.version=?12 AND s.status=?13 AND s.share_with_studio=?14
      AND ((?15=1 AND b.author_id=?2) OR (?15=0 AND s.share_with_studio=1))
      AND EXISTS(SELECT 1 FROM users WHERE id=?2 AND status='active')
      ON CONFLICT(actor_id,request_key) DO NOTHING`)
      .bind(eventId,actorId,mutation.key,mutation.canonical,mutation.hash,mutation.action,targetShare,targetStatus,message,now,briefId,mutation.version,initial.status,initial.share_with_studio,sharing ? 1 : 0),
    db.prepare(`UPDATE studio_intake_state SET
      version=(SELECT version FROM studio_intake_events WHERE id=?1),
      share_with_studio=(SELECT share_with_studio FROM studio_intake_events WHERE id=?1),
      status=(SELECT status FROM studio_intake_events WHERE id=?1),
      customer_message=(SELECT customer_message FROM studio_intake_events WHERE id=?1),
      updated_at=(SELECT created_at FROM studio_intake_events WHERE id=?1)
      WHERE brief_id=?2 AND EXISTS(SELECT 1 FROM studio_intake_events WHERE id=?1 AND before_version=studio_intake_state.version)`)
      .bind(eventId,briefId)
  ])
  const event = await lookup()
  if (!event) {
    await triageState(db, briefId, !sharing)
    const active = await db.prepare('SELECT status FROM users WHERE id=?1').bind(actorId).first<{status:string}>()
    requireValue(active?.status === 'active', 'ACCOUNT_INACTIVE', 403)
    throw new IntakeError('VERSION_CONFLICT', 409)
  }
  requireValue(event.mutation_json === mutation.canonical, 'REQUEST_KEY_CONFLICT', 409)
  const current = await triageState(db, briefId, !sharing)
  requireValue(current.version >= event.version, 'INTAKE_STORAGE_UNAVAILABLE', 503)
  return { data: { id: briefId, triage: await triageOutput(db, briefId, true, !sharing) }, receipt: eventOutput(event), replayed: event.id !== eventId }
}

// Private briefs are stored as plain text data only. Intake creates no order, charge, AI job or outbound message.
export async function handleIntake(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin')
  const reply = (value: unknown, status = 200) => json(value, status, origin, env)
  try {
    const url = new URL(request.url); const path = url.pathname
    if (path === '/api/intake/capabilities' && request.method === 'GET') {
      return reply({ ok: true, intakeEnabled: env.STUDIO_INTAKE_ENABLED === 'true', triageEnabled: env.STUDIO_TRIAGE_ENABLED === 'true', offers, maxBriefsPerUser: maxBriefs })
    }
    requireValue(env.STUDIO_INTAKE_ENABLED === 'true', 'INTAKE_DISABLED', 503)
    const match = path.match(/^\/api\/intake\/briefs\/([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})(?:\/(sharing))?$/i)
    const operatorMatch = path.match(/^\/api\/intake\/operator\/briefs(?:\/([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})(?:\/(triage))?)?$/i)
    const sharing = match?.[2] === 'sharing'; const operatorMutation = operatorMatch?.[2] === 'triage'
    requireValue(path === '/api/intake/briefs' || match || operatorMatch, 'NOT_FOUND', 404)
    if (sharing || operatorMatch) requireValue(env.STUDIO_TRIAGE_ENABLED === 'true', 'TRIAGE_DISABLED', 503)
    requireValue((request.method === 'GET' && !sharing && !operatorMutation) || (request.method === 'POST' && (path === '/api/intake/briefs' || sharing || operatorMutation)), 'METHOD_NOT_ALLOWED', 405)
    // Origin is mandatory for writes. A supplied cross-origin read is rejected as well.
    if (request.method !== 'GET' || origin) requireValue(origin === (env.APP_ORIGIN || 'https://ai.muonnoi.org'), 'ORIGIN_REJECTED', 403)
    const user = await getCurrentUser(request, env)
    requireValue(user, 'LOGIN_REQUIRED', 401)
    // Identity may come from an INTEGER legacy schema or the current TEXT schema.
    // Bind the same canonical string everywhere; SQLite otherwise stores numeric TEXT bindings as '1.0'.
    const actorId = String(user.id)
    const db = env.iai_flow_db
    const active = await db.prepare('SELECT status FROM users WHERE id=?1').bind(actorId).first<{status: string}>()
    requireValue(active?.status === 'active', 'ACCOUNT_INACTIVE', 403)
    if (operatorMatch) {
      const operators = (env.STUDIO_OPERATOR_IDS || '').split(',').map(id => id.trim()).filter(Boolean)
      requireValue(operators.includes(actorId), 'OPERATOR_REQUIRED', 403)
      const id = operatorMatch[1]?.toLowerCase()
      if (operatorMutation) return reply({ ok: true, actor_id: actorId, ...await mutateTriage(request, env, actorId, id, false) })
      if (id) {
        const row = await db.prepare(`SELECT b.id,b.request_key,b.payload_json,b.state,b.created_at FROM studio_intake_briefs b JOIN studio_intake_state s ON s.brief_id=b.id WHERE b.id=?1 AND s.share_with_studio=1`).bind(id).first<BriefRow>()
        requireValue(row, 'NOT_FOUND', 404)
        return reply({ ok: true, actor_id: actorId, data: { ...output(row), triage: await triageOutput(db, id, true, true) } })
      }
      const cursor = url.searchParams.get('cursor') || ''
      requireValue(!cursor || uuid.test(cursor), 'CURSOR_INVALID')
      const rows = await db.prepare(`SELECT b.id,b.created_at,json_extract(b.payload_json,'$.name') AS name,json_extract(b.payload_json,'$.offer_id') AS offer_id,s.* FROM studio_intake_briefs b JOIN studio_intake_state s ON s.brief_id=b.id WHERE s.share_with_studio=1 AND b.id>?1 ORDER BY b.id LIMIT 51`).bind(cursor.toLowerCase()).all<TriageState & {id:string;name:string;offer_id:string;created_at:number}>()
      const page = (rows.results || []).slice(0, 50); const more = (rows.results || []).length > 50
      return reply({ ok: true, actor_id: actorId, data: page.map(row => ({ id: row.id, name: row.name, offer_id: row.offer_id, created_at: row.created_at, triage: stateOutput(row) })), has_more: more, next_cursor: more ? page[page.length - 1].id : null })
    }
    if (sharing) return reply({ ok: true, actor_id: actorId, ...await mutateTriage(request, env, actorId, match![1].toLowerCase(), true) })
    if (request.method === 'GET') {
      if (match) {
        const row = await db.prepare(`SELECT ${columns} FROM studio_intake_briefs WHERE id=?1 AND author_id=?2`).bind(match[1].toLowerCase(), actorId).first<BriefRow>()
        requireValue(row, 'NOT_FOUND', 404)
        return reply({ ok: true, actor_id: actorId, data: { ...output(row), ...(env.STUDIO_TRIAGE_ENABLED === 'true' ? { triage: await triageOutput(db, row.id, true) } : {}) } })
      }
      const rows = await db.prepare(`SELECT ${columns} FROM studio_intake_briefs WHERE author_id=?1 ORDER BY created_at DESC,id LIMIT ?2`).bind(actorId, maxBriefs).all<BriefRow>()
      const data = await Promise.all((rows.results || []).map(async row => ({ ...output(row), ...(env.STUDIO_TRIAGE_ENABLED === 'true' ? { triage: await triageOutput(db, row.id) } : {}) })))
      return reply({ ok: true, actor_id: actorId, data })
    }
    const value = briefOf(await bodyOf(request)); const id = crypto.randomUUID()
    requireValue(value.expectedActor === actorId, 'ACTOR_MISMATCH', 403)
    // Quota, account state and insertion share one SQLite statement, including concurrent retries.
    await db.prepare(`INSERT INTO studio_intake_briefs(id,author_id,request_key,payload_json,state,created_at)
      SELECT ?1,?2,?3,?4,'RECEIVED',?5
      WHERE (SELECT COUNT(*) FROM studio_intake_briefs WHERE author_id=?2) < ?6
      AND EXISTS(SELECT 1 FROM users WHERE id=?2 AND status='active')
      ON CONFLICT(author_id,request_key) DO NOTHING`)
      .bind(id, actorId, value.requestKey, value.payload, Date.now(), maxBriefs).run()
    const row = await db.prepare(`SELECT ${columns} FROM studio_intake_briefs WHERE author_id=?1 AND request_key=?2`).bind(actorId, value.requestKey).first<BriefRow>()
    if (!row) {
      const current = await db.prepare('SELECT status FROM users WHERE id=?1').bind(actorId).first<{status: string}>()
      requireValue(current?.status === 'active', 'ACCOUNT_INACTIVE', 403)
      const count = await db.prepare('SELECT COUNT(*) AS total FROM studio_intake_briefs WHERE author_id=?1').bind(actorId).first<{total: number}>()
      requireValue((count?.total ?? 0) < maxBriefs, 'BRIEF_QUOTA_REACHED', 429)
      throw new IntakeError('INTAKE_STORAGE_UNAVAILABLE', 503)
    }
    requireValue(row.payload_json === value.payload, 'REQUEST_KEY_CONFLICT', 409)
    const replayed = row.id !== id
    return reply({ ok: true, actor_id: actorId, data: output(row), replayed }, replayed ? 200 : 201)
  } catch (error) {
    if (error instanceof IntakeError) return reply({ ok: false, error: error.code }, error.status)
    // Never log private briefs or database exception text into the shared Worker logger.
    return reply({ ok: false, error: 'INTAKE_STORAGE_UNAVAILABLE' }, 503)
  }
}
