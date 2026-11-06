import { NextResponse } from "next/server";
import { features } from "@/lib/env";
import { resendLinks } from "@/lib/orders";
import { limitOrReject, resendRules } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const GENERIC = { ok: true, message: "Nếu email này có đơn đã thanh toán, chúng tôi vừa gửi link tải mới vào đó." };

/**
 * Khách mất link thì nhập email để nhận lại. Luôn trả cùng một nội dung dù email có đơn hay không,
 * nên không dùng để dò xem ai đã mua. Giới hạn tốc độ theo IP và theo email để không thành công cụ gửi thư rác.
 */
export async function POST(req: Request) {
  if (!features.checkout) return NextResponse.json({ error: "Cửa hàng chưa mở." }, { status: 503 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }
  const raw = (body as { email?: unknown } | null)?.email;
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: "Email không hợp lệ." }, { status: 400 });

  const limited = await limitOrReject(resendRules(req, email));
  if (limited) return limited;

  try {
    await resendLinks(email);
  } catch (e) {
    console.error("resend-links:", e);
    return NextResponse.json({ error: "Hệ thống đang bận. Vui lòng thử lại sau." }, { status: 503 });
  }
  return NextResponse.json(GENERIC, { headers: { "Cache-Control": "no-store" } });
}
