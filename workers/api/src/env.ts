export interface Env {
  iai_flow_db: D1Database

  ENVIRONMENT?: string
  SESSION_SECRET: string
  APP_DOMAIN?: string
  AI_API_URL?: string
  AI_API_KEY?: string
  N8N_SIGNING_SECRET?: string
}
