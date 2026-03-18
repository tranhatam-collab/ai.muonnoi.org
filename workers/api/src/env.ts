export interface Env {
  DB: D1Database

  // KV optional (chưa dùng MVP nhưng chuẩn bị sẵn)
  KV?: KVNamespace

  // ENV
  ENVIRONMENT?: string
  SESSION_SECRET: string

  // domain
  APP_DOMAIN?: string
}
