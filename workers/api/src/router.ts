import { Env } from './env'
import { json } from './lib/response'

import { handleLogin, handleLogout, handleMe } from './api/security-api'
import { handleFlows, handleFlowById, handleRunFlow } from './api/flows-api'
import { handleExecutionById } from './api/executions-api'
import { handleFlowDrafts } from './api/flow-drafts-api'
import { handleBuilderUpdate, handleBuilderValidate, handleBuilderPreview } from './api/flow-builder-api'
import { handleNodeCatalog } from './api/node-catalog-api'

export async function router(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method.toUpperCase()

  // ===== HEALTH =====
  if (path === '/api/health') {
    return json({ ok: true, service: 'iai-flow-engine', time: Date.now() })
  }

  // ===== AUTH =====
  if (path === '/api/login' && method === 'POST') return handleLogin(request, env)
  if (path === '/api/logout' && method === 'POST') return handleLogout(request, env)
  if (path === '/api/me' && method === 'GET') return handleMe(request, env)

  // ===== FLOWS =====
  if (path === '/api/flows' && method === 'GET') return handleFlows(request, env)
  if (path === '/api/flows' && method === 'POST') return handleFlows(request, env)

  // /api/flows/:id
  const flowMatch = path.match(/^\/api\/flows\/([^\/]+)$/)
  if (flowMatch) {
    return handleFlowById(request, env, flowMatch[1])
  }

  // /api/flows/:id/run
  const runMatch = path.match(/^\/api\/flows\/([^\/]+)\/run$/)
  if (runMatch && method === 'POST') {
    return handleRunFlow(request, env, runMatch[1])
  }

  // ===== EXECUTIONS =====
  const execMatch = path.match(/^\/api\/executions\/([^\/]+)$/)
  if (execMatch && method === 'GET') {
    return handleExecutionById(request, env, execMatch[1])
  }

  // ===== DRAFTS =====
  const draftMatch = path.match(/^\/api\/flows\/([^\/]+)\/drafts$/)
  if (draftMatch) {
    return handleFlowDrafts(request, env, draftMatch[1])
  }

  // ===== BUILDER =====
  const builderUpdate = path.match(/^\/api\/builder\/flows\/([^\/]+)$/)
  if (builderUpdate && method === 'PUT') {
    return handleBuilderUpdate(request, env, builderUpdate[1])
  }

  const builderValidate = path.match(/^\/api\/builder\/flows\/([^\/]+)\/validate$/)
  if (builderValidate && method === 'POST') {
    return handleBuilderValidate(request, env, builderValidate[1])
  }

  const builderPreview = path.match(/^\/api\/builder\/flows\/([^\/]+)\/preview$/)
  if (builderPreview && method === 'POST') {
    return handleBuilderPreview(request, env, builderPreview[1])
  }

  // ===== NODE CATALOG =====
  if (path === '/api/node-catalog' && method === 'GET') {
    return handleNodeCatalog(request, env)
  }

  // ===== NOT FOUND =====
  return json({ error: 'Not Found', path }, 404)
}
