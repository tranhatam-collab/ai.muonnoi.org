import type { Env } from "./env"
import { router } from "./router"
import { corsHeaders } from "./lib/response"

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get("Origin")

    if (request.method.toUpperCase() === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders(origin)
        }
      })
    }

    try {
      return await router(request, env)
    } catch (error) {
      console.error("FATAL ERROR:", error)

      return new Response(
        JSON.stringify({
          ok: false,
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : "Unknown error"
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            ...corsHeaders(origin)
          }
        }
      )
    }
  }
}
