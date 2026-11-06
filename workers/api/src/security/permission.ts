import type { AuthUser } from "./identity"

const APP_ROLES = new Set(["admin", "moderator", "editor"])

export function canAccessApp(user: AuthUser): boolean {
  return user.role ? APP_ROLES.has(user.role) : false
}

export function isAdmin(user: AuthUser): boolean {
  return user.role === "admin"
}

export function isModerator(user: AuthUser): boolean {
  return user.role === "admin" || user.role === "moderator"
}

export function isAiBot(user: AuthUser): boolean {
  return user.role === "ai_bot"
}
