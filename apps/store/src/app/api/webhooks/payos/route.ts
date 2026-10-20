import { NextResponse } from "next/server";
import { features } from "@/lib/env";
import { addOrderEvent, deliverOrder, getOrderByCode, markOrderPaid } from "@/lib/orders";
import { verifyPayosWebhook } from "@/lib/payos";

export const dynamic = "force-dynamic";

/**
 * payOS gọi vào đây khi có tiền về. Luôn trả 200 cho gói hợp lệ về chữ ký,
 * kể cả gói thử nghiệm lúc xác nhận webhook (mã đơn không tồn tại).
 */
export async function POST(req: Request) {
  if (!features.payos || !features.db) return NextResponse.json({ error: "not configured" }, { status: 503 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  let data;
  try {
    data = await verifyPayosWebhook(body);
  } catch (e) {
    return NextResponse.json({ error: `invalid signature: ${String(e)}` }, { status: 400 });
  }
  const order = await getOrderByCode(Number(data.orderCode));
  if (!order || order.provider !== "payos") return NextResponse.json({ success: true, note: "order not found" });
  if (data.code !== "00") {
    await addOrderEvent(order.id, "payos_webhook_nonsuccess", data);
    return NextResponse.json({ success: true });
  }
  if (Math.round(Number(data.amount)) < Math.round(Number(order.amount))) {
    await addOrderEvent(order.id, "payos_underpaid", { received: data.amount, expected: order.amount });
    return NextResponse.json({ success: true, note: "underpaid" });
  }
  const { order: paid, firstTime } = await markOrderPaid(order.order_code, { providerRef: data.paymentLinkId, payload: data });
  if (paid && firstTime) await deliverOrder(paid);
  return NextResponse.json({ success: true });
}
