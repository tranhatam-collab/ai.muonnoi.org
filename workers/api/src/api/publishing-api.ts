import type { Env } from '../env'
import { json } from '../lib/response'
import { getCurrentUser } from '../security/session'

class PublishingError extends Error {
  constructor(public code: string, public status: number) { super(code) }
}
function requireValue(condition: unknown, code: string, status = 400): asserts condition {
  if (!condition) throw new PublishingError(code, status)
}
const formats = ['discussion', 'article', 'guide', 'story', 'resource', 'report']
function keys(value: Record<string, unknown>, allowed: string[]) {
  requireValue(value && typeof value === 'object' && !Array.isArray(value), 'INVALID_OBJECT')
  requireValue(Object.keys(value).every(k => allowed.includes(k)), 'UNEXPECTED_FIELD')
}
async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  requireValue(request.headers.get('Content-Type')?.split(';')[0] === 'application/json', 'JSON_REQUIRED', 415)
  const reader = request.body?.getReader()
  requireValue(reader, 'BODY_REQUIRED')
  const chunks: Uint8Array[] = []; let size = 0
  while (true) {
    const part = await reader.read(); if (part.done) break
    size += part.value.byteLength
    if (size > 240000) { await reader.cancel(); throw new PublishingError('BODY_TOO_LARGE', 413) }
    chunks.push(part.value)
  }
  const bytes = new Uint8Array(size); let offset = 0
  for (const part of chunks) { bytes.set(part, offset); offset += part.length }
  let value: unknown
  try { value = JSON.parse(new TextDecoder().decode(bytes)) } catch { throw new PublishingError('INVALID_JSON', 400) }
  requireValue(value && typeof value === 'object' && !Array.isArray(value), 'INVALID_OBJECT')
  return value as Record<string, unknown>
}
function content(value: Record<string, unknown>) {
  keys(value, ['title','body','topic','format','sources','rightsConfirmed','aiAssisted','version','requestKey'])
  const title = typeof value.title === 'string' ? value.title.trim() : ''
  const body = typeof value.body === 'string' ? value.body.trim() : ''
  const topic = typeof value.topic === 'string' ? value.topic.trim() : ''
  requireValue(title.length >= 4 && title.length <= 200, 'TITLE_LENGTH')
  requireValue(body.length >= 8 && body.length <= 50000, 'BODY_LENGTH')
  requireValue(topic.length >= 1 && topic.length <= 80, 'TOPIC_LENGTH')
  requireValue(typeof value.format === 'string' && formats.includes(value.format), 'FORMAT_INVALID')
  requireValue(typeof value.rightsConfirmed === 'boolean' && typeof value.aiAssisted === 'boolean', 'ATTESTATION_REQUIRED')
  requireValue(Array.isArray(value.sources) && value.sources.length <= 10, 'SOURCES_INVALID')
  for (const source of value.sources) {
    requireValue(typeof source === 'string' && source.length <= 2048, 'SOURCE_INVALID')
    let url: URL; try { url = new URL(source) } catch { throw new PublishingError('SOURCE_INVALID', 400) }
    requireValue(url.protocol === 'https:' && !url.username && !url.password, 'SOURCE_HTTPS_REQUIRED')
  }
  return { title, body, topic, format: value.format, sources: JSON.stringify(value.sources), rights: value.rightsConfirmed ? 1 : 0, ai: value.aiAssisted ? 1 : 0 }
}
type Draft = {
  id: string; author_id: number; title: string; body: string; topic: string; format: string;
  sources: string; rights_confirmed: number; ai_assisted: number; version: number; state: string;
  reviewer_id: number | null; approved_version: number | null; post_id: number | null;
  review_note: string | null; created_at: number; updated_at: number
}
const columns = 'id,author_id,title,body,topic,format,sources,rights_confirmed,ai_assisted,version,state,reviewer_id,approved_version,post_id,review_note,created_at,updated_at'
function output(row: Draft) { return { ...row, sources: JSON.parse(row.sources) } }
function slug(topic: string) {
  return topic.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'chia-se'
}

