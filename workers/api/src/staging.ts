import { handleIntake } from "./api/intake-api"
import { handleLogin, handleLogout, handleMe } from "./api/security-api"

/**
 * Deliberately narrow Worker surface for the isolated Studio intake staging
 * bundle. It does not import the main router or copy production bindings.
 */
interface StagingEnv {
  iai_flow_db: D1Database
  APP_ORIGIN?: string
  STAGING_AUTH_ENABLED?: string
  STUDIO_INTAKE_ENABLED?: string
  STUDIO_TRIAGE_ENABLED?: string
  STUDIO_OPERATOR_IDS?: string
}

const MAX_STAGING_POST_BODY_BYTES = 24_000

const BLOCKED_ORIGIN_HOSTS = new Set([
  "ai.muonnoi.org",
  "api.muonnoi.org",
  "www.muonnoi.org",
  "muonnoi.org",
  "app.muonnoi.org",
  "www.app.muonnoi.org",
])

function isolatedOrigin(env: StagingEnv): string {
  const candidate = env.APP_ORIGIN?.trim()
  if (!candidate) return "https://ai-muonnoi-studio-staging.invalid"

  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== "https:"
      || BLOCKED_ORIGIN_HOSTS.has(parsed.hostname)
      || parsed.hostname.endsWith(".muonnoi.org")) {
      return "https://ai-muonnoi-studio-staging.invalid"
    }
    return parsed.origin
  } catch {
    return "https://ai-muonnoi-studio-staging.invalid"
  }
}

function scopedEnv(env: StagingEnv) {
  const appOrigin = isolatedOrigin(env)
  const triageEnabled = env.STUDIO_TRIAGE_ENABLED === "true"

  return {
    iai_flow_db: env.iai_flow_db,
    APP_ORIGIN: appOrigin,
    // A staging cookie is host-only. Never inherit an application domain.
    COOKIE_SECURE: "true",
    COOKIE_SAME_SITE: "Lax",
    STAGING_AUTH_ENABLED: env.STAGING_AUTH_ENABLED === "true" ? "true" : "false",
    STUDIO_INTAKE_ENABLED: env.STUDIO_INTAKE_ENABLED === "true" ? "true" : "false",
    STUDIO_TRIAGE_ENABLED: triageEnabled ? "true" : "false",
    STUDIO_OPERATOR_IDS: triageEnabled ? (env.STUDIO_OPERATOR_IDS ?? "") : "",
  }
}

function cors(origin: string | null, appOrigin: string): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  })
  if (origin === appOrigin) headers.set("Access-Control-Allow-Origin", origin)
  return headers
}

function response(body: unknown, status: number, origin: string | null, appOrigin: string): Response {
  const headers = cors(origin, appOrigin)
  headers.set("Content-Type", "application/json; charset=utf-8")
  return new Response(JSON.stringify(body), { status, headers })
}

function contain(responseValue: Response, origin: string | null, appOrigin: string): Response {
  const headers = new Headers(responseValue.headers)
  headers.delete("Access-Control-Allow-Origin")
  headers.delete("Access-Control-Allow-Credentials")
  headers.delete("Access-Control-Allow-Headers")
  headers.delete("Access-Control-Allow-Methods")
  headers.set("Cache-Control", "no-store")
  headers.set("Vary", "Origin")
  if (origin === appOrigin) {
    headers.set("Access-Control-Allow-Origin", origin)
    headers.set("Access-Control-Allow-Credentials", "true")
  }
  return new Response(responseValue.body, {
    status: responseValue.status,
    statusText: responseValue.statusText,
    headers,
  })
}

function isAllowedPath(path: string): boolean {
  return path === "/api/health"
    || path === "/api/login"
    || path === "/api/logout"
    || path === "/api/me"
    || path === "/api/intake/capabilities"
    || path === "/api/intake/briefs"
    || path.startsWith("/api/intake/briefs/")
    || path === "/api/intake/operator/briefs"
    || path.startsWith("/api/intake/operator/briefs/")
}

async function requestWithinBodyLimit(request: Request, maxBytes: number): Promise<Request | null> {
  const contentLength = request.headers.get("Content-Length")
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > maxBytes) return null
  if (!request.body) return request

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        try {
          await reader.cancel()
        } catch {
          // The request is already rejected; cancellation is best effort.
        }
        return null
      }
      chunks.push(value)
    }
  } catch {
    return null
  }

  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }

  const headers = new Headers(request.headers)
  headers.delete("Content-Length")
  return new Request(request.url, { method: request.method, headers, body })
}

export default {
  async fetch(request: Request, env: StagingEnv): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    const origin = request.headers.get("Origin")
    const localEnv = scopedEnv(env)

    if (!isAllowedPath(path)) {
      return response({ ok: false, error: "STAGING_ROUTE_NOT_AVAILABLE" }, 404, origin, localEnv.APP_ORIGIN)
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin, localEnv.APP_ORIGIN) })
    }

    if ((path === "/api/login" || path === "/api/logout" || path === "/api/me")
      && localEnv.STAGING_AUTH_ENABLED !== "true") {
      return response({ ok: false, error: "STAGING_AUTH_DISABLED" }, 503, origin, localEnv.APP_ORIGIN)
    }

    try {
      if (path === "/api/health" && request.method === "GET") {
        return response({ ok: true, service: "ai-muonnoi-studio-staging", stage: "intake" }, 200, origin, localEnv.APP_ORIGIN)
      }
      if (path === "/api/login" && request.method === "POST") {
        if (origin !== localEnv.APP_ORIGIN) {
          return response({ ok: false, error: "STAGING_ORIGIN_REJECTED" }, 403, origin, localEnv.APP_ORIGIN)
        }
        const boundedRequest = await requestWithinBodyLimit(request, MAX_STAGING_POST_BODY_BYTES)
        if (!boundedRequest) {
          return response({ ok: false, error: "STAGING_BODY_TOO_LARGE" }, 413, origin, localEnv.APP_ORIGIN)
        }
        return contain(await handleLogin(boundedRequest, localEnv), origin, localEnv.APP_ORIGIN)
      }
      if (path === "/api/logout" && request.method === "POST") {
        if (origin !== localEnv.APP_ORIGIN) {
          return response({ ok: false, error: "STAGING_ORIGIN_REJECTED" }, 403, origin, localEnv.APP_ORIGIN)
        }
        const boundedRequest = await requestWithinBodyLimit(request, MAX_STAGING_POST_BODY_BYTES)
        if (!boundedRequest) {
          return response({ ok: false, error: "STAGING_BODY_TOO_LARGE" }, 413, origin, localEnv.APP_ORIGIN)
        }
        return contain(await handleLogout(boundedRequest, localEnv), origin, localEnv.APP_ORIGIN)
      }
      if (path === "/api/me" && request.method === "GET") {
        return contain(await handleMe(request, localEnv), origin, localEnv.APP_ORIGIN)
      }
      if (path.startsWith("/api/intake/")) {
        return contain(await handleIntake(request, localEnv), origin, localEnv.APP_ORIGIN)
      }
      return response({ ok: false, error: "STAGING_ROUTE_NOT_AVAILABLE" }, 404, origin, localEnv.APP_ORIGIN)
    } catch {
      return response({ ok: false, error: "STAGING_UNAVAILABLE" }, 503, origin, localEnv.APP_ORIGIN)
    }
  },
}
