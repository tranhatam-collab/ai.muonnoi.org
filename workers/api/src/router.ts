import type { Env } from "./env"
import { json } from "./lib/response"

import { handleLogin, handleLogout, handleMe, handleRegister, handleUpdateProfile } from "./api/security-api"
import { handleFlows, handleFlowById, handleRunFlow } from "./api/flows-api"
import { handleExecutionById } from "./api/executions-api"
import { handleFlowDrafts } from "./api/flow-drafts-api"
import { handleBuilderUpdate, handleBuilderValidate, handleBuilderPreview } from "./api/flow-builder-api"
import { handleNodeCatalog } from "./api/node-catalog-api"

import { handlePosts, handlePostById, handleVotePost, handleSavePost } from "./api/posts-api"
import { handleComments, handleDeleteComment, handleVoteComment } from "./api/comments-api"
import { handleTopics, handleRooms, handleTrending } from "./api/topics-api"
import { handleUserProfile, handleFollow } from "./api/users-api"
import { handleNotifications, handleNotificationCount, handleMarkAllRead } from "./api/notifications-api"

import {
  handleN8nConnections, handleN8nConnectionById,
  handleN8nWebhooks, handleN8nWebhookById, handleN8nWebhookTest, handleN8nTriggerLog
} from "./api/n8n-api"
import { handleAiSummarize, handleAiVerify, handleModerationQueue, handleModerationDecision, handleAiJobs } from "./api/ai-api"
import { handleN8nAutoPost, handleN8nNotify, handleN8nModerate } from "./api/webhook-inbound-api"

