import type { Env } from "../env"
import { getSessionCookie } from "./auth-cookie"
import { findUserBySessionId, type AuthUser } from "./identity"

function createSessionId(): string {
  return crypto.randomUUID()
}

export async function createSession(env: Env, userId: number): Promise<string> {
  const sessionId = createSessionId()
  const now = Date.now()
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000

  await env.iai_flow_db
    .prepare(
      "INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)"
    )
    .bind(sessionId, userId, now, expiresAt)
    .run()

  return sessionId
}

export async function deleteSession(env: Env, sessionId: string): Promise<void> {
  await env.iai_flow_db
    .prepare("DELETE FROM sessions WHERE id = ?1")
    .bind(sessionId)
    .run()
}

export async function getCurrentUser(request: Request, env: Env): Promise<AuthUser | null> {
  const sessionId = getSessionCookie(request)
  if (!sessionId) return null
  return findUserBySessionId(env, sessionId)
}

export async function requireUser(request: Request, env: Env): Promise<AuthUser> {
  const user = await getCurrentUser(request, env)
  if (!user) {
    throw new Error("UNAUTHORIZED")
  }
  return user
}
