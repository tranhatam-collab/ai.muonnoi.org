import type { Env } from "../env"
import { buildFlowRunUrl, getFlowApiBaseUrl, type TriggerEvent } from "../lib/webhooks"
import { json } from "../lib/response"
import { canAccessApp } from "../security/permission"
import { getCurrentUser } from "../security/session"

const VALID_TRIGGER_EVENTS: TriggerEvent[] = [
  "post_created",
  "comment_added",
  "vote_milestone",
  "flow_run",
  "user_registered"
]

function generateKey(): string {
  return crypto.randomUUID().replace(/-/g, "")
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function parseId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value)
  return null
}

function normalizeFlowId(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  if (typeof value === "string") return value.trim()
  return ""
}

function deriveFlowId(row: { flow_id?: unknown; webhook_url?: unknown }): string | null {
  if (typeof row.flow_id === "number" && Number.isFinite(row.flow_id)) return String(row.flow_id)
  if (typeof row.flow_id === "string" && row.flow_id.trim()) return row.flow_id.trim()
  if (typeof row.webhook_url === "string") {
    const match = row.webhook_url.match(/\/api\/integrations\/nhachung\/flows\/([^/]+)\/run$/)
    if (match?.[1]) return decodeURIComponent(match[1])
  }
  return null
}

function buildRunUrl(apiBaseUrl: string, flowId: string): string {
  return buildFlowRunUrl(apiBaseUrl, flowId)
}

// ===== CONNECTIONS =====

export async function handleFlowConnections(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, env)
  if (!canAccessApp(user)) return json({ ok: false, error: "Không có quyền truy cập app nội bộ" }, 403, origin, env)
  const method = request.method.toUpperCase()

  if (method === "GET") {
    const rows = await env.iai_flow_db
      .prepare("SELECT id, name, n8n_base_url, webhook_key, is_active, created_at FROM n8n_connections WHERE user_id = ?1 ORDER BY created_at DESC")
      .bind(user.id)
      .all<Record<string, unknown>>()

    const data = (rows.results ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      service: "flow.muonnoi.org",
      api_base_url: row.n8n_base_url,
      connection_key: row.webhook_key,
      is_active: row.is_active,
      created_at: row.created_at
    }))

    return json({ ok: true, data }, 200, origin, env)
  }

  if (method === "POST") {
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const apiBaseUrl = getFlowApiBaseUrl(
      typeof body.api_base_url === "string" ? body.api_base_url : typeof body.n8n_base_url === "string" ? body.n8n_base_url : undefined,
      env
    )
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Muon Noi Flow"
    if (!isValidHttpUrl(apiBaseUrl)) return json({ ok: false, error: "api_base_url phải là http hoặc https" }, 400, origin, env)

    const key = generateKey()
    const now = Date.now()
    const result = await env.iai_flow_db
      .prepare("INSERT INTO n8n_connections (user_id, name, n8n_base_url, webhook_key, is_active, created_at) VALUES (?1,?2,?3,?4,1,?5)")
      .bind(user.id, name, apiBaseUrl, key, now)
      .run()

    return json({
      ok: true,
      data: {
        id: result.meta?.last_row_id,
        name,
        service: "flow.muonnoi.org",
        api_base_url: apiBaseUrl,
        connection_key: key
      }
    }, 201, origin, env)
  }

  return json({ ok: false, error: "Method Not Allowed" }, 405, origin, env)
}

export async function handleFlowConnectionById(
  request: Request,
  env: Env,
  connId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, env)
  if (!canAccessApp(user)) return json({ ok: false, error: "Không có quyền truy cập app nội bộ" }, 403, origin, env)

  const conn = await env.iai_flow_db
    .prepare("SELECT user_id FROM n8n_connections WHERE id = ?1 LIMIT 1")
    .bind(connId)
    .first<{ user_id: number }>()

  if (!conn || conn.user_id !== user.id) return json({ ok: false, error: "Không tìm thấy" }, 404, origin, env)

  await env.iai_flow_db.prepare("DELETE FROM n8n_connections WHERE id = ?1").bind(connId).run()
  return json({ ok: true }, 200, origin, env)
}

