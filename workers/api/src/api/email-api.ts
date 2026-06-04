import type { Env } from "../env"
import { json } from "../lib/response"

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function mailBase(env: Env): string {
  return (env.MAIL_API_BASE_URL ?? "https://mail.iai.one/_mail/v1").replace(/\/+$/, "")
}

// POST /api/email/send  (internal / system use only — not public)
export async function handleEmailSend(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")

  if (request.method !== "POST") return json({ ok: false, error: "Method Not Allowed" }, 405, origin, env)

  const idempotencyKey = request.headers.get("Idempotency-Key") ?? newId("idem")

  // Replay guard
  const existing = await env.iai_flow_db.prepare(
    "SELECT id, status, provider_msg_id FROM email_deliveries WHERE idempotency_key = ?"
  ).bind(idempotencyKey).first<{ id: string; status: string; provider_msg_id: string | null }>()
  if (existing) {
    return json({ ok: true, data: { deliveryId: existing.id, status: existing.status, replayed: true }, meta: { requestId: newId("req"), serverTime: new Date().toISOString() } }, 200, origin, env)
  }

  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return json({ ok: false, error: { code: "INVALID_JSON" } }, 400, origin, env) }

  const templateId = typeof body.template_id === "string" ? body.template_id : ""
  const locale = typeof body.locale === "string" ? body.locale : "vi"
  const purpose = typeof body.purpose === "string" ? body.purpose : "system"
  const recipientRef = typeof body.recipient_ref === "string" ? body.recipient_ref : ""

  if (!templateId || !recipientRef) {
    return json({ ok: false, error: { code: "MISSING_FIELDS", message: "template_id and recipient_ref required" } }, 400, origin, env)
  }

  const deliveryId = newId("ed")
  await env.iai_flow_db.prepare(
    `INSERT INTO email_deliveries (id, idempotency_key, template_id, locale, purpose, status, provider, attempts, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 'mail_iai_one', 0, datetime('now'), datetime('now'))`
  ).bind(deliveryId, idempotencyKey, templateId, locale, purpose).run()

  let sent = false
  let providerMsgId: string | null = null
  let lastError: string | null = null

  if (env.MAIL_API_KEY) {
    try {
      const mailRes = await fetch(`${mailBase(env)}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.MAIL_API_KEY}`
        },
        body: JSON.stringify({
          template_id: templateId,
          locale,
          purpose,
          recipient_ref: recipientRef,
          delivery_id: deliveryId
        })
      })
      if (mailRes.ok) {
        const data = await mailRes.json() as Record<string, unknown>
        providerMsgId = typeof data.message_id === "string" ? data.message_id : null
        sent = true
      } else {
        const errText = await mailRes.text()
        lastError = `HTTP ${mailRes.status}: ${errText.slice(0, 200)}`
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Network error"
    }

    await env.iai_flow_db.prepare(
      `UPDATE email_deliveries SET status = ?, provider_msg_id = ?, attempts = attempts + 1, last_error = ?, sent_at = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(sent ? "sent" : "failed", providerMsgId, lastError, sent ? new Date().toISOString() : null, deliveryId).run()
  }

  console.log("[email] send", JSON.stringify({ deliveryId, templateId, purpose, sent }))

  return json({
    ok: sent || !env.MAIL_API_KEY,
    data: { deliveryId, status: sent ? "sent" : (env.MAIL_API_KEY ? "failed" : "queued_no_key") },
    meta: { requestId: newId("req"), serverTime: new Date().toISOString() }
  }, sent ? 201 : 202, origin, env)
}

// GET /api/email/:id
export async function handleEmailGetById(request: Request, env: Env, deliveryId: string): Promise<Response> {
  const origin = request.headers.get("Origin")
  const row = await env.iai_flow_db.prepare(
    "SELECT id, template_id, locale, purpose, status, provider, attempts, sent_at, created_at FROM email_deliveries WHERE id = ?"
  ).bind(deliveryId).first<Record<string, unknown>>()

  if (!row) return json({ ok: false, error: { code: "NOT_FOUND" } }, 404, origin, env)
  return json({ ok: true, data: row, meta: { requestId: newId("req"), serverTime: new Date().toISOString() } }, 200, origin, env)
}
