import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./env";

function secret(): string {
  const s = config.downloadSecret;
  if (!s) throw new Error("DOWNLOAD_SECRET chưa được đặt");
  return s;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function hmac(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Token gắn với trang cảm ơn: ai có mã đơn mà không có token thì không xem được link tải. */
export function signOrder(orderCode: number | string): string {
  return hmac(`order:${orderCode}`).slice(0, 32);
}

export function verifyOrderToken(orderCode: number | string, token: string | null | undefined): boolean {
  if (!token) return false;
  try {
    return safeEqual(signOrder(orderCode), token);
  } catch {
    return false;
  }
}

export type DownloadClaims = { o: number; p: string; exp: number };

/** Link tải có hạn: payload.chữ_ký, cả hai base64url. */
export function createDownloadToken(orderCode: number, productId: string, ttlHours = config.downloadTtlHours): string {
  const claims: DownloadClaims = { o: orderCode, p: productId, exp: Date.now() + ttlHours * 3600_000 };
  const payload = b64url(JSON.stringify(claims));
  return `${payload}.${hmac(payload)}`;
}

export function parseDownloadToken(token: string): DownloadClaims | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    if (!safeEqual(hmac(payload), sig)) return null;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DownloadClaims;
    if (typeof claims.o !== "number" || typeof claims.p !== "string" || typeof claims.exp !== "number") return null;
    if (claims.exp < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}
