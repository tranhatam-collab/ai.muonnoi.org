import type { Env } from "../env"
import { json } from "../lib/response"
import { findUserByEmail } from "../security/identity"
import { createSession } from "../security/session"
import { buildSessionCookie } from "../security/auth-cookie"
import { buildWelcomeGoogleEmail, fireEmail } from "../lib/email"

const OAUTH_STATE_TTL_SECONDS = 10 * 60

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

async function createSignedState(secret: string, payload: Record<string, unknown>): Promise<string> {
  const encodedPayload = encodeCursor(payload)
  const signature = await hmacSha256Hex(secret, encodedPayload)
  return `${encodedPayload}.${signature}`
}

async function verifySignedState(
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

function resolveConfig(env: Env): {
  ready: boolean
  missing: string[]
  clientId: string
  clientSecret: string
  redirectUri: string
  stateSecret: string
} {
  const missing: string[] = []
  const clientId = (env.GOOGLE_CLIENT_ID ?? "").trim()
  const clientSecret = (env.GOOGLE_CLIENT_SECRET ?? "").trim()
  const redirectUri = (env.GOOGLE_REDIRECT_URI ?? "").trim()
  const stateSecret = (env.GOOGLE_OAUTH_STATE_SECRET ?? env.SESSION_SECRET ?? "").trim()

  if (!clientId) missing.push("GOOGLE_CLIENT_ID")
  if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET")
  if (!redirectUri) missing.push("GOOGLE_REDIRECT_URI")
  if (!stateSecret) missing.push("GOOGLE_OAUTH_STATE_SECRET")

  return { ready: missing.length === 0, missing, clientId, clientSecret, redirectUri, stateSecret }
}

// Upsert a Google-authenticated user into the users table
async function upsertGoogleUser(
  env: Env,
  profile: Record<string, unknown>
): Promise<{ id: string; email: string; name: string; isNew: boolean }> {
  const email = String(profile.email ?? "").trim().toLowerCase()
  if (!email) throw new Error("Google profile does not include email")

  const existing = await findUserByEmail(env, email)
  if (existing) {
    return { id: String(existing.id), email: existing.email, name: existing.name, isNew: false }
  }

  // Create new user — no password
  const name = String(profile.name ?? profile.given_name ?? email.split("@")[0] ?? "").slice(0, 80)
  const newId = crypto.randomUUID()
  const now = Date.now()

  await env.iai_flow_db
    .prepare(
      `INSERT INTO users (
        id, email, name, password, password_hash, password_salt, password_algo,
        username, role, is_verified, created_at, updated_at
      ) VALUES (?1, ?2, ?3, '', NULL, NULL, NULL, NULL, 'member', 1, ?4, ?4)`
    )
    .bind(newId, email, name, now)
    .run()

  return { id: newId, email, name, isNew: true }
}

// ── GET /api/auth/google/start ───────────────────────────────────────────────

export async function handleGoogleAuthStart(
  request: Request,
  env: Env
): Promise<Response> {
  const cfg = resolveConfig(env)
  if (!cfg.ready) {
    return json({ ok: false, error: "Google OAuth not configured", missing: cfg.missing }, 501, null, env)
  }

  const nonce = crypto.randomUUID().replace(/-/g, "")
  const state = await createSignedState(cfg.stateSecret, {
    nonce,
    exp: nowSeconds() + OAUTH_STATE_TTL_SECONDS
  })

  const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  authorizeUrl.searchParams.set("client_id", cfg.clientId)
  authorizeUrl.searchParams.set("redirect_uri", cfg.redirectUri)
  authorizeUrl.searchParams.set("response_type", "code")
  authorizeUrl.searchParams.set("scope", "openid email profile")
  authorizeUrl.searchParams.set("state", state)
  authorizeUrl.searchParams.set("prompt", "select_account")

  return Response.redirect(authorizeUrl.toString(), 302)
}

// ── GET /api/auth/google/callback ────────────────────────────────────────────

export async function handleGoogleAuthCallback(
  request: Request,
  env: Env
): Promise<Response> {
  const appOrigin = (env.APP_ORIGIN ?? "https://ai.muonnoi.org").replace(/\/+$/, "")
  const errorRedirect = (reason: string) =>
    Response.redirect(`${appOrigin}/login/?error=${encodeURIComponent(reason)}`, 302)

  const cfg = resolveConfig(env)
  if (!cfg.ready) {
    return errorRedirect("provider_not_configured")
  }

  const url = new URL(request.url)
  const code = url.searchParams.get("code") ?? ""
  const state = url.searchParams.get("state") ?? ""
  const providerError = url.searchParams.get("error") ?? ""

  if (providerError) {
    return errorRedirect(`oauth_provider_error`)
  }

  if (!code || !state) {
    return errorRedirect("missing_code_or_state")
  }

  const statePayload = await verifySignedState(cfg.stateSecret, state)
  if (!statePayload) {
    return errorRedirect("invalid_oauth_state")
  }

  // Exchange code for token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: "authorization_code"
    })
  })

  const tokenPayload = await tokenRes.json().catch(() => ({})) as Record<string, unknown>
  if (!tokenRes.ok || !tokenPayload.access_token) {
    console.error("[google-oauth] token exchange failed:", JSON.stringify(tokenPayload).slice(0, 300))
    return errorRedirect("oauth_exchange_failed")
  }

  // Fetch user profile
  const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}` }
  })
  const profilePayload = await profileRes.json().catch(() => ({})) as Record<string, unknown>
  if (!profileRes.ok) {
    return errorRedirect("oauth_profile_failed")
  }

  if (!profilePayload.email || profilePayload.email_verified === false) {
    return errorRedirect("oauth_email_unverified")
  }

  // Upsert user and create session
  let user: { id: string; email: string; name: string; isNew: boolean }
  try {
    user = await upsertGoogleUser(env, profilePayload)
  } catch (err) {
    console.error("[google-oauth] upsert failed:", err instanceof Error ? err.message : String(err))
    return errorRedirect("account_error")
  }

  // Welcome email for first-time Google signups — fire-and-forget
  if (user.isNew) {
    fireEmail(env, buildWelcomeGoogleEmail(env, user.email, user.name))
  }

  const sessionId = await createSession(env, user.id)

  const appDomain = env.APP_DOMAIN
  const cookieOptions = {
    appDomain,
    cookieSecure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE
  }

  const redirectUrl = env.GOOGLE_AUTH_REDIRECT_URL ?? `${appOrigin}/`

  const headers = new Headers()
  headers.set("Set-Cookie", buildSessionCookie(sessionId, cookieOptions))
  headers.set("Location", redirectUrl)

  return new Response(null, { status: 302, headers })
}
