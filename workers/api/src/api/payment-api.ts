import type { Env } from "../env"
import { json } from "../lib/response"
import { buildPaymentConfirmedEmail, buildPaymentFailedEmail, fireEmail } from "../lib/email"

const PROVIDER_DEFAULT = "payos"
const CURRENCY_DEFAULT = "VND"
const TTL_MS = 30 * 60 * 1000 // 30 min

function payBase(env: Env): string {
  return (env.PAY_IAI_ONE_BASE_URL ?? "https://pay.iai.one").replace(/\/+$/, "")
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function sanitizeLog(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj
  const safe: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (/api.?key|apikey|secret|token|signature|webhook|password|card|cvv/i.test(k)) {
      safe[k] = "[REDACTED]"
    } else if (v && typeof v === "object") {
      safe[k] = sanitizeLog(v)
    } else {
      safe[k] = v
    }
  }
  return safe
}

function isSha256Hex(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value)
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function isUniqueConstraintError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /unique|constraint/i.test(message)
}

// POST /api/payment/create-intent
export async function handlePaymentCreateIntent(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")

  if (request.method !== "POST") return json({ ok: false, error: "Method Not Allowed" }, 405, origin, env)

  const idempotencyKey = request.headers.get("Idempotency-Key") || request.headers.get("idempotency-key")
  if (!idempotencyKey) {
    return json({ ok: false, error: { code: "MISSING_IDEMPOTENCY_KEY", message: "Idempotency-Key header required" } }, 400, origin, env)
  }

  // Replay guard
  const existing = await env.iai_flow_db.prepare(
    "SELECT id, status, checkout_url, expires_at FROM payment_intents WHERE idempotency_key = ?"
  ).bind(idempotencyKey).first<{ id: string; status: string; checkout_url: string | null; expires_at: string }>()

  if (existing) {
    const reqId = newId("req")
    return json({ ok: true, data: { paymentId: existing.id, status: existing.status, clientAction: existing.checkout_url ? { type: "redirect", url: existing.checkout_url } : null }, meta: { requestId: reqId, serverTime: new Date().toISOString() } }, 200, origin, env)
  }

  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return json({ ok: false, error: { code: "INVALID_JSON", message: "Request body must be JSON" } }, 400, origin, env) }

  const amount = typeof body.amount === "number" ? body.amount : parseInt(String(body.amount ?? "0"), 10)
  const currency = typeof body.currency === "string" ? body.currency.toUpperCase() : CURRENCY_DEFAULT
  const purpose = typeof body.purpose === "string" ? body.purpose : "membership"
  const returnUrl = typeof body.returnUrl === "string" ? body.returnUrl : (env.GATEWAY_SUCCESS_URL ?? "https://www.muonnoi.org/")

  if (!amount || amount <= 0) {
    return json({ ok: false, error: { code: "INVALID_AMOUNT", message: "amount phải là số dương" } }, 400, origin, env)
  }

  const intentId = newId("pi")
  const reqId = newId("req")
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString()

  // Write intent before calling provider (idempotency anchor)
  await env.iai_flow_db.prepare(
    `INSERT INTO payment_intents (id, idempotency_key, amount, currency, purpose, status, provider, return_url, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, datetime('now'), datetime('now'))`
  ).bind(intentId, idempotencyKey, amount, currency, purpose, PROVIDER_DEFAULT, returnUrl, expiresAt).run()

  // Call pay.iai.one
  let checkoutUrl: string | null = null
  let providerRef: string | null = null
  let payIaiStatus = "pending"

  if (env.PAY_IAI_ONE_API_KEY) {
    try {
      const payRes = await fetch(`${payBase(env)}/checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.PAY_IAI_ONE_API_KEY}` },
        body: JSON.stringify({
          tenant_code: env.PAY_IAI_ONE_TENANT_CODE ?? "muonnoi",
          site_code: env.PAY_IAI_ONE_SITE_CODE ?? "muonnoi",
          intent_id: intentId,
          amount,
          currency,
          purpose,
          callback_url: `${(env.PAY_IAI_ONE_CALLBACK_BASE_URL ?? "https://api.muonnoi.org")}/api/webhook/payment`,
          success_url: returnUrl
        })
      })
      if (payRes.ok) {
        const payData = await payRes.json() as Record<string, unknown>
        checkoutUrl = typeof payData.checkout_url === "string" ? payData.checkout_url : null
        providerRef = typeof payData.session_id === "string" ? payData.session_id : null
        payIaiStatus = checkoutUrl ? "provider_created" : "pending"
      }
    } catch (err) {
      console.error("[payment] pay.iai.one call failed", err)
    }

    await env.iai_flow_db.prepare(
      `UPDATE payment_intents SET provider_ref = ?, checkout_url = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(providerRef, checkoutUrl, payIaiStatus, intentId).run()
  }

  console.log("[payment] create-intent", JSON.stringify(sanitizeLog({ intentId, amount, currency, purpose, payIaiStatus })))

  return json({
    ok: true,
    data: {
      paymentId: intentId,
      provider: PROVIDER_DEFAULT,
      status: payIaiStatus,
      clientAction: checkoutUrl ? { type: "redirect", url: checkoutUrl } : { type: "pending", url: null }
    },
    meta: { requestId: reqId, serverTime: new Date().toISOString() }
  }, 201, origin, env)
}

// GET /api/payment/:id
export async function handlePaymentGetById(request: Request, env: Env, intentId: string): Promise<Response> {
  const origin = request.headers.get("Origin")
  const row = await env.iai_flow_db.prepare(
    "SELECT id, amount, currency, purpose, status, provider, checkout_url, expires_at, completed_at, created_at FROM payment_intents WHERE id = ?"
  ).bind(intentId).first<Record<string, unknown>>()

  if (!row) return json({ ok: false, error: { code: "NOT_FOUND", message: "Payment intent not found" } }, 404, origin, env)

  return json({ ok: true, data: sanitizeLog(row), meta: { requestId: newId("req"), serverTime: new Date().toISOString() } }, 200, origin, env)
}

// POST /api/webhook/payment
export async function handlePaymentWebhook(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const rawBody = await request.text()

  // This route is a provider callback. It must never process an unsigned event.
  if (!env.PAYMENT_WEBHOOK_SECRET) {
    return json({ ok: false, error: { code: "WEBHOOK_NOT_CONFIGURED" } }, 503, origin, env)
  }

  const sig = request.headers.get("X-Signature") ?? request.headers.get("x-signature") ?? ""
  if (!sig) {
    return json({ ok: false, error: { code: "MISSING_SIGNATURE" } }, 401, origin, env)
  }
  if (!isSha256Hex(sig)) {
    return json({ ok: false, error: { code: "INVALID_SIGNATURE" } }, 401, origin, env)
  }

  try {
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(env.PAYMENT_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    )
    const sigBytes = Uint8Array.from(sig.match(/../g)!.map((hex) => parseInt(hex, 16)))
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(rawBody))
    if (!valid) {
      return json({ ok: false, error: { code: "INVALID_SIGNATURE" } }, 401, origin, env)
    }
  } catch {
    return json({ ok: false, error: { code: "INVALID_SIGNATURE" } }, 401, origin, env)
  }

  let payload: Record<string, unknown>
  try { payload = JSON.parse(rawBody) as Record<string, unknown> } catch { return json({ ok: false, error: { code: "INVALID_JSON" } }, 400, origin, env) }

  const eventId = typeof payload.event_id === "string" ? payload.event_id.trim() : ""
  if (!eventId) {
    return json({ ok: false, error: { code: "MISSING_EVENT_ID" } }, 400, origin, env)
  }
  const eventType = typeof payload.event_type === "string" ? payload.event_type : "unknown"
  const intentId = typeof payload.intent_id === "string" ? payload.intent_id : null
  const provider = typeof payload.provider === "string" ? payload.provider : PROVIDER_DEFAULT
  const payloadHash = await sha256Hex(rawBody)

  const isCompleted = (eventType === "payment.completed" || eventType === "payment.success") && Boolean(intentId)
  const isFailed = (eventType === "payment.failed" || eventType === "payment.error") && Boolean(intentId)
  const logId = newId("whl")
  const logStatus = isCompleted || isFailed ? "processed" : "received"

  // D1 batch rolls every statement back if one fails. The receipt, audit row and
  // payment state must commit together so provider retries cannot be poisoned by
  // a receipt that survived a partial failure.
  const statements = [
    env.iai_flow_db.prepare(
      `INSERT INTO payment_webhook_receipts (event_id, provider, intent_id, payload_hash, received_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(eventId, provider, intentId, payloadHash),
    env.iai_flow_db.prepare(
      `INSERT INTO payment_webhook_log (id, provider, event_type, event_id, intent_id, payload_hash, status, processed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ${logStatus === "processed" ? "datetime('now')" : "NULL"}, datetime('now'))`
    ).bind(logId, provider, eventType, eventId, intentId, payloadHash, logStatus)
  ]

  if (isCompleted) {
    statements.push(env.iai_flow_db.prepare(
      `UPDATE payment_intents SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).bind(intentId))
  }
  if (isFailed) {
    statements.push(env.iai_flow_db.prepare(
      `UPDATE payment_intents SET status = 'failed', updated_at = datetime('now') WHERE id = ?`
    ).bind(intentId))
  }

  try {
    await env.iai_flow_db.batch(statements)
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return json({ ok: true, data: { replayed: true } }, 200, origin, env)
    }
    throw error
  }

  if (isCompleted && intentId) {
    // Send payment confirmation email — fire-and-forget
    const intent = await env.iai_flow_db.prepare(
      `SELECT pi.amount, pi.currency, pi.purpose,
              u.email, u.name
       FROM payment_intents pi
       LEFT JOIN users u ON u.id = pi.user_id
       WHERE pi.id = ?`
    ).bind(intentId).first<{ amount: number; currency: string; purpose: string; email: string | null; name: string | null }>()

    const recipientEmail = intent?.email ?? (typeof payload.customer_email === "string" ? payload.customer_email : null)
    if (recipientEmail && intent) {
      fireEmail(env, buildPaymentConfirmedEmail(env, recipientEmail, {
        name: intent.name ?? undefined,
        amount: intent.amount,
        currency: intent.currency ?? "VND",
        intentId,
        purpose: intent.purpose,
        completedAt: new Date().toISOString(),
      }))
    }
  }

  if (isFailed && intentId) {
    // Send payment failure email — fire-and-forget
    const intent = await env.iai_flow_db.prepare(
      `SELECT pi.amount, pi.currency, pi.purpose,
              u.email, u.name
       FROM payment_intents pi
       LEFT JOIN users u ON u.id = pi.user_id
       WHERE pi.id = ?`
    ).bind(intentId).first<{ amount: number; currency: string; purpose: string; email: string | null; name: string | null }>()

    const recipientEmail = intent?.email ?? (typeof payload.customer_email === "string" ? payload.customer_email : null)
    if (recipientEmail && intent) {
      fireEmail(env, buildPaymentFailedEmail(env, recipientEmail, {
        name: intent.name ?? undefined,
        amount: intent.amount,
        currency: intent.currency ?? "VND",
        intentId,
        reason: typeof payload.failure_reason === "string" ? payload.failure_reason : undefined,
      }))
    }
  }

  console.log("[webhook] payment event", JSON.stringify(sanitizeLog({ eventType, intentId, logId })))
  return json({ ok: true, data: { received: true, logId } }, 200, origin, env)
}
