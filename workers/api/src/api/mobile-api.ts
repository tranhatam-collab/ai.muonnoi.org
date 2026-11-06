import type { Env } from "../env"
import { json } from "../lib/response"
import { getCurrentUser } from "../security/session"

const VALID_PLATFORMS = new Set(["ios", "android"])

function normalizeToken(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function normalizePlatform(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export async function handleMobilePushRegister(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get("Origin")
  const user = await getCurrentUser(request, env)
  if (!user) return json({ ok: false, error: "Chưa đăng nhập" }, 401, origin, env)

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const token = normalizeToken(body.token)
  const platform = normalizePlatform(body.platform)
  const source = typeof body.source === "string" && body.source.trim() ? body.source.trim().slice(0, 40) : "capacitor"
  const now = Date.now()

  if (!token || token.length < 16 || token.length > 4096) {
    return json({ ok: false, error: "Push token không hợp lệ" }, 400, origin, env)
  }

  if (!VALID_PLATFORMS.has(platform)) {
    return json({ ok: false, error: "Platform phải là ios hoặc android" }, 400, origin, env)
  }

  await env.iai_flow_db
    .prepare(
      `INSERT INTO mobile_push_tokens (
         token, user_id, platform, source, first_seen_at, last_seen_at, updated_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?5, ?5)
       ON CONFLICT(token) DO UPDATE SET
         user_id = excluded.user_id,
         platform = excluded.platform,
         source = excluded.source,
         last_seen_at = excluded.last_seen_at,
         updated_at = excluded.updated_at`
    )
    .bind(token, user.id, platform, source, now)
    .run()

  return json({ ok: true, data: { registered: true, platform } }, 200, origin, env)
}
