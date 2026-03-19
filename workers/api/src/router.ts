import type { Env } from "./env"
import { json } from "./lib/response"

import { handleLogin, handleLogout, handleMe } from "./api/security-api"
import { handleFlows, handleFlowById, handleRunFlow } from "./api/flows-api"
import { handleExecutionById } from "./api/executions-api"
import { handleFlowDrafts } from "./api/flow-drafts-api"
import {
  handleBuilderUpdate,
  handleBuilderValidate,
  handleBuilderPreview
} from "./api/flow-builder-api"
import { handleNodeCatalog } from "./api/node-catalog-api"

export async function router(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method.toUpperCase()
  const origin = request.headers.get("Origin")

  if (path === "/api/health") {
    return json({
      ok: true,
      service: "ai-muonnoi-flow-api",
      time: Date.now()
    }, 200, origin)
  }

  if (path === "/api/login" && method === "POST") return handleLogin(request, env)
  if (path === "/api/logout" && method === "POST") return handleLogout(request, env)
  if (path === "/api/me" && method === "GET") return handleMe(request, env)

  if (path === "/api/flows" && (method === "GET" || method === "POST")) {
    return handleFlows(request, env)
  }

  const flowMatch = path.match(/^\/api\/flows\/([^/]+)$/)
  if (flowMatch && method === "GET") {
    return handleFlowById(request, env, flowMatch[1])
  }

  const runMatch = path.match(/^\/api\/flows\/([^/]+)\/run$/)
  if (runMatch && method === "POST") {
    return handleRunFlow(request, env, runMatch[1])
  }

  const execMatch = path.match(/^\/api\/executions\/([^/]+)$/)
  if (execMatch && method === "GET") {
    return handleExecutionById(request, env, execMatch[1])
  }

  const draftsMatch = path.match(/^\/api\/flows\/([^/]+)\/drafts$/)
  if (draftsMatch && (method === "GET" || method === "POST")) {
    return handleFlowDrafts(request, env, draftsMatch[1])
  }

  const builderUpdateMatch = path.match(/^\/api\/builder\/flows\/([^/]+)$/)
  if (builderUpdateMatch && method === "PUT") {
    return handleBuilderUpdate(request, env, builderUpdateMatch[1])
  }

  const builderValidateMatch = path.match(/^\/api\/builder\/flows\/([^/]+)\/validate$/)
  if (builderValidateMatch && method === "POST") {
    return handleBuilderValidate(request, env, builderValidateMatch[1])
  }

  const builderPreviewMatch = path.match(/^\/api\/builder\/flows\/([^/]+)\/preview$/)
  if (builderPreviewMatch && method === "POST") {
    return handleBuilderPreview(request, env, builderPreviewMatch[1])
  }

  if (path === "/api/node-catalog" && method === "GET") {
    return handleNodeCatalog(request, env)
  }

  return json({
    ok: false,
    error: "Not Found",
    path
  }, 404, origin)
}
