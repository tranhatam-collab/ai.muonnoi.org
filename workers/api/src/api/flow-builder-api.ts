import type { Env } from "../env"
import { json } from "../lib/response"
import { canAccessApp } from "../security/permission"
import { getCurrentUser } from "../security/session"

export async function handleBuilderUpdate(
  request: Request,
  env: Env,
  flowId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, env)
  if (!canAccessApp(user)) return json({ ok: false, error: "Không có quyền truy cập app nội bộ" }, 403, origin, env)
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const definition =
    typeof body.definition_json === "string"
      ? body.definition_json
      : JSON.stringify(body.definition_json ?? { nodes: [], edges: [] })

  await env.iai_flow_db
    .prepare("UPDATE flows SET definition_json = ?1 WHERE id = ?2")
    .bind(definition, flowId)
    .run()

  return json({
    ok: true,
    data: {
      flow_id: flowId,
      updated: true
    }
  }, 200, origin, env)
}

export async function handleBuilderValidate(
  request: Request,
  _env: Env,
  flowId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, _env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, _env)
  if (!canAccessApp(user)) return json({ ok: false, error: "Không có quyền truy cập app nội bộ" }, 403, origin, _env)
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const definition = body.definition_json ?? { nodes: [], edges: [] }

  const valid =
    definition &&
    typeof definition === "object" &&
    Array.isArray(definition.nodes) &&
    Array.isArray(definition.edges)

  return json({
    ok: true,
    data: {
      flow_id: flowId,
      valid,
      errors: valid ? [] : ["definition_json phải có nodes[] và edges[]"]
    }
  }, 200, origin, _env)
}

export async function handleBuilderPreview(
  request: Request,
  _env: Env,
  flowId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, _env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, _env)
  if (!canAccessApp(user)) return json({ ok: false, error: "Không có quyền truy cập app nội bộ" }, 403, origin, _env)
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const definition = body.definition_json ?? { nodes: [], edges: [] }

  return json({
    ok: true,
    data: {
      flow_id: flowId,
      preview: {
        nodes: Array.isArray(definition.nodes) ? definition.nodes.length : 0,
        edges: Array.isArray(definition.edges) ? definition.edges.length : 0,
        message: "Preview sẵn sàng"
      }
    }
  }, 200, origin, _env)
}
