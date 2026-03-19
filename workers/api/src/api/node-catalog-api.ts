import type { Env } from "../env"
import { json } from "../lib/response"

export async function handleNodeCatalog(request: Request, _env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")

  return json({
    ok: true,
    data: [
      { type: "manual", label: "Manual Trigger", category: "trigger" },
      { type: "transform", label: "Transform", category: "action" },
      { type: "if", label: "If", category: "logic" },
      { type: "response", label: "Response", category: "output" }
    ]
  }, 200, origin)
}
