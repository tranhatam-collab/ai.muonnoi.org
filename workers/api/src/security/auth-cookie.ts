const COOKIE_NAME = "ai_nhachung_session"

function shouldUseSecureCookie(appDomain?: string, explicitFlag?: string): boolean {
  if (explicitFlag === "true") return true
  if (explicitFlag === "false") return false
  return Boolean(appDomain && appDomain !== "localhost")
}

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

export function buildSessionCookie(
  sessionId: string,
  options?: {
    appDomain?: string
    cookieSecure?: string
    sameSite?: string
    maxAgeSeconds?: number
  }
): string {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${options?.sameSite || "Lax"}`,
    `Max-Age=${options?.maxAgeSeconds ?? 60 * 60 * 24 * 7}`
  ]

  if (options?.appDomain) {
    parts.push(`Domain=${options.appDomain}`)
  }

  if (shouldUseSecureCookie(options?.appDomain, options?.cookieSecure)) {
    parts.push("Secure")
  }

  return parts.join("; ")
}

export function buildClearSessionCookie(options?: {
  appDomain?: string
  cookieSecure?: string
  sameSite?: string
}): string {
  const parts = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    `SameSite=${options?.sameSite || "Lax"}`,
    "Max-Age=0"
  ]

  if (options?.appDomain) {
    parts.push(`Domain=${options.appDomain}`)
  }

  if (shouldUseSecureCookie(options?.appDomain, options?.cookieSecure)) {
    parts.push("Secure")
  }

  return parts.join("; ")
}
