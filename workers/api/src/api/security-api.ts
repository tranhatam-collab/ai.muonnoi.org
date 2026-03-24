import type { Env } from "../env"
import { json, corsHeaders } from "../lib/response"
import { checkRateLimit } from "../lib/rate-limit"
import {
  findUserById,
  findUserWithPassword,
  createUser,
  setUserPasswordHash,
  updateUserProfile
} from "../security/identity"
import { createSession, deleteSession, getCurrentUser } from "../security/session"
import { buildClearSessionCookie, buildSessionCookie, getSessionCookie } from "../security/auth-cookie"
import { canAccessApp } from "../security/permission"
import { isPasswordHashSupported, verifyPassword } from "../security/password"
import { fireWebhooks } from "../lib/webhooks"

function serializeUser(user: Awaited<ReturnType<typeof getCurrentUser>> | NonNullable<Awaited<ReturnType<typeof findUserById>>>) {
  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username,
    avatar_url: user.avatar_url,
    bio: user.bio,
    role: user.role,
    is_verified: user.is_verified,
    can_access_app: canAccessApp(user)
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,24}$/.test(username)
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function resolveCookieOptions(request: Request, env: Env) {
  const origin = request.headers.get("Origin")
  let hostname = ""

  try {
    hostname = origin ? new URL(origin).hostname : new URL(request.url).hostname
  } catch {
    hostname = ""
  }

  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1"

  return {
    appDomain: isLocalHost ? undefined : env.APP_DOMAIN,
    cookieSecure: isLocalHost ? "false" : env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE
  }
}

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const cookieOptions = resolveCookieOptions(request, env)
  const body = await request.json().catch(() => ({} as Record<string, unknown>))

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const password = typeof body.password === "string" ? body.password : ""

  const rateLimit = await checkRateLimit(request, env, {
    namespace: "auth:login",
    subject: email || null,
    limit: 10,
    windowMs: 10 * 60 * 1000
  })

  if (!rateLimit.allowed) {
    return json({
      ok: false,
      error: "Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau.",
      retry_after_ms: Math.max(0, rateLimit.resetAt - Date.now())
    }, 429, origin, env)
  }

  if (!email || !password) {
    return json({ ok: false, error: "Email và mật khẩu là bắt buộc" }, 400, origin, env)
  }

  const user = await findUserWithPassword(env, email)
  if (!user) {
    return json({ ok: false, error: "Sai thông tin đăng nhập" }, 401, origin, env)
  }

  let verified = false

  if (user.password_hash && user.password_salt && isPasswordHashSupported(user.password_algo)) {
    verified = await verifyPassword(password, user.password_hash, user.password_salt)
  } else if (user.password && user.password === password) {
    verified = true
    await setUserPasswordHash(env, user.id, password)
  }

  if (!verified) {
    return json({ ok: false, error: "Sai thông tin đăng nhập" }, 401, origin, env)
  }

  const sessionId = await createSession(env, user.id)

  return new Response(
    JSON.stringify({
      ok: true,
      data: serializeUser(user)
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Set-Cookie": buildSessionCookie(sessionId, cookieOptions),
        ...corsHeaders(origin, env)
      }
    }
  )
}

