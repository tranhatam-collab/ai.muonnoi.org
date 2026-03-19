import type { Env } from "../env"
import { json } from "../lib/response"

export async function handleFlows(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const method = request.method.toUpperCase()

  if (method === "GET") {
    const result = await env.iai_flow_db
      .prepare("SELECT id, name, created_at FROM flows ORDER BY id DESC")
      .all()

    return json({ ok: true, data: result.results ?? [] }, 200, origin)
  }

  if (method === "POST") {
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const name =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : "Flow mới"

    const definition = JSON.stringify({ nodes: [], edges: [] })
    const createdAt = Date.now()

    const result = await env.iai_flow_db
      .prepare(
        "INSERT INTO flows (name, definition_json, created_at) VALUES (?1, ?2, ?3)"
      )
      .bind(name, definition, createdAt)
      .run()

    return json({
      ok: true,
      data: {
        id: result.meta?.last_row_id ?? null,
        name,
        created_at: createdAt
      }
    }, 201, origin)
  }

  return json({ ok: false, error: "Method Not Allowed" }, 405, origin)
}

export async function handleFlowById(
  request: Request,
  env: Env,
  flowId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")

  const result = await env.iai_flow_db
    .prepare("SELECT id, name, definition_json, created_at FROM flows WHERE id = ?1 LIMIT 1")
    .bind(flowId)
    .first()

  if (!result) {
    return json({ ok: false, error: "Flow not found" }, 404, origin)
  }

  return json({ ok: true, data: result }, 200, origin)
}

export async function handleRunFlow(
  request: Request,
  env: Env,
  flowId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")

  const flow = await env.iai_flow_db
    .prepare("SELECT id, name FROM flows WHERE id = ?1 LIMIT 1")
    .bind(flowId)
    .first()

  if (!flow) {
    return json({ ok: false, error: "Flow not found" }, 404, origin)
  }

  const startedAt = Date.now()

  const insert = await env.iai_flow_db
    .prepare(
      "INSERT INTO execution_logs (flow_id, status, output_json, created_at) VALUES (?1, ?2, ?3, ?4)"
    )
    .bind(flowId, "success", JSON.stringify({ message: "MVP run OK" }), startedAt)
    .run()

  return json({
    ok: true,
    data: {
      execution_id: insert.meta?.last_row_id ?? null,
      flow_id: flowId,
      status: "success",
      output: { message: "MVP run OK" },
      created_at: startedAt
    }
  }, 200, origin)
}
