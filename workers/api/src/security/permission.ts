import type { AuthUser } from "./identity"

export function canAccessApp(_user: AuthUser): boolean {
  return true
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