export async function handleRegister(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const cookieOptions = resolveCookieOptions(request, env)
  const body = await request.json().catch(() => ({} as Record<string, unknown>))

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const password = typeof body.password === "string" ? body.password : ""
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : undefined

  const rateLimit = await checkRateLimit(request, env, {
    namespace: "auth:register",
    subject: email || null,
    limit: 5,
    windowMs: 60 * 60 * 1000
  })

  if (!rateLimit.allowed) {
    return json({
      ok: false,
      error: "Bạn đã thử đăng ký quá nhiều lần. Vui lòng thử lại sau.",
      retry_after_ms: Math.max(0, rateLimit.resetAt - Date.now())
    }, 429, origin, env)
  }

  if (!email || !name || !password) {
    return json({ ok: false, error: "Email, tên và mật khẩu là bắt buộc" }, 400, origin, env)
  }
  if (!isValidEmail(email)) {
    return json({ ok: false, error: "Email không hợp lệ" }, 400, origin, env)
  }
  if (name.length < 2 || name.length > 80) {
    return json({ ok: false, error: "Tên hiển thị phải từ 2 đến 80 ký tự" }, 400, origin, env)
  }
  if (password.length < 8) {
    return json({ ok: false, error: "Mật khẩu cần ít nhất 8 ký tự" }, 400, origin, env)
  }
  if (username && !isValidUsername(username)) {
    return json({ ok: false, error: "Username chỉ gồm chữ thường, số, dấu gạch dưới và dài 3-24 ký tự" }, 400, origin, env)
  }

  const existing = await findUserWithPassword(env, email)
  if (existing) {
    return json({ ok: false, error: "Email đã được sử dụng" }, 409, origin, env)
  }

  let userId: number | null = null

  try {
    userId = await createUser(env, email, name, password, username)
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : ""
    if (message.includes("username")) {
      return json({ ok: false, error: "Username đã được sử dụng" }, 409, origin, env)
    }
    return json({ ok: false, error: "Không thể tạo tài khoản" }, 500, origin, env)
  }

  if (!userId) return json({ ok: false, error: "Không thể tạo tài khoản" }, 500, origin, env)

  ctx.waitUntil(
    fireWebhooks(env, ctx, "user_registered", { user_id: userId, email, username })
  )

  const sessionId = await createSession(env, userId)

  return new Response(
    JSON.stringify({
      ok: true,
      data: {
        id: userId,
        email,
        name,
        username,
        avatar_url: null,
        bio: "",
        role: "member",
        is_verified: 0,
        can_access_app: false
      }
    }),
    {
      status: 201,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Set-Cookie": buildSessionCookie(sessionId, cookieOptions),
        ...corsHeaders(origin, env)
      }
    }
  )
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const cookieOptions = resolveCookieOptions(request, env)
  const sessionId = getSessionCookie(request)
  if (sessionId) await deleteSession(env, sessionId)

  return new Response(
    JSON.stringify({ ok: true, data: { logged_out: true } }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Set-Cookie": buildClearSessionCookie(cookieOptions),
        ...corsHeaders(origin, env)
      }
    }
  )
}

export async function handleMe(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, env)
  return json({ ok: true, data: serializeUser(user) }, 200, origin, env)
}

export async function handleUpdateProfile(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, env)

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const fields: Parameters<typeof updateUserProfile>[2] = {}
  if (typeof body.name === "string") {
    const nextName = body.name.trim()
    if (nextName.length < 2 || nextName.length > 80) {
      return json({ ok: false, error: "Tên hiển thị phải từ 2 đến 80 ký tự" }, 400, origin, env)
    }
    fields.name = nextName
  }
  if (typeof body.username === "string") {
    const nextUsername = body.username.trim().toLowerCase()
    if (nextUsername && !isValidUsername(nextUsername)) {
      return json({ ok: false, error: "Username không hợp lệ" }, 400, origin, env)
    }
    fields.username = nextUsername
  }
  if (typeof body.bio === "string") {
    const nextBio = body.bio.trim()
    if (nextBio.length > 280) {
      return json({ ok: false, error: "Bio tối đa 280 ký tự" }, 400, origin, env)
    }
    fields.bio = nextBio
  }
  if (typeof body.avatar_url === "string") {
    const avatarUrl = body.avatar_url.trim()
    if (avatarUrl && !isValidHttpUrl(avatarUrl)) {
      return json({ ok: false, error: "Avatar URL phải là http hoặc https" }, 400, origin, env)
    }
    fields.avatar_url = avatarUrl
  }

  try {
    await updateUserProfile(env, user.id, fields)
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : ""
    if (message.includes("username")) {
      return json({ ok: false, error: "Username đã được sử dụng" }, 409, origin, env)
    }
    return json({ ok: false, error: "Không thể cập nhật hồ sơ" }, 500, origin, env)
  }

  const updated = await findUserById(env, user.id)
  return json({ ok: true, data: serializeUser(updated) }, 200, origin, env)
}
