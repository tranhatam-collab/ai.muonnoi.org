import type { Env } from "../env"
import { json } from "../lib/response"

export async function handleExecutionById(
  request: Request,
  env: Env,
  executionId: string
): Promise<Response> {
  const origin = request.headers.get("Origin")

  const result = await env.iai_flow_db
    .prepare(
      "SELECT id, flow_id, status, output_json, created_at FROM execution_logs WHERE id = ?1 LIMIT 1"
    )
    .bind(executionId)
    .first()

  if (!result) {
    return json({ ok: false, error: "Execution not found" }, 404, origin)
  }

  return json({ ok: true, data: result }, 200, origin)
}
