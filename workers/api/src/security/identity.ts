import type { Env } from "../env"

export interface AuthUser {
  id: number
  email: string
  name: string
}

export async function findUserByEmail(env: Env, email: string): Promise<AuthUser | null> {
  const row = await env.iai_flow_db
    .prepare("SELECT id, email, name FROM users WHERE email = ?1 LIMIT 1")
    .bind(email)
    .first<AuthUser>()

  return row ?? null
}

export async function findUserWithPassword(
  env: Env,
  email: string
): Promise<(AuthUser & { password: string }) | null> {
  const row = await env.iai_flow_db
    .prepare("SELECT id, email, name, password FROM users WHERE email = ?1 LIMIT 1")
    .bind(email)
    .first<AuthUser & { password: string }>()

  return row ?? null
}

export async function findUserBySessionId(env: Env, sessionId: string): Promise<AuthUser | null> {
  const now = Date.now()

  const row = await env.iai_flow_db
    .prepare(
      `SELECT u.id, u.email, u.name
       FROM sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.id = ?1 AND s.expires_at > ?2
       LIMIT 1`
    )
    .bind(sessionId, now)
    .first<AuthUser>()

  return row ?? null
}
