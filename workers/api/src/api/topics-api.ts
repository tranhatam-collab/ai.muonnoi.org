import type { Env } from "../env"
import { json } from "../lib/response"

export async function handleTopics(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const rows = await env.iai_flow_db
    .prepare("SELECT id, slug, name, description, post_count FROM topics ORDER BY post_count DESC")
    .all<Record<string, unknown>>()
  return json({ ok: true, data: rows.results ?? [] }, 200, origin)
}

export async function handleRooms(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const rows = await env.iai_flow_db
    .prepare("SELECT id, name, description, member_count FROM rooms WHERE is_active = 1 ORDER BY member_count DESC")
    .all<Record<string, unknown>>()
  return json({ ok: true, data: rows.results ?? [] }, 200, origin)
}

export async function handleTrending(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")

  const [postsRow, commentsRow, usersRow] = await Promise.all([
    env.iai_flow_db.prepare("SELECT COUNT(*) as cnt FROM posts").first<{ cnt: number }>(),
    env.iai_flow_db.prepare("SELECT COUNT(*) as cnt FROM comments").first<{ cnt: number }>(),
    env.iai_flow_db.prepare("SELECT COUNT(*) as cnt FROM users").first<{ cnt: number }>()
  ])

  const hotPosts = await env.iai_flow_db
    .prepare(
      `SELECT p.id, p.title, p.topic, p.vote_count, p.comment_count,
              u.name as author
       FROM posts p
       INNER JOIN users u ON u.id = p.user_id
       WHERE p.visibility = 'public'
       ORDER BY p.vote_count DESC, p.created_at DESC
       LIMIT 5`
    )
    .all<Record<string, unknown>>()

  const topics = await env.iai_flow_db
    .prepare("SELECT slug, name, post_count FROM topics ORDER BY post_count DESC LIMIT 6")
    .all<Record<string, unknown>>()

  const rooms = await env.iai_flow_db
    .prepare("SELECT name, member_count FROM rooms WHERE is_active = 1 ORDER BY member_count DESC LIMIT 3")
    .all<Record<string, unknown>>()

  return json({
    ok: true,
    data: {
      communityStats: [
        { value: String(postsRow?.cnt ?? 0), label: "Bài viết" },
        { value: String(commentsRow?.cnt ?? 0), label: "Bình luận" },
        { value: String(usersRow?.cnt ?? 0), label: "Thành viên" },
        { value: "24/7", label: "Hoạt động" }
      ],
      trending: (topics.results ?? []).map(t => ({
        tag: `#${t.slug}`,
        name: t.name,
        count: `${t.post_count ?? 0} bài viết`
      })),
      rooms: rooms.results ?? [],
      hotPosts: hotPosts.results ?? []
    }
  }, 200, origin)
}
