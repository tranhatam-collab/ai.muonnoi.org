import type { Env } from "../env"
import { json } from "../lib/response"
import { checkRateLimit } from "../lib/rate-limit"
import { getCurrentUser } from "../security/session"
import { fireFlowTriggers } from "../lib/webhooks"

export async function handleComments(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  postId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const method = request.method.toUpperCase()

  if (method === "GET") {
    const rows = await env.iai_flow_db
      .prepare(
        `SELECT c.id, c.body, c.parent_id, c.is_ai, c.vote_count, c.created_at,
                u.id as user_id, u.name as author, u.username, u.avatar_url, u.is_verified as author_verified
         FROM comments c
         INNER JOIN users u ON u.id = c.user_id
         WHERE c.post_id = ?1
         ORDER BY c.created_at ASC
         LIMIT 100`
      )
      .bind(postId)
      .all<Record<string, unknown>>()

    return json({ ok: true, data: rows.results ?? [] }, 200, origin, env)
  }

  if (method === "POST") {
    const user = await getCurrentUser(request, env)
    if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, env)

    const rateLimit = await checkRateLimit(request, env, {
      namespace: "comments:create",
      subject: user.id,
      limit: 60,
      windowMs: 60 * 60 * 1000
    })

    if (!rateLimit.allowed) {
      return json({ ok: false, error: "Bạn đã gửi quá nhiều bình luận trong giờ này. Vui lòng thử lại sau." }, 429, origin, env)
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const text = typeof body.body === "string" ? body.body.trim() : ""
    const parentId = typeof body.parent_id === "number" ? body.parent_id : null

    if (!text) return json({ ok: false, error: "Nội dung bình luận là bắt buộc" }, 400, origin, env)
    if (text.length > 2000) return json({ ok: false, error: "Bình luận tối đa 2.000 ký tự" }, 400, origin, env)

    const post = await env.iai_flow_db
      .prepare("SELECT id, user_id, title FROM posts WHERE id = ?1 AND visibility = 'public' LIMIT 1")
      .bind(postId)
      .first<{ id: number; user_id: number; title: string }>()

    if (!post) return json({ ok: false, error: "Không tìm thấy bài viết" }, 404, origin, env)

    if (parentId !== null) {
      const parent = await env.iai_flow_db
        .prepare("SELECT id FROM comments WHERE id = ?1 AND post_id = ?2 LIMIT 1")
        .bind(parentId, postId)
        .first<{ id: number }>()

      if (!parent) {
        return json({ ok: false, error: "Bình luận cha không hợp lệ" }, 400, origin, env)
      }
    }

    const now = Date.now()
    const result = await env.iai_flow_db
      .prepare(
        "INSERT INTO comments (post_id, parent_id, user_id, body, is_ai, vote_count, created_at) VALUES (?1,?2,?3,?4,0,0,?5)"
      )
      .bind(postId, parentId, user.id, text, now)
      .run()

    await env.iai_flow_db
      .prepare("UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?1")
      .bind(postId)
      .run()

    const commentId = result.meta?.last_row_id as number

    if (post.user_id !== user.id) {
      await env.iai_flow_db
        .prepare(
          `INSERT INTO notifications (user_id, type, ref_type, ref_id, actor_id, message, created_at)
           VALUES (?1, 'comment', 'post', ?2, ?3, ?4, ?5)`
        )
        .bind(post.user_id, Number(postId), user.id, `${user.name} đã bình luận về "${post.title}"`, now)
        .run()
    }

    ctx.waitUntil(
      fireFlowTriggers(env, ctx, "comment_added", {
        comment_id: commentId, post_id: Number(postId), user_id: user.id, body: text
      })
    )

    return json({
      ok: true,
      data: { id: commentId, body: text, parent_id: parentId, created_at: now, author: user.name, user_id: user.id }
    }, 201, origin, env)
  }

  return json({ ok: false, error: "Method Not Allowed" }, 405, origin, env)
}

export async function handleDeleteComment(
  request: Request,
  env: Env,
  commentId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, env)

  const comment = await env.iai_flow_db
    .prepare("SELECT user_id, post_id FROM comments WHERE id = ?1 LIMIT 1")
    .bind(commentId)
    .first<{ user_id: number; post_id: number }>()

  if (!comment) return json({ ok: false, error: "Không tìm thấy" }, 404, origin, env)
  if (comment.user_id !== user.id && user.role !== "admin" && user.role !== "moderator") {
    return json({ ok: false, error: "Không có quyền" }, 403, origin, env)
  }

  await env.iai_flow_db.prepare("DELETE FROM comments WHERE id = ?1").bind(commentId).run()
  await env.iai_flow_db
    .prepare("UPDATE posts SET comment_count = MAX(0, comment_count - 1) WHERE id = ?1")
    .bind(comment.post_id)
    .run()

  return json({ ok: true }, 200, origin, env)
}

export async function handleVoteComment(
  request: Request,
  env: Env,
  commentId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, env)

  const comment = await env.iai_flow_db
    .prepare("SELECT id FROM comments WHERE id = ?1 LIMIT 1")
    .bind(commentId)
    .first<{ id: number }>()

  if (!comment) return json({ ok: false, error: "Không tìm thấy bình luận" }, 404, origin, env)

  const existing = await env.iai_flow_db
    .prepare("SELECT id FROM votes WHERE user_id = ?1 AND target_type = 'comment' AND target_id = ?2 LIMIT 1")
    .bind(user.id, commentId)
    .first<{ id: number }>()

  if (existing) {
    await env.iai_flow_db.prepare("DELETE FROM votes WHERE id = ?1").bind(existing.id).run()
    await env.iai_flow_db.prepare("UPDATE comments SET vote_count = MAX(0, vote_count - 1) WHERE id = ?1").bind(commentId).run()
    const c = await env.iai_flow_db.prepare("SELECT vote_count FROM comments WHERE id = ?1").bind(commentId).first<{ vote_count: number }>()
    return json({ ok: true, data: { voted: false, vote_count: c?.vote_count ?? 0 } }, 200, origin, env)
  }

  await env.iai_flow_db
    .prepare("INSERT INTO votes (user_id, target_type, target_id, value, created_at) VALUES (?1,'comment',?2,1,?3)")
    .bind(user.id, commentId, Date.now())
    .run()
  await env.iai_flow_db.prepare("UPDATE comments SET vote_count = vote_count + 1 WHERE id = ?1").bind(commentId).run()
  const c = await env.iai_flow_db.prepare("SELECT vote_count FROM comments WHERE id = ?1").bind(commentId).first<{ vote_count: number }>()

  return json({ ok: true, data: { voted: true, vote_count: c?.vote_count ?? 0 } }, 200, origin, env)
}
