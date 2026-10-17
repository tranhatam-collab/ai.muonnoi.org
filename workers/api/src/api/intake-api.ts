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

// Private briefs are stored as plain text data only. Intake creates no order, charge, AI job or outbound message.
export async function handleIntake(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin')
  const reply = (value: unknown, status = 200) => json(value, status, origin, env)
  try {
    const path = new URL(request.url).pathname
    if (path === '/api/intake/capabilities' && request.method === 'GET') {
      return reply({ ok: true, intakeEnabled: env.STUDIO_INTAKE_ENABLED === 'true', offers, maxBriefsPerUser: maxBriefs })
    }
    requireValue(env.STUDIO_INTAKE_ENABLED === 'true', 'INTAKE_DISABLED', 503)
    const match = path.match(/^\/api\/intake\/briefs\/([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})$/i)
    requireValue(path === '/api/intake/briefs' || match, 'NOT_FOUND', 404)
    requireValue(request.method === 'GET' || (request.method === 'POST' && !match), 'METHOD_NOT_ALLOWED', 405)
    // Origin is mandatory for writes. A supplied cross-origin read is rejected as well.
    if (request.method !== 'GET' || origin) requireValue(origin === (env.APP_ORIGIN || 'https://ai.muonnoi.org'), 'ORIGIN_REJECTED', 403)
    const user = await getCurrentUser(request, env)
    requireValue(user, 'LOGIN_REQUIRED', 401)
    const db = env.iai_flow_db
    const active = await db.prepare('SELECT status FROM users WHERE id=?1').bind(user.id).first<{status: string}>()
    requireValue(active?.status === 'active', 'ACCOUNT_INACTIVE', 403)
    if (request.method === 'GET') {
      if (match) {
        const row = await db.prepare(`SELECT ${columns} FROM studio_intake_briefs WHERE id=?1 AND author_id=?2`).bind(match[1].toLowerCase(), user.id).first<BriefRow>()
        requireValue(row, 'NOT_FOUND', 404)
        return reply({ ok: true, actor_id: String(user.id), data: output(row) })
      }
      const rows = await db.prepare(`SELECT ${columns} FROM studio_intake_briefs WHERE author_id=?1 ORDER BY created_at DESC,id LIMIT ?2`).bind(user.id, maxBriefs).all<BriefRow>()
      return reply({ ok: true, actor_id: String(user.id), data: (rows.results || []).map(output) })
    }
    const value = briefOf(await bodyOf(request)); const id = crypto.randomUUID()
    requireValue(value.expectedActor === String(user.id), 'ACTOR_MISMATCH', 403)
    // Quota, account state and insertion share one SQLite statement, including concurrent retries.
    await db.prepare(`INSERT INTO studio_intake_briefs(id,author_id,request_key,payload_json,state,created_at)
      SELECT ?1,?2,?3,?4,'RECEIVED',?5
      WHERE (SELECT COUNT(*) FROM studio_intake_briefs WHERE author_id=?2) < ?6
      AND EXISTS(SELECT 1 FROM users WHERE id=?2 AND status='active')
      ON CONFLICT(author_id,request_key) DO NOTHING`)
      .bind(id, user.id, value.requestKey, value.payload, Date.now(), maxBriefs).run()
    const row = await db.prepare(`SELECT ${columns} FROM studio_intake_briefs WHERE author_id=?1 AND request_key=?2`).bind(user.id, value.requestKey).first<BriefRow>()
    if (!row) {
      const current = await db.prepare('SELECT status FROM users WHERE id=?1').bind(user.id).first<{status: string}>()
      requireValue(current?.status === 'active', 'ACCOUNT_INACTIVE', 403)
      const count = await db.prepare('SELECT COUNT(*) AS total FROM studio_intake_briefs WHERE author_id=?1').bind(user.id).first<{total: number}>()
      requireValue((count?.total ?? 0) < maxBriefs, 'BRIEF_QUOTA_REACHED', 429)
      throw new IntakeError('INTAKE_STORAGE_UNAVAILABLE', 503)
    }
    requireValue(row.payload_json === value.payload, 'REQUEST_KEY_CONFLICT', 409)
    const replayed = row.id !== id
    return reply({ ok: true, actor_id: String(user.id), data: output(row), replayed }, replayed ? 200 : 201)
  } catch (error) {
    if (error instanceof IntakeError) return reply({ ok: false, error: error.code }, error.status)
    // Never log private briefs or database exception text into the shared Worker logger.
    return reply({ ok: false, error: 'INTAKE_STORAGE_UNAVAILABLE' }, 503)
  }
}
