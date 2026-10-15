import { requestObject } from '../lib/request-object'
import type { Env } from "../env"
import { json } from "../lib/response"

async function validateConnectionKey(env: Env, request: Request): Promise<boolean> {
  const key = request.headers.get("X-Connection-Key") || request.headers.get("X-Webhook-Key")
  if (!key) return false

  const conn = await env.iai_flow_db
    .prepare("SELECT id FROM n8n_connections WHERE webhook_key = ?1 AND is_active = 1 LIMIT 1")
    .bind(key)
    .first<{ id: number }>()

  return conn !== null
}

// Legacy Flow/n8n auto-post cannot bypass the versioned Studio review lane.
export async function handleFlowAutoPost(request: Request, env: Env): Promise<Response> {
  return json({ok:false,error:'USE_REVIEWED_PUBLISHING_STUDIO'},423,request.headers.get('Origin'),env)
}

export async function handleFlowNotify(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")

  if (!(await validateConnectionKey(env, request))) {
    return json({ ok: false, error: "Invalid connection key" }, 401, origin, env)
  }

  const body = await requestObject(request)
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

  const body = await requestObject(request)
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
