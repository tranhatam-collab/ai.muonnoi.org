import type { Env } from "../env"
import { json } from "../lib/response"
import { canAccessApp } from "../security/permission"
import { getCurrentUser } from "../security/session"

export async function handleNodeCatalog(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)

  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, env)
  if (!canAccessApp(user)) return json({ ok: false, error: "Không có quyền truy cập app nội bộ" }, 403, origin, env)

  return json({
    ok: true,
    data: [
      { type: "manual", label: "Manual Trigger", category: "trigger" },
      { type: "transform", label: "Transform", category: "action" },
      { type: "if", label: "If", category: "logic" },
      { type: "response", label: "Response", category: "output" }
    ]
  }, 200, origin, env)
}