// Session identity and roles come from the database. No AI, outbound webhook, social or payment calls.
export async function handlePublishing(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin')
  const reply = (data: unknown, status = 200) => json(data, status, origin, env)
  try {
    const path = new URL(request.url).pathname
    if (path === '/api/publishing/capabilities' && request.method === 'GET') {
      return reply({ ok: true, formats, publishEnabled: env.STUDIO_PUBLISH_ENABLED === 'true', aiEnabled: false, socialEnabled: false, budgetVnd: 0 })
    }
    requireValue(['GET','POST','PUT'].includes(request.method), 'METHOD_NOT_ALLOWED', 405)
    if (request.method !== 'GET') requireValue(origin === (env.APP_ORIGIN || 'https://ai.muonnoi.org'), 'ORIGIN_REJECTED', 403)
    const user = await getCurrentUser(request, env)
    requireValue(user, 'LOGIN_REQUIRED', 401)
    const active = await env.iai_flow_db.prepare('SELECT status FROM users WHERE id=?1').bind(user.id).first<{status:string}>()
    requireValue(active?.status === 'active', 'ACCOUNT_INACTIVE', 403)
    const reviewer = user.role === 'admin' || user.role === 'moderator'
    const db = env.iai_flow_db; const now = Date.now()
    const match = path.match(/^\/api\/publishing\/drafts\/([a-f0-9-]{36})(?:\/(submit|review|publish|audit))?$/)
    if (path === '/api/publishing/drafts' && request.method === 'GET') {
      const rows = await db.prepare(`SELECT ${columns} FROM publishing_drafts WHERE author_id=?1 OR ?2=1 ORDER BY updated_at DESC,id LIMIT 100`).bind(user.id, reviewer ? 1 : 0).all<Draft>()
      return reply({ ok: true, data: (rows.results || []).map(output), canReview: reviewer, actorId: user.id })
    }
    if (path === '/api/publishing/drafts' && request.method === 'POST') {
      const value = await bodyOf(request); const c = content(value)
      requireValue(typeof value.requestKey === 'string' && /^[a-f0-9-]{36}$/.test(value.requestKey), 'REQUEST_KEY_REQUIRED')
      const id = crypto.randomUUID()
      await db.prepare(`INSERT INTO publishing_drafts(id,author_id,request_key,title,body,topic,format,sources,rights_confirmed,ai_assisted,last_actor,last_action,created_at,updated_at)
        VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?2,'CREATE',?11,?11) ON CONFLICT(author_id,request_key) DO NOTHING`)
        .bind(id,user.id,value.requestKey,c.title,c.body,c.topic,c.format,c.sources,c.rights,c.ai,now).run()
      const row = await db.prepare(`SELECT ${columns} FROM publishing_drafts WHERE author_id=?1 AND request_key=?2`).bind(user.id,value.requestKey).first<Draft>()
      requireValue(row, 'STORAGE_UNAVAILABLE', 503)
      // Idempotency keys cannot silently accept a different payload.
      requireValue(row.title===c.title && row.body===c.body && row.topic===c.topic && row.format===c.format && row.sources===c.sources && row.rights_confirmed===c.rights && row.ai_assisted===c.ai, 'REQUEST_KEY_CONFLICT', 409)
      return reply({ok:true,data:output(row)},201)
    }
    requireValue(match, 'NOT_FOUND', 404)
    const [ ,id,action ] = match
    const get = () => db.prepare(`SELECT ${columns} FROM publishing_drafts WHERE id=?1`).bind(id).first<Draft>()
    const draft = await get()
    requireValue(draft && (String(draft.author_id) === String(user.id) || reviewer), 'NOT_FOUND', 404)
    const owner = String(draft.author_id) === String(user.id)
    if (!action && request.method === 'GET') return reply({ok:true,data:output(draft)})
    if (action === 'audit' && request.method === 'GET') return reply({ok:true,data:(await db.prepare('SELECT version,actor_id,action,state,happened_at FROM publishing_audit WHERE draft_id=?1 ORDER BY id').bind(id).all()).results})
    const value = await bodyOf(request)
    requireValue(Number.isSafeInteger(value.version) && value.version === draft.version, 'VERSION_CONFLICT', 409)
    let changed = 0
    if (!action && request.method === 'PUT') {
      requireValue(owner, 'AUTHOR_REQUIRED', 403)
      requireValue(draft.state !== 'PUBLISHED', 'PUBLISHED_IMMUTABLE', 409)
      const c = content(value)
      const result = await db.prepare(`UPDATE publishing_drafts SET title=?1,body=?2,topic=?3,format=?4,sources=?5,rights_confirmed=?6,ai_assisted=?7,version=version+1,state='DRAFT',approved_version=NULL,reviewer_id=NULL,review_note=NULL,last_actor=?8,last_action='EDIT',updated_at=?9 WHERE id=?10 AND version=?11 AND state<>'PUBLISHED'`)
        .bind(c.title,c.body,c.topic,c.format,c.sources,c.rights,c.ai,user.id,now,id,draft.version).run()
      changed = result.meta.changes
    } else if (action === 'submit' && request.method === 'POST') {
      keys(value,['version']); requireValue(owner,'AUTHOR_REQUIRED',403)
      requireValue(draft.rights_confirmed === 1,'RIGHTS_CONFIRMATION_REQUIRED')
      const result = await db.prepare(`UPDATE publishing_drafts SET state='REVIEW',last_actor=?1,last_action='SUBMIT',updated_at=?2 WHERE id=?3 AND version=?4 AND state='DRAFT'`).bind(user.id,now,id,draft.version).run()
      changed = result.meta.changes
    } else if (action === 'review' && request.method === 'POST') {
      keys(value,['version','decision','note']); requireValue(reviewer && !owner,'INDEPENDENT_REVIEWER_REQUIRED',403)
      requireValue(value.decision === 'approve' || value.decision === 'reject','DECISION_INVALID')
      requireValue(typeof value.note === 'string' && value.note.trim().length >= 12 && value.note.length <= 2000,'REVIEW_NOTE_REQUIRED')
      const approve = value.decision === 'approve'
      const result = await db.prepare(`UPDATE publishing_drafts SET state=?1,approved_version=?2,reviewer_id=CASE WHEN ?2 IS NOT NULL THEN ?3 ELSE NULL END,review_note=?4,last_actor=?3,last_action=?5,updated_at=?6 WHERE id=?7 AND version=?8 AND state='REVIEW' AND rights_confirmed=1`)
        .bind(approve?'APPROVED':'DRAFT',approve?draft.version:null,user.id,value.note.trim(),approve?'APPROVE':'REJECT',now,id,draft.version).run()
      changed = result.meta.changes
    } else if (action === 'publish' && request.method === 'POST') {
      keys(value,['version']); requireValue(owner,'AUTHOR_REQUIRED',403)
      requireValue(env.STUDIO_PUBLISH_ENABLED === 'true','PUBLISH_LOCKED',423)
      if (draft.state === 'PUBLISHED') return reply({ok:true,data:output(draft),replayed:true})
      requireValue(draft.state === 'APPROVED' && draft.approved_version === draft.version,'APPROVAL_REQUIRED',409)
      const topicSlug = slug(draft.topic)
      // D1 batch is atomic. Both inserts read the current approved revision, never a stale JS snapshot.
      await db.batch([
        db.prepare(`INSERT INTO topics(slug,name,description,created_at) SELECT ?1,topic,'',?2 FROM publishing_drafts WHERE id=?3 AND version=?4 AND state='APPROVED' AND approved_version=version ON CONFLICT(slug) DO NOTHING`).bind(topicSlug,now,id,draft.version),
        db.prepare(`INSERT INTO posts(user_id,title,body,topic,post_type,visibility,is_hot,is_verified,is_ai,vote_count,comment_count,created_at,updated_at,source_draft_id)
          SELECT author_id,title,body || CASE WHEN sources<>'[]' THEN char(10)||char(10)||'Nguồn tham khảo:'||char(10)||(SELECT group_concat(value,char(10)) FROM json_each(sources)) ELSE '' END,?1,format,'public',0,0,ai_assisted,0,0,?2,?2,id FROM publishing_drafts
          WHERE id=?3 AND version=?4 AND state='APPROVED' AND approved_version=version AND rights_confirmed=1 AND reviewer_id<>author_id
          AND NOT EXISTS(SELECT 1 FROM posts WHERE source_draft_id=?3)`).bind(topicSlug,now,id,draft.version),
        db.prepare(`UPDATE topics SET post_count=post_count+1 WHERE slug=?1 AND EXISTS(SELECT 1 FROM publishing_drafts d JOIN posts p ON p.source_draft_id=d.id WHERE d.id=?2 AND d.state='APPROVED' AND d.version=?3)`).bind(topicSlug,id,draft.version),
        db.prepare(`UPDATE publishing_drafts SET state='PUBLISHED',post_id=(SELECT id FROM posts WHERE source_draft_id=?1),last_actor=?2,last_action='PUBLISH',updated_at=?3 WHERE id=?1 AND version=?4 AND state='APPROVED' AND EXISTS(SELECT 1 FROM posts WHERE source_draft_id=?1)`).bind(id,user.id,now,draft.version)
      ])
      const published = await get(); requireValue(published?.state === 'PUBLISHED','VERSION_CONFLICT',409)
      return reply({ok:true,data:output(published)})
    } else throw new PublishingError('METHOD_NOT_ALLOWED',405)
    // D1 includes changes made by audit triggers in its metadata; a successful row update may count >1.
    requireValue(changed >= 1,'STATE_OR_VERSION_CONFLICT',409)
    const updated = await get(); requireValue(updated,'STORAGE_UNAVAILABLE',503)
    return reply({ok:true,data:output(updated)})
  } catch (error) {
    if (error instanceof PublishingError) return reply({ok:false,error:error.code},error.status)
    return reply({ok:false,error:'STUDIO_STORAGE_UNAVAILABLE'},503)
  }
}
