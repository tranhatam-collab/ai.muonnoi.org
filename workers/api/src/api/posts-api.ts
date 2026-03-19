import type { Env } from "../env"
import { json } from "../lib/response"
import { getCurrentUser } from "../security/session"
import { PAGE_SIZE, getCursorFromUrl, encodeCursor } from "../lib/pagination"
import { runAiModeration } from "../lib/ai"
import { fireWebhooks } from "../lib/webhooks"

export async function handlePosts(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const method = request.method.toUpperCase()
  const url = new URL(request.url)

  if (method === "GET") {
    const tab = url.searchParams.get("tab") || "latest"
    const topic = url.searchParams.get("topic") || ""
    const q = url.searchParams.get("q") || ""
    const cursor = getCursorFromUrl(url)

    let baseWhere = "WHERE p.visibility = 'public'"
    const binds: unknown[] = []
    let idx = 1

    if (topic) { baseWhere += ` AND p.topic = ?${idx++}`; binds.push(topic) }
    if (q) { baseWhere += ` AND (p.title LIKE ?${idx} OR p.body LIKE ?${idx})`; binds.push(`%${q}%`); idx++ }
    if (tab === "hot") baseWhere += " AND p.is_hot = 1"
    if (tab === "verified") baseWhere += " AND p.is_verified = 1"
    if (tab === "ai") baseWhere += " AND p.is_ai = 1"

    if (cursor) {
      baseWhere += ` AND (p.created_at < ?${idx} OR (p.created_at = ?${idx} AND p.id < ?${idx + 1}))`
      binds.push(cursor.ts, cursor.ts, cursor.id)
    }

    const rows = await env.iai_flow_db
      .prepare(
        `SELECT p.id, p.title, p.body, p.topic, p.post_type, p.link_url, p.link_title,
                p.is_hot, p.is_verified, p.is_ai, p.vote_count, p.comment_count, p.created_at,
                u.id as user_id, u.name as author, u.username, u.avatar_url, u.is_verified as author_verified
         FROM posts p
         INNER JOIN users u ON u.id = p.user_id
         ${baseWhere}
         ORDER BY p.created_at DESC, p.id DESC
         LIMIT ${PAGE_SIZE + 1}`
      )
      .bind(...binds)
      .all<Record<string, unknown>>()

    const items = rows.results ?? []
    const hasMore = items.length > PAGE_SIZE
    if (hasMore) items.pop()

    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1].created_at as number, items[items.length - 1].id as number)
      : null

    // Attach labels
    for (const post of items) {
      const labels = await env.iai_flow_db
        .prepare("SELECT label, added_by FROM post_labels WHERE post_id = ?1")
        .bind(post.id)
        .all<{ label: string; added_by: string }>()
      post.labels = labels.results ?? []
    }

    return json({ ok: true, data: items, next_cursor: nextCursor }, 200, origin)
  }

  if (method === "POST") {
    const user = await getCurrentUser(request, env)
    if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)

    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const title = typeof body.title === "string" ? body.title.trim() : ""
    const text = typeof body.body === "string" ? body.body.trim() : ""
    const topic = typeof body.topic === "string" ? body.topic.trim() : ""
    const postType = typeof body.post_type === "string" ? body.post_type : "discussion"
    const linkUrl = typeof body.link_url === "string" ? body.link_url : null
    const linkTitle = typeof body.link_title === "string" ? body.link_title : null
    const linkDesc = typeof body.link_desc === "string" ? body.link_desc : null

    if (!title || !text) return json({ ok: false, error: "Tiêu đề và nội dung là bắt buộc" }, 400, origin)

    const now = Date.now()
    const result = await env.iai_flow_db
      .prepare(
        `INSERT INTO posts (user_id, title, body, topic, post_type, link_url, link_title, link_desc,
         visibility, is_hot, is_verified, is_ai, vote_count, comment_count, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,'public',0,0,0,0,0,?9,?9)`
      )
      .bind(user.id, title, text, topic, postType, linkUrl, linkTitle, linkDesc, now)
      .run()

    const postId = result.meta?.last_row_id as number

    ctx.waitUntil(runAiModeration(env, postId, `${title} ${text}`))
    ctx.waitUntil(
      fireWebhooks(env, ctx, "post_created", {
        post_id: postId, user_id: user.id, title, topic, is_ai: false
      })
    )

    return json({ ok: true, data: { id: postId, title, created_at: now } }, 201, origin)
  }

  return json({ ok: false, error: "Method Not Allowed" }, 405, origin)
}

