import type { AuthUser } from "./identity"

export function canAccessApp(_user: AuthUser): boolean {
  return true
}
