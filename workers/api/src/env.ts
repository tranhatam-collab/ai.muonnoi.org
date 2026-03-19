export interface Env {
  iai_flow_db: D1Database

  ENVIRONMENT?: string
  SESSION_SECRET: string
  APP_DOMAIN?: string
}
