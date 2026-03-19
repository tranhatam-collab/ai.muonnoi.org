import type { Env } from "../env"
import { json, corsHeaders } from "../lib/response"
import { findUserWithPassword } from "../security/identity"
import { createSession, deleteSession, getCurrentUser } from "../security/session"
import { buildClearSessionCookie, buildSessionCookie, getSessionCookie } from "../security/auth-cookie"
import { canAccessApp } from "../security/permission"

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
      data: {
        id: user.id,
        email: user.email,
        name: user.name
      }
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

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const sessionId = getSessionCookie(request)

  if (sessionId) {
    await deleteSession(env, sessionId)
  }

  return new Response(
    JSON.stringify({
      ok: true,
      data: { logged_out: true }
    }),
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

  if (!user) {
    return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)
  }

  return json({ ok: true, data: user }, 200, origin)
}