export async function router(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method.toUpperCase()
  const origin = request.headers.get("Origin")

  // HEALTH
  if (path === "/api/health") {
    return json({ ok: true, service: "ai-muonnoi-flow-api", time: Date.now() }, 200, origin)
  }

  // AUTH
  if (path === "/api/login" && method === "POST") return handleLogin(request, env)
  if (path === "/api/register" && method === "POST") return handleRegister(request, env, ctx)
  if (path === "/api/logout" && method === "POST") return handleLogout(request, env)
  if (path === "/api/me" && method === "GET") return handleMe(request, env)
  if (path === "/api/me/profile" && method === "PUT") return handleUpdateProfile(request, env)

  // SOCIAL: POSTS
  if (path === "/api/posts" && (method === "GET" || method === "POST")) {
    return handlePosts(request, env, ctx)
  }

  const postMatch = path.match(/^\/api\/posts\/([^/]+)$/)
  if (postMatch && (method === "GET" || method === "DELETE")) return handlePostById(request, env, postMatch[1])

  const votePostMatch = path.match(/^\/api\/posts\/([^/]+)\/vote$/)
  if (votePostMatch && method === "POST") return handleVotePost(request, env, votePostMatch[1])

  const savePostMatch = path.match(/^\/api\/posts\/([^/]+)\/save$/)
  if (savePostMatch && method === "POST") return handleSavePost(request, env, savePostMatch[1])

  const commentsMatch = path.match(/^\/api\/posts\/([^/]+)\/comments$/)
  if (commentsMatch && (method === "GET" || method === "POST")) {
    return handleComments(request, env, ctx, commentsMatch[1])
  }

  // COMMENTS
  const commentMatch = path.match(/^\/api\/comments\/([^/]+)$/)
  if (commentMatch && method === "DELETE") return handleDeleteComment(request, env, commentMatch[1])

  const voteCommentMatch = path.match(/^\/api\/comments\/([^/]+)\/vote$/)
  if (voteCommentMatch && method === "POST") return handleVoteComment(request, env, voteCommentMatch[1])

  // TOPICS / ROOMS / TRENDING
  if (path === "/api/topics" && method === "GET") return handleTopics(request, env)
  if (path === "/api/rooms" && method === "GET") return handleRooms(request, env)
  if (path === "/api/trending" && method === "GET") return handleTrending(request, env)

  // USERS
  const userProfileMatch = path.match(/^\/api\/users\/([^/]+)$/)
  if (userProfileMatch && method === "GET") return handleUserProfile(request, env, userProfileMatch[1])

  const followMatch = path.match(/^\/api\/users\/([^/]+)\/follow$/)
  if (followMatch && method === "POST") return handleFollow(request, env, ctx, followMatch[1])

  // NOTIFICATIONS
  if (path === "/api/notifications" && method === "GET") return handleNotifications(request, env)
  if (path === "/api/notifications/count" && method === "GET") return handleNotificationCount(request, env)
  if (path === "/api/notifications/read-all" && method === "POST") return handleMarkAllRead(request, env)

  // N8N
  if (path === "/api/n8n/connections" && (method === "GET" || method === "POST")) {
    return handleN8nConnections(request, env)
  }
  const n8nConnMatch = path.match(/^\/api\/n8n\/connections\/([^/]+)$/)
  if (n8nConnMatch && method === "DELETE") return handleN8nConnectionById(request, env, n8nConnMatch[1])

  if (path === "/api/n8n/webhooks" && (method === "GET" || method === "POST")) {
    return handleN8nWebhooks(request, env)
  }
  const n8nWebhookMatch = path.match(/^\/api\/n8n\/webhooks\/([^/]+)$/)
  if (n8nWebhookMatch && method === "DELETE") return handleN8nWebhookById(request, env, n8nWebhookMatch[1])

  const n8nTestMatch = path.match(/^\/api\/n8n\/webhooks\/([^/]+)\/test$/)
  if (n8nTestMatch && method === "POST") return handleN8nWebhookTest(request, env, n8nTestMatch[1])

  if (path === "/api/n8n/trigger-log" && method === "GET") return handleN8nTriggerLog(request, env)

  // AI
  if (path === "/api/ai/summarize" && method === "POST") return handleAiSummarize(request, env)
  if (path === "/api/ai/verify" && method === "POST") return handleAiVerify(request, env)
  if (path === "/api/ai/moderation-queue" && method === "GET") return handleModerationQueue(request, env)
  if (path === "/api/ai/jobs" && method === "GET") return handleAiJobs(request, env)

  const modDecisionMatch = path.match(/^\/api\/ai\/moderation-queue\/([^/]+)$/)
  if (modDecisionMatch && method === "PUT") return handleModerationDecision(request, env, modDecisionMatch[1])

  // INBOUND WEBHOOKS
  if (path === "/api/webhooks/n8n/auto-post" && method === "POST") return handleN8nAutoPost(request, env)
  if (path === "/api/webhooks/n8n/notify" && method === "POST") return handleN8nNotify(request, env)
  if (path === "/api/webhooks/n8n/moderate" && method === "POST") return handleN8nModerate(request, env)

  // FLOWS (MVP)
  if (path === "/api/flows" && (method === "GET" || method === "POST")) return handleFlows(request, env)

  const flowMatch = path.match(/^\/api\/flows\/([^/]+)$/)
  if (flowMatch && method === "GET") return handleFlowById(request, env, flowMatch[1])

  const runMatch = path.match(/^\/api\/flows\/([^/]+)\/run$/)
  if (runMatch && method === "POST") return handleRunFlow(request, env, runMatch[1])

  const execMatch = path.match(/^\/api\/executions\/([^/]+)$/)
  if (execMatch && method === "GET") return handleExecutionById(request, env, execMatch[1])

  const draftsMatch = path.match(/^\/api\/flows\/([^/]+)\/drafts$/)
  if (draftsMatch && (method === "GET" || method === "POST")) return handleFlowDrafts(request, env, draftsMatch[1])

  const builderUpdateMatch = path.match(/^\/api\/builder\/flows\/([^/]+)$/)
  if (builderUpdateMatch && method === "PUT") return handleBuilderUpdate(request, env, builderUpdateMatch[1])

  const builderValidateMatch = path.match(/^\/api\/builder\/flows\/([^/]+)\/validate$/)
  if (builderValidateMatch && method === "POST") return handleBuilderValidate(request, env, builderValidateMatch[1])

  const builderPreviewMatch = path.match(/^\/api\/builder\/flows\/([^/]+)\/preview$/)
  if (builderPreviewMatch && method === "POST") return handleBuilderPreview(request, env, builderPreviewMatch[1])

  if (path === "/api/node-catalog" && method === "GET") return handleNodeCatalog(request, env)

  return json({ ok: false, error: "Not Found", path }, 404, origin)
}
