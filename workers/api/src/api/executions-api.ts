import type { Env } from "../env"
import { json } from "../lib/response"
import { canAccessApp } from "../security/permission"
import { getCurrentUser } from "../security/session"

export async function handleExecutionById(
  request: Request,
  env: Env,
  executionId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)

  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, env)
  if (!canAccessApp(user)) return json({ ok: false, error: "Không có quyền truy cập app nội bộ" }, 403, origin, env)

  const result = await env.iai_flow_db
    .prepare(
      "SELECT id, flow_id, status, output_json, created_at FROM execution_logs WHERE id = ?1 LIMIT 1"
    )
    .bind(executionId)
    .first()

  if (!result) {
    return json({ ok: false, error: "Execution not found" }, 404, origin, env)
  }

  return json({ ok: true, data: result }, 200, origin, env)
}
