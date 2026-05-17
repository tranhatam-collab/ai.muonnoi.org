import type { Env } from "../env"
import { json } from "../lib/response"
import { findUserByEmail } from "../security/identity"
import { createSession } from "../security/session"
import { buildSessionCookie } from "../security/auth-cookie"
import { checkRateLimit } from "../lib/rate-limit"

const MAGIC_LINK_TTL_SECONDS = 15 * 60

// ── helpers ─────────────────────────────────────────────────────────────────

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

function encodeCursor(payload: unknown): string {
  return btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function decodeCursor(encoded: string): unknown {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/")
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

async function createSignedToken(secret: string, payload: Record<string, unknown>): Promise<string> {
  const encodedPayload = encodeCursor(payload)
  const signature = await hmacSha256Hex(secret, encodedPayload)
  return `${encodedPayload}.${signature}`
}

async function verifySignedToken(
  secret: string,
  token: string
): Promise<Record<string, unknown> | null> {
  const parts = String(token || "").split(".")
  if (parts.length !== 2) return null
  const [encodedPayload, signature] = parts
  if (!encodedPayload || !signature) return null
  const expectedSig = await hmacSha256Hex(secret, encodedPayload)
  if (!timingSafeEqual(signature, expectedSig)) return null
  const payload = decodeCursor(encodedPayload)
  if (!payload || typeof payload !== "object") return null
  const p = payload as Record<string, unknown>
  if (!Number.isFinite(p.exp) || (p.exp as number) < nowSeconds()) return null
  return p
}

async function sendMagicLinkEmail(
  env: Env,
  toEmail: string,
  magicLink: string
): Promise<{ ok: boolean; reason?: string }> {
  if (!env.MAIL_API_KEY) {
    return { ok: false, reason: "MAIL_API_KEY not configured" }
  }
  const mailBase = (env.MAIL_API_BASE_URL ?? "https://mail.iai.one/v1").replace(/\/+$/, "")
  const workspaceId = env.MAIL_API_WORKSPACE_ID ?? "muonnoi.org"
  const escapedLink = magicLink.replace(/&/g, "&amp;")

  const payload = {
    from: env.EMAIL_FROM_NOREPLY ?? "Muon Noi <noreply@muonnoi.org>",
    to: toEmail,
    subject: "Link đăng nhập Muon Noi của bạn",
    text: `Dùng link này để đăng nhập: ${magicLink}\nLink có hiệu lực trong 15 phút.`,
    html: `<p>Dùng link này để đăng nhập:</p><p><a href="${escapedLink}">${escapedLink}</a></p><p>Link có hiệu lực trong 15 phút.</p>`,
    message_idempotency_key: `ml_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  try {
    const res = await fetch(`${mailBase}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.MAIL_API_KEY}`,
        "X-Workspace-Id": workspaceId
      },
      body: JSON.stringify(payload)
    })
    if (!res.ok) {
      const text = await res.text()
      console.error("[magic-link] mail send failed:", res.status, text.slice(0, 200))
      return { ok: false, reason: `provider_error_${res.status}` }
    }
    return { ok: true }
  } catch (err) {
    console.error("[magic-link] mail fetch error:", err instanceof Error ? err.message : String(err))
    return { ok: false, reason: "network_error" }
  }
}

// ── POST /api/auth/magic-link/request ───────────────────────────────────────

export async function handleMagicLinkRequest(
  request: Request,
  env: Env
): Promise<Response> {
  const origin = request.headers.get("Origin")

  if (!env.MAGIC_LINK_SECRET) {
    return json({ ok: false, error: "Magic link not configured" }, 501, origin, env)
  }

  const rateLimit = await checkRateLimit(request, env, {
    namespace: "auth:magic-link",
    subject: null,
    limit: 5,
    windowMs: 15 * 60 * 1000
  })
  if (!rateLimit.allowed) {
    return json({
      ok: false,
      error: "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
      retry_after_ms: Math.max(0, rateLimit.resetAt - Date.now())
    }, 429, origin, env)
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: "Email không hợp lệ" }, 400, origin, env)
  }

  // Look up user — don't reveal existence
  const user = await findUserByEmail(env, email)

  if (user) {
    const apiBase = (env.API_ORIGIN ?? "https://api.muonnoi.org").replace(/\/+$/, "")
    const token = await createSignedToken(env.MAGIC_LINK_SECRET, {
      type: "magic_link_login",
      userId: String(user.id),
      email: user.email,
      exp: nowSeconds() + MAGIC_LINK_TTL_SECONDS
    })
    const magicLink = `${apiBase}/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`
    await sendMagicLinkEmail(env, user.email, magicLink)
  }

  // Always return 202 to avoid leaking account existence
  return json({
    ok: true,
    data: {
      accepted: true,
      channel: "email",
      expiresInSeconds: MAGIC_LINK_TTL_SECONDS
    }
  }, 202, origin, env)
}

// ── GET /api/auth/magic-link/verify?token=... ────────────────────────────────

export async function handleMagicLinkVerify(
  request: Request,
  env: Env
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const url = new URL(request.url)
  const token = url.searchParams.get("token") ?? ""
  const appOrigin = (env.APP_ORIGIN ?? "https://ai.muonnoi.org").replace(/\/+$/, "")
  const errorRedirect = `${appOrigin}/login/?error=magic_link_invalid`

  if (!env.MAGIC_LINK_SECRET) {
    return Response.redirect(errorRedirect, 302)
  }

  if (!token) {
    return Response.redirect(errorRedirect, 302)
  }

  const payload = await verifySignedToken(env.MAGIC_LINK_SECRET, token)
  if (!payload || payload["type"] !== "magic_link_login") {
    return Response.redirect(errorRedirect, 302)
  }

  const userId = String(payload["userId"] ?? "")
  const payloadEmail = String(payload["email"] ?? "").toLowerCase()

  if (!userId || !payloadEmail) {
    return Response.redirect(errorRedirect, 302)
  }

  // Verify user still exists and email matches
  const user = await findUserByEmail(env, payloadEmail)
  if (!user || String(user.id) !== userId) {
    return Response.redirect(errorRedirect, 302)
  }

  // Create session
  const sessionId = await createSession(env, user.id)

  const appDomain = env.APP_DOMAIN
  const isLocalHost = false
  const cookieOptions = {
    appDomain: isLocalHost ? undefined : appDomain,
    cookieSecure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE
  }

  const redirectUrl = env.GOOGLE_AUTH_REDIRECT_URL ?? `${appOrigin}/`

  const headers = new Headers()
  headers.set("Set-Cookie", buildSessionCookie(sessionId, cookieOptions))
  headers.set("Location", redirectUrl)

  return new Response(null, { status: 302, headers })
}
