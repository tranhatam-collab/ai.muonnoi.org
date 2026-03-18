import { router } from './router'
import { Env } from './env'

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      return await router(request, env)
    } catch (err: any) {
      console.error('FATAL ERROR:', err)

      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: err?.message || 'Unknown error',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }
  }
}
