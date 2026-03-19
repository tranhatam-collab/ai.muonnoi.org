import type { Env } from "../env"
import { json } from "../lib/response"

async function validateWebhookKey(env: Env, request: Request): Promise<boolean> {
  const key = request.headers.get("X-Webhook-Key")
  if (!key) return false

  const conn = await env.iai_flow_db
    .prepare("SELECT id FROM n8n_connections WHERE webhook_key = ?1 AND is_active = 1 LIMIT 1")
    .bind(key)
    .first<{ id: number }>()

  return conn !== null
}

export async function handleN8nAutoPost(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")

  if (!(await validateWebhookKey(env, request))) {
    return json({ ok: false, error: "Invalid webhook key" }, 401, origin)
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const title = typeof body.title === "string" ? body.title.trim() : ""
  const text = typeof body.body === "string" ? body.body.trim() : ""
  const topic = typeof body.topic === "string" ? body.topic.trim() : ""

  if (!title || !text) return json({ ok: false, error: "title và body là bắt buộc" }, 400, origin)

  // Find or create ai_bot user
  let botUser = await env.iai_flow_db
    .prepare("SELECT id FROM users WHERE role = 'ai_bot' LIMIT 1")
    .first<{ id: number }>()

  if (!botUser) {
    const result = await env.iai_flow_db
      .prepare("INSERT INTO users (email, name, password, role, is_verified, created_at) VALUES ('ai-bot@ai.muonnoi.org','AI Bot','',  'ai_bot',1,?1)")
      .bind(Date.now())
      .run()
    botUser = { id: result.meta?.last_row_id as number }
  }

  const now = Date.now()
  const result = await env.iai_flow_db
    .prepare(
      `INSERT INTO posts (user_id, title, body, topic, post_type, visibility, is_hot, is_verified, is_ai, vote_count, comment_count, created_at, updated_at)
       VALUES (?1,?2,?3,?4,'discussion','public',0,1,1,0,0,?5,?5)`
    )
    .bind(botUser.id, title, text, topic, now)
    .run()

  return json({ ok: true, data: { post_id: result.meta?.last_row_id } }, 201, origin)
}

export async function handleN8nNotify(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")

  if (!(await validateWebhookKey(env, request))) {
    return json({ ok: false, error: "Invalid webhook key" }, 401, origin)
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const userId = typeof body.user_id === "number" ? body.user_id : null
  const message = typeof body.message === "string" ? body.message.trim() : ""

  if (!userId || !message) return json({ ok: false, error: "user_id và message là bắt buộc" }, 400, origin)

  await env.iai_flow_db
    .prepare("INSERT INTO notifications (user_id, type, message, is_read, created_at) VALUES (?1,'n8n_trigger',?2,0,?3)")
    .bind(userId, message, Date.now())
    .run()

  return json({ ok: true }, 200, origin)
}

export async function handleN8nModerate(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")

  if (!(await validateWebhookKey(env, request))) {
    return json({ ok: false, error: "Invalid webhook key" }, 401, origin)
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const queueId = typeof body.queue_id === "number" ? body.queue_id : null
  const decision = typeof body.decision === "string" ? body.decision : ""

  if (!queueId || !["approved", "rejected", "escalated"].includes(decision)) {
    return json({ ok: false, error: "queue_id và decision hợp lệ là bắt buộc" }, 400, origin)
  }

  await env.iai_flow_db
    .prepare("UPDATE ai_moderation_queue SET status = ?1 WHERE id = ?2")
    .bind(decision, queueId)
    .run()

  return json({ ok: true }, 200, origin)
}
