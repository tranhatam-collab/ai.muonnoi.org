import type { Env } from "../env"
import { json } from "../lib/response"

export async function handleFlowDrafts(
  request: Request,
  env: Env,
  flowId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")
  const method = request.method.toUpperCase()

  if (method === "GET") {
    const result = await env.iai_flow_db
      .prepare(
        "SELECT id, flow_id, draft_json, created_at FROM flow_drafts WHERE flow_id = ?1 ORDER BY id DESC LIMIT 1"
      )
      .bind(flowId)
      .first()

    return json({ ok: true, data: result ?? null }, 200, origin)
  }

  if (method === "POST") {
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const draftJson =
      typeof body.draft_json === "string"
        ? body.draft_json
        : JSON.stringify(body.draft_json ?? { nodes: [], edges: [] })

    const createdAt = Date.now()

    const insert = await env.iai_flow_db
      .prepare(
        "INSERT INTO flow_drafts (flow_id, draft_json, created_at) VALUES (?1, ?2, ?3)"
      )
      .bind(flowId, draftJson, createdAt)
      .run()

    return json({
      ok: true,
      data: {
        id: insert.meta?.last_row_id ?? null,
        flow_id: flowId,
        created_at: createdAt
      }
    }, 201, origin)
  }

  return json({ ok: false, error: "Method Not Allowed" }, 405, origin)
}
