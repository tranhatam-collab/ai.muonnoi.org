import type { Env } from "../env"
import { json } from "../lib/response"
import { checkRateLimit } from "../lib/rate-limit"
import { getCurrentUser } from "../security/session"
import { PAGE_SIZE, getCursorFromUrl, encodeCursor } from "../lib/pagination"
import { runAiModeration } from "../lib/ai"
import { fireFlowTriggers } from "../lib/webhooks"

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function normalizeTopic(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 48)
}

async function ensureTopic(env: Env, slug: string, label: string, now: number): Promise<void> {
  if (!slug) return

  await env.iai_flow_db
    .prepare(
      `INSERT INTO topics (slug, name, description, created_at)
       VALUES (?1, ?2, '', ?3)
       ON CONFLICT(slug) DO NOTHING`
    )
    .bind(slug, label.slice(0, 80) || slug, now)
    .run()
}

async function adjustTopicCount(env: Env, slug: string, delta: number): Promise<void> {
  if (!slug) return

  await env.iai_flow_db
    .prepare(
      `UPDATE topics
       SET post_count = CASE
         WHEN post_count + ?2 < 0 THEN 0
         ELSE post_count + ?2
       END
       WHERE slug = ?1`
    )
    .bind(slug, delta)
    .run()
}

async function getPostMeta(
  env: Env,
  postId: string
): Promise<{ id: number; user_id: number; topic: string; title: string } | null> {
  const row = await env.iai_flow_db
    .prepare("SELECT id, user_id, topic, title FROM posts WHERE id = ?1 LIMIT 1")
    .bind(postId)
    .first<{ id: number; user_id: number; topic: string; title: string }>()

  return row ?? null
}

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
    if (q) {
      baseWhere += ` AND (
        p.title LIKE ?${idx}
        OR p.body LIKE ?${idx}
        OR u.name LIKE ?${idx}
        OR u.username LIKE ?${idx}
      )`
      binds.push(`%${q}%`)
      idx += 1
    }
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

    return json({ ok: true, data: items, next_cursor: nextCursor }, 200, origin, env)
  }

  if (method === "POST") {
    const user = await getCurrentUser(request, env)
    if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, env)

    const rateLimit = await checkRateLimit(request, env, {
      namespace: "posts:create",
      subject: user.id,
      limit: 20,
      windowMs: 60 * 60 * 1000
    })

    if (!rateLimit.allowed) {
      return json({ ok: false, error: "Bạn đã đăng quá nhiều bài trong giờ này. Vui lòng thử lại sau." }, 429, origin, env)
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const title = typeof body.title === "string" ? body.title.trim() : ""
    const text = typeof body.body === "string" ? body.body.trim() : ""
    const rawTopic = typeof body.topic === "string" ? body.topic.trim() : ""
    const postType = typeof body.post_type === "string" ? body.post_type : "discussion"
    const linkUrl = typeof body.link_url === "string" ? body.link_url : null
    const linkTitle = typeof body.link_title === "string" ? body.link_title : null
    const linkDesc = typeof body.link_desc === "string" ? body.link_desc : null

    if (!title || !text) return json({ ok: false, error: "Tiêu đề và nội dung là bắt buộc" }, 400, origin, env)
    if (title.length < 4 || title.length > 200) {
      return json({ ok: false, error: "Tiêu đề phải từ 4 đến 200 ký tự" }, 400, origin, env)
    }
    if (text.length < 8 || text.length > 10000) {
      return json({ ok: false, error: "Nội dung phải từ 8 đến 10.000 ký tự" }, 400, origin, env)
    }
    if (linkUrl && !isValidHttpUrl(linkUrl)) {
      return json({ ok: false, error: "Link đính kèm phải là http hoặc https" }, 400, origin, env)
    }
    if (linkTitle && linkTitle.trim().length > 160) {
      return json({ ok: false, error: "Tiêu đề link tối đa 160 ký tự" }, 400, origin, env)
    }
    if (linkDesc && linkDesc.trim().length > 280) {
      return json({ ok: false, error: "Mô tả link tối đa 280 ký tự" }, 400, origin, env)
    }

    const now = Date.now()
    const topic = normalizeTopic(rawTopic)
    await ensureTopic(env, topic, rawTopic || topic, now)

    const result = await env.iai_flow_db
      .prepare(
        `INSERT INTO posts (user_id, title, body, topic, post_type, link_url, link_title, link_desc,
         visibility, is_hot, is_verified, is_ai, vote_count, comment_count, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,'public',0,0,0,0,0,?9,?9)`
      )
      .bind(user.id, title, text, topic, postType, linkUrl, linkTitle, linkDesc, now)
      .run()

    const postId = result.meta?.last_row_id as number

    await adjustTopicCount(env, topic, 1)

    ctx.waitUntil(runAiModeration(env, postId, `${title} ${text}`))
    ctx.waitUntil(
      fireFlowTriggers(env, ctx, "post_created", {
        post_id: postId, user_id: user.id, title, topic, is_ai: false
      })
    )

    return json({ ok: true, data: { id: postId, title, created_at: now } }, 201, origin, env)
  }

  return json({ ok: false, error: "Method Not Allowed" }, 405, origin, env)
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
         WHERE p.id = ?1 AND p.visibility = 'public' LIMIT 1`
      )
      .bind(postId)
      .first<Record<string, unknown>>()

    if (!post) return json({ ok: false, error: "Không tìm thấy bài viết" }, 404, origin, env)

    const labels = await env.iai_flow_db
      .prepare("SELECT label, added_by FROM post_labels WHERE post_id = ?1")
      .bind(postId)
      .all<{ label: string; added_by: string }>()
    post.labels = labels.results ?? []

    return json({ ok: true, data: post }, 200, origin, env)
  }

  if (method === "DELETE") {
    const user = await getCurrentUser(request, env)
    if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, env)

    const post = await env.iai_flow_db
      .prepare("SELECT user_id, topic FROM posts WHERE id = ?1 LIMIT 1")
      .bind(postId)
      .first<{ user_id: number; topic: string }>()

    if (!post) return json({ ok: false, error: "Không tìm thấy" }, 404, origin, env)
    if (post.user_id !== user.id && user.role !== "admin" && user.role !== "moderator") {
      return json({ ok: false, error: "Không có quyền" }, 403, origin, env)
    }

    await env.iai_flow_db.prepare("DELETE FROM posts WHERE id = ?1").bind(postId).run()
    await adjustTopicCount(env, post.topic, -1)
    return json({ ok: true }, 200, origin, env)
  }

  return json({ ok: false, error: "Method Not Allowed" }, 405, origin, env)
}

export async function handleVotePost(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  postId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, env)

  if (!(await getPostMeta(env, postId))) return json({ ok: false, error: "Không tìm thấy bài viết" }, 404, origin, env)

  const now = Date.now()
  const existing = await env.iai_flow_db
    .prepare("SELECT id FROM votes WHERE user_id = ?1 AND target_type = 'post' AND target_id = ?2 LIMIT 1")
    .bind(user.id, postId)
    .first<{ id: number }>()

  if (existing) {
    await env.iai_flow_db.prepare("DELETE FROM votes WHERE id = ?1").bind(existing.id).run()
    await env.iai_flow_db.prepare("UPDATE posts SET vote_count = MAX(0, vote_count - 1) WHERE id = ?1").bind(postId).run()
    const updated = await env.iai_flow_db.prepare("SELECT vote_count FROM posts WHERE id = ?1").bind(postId).first<{ vote_count: number }>()
    return json({ ok: true, data: { voted: false, vote_count: updated?.vote_count ?? 0 } }, 200, origin, env)
  }

  await env.iai_flow_db
    .prepare("INSERT INTO votes (user_id, target_type, target_id, value, created_at) VALUES (?1, 'post', ?2, 1, ?3)")
    .bind(user.id, postId, now)
    .run()
  await env.iai_flow_db.prepare("UPDATE posts SET vote_count = vote_count + 1 WHERE id = ?1").bind(postId).run()
  const updated = await env.iai_flow_db.prepare("SELECT vote_count FROM posts WHERE id = ?1").bind(postId).first<{ vote_count: number }>()

  // Check vote milestones for Flow API triggers
  const count = updated?.vote_count ?? 0
  const milestones = [10, 50, 100, 500]
  if (milestones.includes(count)) {
    ctx.waitUntil(
      fireFlowTriggers(env, ctx, "vote_milestone", {
        post_id: Number(postId),
        vote_count: count,
        milestone: count
      })
    )
  }

  return json({ ok: true, data: { voted: true, vote_count: count } }, 200, origin, env)
}

export async function handleSavePost(
  request: Request,
  env: Env,
  postId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, env)

  if (!(await getPostMeta(env, postId))) return json({ ok: false, error: "Không tìm thấy bài viết" }, 404, origin, env)

  const existing = await env.iai_flow_db
    .prepare("SELECT id FROM saved_posts WHERE user_id = ?1 AND post_id = ?2 LIMIT 1")
    .bind(user.id, postId)
    .first<{ id: number }>()

  if (existing) {
    await env.iai_flow_db.prepare("DELETE FROM saved_posts WHERE id = ?1").bind(existing.id).run()
    return json({ ok: true, data: { saved: false } }, 200, origin, env)
  }

  await env.iai_flow_db
    .prepare("INSERT INTO saved_posts (user_id, post_id, created_at) VALUES (?1, ?2, ?3)")
    .bind(user.id, postId, Date.now())
    .run()
  return json({ ok: true, data: { saved: true } }, 200, origin, env)
}
