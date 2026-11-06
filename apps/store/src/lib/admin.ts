import { timingSafeEqual } from "node:crypto";
import { config } from "./env";

/** Xác thực các route quản trị bằng header x-admin-secret. */
export function isAdmin(req: Request): boolean {
  const expected = config.adminSecret;
  const given = req.headers.get("x-admin-secret") ?? "";
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}
