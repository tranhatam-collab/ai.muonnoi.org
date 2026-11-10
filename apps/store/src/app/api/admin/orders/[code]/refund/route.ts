import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { features } from "@/lib/env";
import { refundOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

/**
 * Ghi nhận một đơn đã hoàn tiền. Chủ cửa hàng hoàn tiền trong bảng điều khiển payOS hoặc PayPal trước,
 * rồi gọi đây để thu hồi quyền tải và đảo sổ cái. Không chuyển tiền.
 * Cần header x-admin-secret. Thân yêu cầu tùy chọn: { "reason": "..." }.
 */
export async function POST(req: Request, { params }: Ctx) {
  if (!isAdmin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!features.db) return NextResponse.json({ error: "db not configured" }, { status: 503 });
  const { code } = await params;
  if (!/^\d{10,18}$/.test(code)) return NextResponse.json({ error: "invalid order code" }, { status: 400 });
  let reason: string | undefined;
  try {
    const body = (await req.json()) as { reason?: unknown };
    if (typeof body?.reason === "string") reason = body.reason;
  } catch {
    // Không có thân yêu cầu cũng được.
  }
  const result = await refundOrder(Number(code), reason);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ orderCode: result.order.order_code, status: result.order.status, alreadyRefunded: result.already });
}