// ===== TRIGGERS =====

export async function handleFlowTriggers(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, env)
  if (!canAccessApp(user)) return json({ ok: false, error: "Không có quyền truy cập app nội bộ" }, 403, origin, env)
  const method = request.method.toUpperCase()

  if (method === "GET") {
    const rows = await env.iai_flow_db
      .prepare(
        `SELECT w.id, w.name, w.flow_id, w.webhook_url, w.trigger_event, w.is_active, w.last_triggered, w.created_at,
                c.name as connection_name, c.n8n_base_url as api_base_url
         FROM n8n_webhooks w
         LEFT JOIN n8n_connections c ON c.id = w.connection_id
         WHERE w.user_id = ?1
         ORDER BY w.created_at DESC`
      )
      .bind(user.id)
      .all<Record<string, unknown>>()

    const data = (rows.results ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      flow_id: deriveFlowId(row),
      trigger_event: row.trigger_event,
      connection_name: row.connection_name,
      api_base_url: row.api_base_url,
      run_url:
        typeof row.webhook_url === "string" && row.webhook_url
          ? row.webhook_url
          : deriveFlowId(row)
            ? buildRunUrl(getFlowApiBaseUrl(String(row.api_base_url || ""), env), deriveFlowId(row) as string)
            : null,
      is_active: row.is_active,
      last_triggered: row.last_triggered,
      created_at: row.created_at
    }))

    return json({ ok: true, data }, 200, origin, env)
  }

  if (method === "POST") {
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const triggerEvent = typeof body.trigger_event === "string" ? body.trigger_event.trim() : ""
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Flow trigger"
    const connId = parseId(body.connection_id)
    const flowId = normalizeFlowId(body.flow_id)

    if (!connId || !flowId || !triggerEvent) {
      return json({ ok: false, error: "connection_id, flow_id và trigger_event là bắt buộc" }, 400, origin, env)
    }

    if (!VALID_TRIGGER_EVENTS.includes(triggerEvent as TriggerEvent)) {
      return json({ ok: false, error: `trigger_event phải là một trong: ${VALID_TRIGGER_EVENTS.join(", ")}` }, 400, origin, env)
    }

    const conn = await env.iai_flow_db
      .prepare("SELECT id, n8n_base_url FROM n8n_connections WHERE id = ?1 AND user_id = ?2 LIMIT 1")
      .bind(connId, user.id)
      .first<{ id: number; n8n_base_url: string }>()

    if (!conn) return json({ ok: false, error: "Connection không tồn tại hoặc không thuộc về bạn" }, 404, origin, env)

    const apiBaseUrl = getFlowApiBaseUrl(conn.n8n_base_url, env)
    const runUrl = buildRunUrl(apiBaseUrl, flowId)
    const localFlowId = parseId(body.flow_id)
    const now = Date.now()

    const result = await env.iai_flow_db
      .prepare("INSERT INTO n8n_webhooks (user_id, connection_id, flow_id, name, webhook_url, trigger_event, is_active, created_at) VALUES (?1,?2,?3,?4,?5,?6,1,?7)")
      .bind(user.id, connId, localFlowId, name, runUrl, triggerEvent, now)
      .run()

    return json({
      ok: true,
      data: {
        id: result.meta?.last_row_id,
        name,
        flow_id: flowId,
        run_url: runUrl,
        trigger_event: triggerEvent
      }
    }, 201, origin, env)
  }

  return json({ ok: false, error: "Method Not Allowed" }, 405, origin, env)
}

export async function handleFlowTriggerById(
  request: Request,
  env: Env,
  triggerId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, env)
  if (!canAccessApp(user)) return json({ ok: false, error: "Không có quyền truy cập app nội bộ" }, 403, origin, env)

  const trigger = await env.iai_flow_db
    .prepare("SELECT user_id FROM n8n_webhooks WHERE id = ?1 LIMIT 1")
    .bind(triggerId)
    .first<{ user_id: number }>()

  if (!trigger || trigger.user_id !== user.id) return json({ ok: false, error: "Không tìm thấy" }, 404, origin, env)

  await env.iai_flow_db.prepare("DELETE FROM n8n_webhooks WHERE id = ?1").bind(triggerId).run()
  return json({ ok: true }, 200, origin, env)
}

