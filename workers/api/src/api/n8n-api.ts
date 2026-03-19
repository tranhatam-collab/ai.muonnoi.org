import type { Env } from "../env"
import { json } from "../lib/response"
import { getCurrentUser } from "../security/session"

function generateKey(): string {
  return crypto.randomUUID().replace(/-/g, "")
}

// ===== CONNECTIONS =====

export async function handleN8nConnections(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)
  const method = request.method.toUpperCase()

  if (method === "GET") {
    const rows = await env.iai_flow_db
      .prepare("SELECT id, name, n8n_base_url, webhook_key, is_active, created_at FROM n8n_connections WHERE user_id = ?1 ORDER BY created_at DESC")
      .bind(user.id)
      .all<Record<string, unknown>>()
    return json({ ok: true, data: rows.results ?? [] }, 200, origin)
  }

  if (method === "POST") {
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const baseUrl = typeof body.n8n_base_url === "string" ? body.n8n_base_url.trim().replace(/\/$/, "") : ""
    const name = typeof body.name === "string" ? body.name.trim() : "My n8n"
    if (!baseUrl) return json({ ok: false, error: "n8n_base_url là bắt buộc" }, 400, origin)

    const key = generateKey()
    const now = Date.now()
    const result = await env.iai_flow_db
      .prepare("INSERT INTO n8n_connections (user_id, name, n8n_base_url, webhook_key, is_active, created_at) VALUES (?1,?2,?3,?4,1,?5)")
      .bind(user.id, name, baseUrl, key, now)
      .run()

    return json({ ok: true, data: { id: result.meta?.last_row_id, name, n8n_base_url: baseUrl, webhook_key: key } }, 201, origin)
  }

  return json({ ok: false, error: "Method Not Allowed" }, 405, origin)
}

export async function handleN8nConnectionById(
  request: Request, env: Env, connId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)

  const conn = await env.iai_flow_db
    .prepare("SELECT user_id FROM n8n_connections WHERE id = ?1 LIMIT 1")
    .bind(connId)
    .first<{ user_id: number }>()

  if (!conn || conn.user_id !== user.id) return json({ ok: false, error: "Không tìm thấy" }, 404, origin)

  await env.iai_flow_db.prepare("DELETE FROM n8n_connections WHERE id = ?1").bind(connId).run()
  return json({ ok: true }, 200, origin)
}

// ===== WEBHOOKS =====

export async function handleN8nWebhooks(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)
  const method = request.method.toUpperCase()

  if (method === "GET") {
    const rows = await env.iai_flow_db
      .prepare(
        `SELECT w.id, w.name, w.webhook_url, w.trigger_event, w.is_active, w.last_triggered, w.created_at,
                c.name as connection_name
         FROM n8n_webhooks w
         LEFT JOIN n8n_connections c ON c.id = w.connection_id
         WHERE w.user_id = ?1
         ORDER BY w.created_at DESC`
      )
      .bind(user.id)
      .all<Record<string, unknown>>()
    return json({ ok: true, data: rows.results ?? [] }, 200, origin)
  }

  if (method === "POST") {
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const webhookUrl = typeof body.webhook_url === "string" ? body.webhook_url.trim() : ""
    const triggerEvent = typeof body.trigger_event === "string" ? body.trigger_event : ""
    const name = typeof body.name === "string" ? body.name.trim() : "Webhook"
    const connId = typeof body.connection_id === "number" ? body.connection_id : null
    const flowId = typeof body.flow_id === "number" ? body.flow_id : null

    if (!webhookUrl || !triggerEvent) return json({ ok: false, error: "webhook_url và trigger_event là bắt buộc" }, 400, origin)

    const validEvents = ["post_created", "comment_added", "vote_milestone", "ai_flag", "flow_run", "user_registered"]
    if (!validEvents.includes(triggerEvent)) {
      return json({ ok: false, error: `trigger_event phải là một trong: ${validEvents.join(", ")}` }, 400, origin)
    }

    const now = Date.now()
    const result = await env.iai_flow_db
      .prepare("INSERT INTO n8n_webhooks (user_id, connection_id, flow_id, name, webhook_url, trigger_event, is_active, created_at) VALUES (?1,?2,?3,?4,?5,?6,1,?7)")
      .bind(user.id, connId, flowId, name, webhookUrl, triggerEvent, now)
      .run()

    return json({ ok: true, data: { id: result.meta?.last_row_id, name, webhook_url: webhookUrl, trigger_event: triggerEvent } }, 201, origin)
  }

  return json({ ok: false, error: "Method Not Allowed" }, 405, origin)
}

export async function handleN8nWebhookById(
  request: Request, env: Env, webhookId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)

  const hook = await env.iai_flow_db
    .prepare("SELECT user_id FROM n8n_webhooks WHERE id = ?1 LIMIT 1")
    .bind(webhookId)
    .first<{ user_id: number }>()

  if (!hook || hook.user_id !== user.id) return json({ ok: false, error: "Không tìm thấy" }, 404, origin)

  await env.iai_flow_db.prepare("DELETE FROM n8n_webhooks WHERE id = ?1").bind(webhookId).run()
  return json({ ok: true }, 200, origin)
}

export async function handleN8nWebhookTest(
  request: Request, env: Env, webhookId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)

  const hook = await env.iai_flow_db
    .prepare("SELECT user_id, webhook_url, trigger_event FROM n8n_webhooks WHERE id = ?1 LIMIT 1")
    .bind(webhookId)
    .first<{ user_id: number; webhook_url: string; trigger_event: string }>()

  if (!hook || hook.user_id !== user.id) return json({ ok: false, error: "Không tìm thấy" }, 404, origin)

  const testPayload = {
    event: hook.trigger_event,
    test: true,
    triggered_at: Date.now(),
    source: "ai.muonnoi.org"
  }

  let status = "failed"
  let responseCode = 0

  try {
    const res = await fetch(hook.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10000)
    })
    responseCode = res.status
    status = res.ok ? "sent" : "failed"
  } catch {
    status = "timeout"
  }

  await env.iai_flow_db
    .prepare("INSERT INTO n8n_trigger_log (webhook_id, payload_json, status, response_code, triggered_at) VALUES (?1,?2,?3,?4,?5)")
    .bind(Number(webhookId), JSON.stringify(testPayload), status, responseCode, Date.now())
    .run()

  return json({ ok: true, data: { status, response_code: responseCode } }, 200, origin)
}

export async function handleN8nTriggerLog(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)

  const rows = await env.iai_flow_db
    .prepare(
      `SELECT l.id, l.status, l.response_code, l.triggered_at,
              w.name as webhook_name, w.trigger_event
       FROM n8n_trigger_log l
       INNER JOIN n8n_webhooks w ON w.id = l.webhook_id
       WHERE w.user_id = ?1
       ORDER BY l.triggered_at DESC
       LIMIT 50`
    )
    .bind(user.id)
    .all<Record<string, unknown>>()

  return json({ ok: true, data: rows.results ?? [] }, 200, origin)
}
