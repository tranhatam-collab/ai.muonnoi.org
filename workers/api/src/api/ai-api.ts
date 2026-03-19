import type { Env } from "../env"
import { json } from "../lib/response"
import { getCurrentUser } from "../security/session"
import { isModerator } from "../security/permission"
import { callAiSummarize } from "../lib/ai"

export async function handleAiSummarize(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const postId = typeof body.post_id === "number" ? body.post_id : null
  if (!postId) return json({ ok: false, error: "post_id là bắt buộc" }, 400, origin)

  const post = await env.iai_flow_db
    .prepare("SELECT title, body FROM posts WHERE id = ?1 LIMIT 1")
    .bind(postId)
    .first<{ title: string; body: string }>()

  if (!post) return json({ ok: false, error: "Không tìm thấy bài viết" }, 404, origin)

  const now = Date.now()
  const result = await env.iai_flow_db
    .prepare("INSERT INTO ai_jobs (job_type, target_type, target_id, status, triggered_by, created_at) VALUES ('summarize','post',?1,'pending','user',?2)")
    .bind(postId, now)
    .run()

  const jobId = result.meta?.last_row_id as number

  const summary = await callAiSummarize(env, `${post.title}\n\n${post.body}`)

  await env.iai_flow_db
    .prepare("UPDATE ai_jobs SET status = 'done', result_json = ?1, completed_at = ?2 WHERE id = ?3")
    .bind(JSON.stringify({ summary: summary ?? "AI không khả dụng lúc này." }), Date.now(), jobId)
    .run()

  return json({
    ok: true,
    data: { job_id: jobId, summary: summary ?? "AI không khả dụng lúc này." }
  }, 200, origin)
}

export async function handleAiVerify(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const postId = typeof body.post_id === "number" ? body.post_id : null
  if (!postId) return json({ ok: false, error: "post_id là bắt buộc" }, 400, origin)

  const now = Date.now()
  const result = await env.iai_flow_db
    .prepare("INSERT INTO ai_jobs (job_type, target_type, target_id, status, triggered_by, created_at) VALUES ('verify','post',?1,'pending','user',?2)")
    .bind(postId, now)
    .run()

  return json({ ok: true, data: { job_id: result.meta?.last_row_id, status: "pending" } }, 202, origin)
}

export async function handleModerationQueue(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)
  if (!isModerator(user)) return json({ ok: false, error: "Không có quyền truy cập" }, 403, origin)

  const rows = await env.iai_flow_db
    .prepare(
      `SELECT q.id, q.post_id, q.comment_id, q.reason, q.ai_score, q.status, q.created_at,
              p.title as post_title, p.body as post_body
       FROM ai_moderation_queue q
       LEFT JOIN posts p ON p.id = q.post_id
       WHERE q.status = 'pending'
       ORDER BY q.ai_score DESC, q.created_at ASC
       LIMIT 50`
    )
    .all<Record<string, unknown>>()

  return json({ ok: true, data: rows.results ?? [] }, 200, origin)
}

export async function handleModerationDecision(
  request: Request,
  env: Env,
  queueId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)
  if (!isModerator(user)) return json({ ok: false, error: "Không có quyền truy cập" }, 403, origin)

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const decision = typeof body.decision === "string" ? body.decision : ""

  if (!["approved", "rejected", "escalated"].includes(decision)) {
    return json({ ok: false, error: "decision phải là: approved, rejected, escalated" }, 400, origin)
  }

  await env.iai_flow_db
    .prepare("UPDATE ai_moderation_queue SET status = ?1, reviewed_by = ?2 WHERE id = ?3")
    .bind(decision, user.id, queueId)
    .run()

  return json({ ok: true, data: { decision } }, 200, origin)
}

export async function handleAiJobs(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin)

  const url = new URL(request.url)
  const status = url.searchParams.get("status") || ""
  const type = url.searchParams.get("type") || ""

  let where = "WHERE 1=1"
  const binds: unknown[] = []
  let idx = 1
  if (status) { where += ` AND status = ?${idx++}`; binds.push(status) }
  if (type) { where += ` AND job_type = ?${idx++}`; binds.push(type) }

  const rows = await env.iai_flow_db
    .prepare(`SELECT id, job_type, target_type, target_id, status, result_json, triggered_by, created_at, completed_at FROM ai_jobs ${where} ORDER BY created_at DESC LIMIT 50`)
    .bind(...binds)
    .all<Record<string, unknown>>()

  return json({ ok: true, data: rows.results ?? [] }, 200, origin)
}
