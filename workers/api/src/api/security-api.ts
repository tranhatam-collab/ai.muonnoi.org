import type { Env } from "../env"
import { json, corsHeaders } from "../lib/response"
import { findUserWithPassword, createUser, updateUserProfile } from "../security/identity"
import { createSession, deleteSession, getCurrentUser } from "../security/session"
import { buildClearSessionCookie, buildSessionCookie, getSessionCookie } from "../security/auth-cookie"
import { canAccessApp } from "../security/permission"
import { fireWebhooks } from "../lib/webhooks"

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const body = await request.json().catch(() => ({} as Record<string, unknown>))

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const password = typeof body.password === "string" ? body.password : ""

  if (!email || !password) {
    return json({ ok: false, error: "Email và password là bắt buộc" }, 400, origin)
  }

  const user = await findUserWithPassword(env, email)
  if (!user || user.password !== password) {
    return json({ ok: false, error: "Sai thông tin đăng nhập" }, 401, origin)
  }

  if (!canAccessApp(user)) {
    return json({ ok: false, error: "Không có quyền truy cập" }, 403, origin)
  }

  const sessionId = await createSession(env, user.id)

  return new Response(
    JSON.stringify({
      ok: true,
      data: { id: user.id, email: user.email, name: user.name, username: user.username, avatar_url: user.avatar_url, role: user.role }
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Set-Cookie": buildSessionCookie(sessionId),
        ...corsHeaders(origin)
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
  const body = await request.json().catch(() => ({} as Record<string, unknown>))

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const password = typeof body.password === "string" ? body.password : ""
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : undefined

  if (!email || !name || !password) {
    return json({ ok: false, error: "Email, tên và password là bắt buộc" }, 400, origin)
  }
  if (password.length < 6) {
    return json({ ok: false, error: "Password cần ít nhất 6 ký tự" }, 400, origin)
  }

  const existing = await findUserWithPassword(env, email)
  if (existing) {
    return json({ ok: false, error: "Email đã được sử dụng" }, 409, origin)
  }

  const userId = await createUser(env, email, name, password, username)
  if (!userId) return json({ ok: false, error: "Không thể tạo tài khoản" }, 500, origin)

  ctx.waitUntil(
    fireWebhooks(env, ctx, "user_registered", { user_id: userId, email, username })
  )

  const sessionId = await createSession(env, userId)

  return new Response(
    JSON.stringify({ ok: true, data: { id: userId, email, name, username } }),
    {
      status: 201,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Set-Cookie": buildSessionCookie(sessionId),
        ...corsHeaders(origin)
      }
    }
  )
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const sessionId = getSessionCookie(request)
  if (sessionId) await deleteSession(env, sessionId)

  return new Response(
    JSON.stringify({ ok: true, data: { logged_out: true } }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Set-Cookie": buildClearSessionCookie(),
        ...corsHeaders(origin)
      }
    }
  )
}

export async function handleMe(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)
  return json({ ok: true, data: user }, 200, origin)
}

export async function handleUpdateProfile(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const fields: Parameters<typeof updateUserProfile>[2] = {}
  if (typeof body.name === "string") fields.name = body.name.trim()
  if (typeof body.username === "string") fields.username = body.username.trim().toLowerCase()
  if (typeof body.bio === "string") fields.bio = body.bio.trim()
  if (typeof body.avatar_url === "string") fields.avatar_url = body.avatar_url.trim()

  await updateUserProfile(env, user.id, fields)
  return json({ ok: true }, 200, origin)
}
