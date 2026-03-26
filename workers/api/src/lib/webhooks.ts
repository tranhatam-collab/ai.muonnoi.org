import type { Env } from "../env"

export type TriggerEvent =
  | "post_created"
  | "comment_added"
  | "vote_milestone"
  | "flow_run"
  | "user_registered"

const DEFAULT_FLOW_API_URL = "https://api.flow.muonnoi.org"

function normalizeBaseUrl(value?: string | null): string {
  const baseUrl = (value || DEFAULT_FLOW_API_URL).trim().replace(/\/$/, "")
  return baseUrl || DEFAULT_FLOW_API_URL
}

export function getFlowApiBaseUrl(value?: string | null, env?: Env): string {
  return normalizeBaseUrl(value || env?.FLOW_API_URL)
}

export function buildFlowRunUrl(baseUrl: string, flowId: string | number): string {
  return `${normalizeBaseUrl(baseUrl)}/api/workflows/${encodeURIComponent(String(flowId))}/run`
}

export async function fireFlowTriggers(
  env: Env,
  ctx: ExecutionContext,
  event: TriggerEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const rows = await env.iai_flow_db
    .prepare(
      `SELECT w.id, w.flow_id, w.webhook_url, c.n8n_base_url AS api_base_url
       FROM n8n_webhooks w
       LEFT JOIN n8n_connections c ON c.id = w.connection_id
       WHERE w.trigger_event = ?1
         AND w.is_active = 1
         AND (w.webhook_url IS NOT NULL OR w.flow_id IS NOT NULL)
         AND c.is_active = 1`
    )
    .bind(event)
    .all<{ id: number; flow_id: string | number | null; webhook_url: string | null; api_base_url: string | null }>()

  for (const row of rows.results ?? []) {
    const url =
      typeof row.webhook_url === "string" && row.webhook_url.trim()
        ? row.webhook_url
        : row.flow_id !== null
          ? buildFlowRunUrl(getFlowApiBaseUrl(row.api_base_url, env), row.flow_id)
          : null

    if (!url) continue

    ctx.waitUntil(
      runRemoteFlow(env, row.id, url, {
        event,
        payload,
        source: "nhachung.org",
        triggered_at: Date.now(),
        triggered_by: "nhachung-api"
      })
    )
  }
}

export const fireWebhooks = fireFlowTriggers

async function runRemoteFlow(
  env: Env,
  triggerId: number,
  url: string,
  payload: Record<string, unknown>
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (env.FLOW_API_KEY) headers.Authorization = `Bearer ${env.FLOW_API_KEY}`

  let status = "failed"
  let responseCode = 0

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ input: payload }),
      signal: AbortSignal.timeout(10000)
    })
    responseCode = res.status
    status = res.ok ? "sent" : "failed"
  } catch {
    status = "timeout"
  }

  try {
    await env.iai_flow_db
      .prepare(
        "INSERT INTO n8n_trigger_log (webhook_id, payload_json, status, response_code, triggered_at) VALUES (?1, ?2, ?3, ?4, ?5)"
      )
      .bind(triggerId, JSON.stringify(payload), status, responseCode, Date.now())
      .run()

    await env.iai_flow_db
      .prepare("UPDATE n8n_webhooks SET last_triggered = ?1 WHERE id = ?2")
      .bind(Date.now(), triggerId)
      .run()
  } catch {
    // log errors silently
  }
}
