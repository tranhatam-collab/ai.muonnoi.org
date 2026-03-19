const ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:5173",
  "https://ai.muonnoi.org"
]

export function corsHeaders(origin?: string | null): Record<string, string> {
  const allowOrigin =
    origin && (origin.startsWith("http://localhost:") || ALLOWED_ORIGINS.includes(origin))
      ? origin
      : ALLOWED_ORIGINS[ALLOWED_ORIGINS.length - 1]

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Vary": "Origin"
  }
}

export function json(data: unknown, status = 200, origin?: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(origin)
    }
  })
}

export function empty(status = 204, origin?: string | null): Response {
  return new Response(null, {
    status,
    headers: {
      ...corsHeaders(origin)
    }
  })
}