export async function handleFlowTriggerTest(
  request: Request,
  env: Env,
  triggerId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, env)
  if (!canAccessApp(user)) return json({ ok: false, error: "Không có quyền truy cập app nội bộ" }, 403, origin, env)

  const trigger = await env.iai_flow_db
    .prepare(
      `SELECT w.user_id, w.flow_id, w.webhook_url, w.trigger_event, c.n8n_base_url
       FROM n8n_webhooks w
       LEFT JOIN n8n_connections c ON c.id = w.connection_id
       WHERE w.id = ?1
       LIMIT 1`
    )
    .bind(triggerId)
    .first<{ user_id: number; flow_id: string | number | null; webhook_url: string | null; trigger_event: TriggerEvent; n8n_base_url: string | null }>()

  if (!trigger || trigger.user_id !== user.id) return json({ ok: false, error: "Không tìm thấy" }, 404, origin, env)

  const flowId = deriveFlowId(trigger)
  const runUrl =
    typeof trigger.webhook_url === "string" && trigger.webhook_url
      ? trigger.webhook_url
      : flowId
        ? buildRunUrl(getFlowApiBaseUrl(trigger.n8n_base_url, env), flowId)
        : null

  if (!runUrl) return json({ ok: false, error: "Trigger chưa có flow hợp lệ" }, 422, origin, env)

  const testPayload = {
    event: trigger.trigger_event,
    payload: {
      test: true,
      trigger_id: Number(triggerId)
    },
    source: "nhachung.org",
    test: true,
    triggered_at: Date.now(),
    triggered_by: user.email
  }

  let status = "failed"
  let responseCode = 0

  try {
    const res = await fetch(runUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.FLOW_API_KEY ? { Authorization: `Bearer ${env.FLOW_API_KEY}` } : {})
      },
      body: JSON.stringify({ input: testPayload }),
      signal: AbortSignal.timeout(10000)
    })
    responseCode = res.status
    status = res.ok ? "sent" : "failed"
  } catch {
    status = "timeout"
  }

  await env.iai_flow_db
    .prepare("INSERT INTO n8n_trigger_log (webhook_id, payload_json, status, response_code, triggered_at) VALUES (?1,?2,?3,?4,?5)")
    .bind(Number(triggerId), JSON.stringify(testPayload), status, responseCode, Date.now())
    .run()

  await env.iai_flow_db
    .prepare("UPDATE n8n_webhooks SET last_triggered = ?1 WHERE id = ?2")
    .bind(Date.now(), triggerId)
    .run()

  return json({ ok: true, data: { status, response_code: responseCode } }, 200, origin, env)
}

export async function handleFlowTriggerLog(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, env)
  if (!canAccessApp(user)) return json({ ok: false, error: "Không có quyền truy cập app nội bộ" }, 403, origin, env)

  const rows = await env.iai_flow_db
    .prepare(
      `SELECT l.id, l.status, l.response_code, l.triggered_at,
              w.name as trigger_name, w.trigger_event, w.flow_id
       FROM n8n_trigger_log l
       INNER JOIN n8n_webhooks w ON w.id = l.webhook_id
       WHERE w.user_id = ?1
       ORDER BY l.triggered_at DESC
       LIMIT 50`
    )
    .bind(user.id)
    .all<Record<string, unknown>>()

  return json({ ok: true, data: rows.results ?? [] }, 200, origin, env)
}

// Legacy aliases for existing internal callers while routes transition to /api/flow/*
export const handleN8nConnections = handleFlowConnections
export const handleN8nConnectionById = handleFlowConnectionById
export const handleN8nWebhooks = handleFlowTriggers
export const handleN8nWebhookById = handleFlowTriggerById
export const handleN8nWebhookTest = handleFlowTriggerTest
export const handleN8nTriggerLog = handleFlowTriggerLog
