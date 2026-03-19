import type { Env } from "../env"
import { json } from "../lib/response"
import { getCurrentUser } from "../security/session"

export async function handleNotifications(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)

  const url = new URL(request.url)
  const unreadOnly = url.searchParams.get("unread_only") === "true"

  const where = unreadOnly
    ? "WHERE n.user_id = ?1 AND n.is_read = 0"
    : "WHERE n.user_id = ?1"

  const rows = await env.iai_flow_db
    .prepare(
      `SELECT n.id, n.type, n.ref_type, n.ref_id, n.message, n.is_read, n.created_at,
              u.name as actor_name, u.username as actor_username, u.avatar_url as actor_avatar
       FROM notifications n
       LEFT JOIN users u ON u.id = n.actor_id
       ${where}
       ORDER BY n.created_at DESC
       LIMIT 50`
    )
    .bind(user.id)
    .all<Record<string, unknown>>()

  return json({ ok: true, data: rows.results ?? [] }, 200, origin)
}

export async function handleNotificationCount(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: true, data: { count: 0 } }, 200, origin)

  const row = await env.iai_flow_db
    .prepare("SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ?1 AND is_read = 0")
    .bind(user.id)
    .first<{ cnt: number }>()

  return json({ ok: true, data: { count: row?.cnt ?? 0 } }, 200, origin)
}

export async function handleMarkAllRead(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)

  await env.iai_flow_db
    .prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?1")
    .bind(user.id)
    .run()

  return json({ ok: true }, 200, origin)
}
