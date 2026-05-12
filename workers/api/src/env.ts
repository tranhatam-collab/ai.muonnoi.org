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

  // Payment integration (pay.iai.one canonical gateway)
  PAY_IAI_ONE_BASE_URL?: string
  PAY_IAI_ONE_TENANT_CODE?: string
  PAY_IAI_ONE_SITE_CODE?: string
  PAY_IAI_ONE_PROVIDER?: string
  PAY_IAI_ONE_CALLBACK_BASE_URL?: string
  PAY_IAI_ONE_API_KEY?: string
  PAYMENT_WEBHOOK_SECRET?: string
  GATEWAY_SUCCESS_URL?: string

  // Mail integration (mail.iai.one)
  MAIL_API_BASE_URL?: string
  MAIL_API_KEY?: string
  EMAIL_FROM?: string
  EMAIL_FROM_NOREPLY?: string
  SUPPORT_EMAIL?: string
}
