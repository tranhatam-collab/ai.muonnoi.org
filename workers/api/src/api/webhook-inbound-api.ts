import type { Env } from "../env"
import { json } from "../lib/response"

function normalizeTopic(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 48)
}

async function ensureTopic(env: Env, slug: string, label: string, now: number): Promise<void> {
  if (!slug) return

  await env.iai_flow_db
    .prepare(
      `INSERT INTO topics (slug, name, description, created_at)
       VALUES (?1, ?2, '', ?3)
       ON CONFLICT(slug) DO NOTHING`
    )
    .bind(slug, label.slice(0, 80) || slug, now)
    .run()
}

async function incrementTopicCount(env: Env, slug: string): Promise<void> {
  if (!slug) return

  await env.iai_flow_db
    .prepare("UPDATE topics SET post_count = post_count + 1 WHERE slug = ?1")
    .bind(slug)
    .run()
}

async function validateConnectionKey(env: Env, request: Request): Promise<boolean> {
  const key = request.headers.get("X-Connection-Key") || request.headers.get("X-Webhook-Key")
  if (!key) return false

  const conn = await env.iai_flow_db
    .prepare("SELECT id FROM n8n_connections WHERE webhook_key = ?1 AND is_active = 1 LIMIT 1")
    .bind(key)
    .first<{ id: number }>()

  return conn !== null
}

export async function handleFlowAutoPost(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")

  if (!(await validateConnectionKey(env, request))) {
    return json({ ok: false, error: "Invalid connection key" }, 401, origin, env)
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const title = typeof body.title === "string" ? body.title.trim() : ""
  const text = typeof body.body === "string" ? body.body.trim() : ""
  const rawTopic = typeof body.topic === "string" ? body.topic.trim() : ""

  if (!title || !text) return json({ ok: false, error: "title và body là bắt buộc" }, 400, origin, env)

  // Find or create ai_bot user
  let botUser = await env.iai_flow_db
    .prepare("SELECT id FROM users WHERE role = 'ai_bot' LIMIT 1")
    .first<{ id: number }>()

  if (!botUser) {
    const result = await env.iai_flow_db
      .prepare("INSERT INTO users (email, name, password, role, is_verified, created_at) VALUES ('ai-bot@nhachung.org','AI Bot','',  'ai_bot',1,?1)")
      .bind(Date.now())
      .run()
    botUser = { id: result.meta?.last_row_id as number }
  }

  const now = Date.now()
  const topic = normalizeTopic(rawTopic)
  await ensureTopic(env, topic, rawTopic || topic, now)
  const result = await env.iai_flow_db
    .prepare(
      `INSERT INTO posts (user_id, title, body, topic, post_type, visibility, is_hot, is_verified, is_ai, vote_count, comment_count, created_at, updated_at)
       VALUES (?1,?2,?3,?4,'discussion','public',0,1,1,0,0,?5,?5)`
    )
    .bind(botUser.id, title, text, topic, now)
    .run()

  await incrementTopicCount(env, topic)

  return json({ ok: true, data: { post_id: result.meta?.last_row_id } }, 201, origin, env)
}

export async function handleFlowNotify(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")

  if (!(await validateConnectionKey(env, request))) {
    return json({ ok: false, error: "Invalid connection key" }, 401, origin, env)
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const userId = typeof body.user_id === "number" ? body.user_id : null
  const message = typeof body.message === "string" ? body.message.trim() : ""

  if (!userId || !message) return json({ ok: false, error: "user_id và message là bắt buộc" }, 400, origin, env)

  await env.iai_flow_db
    .prepare("INSERT INTO notifications (user_id, type, message, is_read, created_at) VALUES (?1,'flow_event',?2,0,?3)")
    .bind(userId, message, Date.now())
    .run()

  return json({ ok: true }, 200, origin, env)
}

export async function handleFlowModerate(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")

  if (!(await validateConnectionKey(env, request))) {
    return json({ ok: false, error: "Invalid connection key" }, 401, origin, env)
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const queueId = typeof body.queue_id === "number" ? body.queue_id : null
  const decision = typeof body.decision === "string" ? body.decision : ""

  if (!queueId || !["approved", "rejected", "escalated"].includes(decision)) {
    return json({ ok: false, error: "queue_id và decision hợp lệ là bắt buộc" }, 400, origin, env)
  }

  await env.iai_flow_db
    .prepare("UPDATE ai_moderation_queue SET status = ?1 WHERE id = ?2")
    .bind(decision, queueId)
    .run()

  return json({ ok: true }, 200, origin, env)
}

export const handleN8nAutoPost = handleFlowAutoPost
export const handleN8nNotify = handleFlowNotify
export const handleN8nModerate = handleFlowModerate
