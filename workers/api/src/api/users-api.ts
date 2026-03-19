import type { Env } from "../env"
import { json } from "../lib/response"
import { getCurrentUser } from "../security/session"
import { findUserById } from "../security/identity"
import { fireWebhooks } from "../lib/webhooks"

export async function handleUserProfile(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")

  const user = await findUserById(env, Number(userId))
  if (!user) return json({ ok: false, error: "Không tìm thấy người dùng" }, 404, origin)

  const [postsRow, followersRow, followingRow] = await Promise.all([
    env.iai_flow_db.prepare("SELECT COUNT(*) as cnt FROM posts WHERE user_id = ?1").bind(userId).first<{ cnt: number }>(),
    env.iai_flow_db.prepare("SELECT COUNT(*) as cnt FROM follows WHERE following_id = ?1").bind(userId).first<{ cnt: number }>(),
    env.iai_flow_db.prepare("SELECT COUNT(*) as cnt FROM follows WHERE follower_id = ?1").bind(userId).first<{ cnt: number }>()
  ])

  const posts = await env.iai_flow_db
    .prepare(
      "SELECT id, title, topic, vote_count, comment_count, created_at FROM posts WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 10"
    )
    .bind(userId)
    .all<Record<string, unknown>>()

  return json({
    ok: true,
    data: {
      ...user,
      post_count: postsRow?.cnt ?? 0,
      follower_count: followersRow?.cnt ?? 0,
      following_count: followingRow?.cnt ?? 0,
      recent_posts: posts.results ?? []
    }
  }, 200, origin)
}

export async function handleFollow(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  targetUserId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)

  if (user.id === Number(targetUserId)) {
    return json({ ok: false, error: "Không thể tự follow" }, 400, origin)
  }

  const existing = await env.iai_flow_db
    .prepare("SELECT id FROM follows WHERE follower_id = ?1 AND following_id = ?2 LIMIT 1")
    .bind(user.id, targetUserId)
    .first<{ id: number }>()

  if (existing) {
    await env.iai_flow_db.prepare("DELETE FROM follows WHERE id = ?1").bind(existing.id).run()
    return json({ ok: true, data: { following: false } }, 200, origin)
  }

  await env.iai_flow_db
    .prepare("INSERT INTO follows (follower_id, following_id, created_at) VALUES (?1, ?2, ?3)")
    .bind(user.id, targetUserId, Date.now())
    .run()

  // Notify target user
  await env.iai_flow_db
    .prepare(
      "INSERT INTO notifications (user_id, type, ref_type, ref_id, actor_id, message, created_at) VALUES (?1,'follow','user',?2,?3,?4,?5)"
    )
    .bind(Number(targetUserId), user.id, user.id, `${user.name} đã bắt đầu theo dõi bạn`, Date.now())
    .run()

  return json({ ok: true, data: { following: true } }, 200, origin)
}
