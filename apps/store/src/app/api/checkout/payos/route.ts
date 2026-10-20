import { NextResponse } from "next/server";
import { validateCheckout } from "@/lib/checkout";
import { features, siteUrl } from "@/lib/env";
import { newOrderCode } from "@/lib/money";
import { createOrder, addOrderEvent, updateOrder, thankYouUrl } from "@/lib/orders";
import { createPayosLink } from "@/lib/payos";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!features.payos) return NextResponse.json({ error: "Chưa bật thanh toán VietQR." }, { status: 503 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }
  const v = await validateCheckout(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.status });
  if (!v.product.price_vnd) return NextResponse.json({ error: "Sách này không có giá VND." }, { status: 400 });

  const orderCode = newOrderCode();
  const order = await createOrder({
    orderCode,
    productId: v.product.id,
    provider: "payos",
    currency: "VND",
    amount: v.product.price_vnd,
    buyerEmail: v.email,
    buyerName: v.name,
  });
  try {
    const link = await createPayosLink({
      orderCode,
      amountVnd: v.product.price_vnd,
      description: `SACH ${orderCode}`,
      itemName: v.title,
      returnUrl: thankYouUrl(orderCode),
      cancelUrl: `${siteUrl()}/mua/${v.product.id}?cancelled=1`,
      buyerEmail: v.email,
      buyerName: v.name,
      expiresInMinutes: 60,
    });
    await updateOrder(orderCode, { provider_ref: link.paymentLinkId });
    await addOrderEvent(order.id, "payos_link_created", { paymentLinkId: link.paymentLinkId, status: link.status });
    return NextResponse.json({ url: link.checkoutUrl, orderCode });
  } catch (e) {
    await addOrderEvent(order.id, "error", { stage: "payos_create", message: String(e) });
    return NextResponse.json({ error: "Không tạo được mã thanh toán. Vui lòng thử lại." }, { status: 502 });
  }
}
