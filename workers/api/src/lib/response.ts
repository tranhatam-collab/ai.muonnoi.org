import type { Env } from "../env"

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:5173",
  "https://nhachung.org",
  "https://www.nhachung.org",
  "https://docs.nhachung.org"
]

function getAllowedOrigins(env?: Env): string[] {
  const configured = [
    env?.APP_ORIGIN,
    env?.DOCS_ORIGIN,
    env?.CORS_ALLOW_ORIGINS
  ]
    .flatMap((value) => (value ? value.split(",") : []))
    .map((value) => value.trim())
    .filter(Boolean)

  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]))
}

export function corsHeaders(origin?: string | null, env?: Env): Record<string, string> {
  const allowedOrigins = getAllowedOrigins(env)
  const allowOrigin =
    origin && (origin.startsWith("http://localhost:") || allowedOrigins.includes(origin))
      ? origin
      : allowedOrigins[0]

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Connection-Key, X-Webhook-Key",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Vary": "Origin"
  }
}

export function json(data: unknown, status = 200, origin?: string | null, env?: Env): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(origin, env)
    }
  })
}

export function empty(status = 204, origin?: string | null, env?: Env): Response {
  return new Response(null, {
    status,
    headers: {
      ...corsHeaders(origin, env)
    }
  })
}
