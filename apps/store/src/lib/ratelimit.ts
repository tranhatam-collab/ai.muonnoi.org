import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { config } from "./env";
import { clientIp } from "./checkout";
import { serviceClient } from "./supabase";

// Giới hạn tốc độ dựa trên Postgres (hàm engine_rate_limit_hit, migration 0002), không dùng bộ nhớ của
// từng instance serverless nên mọi instance cùng đếm vào một nơi. Lỗi hạ tầng thì đóng cửa (503) thay vì bỏ qua giới hạn.

export type RateRule = { bucket: string; limit: number; windowSeconds: number };
export type RateVerdict = { ok: true } | { ok: false; status: 429 | 503; retryAfter: number };

/** Băm IP hoặc email trước khi lưu: bảng đếm không giữ dữ liệu cá nhân thô. */
export function bucketKey(kind: string, value: string): string {
  const secret = config.downloadSecret ?? "no-secret";
  return `${kind}:${createHmac("sha256", secret).update(value.toLowerCase()).digest("base64url").slice(0, 22)}`;
}

export async function consume(rules: RateRule[]): Promise<RateVerdict> {
  const client = serviceClient();
  if (!client) return { ok: false, status: 503, retryAfter: 60 };
  for (const rule of rules) {
    const { data, error } = await client.rpc("engine_rate_limit_hit", {
      p_bucket: rule.bucket,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) {
      console.error("rate-limit: không đếm được, đóng cửa để an toàn:", error.message);
      return { ok: false, status: 503, retryAfter: 30 };
    }
    if (data !== true) return { ok: false, status: 429, retryAfter: rule.windowSeconds };
  }
  return { ok: true };
}

/** Trả phản hồi 429 hoặc 503 nếu không cho qua, ngược lại trả null. */
export async function limitOrReject(rules: RateRule[]): Promise<NextResponse | null> {
  const verdict = await consume(rules);
  if (verdict.ok) return null;
  const headers = { "Retry-After": String(verdict.retryAfter), "Cache-Control": "no-store" };
  if (verdict.status === 429) return NextResponse.json({ error: "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút." }, { status: 429, headers });
  return NextResponse.json({ error: "Hệ thống đang bận. Vui lòng thử lại sau." }, { status: 503, headers });
}

/** Mở đơn: tối đa 10 lần mỗi 10 phút cho một địa chỉ IP. */
export function checkoutRules(req: Request): RateRule[] {
  return [{ bucket: bucketKey("checkout-ip", clientIp(req) ?? "unknown"), limit: 10, windowSeconds: 600 }];
}

/** Lấy lại link tải: tối đa 5 lần mỗi giờ cho một IP và 3 lần mỗi ngày cho một email, để không dùng làm công cụ gửi thư rác. */
export function resendRules(req: Request, email: string): RateRule[] {
  return [
    { bucket: bucketKey("resend-ip", clientIp(req) ?? "unknown"), limit: 5, windowSeconds: 3600 },
    { bucket: bucketKey("resend-email", email), limit: 3, windowSeconds: 86400 },
  ];
}
