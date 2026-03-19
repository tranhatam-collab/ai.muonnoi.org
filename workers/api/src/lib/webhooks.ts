import type { Env } from "../env"

export type TriggerEvent =
  | "post_created"
  | "comment_added"
  | "vote_milestone"
  | "ai_flag"
  | "flow_run"
  | "user_registered"

export async function fireWebhooks(
  env: Env,
  ctx: ExecutionContext,
  event: TriggerEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const rows = await env.iai_flow_db
    .prepare("SELECT id, webhook_url, webhook_key FROM n8n_webhooks WHERE trigger_event = ?1 AND is_active = 1")
    .bind(event)
    .all<{ id: number; webhook_url: string; webhook_key: string | null }>()

  for (const row of rows.results ?? []) {
    ctx.waitUntil(sendWebhook(env, row.id, row.webhook_url, payload, row.webhook_key))
  }
}

async function sendWebhook(
  env: Env,
  webhookId: number,
  url: string,
  payload: Record<string, unknown>,
  key: string | null
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (key) headers["X-Webhook-Key"] = key

  let status = "failed"
  let responseCode = 0

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
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
      .bind(webhookId, JSON.stringify(payload), status, responseCode, Date.now())
      .run()

    await env.iai_flow_db
      .prepare("UPDATE n8n_webhooks SET last_triggered = ?1 WHERE id = ?2")
      .bind(Date.now(), webhookId)
      .run()
  } catch {
    // log errors silently
  }
}