export async function handlePostById(
  request: Request,
  env: Env,
  postId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const method = request.method.toUpperCase()

  if (method === "GET") {
    const post = await env.iai_flow_db
      .prepare(
        `SELECT p.*, u.name as author, u.username, u.avatar_url, u.is_verified as author_verified
         FROM posts p INNER JOIN users u ON u.id = p.user_id
         WHERE p.id = ?1 LIMIT 1`
      )
      .bind(postId)
      .first<Record<string, unknown>>()

    if (!post) return json({ ok: false, error: "Không tìm thấy bài viết" }, 404, origin)

    const labels = await env.iai_flow_db
      .prepare("SELECT label, added_by FROM post_labels WHERE post_id = ?1")
      .bind(postId)
      .all<{ label: string; added_by: string }>()
    post.labels = labels.results ?? []

    return json({ ok: true, data: post }, 200, origin)
  }

  if (method === "DELETE") {
    const user = await getCurrentUser(request, env)
    if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)

    const post = await env.iai_flow_db
      .prepare("SELECT user_id FROM posts WHERE id = ?1 LIMIT 1")
      .bind(postId)
      .first<{ user_id: number }>()

    if (!post) return json({ ok: false, error: "Không tìm thấy" }, 404, origin)
    if (post.user_id !== user.id && user.role !== "admin" && user.role !== "moderator") {
      return json({ ok: false, error: "Không có quyền" }, 403, origin)
    }

    await env.iai_flow_db.prepare("DELETE FROM posts WHERE id = ?1").bind(postId).run()
    return json({ ok: true }, 200, origin)
  }

  return json({ ok: false, error: "Method Not Allowed" }, 405, origin)
}

export async function handleVotePost(
  request: Request,
  env: Env,
  postId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)

  const now = Date.now()
  const existing = await env.iai_flow_db
    .prepare("SELECT id FROM votes WHERE user_id = ?1 AND target_type = 'post' AND target_id = ?2 LIMIT 1")
    .bind(user.id, postId)
    .first<{ id: number }>()

  if (existing) {
    await env.iai_flow_db.prepare("DELETE FROM votes WHERE id = ?1").bind(existing.id).run()
    await env.iai_flow_db.prepare("UPDATE posts SET vote_count = MAX(0, vote_count - 1) WHERE id = ?1").bind(postId).run()
    const updated = await env.iai_flow_db.prepare("SELECT vote_count FROM posts WHERE id = ?1").bind(postId).first<{ vote_count: number }>()
    return json({ ok: true, data: { voted: false, vote_count: updated?.vote_count ?? 0 } }, 200, origin)
  }

  await env.iai_flow_db
    .prepare("INSERT INTO votes (user_id, target_type, target_id, value, created_at) VALUES (?1, 'post', ?2, 1, ?3)")
    .bind(user.id, postId, now)
    .run()
  await env.iai_flow_db.prepare("UPDATE posts SET vote_count = vote_count + 1 WHERE id = ?1").bind(postId).run()
  const updated = await env.iai_flow_db.prepare("SELECT vote_count FROM posts WHERE id = ?1").bind(postId).first<{ vote_count: number }>()

  // Check vote milestones for n8n
  const count = updated?.vote_count ?? 0
  const milestones = [10, 50, 100, 500]
  if (milestones.includes(count)) {
    // fire webhook async (no ctx available here, fire directly)
    env.iai_flow_db.prepare("SELECT id FROM n8n_webhooks WHERE trigger_event = 'vote_milestone' AND is_active = 1").all()
      .then(rows => {
        for (const row of (rows.results ?? []) as Array<{ id: number; webhook_url: string }>) {
          fetch(row.webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ post_id: postId, vote_count: count, milestone: count })
          }).catch(() => {})
        }
      })
      .catch(() => {})
  }

  return json({ ok: true, data: { voted: true, vote_count: count } }, 200, origin)
}

export async function handleSavePost(
  request: Request,
  env: Env,
  postId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)

  const existing = await env.iai_flow_db
    .prepare("SELECT id FROM saved_posts WHERE user_id = ?1 AND post_id = ?2 LIMIT 1")
    .bind(user.id, postId)
    .first<{ id: number }>()

  if (existing) {
    await env.iai_flow_db.prepare("DELETE FROM saved_posts WHERE id = ?1").bind(existing.id).run()
    return json({ ok: true, data: { saved: false } }, 200, origin)
  }

  await env.iai_flow_db
    .prepare("INSERT INTO saved_posts (user_id, post_id, created_at) VALUES (?1, ?2, ?3)")
    .bind(user.id, postId, Date.now())
    .run()
  return json({ ok: true, data: { saved: true } }, 200, origin)
}
