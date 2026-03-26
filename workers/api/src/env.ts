export interface Env {
  iai_flow_db: D1Database
  KV?: KVNamespace

  ENVIRONMENT?: string
  SESSION_SECRET?: string
  APP_DOMAIN?: string
  APP_ORIGIN?: string
  API_ORIGIN?: string
  DOCS_ORIGIN?: string
  CORS_ALLOW_ORIGINS?: string
  COOKIE_SECURE?: string
  COOKIE_SAME_SITE?: string

  // AI integration
  AI_API_URL?: string
  AI_API_KEY?: string

  // Flow API integration
  FLOW_API_URL?: string
  FLOW_API_KEY?: string
}
