import type { Env } from "../env"

interface RateLimitOptions {
  namespace: string
  limit: number
  windowMs: number
  subject?: string | number | null
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("CF-Connecting-IP")
    ?? request.headers.get("X-Forwarded-For")
    ?? request.headers.get("X-Real-IP")

  if (!forwarded) return "unknown"
  return forwarded.split(",")[0].trim() || "unknown"
}

export async function checkRateLimit(
  request: Request,
  env: Env,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const now = Date.now()
  const resetAt = now + options.windowMs
  const scope = [options.namespace, options.subject ?? getClientIp(request)]
    .map((item) => String(item).trim())
    .filter(Boolean)
    .join(":")

  await env.iai_flow_db
    .prepare(
      `INSERT INTO rate_limits (key, hits, reset_at, updated_at)
       VALUES (?1, 1, ?2, ?3)
       ON CONFLICT(key) DO UPDATE SET
         hits = CASE
           WHEN rate_limits.reset_at <= excluded.updated_at THEN 1
           ELSE rate_limits.hits + 1
         END,
         reset_at = CASE
           WHEN rate_limits.reset_at <= excluded.updated_at THEN excluded.reset_at
           ELSE rate_limits.reset_at
         END,
         updated_at = excluded.updated_at`
    )
    .bind(scope, resetAt, now)
    .run()

  const row = await env.iai_flow_db
    .prepare("SELECT hits, reset_at FROM rate_limits WHERE key = ?1 LIMIT 1")
    .bind(scope)
    .first<{ hits: number; reset_at: number }>()

  const hits = row?.hits ?? 0

  return {
    allowed: hits <= options.limit,
    limit: options.limit,
    remaining: Math.max(0, options.limit - hits),
    resetAt: row?.reset_at ?? resetAt
  }
}
