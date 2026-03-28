import type { Env } from "../env"
import { hashPassword } from "./password"

export interface AuthUser {
  id: number
  email: string
  name: string
  username?: string
  avatar_url?: string
  bio?: string
  role?: string
  is_verified?: number
  password?: string
  password_hash?: string | null
  password_salt?: string | null
  password_algo?: string | null
}

export async function findUserByEmail(env: Env, email: string): Promise<AuthUser | null> {
  const row = await env.iai_flow_db
    .prepare("SELECT id, email, name, username, avatar_url, bio, role, is_verified FROM users WHERE email = ?1 LIMIT 1")
    .bind(email)
    .first<AuthUser>()
  return row ?? null
}

export async function findUserWithPassword(
  env: Env,
  email: string
): Promise<(AuthUser & { password: string }) | null> {
  const row = await env.iai_flow_db
    .prepare(
      `SELECT id, email, name, username, avatar_url, bio, role, is_verified,
              password, password_hash, password_salt, password_algo
       FROM users
       WHERE email = ?1
       LIMIT 1`
    )
    .bind(email)
    .first<AuthUser & { password: string }>()
  return row ?? null
}

export async function findUserBySessionId(env: Env, sessionId: string): Promise<AuthUser | null> {
  const now = Date.now()
  const row = await env.iai_flow_db
    .prepare(
      `SELECT u.id, u.email, u.name, u.username, u.avatar_url, u.bio, u.role, u.is_verified
       FROM sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.id = ?1 AND s.expires_at > ?2
       LIMIT 1`
    )
    .bind(sessionId, now)
    .first<AuthUser>()
  return row ?? null
}

export async function findUserById(env: Env, userId: number): Promise<AuthUser | null> {
  const row = await env.iai_flow_db
    .prepare("SELECT id, email, name, username, avatar_url, bio, role, is_verified FROM users WHERE id = ?1 LIMIT 1")
    .bind(userId)
    .first<AuthUser>()
  return row ?? null
}

export async function createUser(
  env: Env,
  email: string,
  name: string,
  password: string,
  username?: string
): Promise<number | null> {
  const hashed = await hashPassword(password)
  const normalizedUsername = username && username.trim() ? username.trim() : null
  const now = Date.now()
  const result = await env.iai_flow_db
    .prepare(
      `INSERT INTO users (
        email, name, password, password_hash, password_salt, password_algo,
        username, role, is_verified, created_at
      ) VALUES (?1, ?2, '', ?3, ?4, ?5, ?6, 'member', 0, ?7)`
    )
    .bind(email, name, hashed.hash, hashed.salt, hashed.algorithm, normalizedUsername, now)
    .run()
  return result.meta?.last_row_id ?? null
}

export async function setUserPasswordHash(
  env: Env,
  userId: number,
  password: string
): Promise<void> {
  const hashed = await hashPassword(password)

  await env.iai_flow_db
    .prepare(
      `UPDATE users
       SET password = '',
           password_hash = ?1,
           password_salt = ?2,
           password_algo = ?3
       WHERE id = ?4`
    )
    .bind(hashed.hash, hashed.salt, hashed.algorithm, userId)
    .run()
}

export async function updateUserProfile(
  env: Env,
  userId: number,
  fields: { username?: string; bio?: string; avatar_url?: string; name?: string }
): Promise<void> {
  const parts: string[] = []
  const values: unknown[] = []
  let idx = 1
  if (fields.username !== undefined) { parts.push(`username = ?${idx++}`); values.push(fields.username) }
  if (fields.bio !== undefined) { parts.push(`bio = ?${idx++}`); values.push(fields.bio) }
  if (fields.avatar_url !== undefined) { parts.push(`avatar_url = ?${idx++}`); values.push(fields.avatar_url) }
  if (fields.name !== undefined) { parts.push(`name = ?${idx++}`); values.push(fields.name) }
  if (!parts.length) return
  values.push(userId)
  await env.iai_flow_db
    .prepare(`UPDATE users SET ${parts.join(", ")} WHERE id = ?${idx}`)
    .bind(...values)
    .run()
}
