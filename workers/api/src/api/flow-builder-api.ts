import type { Env } from "../env"
import { json } from "../lib/response"

export async function handleBuilderUpdate(
  request: Request,
  env: Env,
  flowId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
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
  }, 200, origin)
}

export async function handleBuilderValidate(
  request: Request,
  _env: Env,
  flowId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
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
  }, 200, origin)
}

export async function handleBuilderPreview(
  request: Request,
  _env: Env,
  flowId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const definition = body.definition_json ?? { nodes: [], edges: [] }

  return json({
    ok: true,
    data: {
      flow_id: flowId,
      preview: {
        nodes: Array.isArray(definition.nodes) ? definition.nodes.length : 0,
        edges: Array.isArray(definition.edges) ? definition.edges.length : 0,
        message: "Preview MVP OK"
      }
    }
  }, 200, origin)
}
