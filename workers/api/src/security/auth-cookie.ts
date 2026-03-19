const COOKIE_NAME = "ai_nhachung_session"

export function getSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie")
  if (!cookieHeader) return null

  const parts = cookieHeader.split(";").map((v) => v.trim())
  for (const part of parts) {
    if (part.startsWith(COOKIE_NAME + "=")) {
      return decodeURIComponent(part.slice((COOKIE_NAME + "=").length))
    }
  }

  return null
}

export function buildSessionCookie(sessionId: string, maxAgeSeconds = 60 * 60 * 24 * 7): string {
  return [
    `${COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`
  ].join("; ")
}

export function buildClearSessionCookie(): string {
  return [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0"
  ].join("; ")
}
