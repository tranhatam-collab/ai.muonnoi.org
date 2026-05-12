import type { Env } from "../env"
import { json } from "../lib/response"

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

  // Signature check (HMAC-SHA256 when secret configured)
  const sig = request.headers.get("X-Signature") ?? request.headers.get("x-signature") ?? ""
  if (env.PAYMENT_WEBHOOK_SECRET && sig) {
    // Web Crypto HMAC verify
    try {
      const key = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(env.PAYMENT_WEBHOOK_SECRET),
        { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
      )
      const sigBytes = Uint8Array.from(sig.match(/../g)!.map(h => parseInt(h, 16)))
      const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(rawBody))
      if (!valid) {
        console.warn("[webhook] invalid signature")
        return json({ ok: false, error: { code: "INVALID_SIGNATURE" } }, 401, origin, env)
      }
    } catch (err) {
      console.error("[webhook] sig verify error", err)
    }
  }

  let payload: Record<string, unknown>
  try { payload = JSON.parse(rawBody) as Record<string, unknown> } catch { return json({ ok: false, error: { code: "INVALID_JSON" } }, 400, origin, env) }

  const eventId = typeof payload.event_id === "string" ? payload.event_id : newId("evt")
  const eventType = typeof payload.event_type === "string" ? payload.event_type : "unknown"
  const intentId = typeof payload.intent_id === "string" ? payload.intent_id : null

  // Replay guard via event_id uniqueness
  const logId = newId("whl")
  try {
    await env.iai_flow_db.prepare(
      `INSERT INTO payment_webhook_log (id, provider, event_type, event_id, intent_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'received', datetime('now'))`
    ).bind(logId, payload.provider ?? PROVIDER_DEFAULT, eventType, eventId, intentId).run()
  } catch {
    // Duplicate event_id → already processed
    return json({ ok: true, data: { replayed: true } }, 200, origin, env)
  }

  if ((eventType === "payment.completed" || eventType === "payment.success") && intentId) {
    await env.iai_flow_db.prepare(
      `UPDATE payment_intents SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).bind(intentId).run()
    await env.iai_flow_db.prepare(
      `UPDATE payment_webhook_log SET status = 'processed', processed_at = datetime('now') WHERE id = ?`
    ).bind(logId).run()
  }

  console.log("[webhook] payment event", JSON.stringify(sanitizeLog({ eventType, intentId, logId })))
  return json({ ok: true, data: { received: true, logId } }, 200, origin, env)
}
