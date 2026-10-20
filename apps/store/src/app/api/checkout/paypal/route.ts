import { NextResponse } from "next/server";
import { validateCheckout } from "@/lib/checkout";
import { features, siteUrl } from "@/lib/env";
import { newOrderCode } from "@/lib/money";
import { createOrder, addOrderEvent, updateOrder } from "@/lib/orders";
import { createPaypalOrder } from "@/lib/paypal";
import { signOrder } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!features.paypal) return NextResponse.json({ error: "PayPal chưa được bật." }, { status: 503 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }
  const v = await validateCheckout(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.status });
  if (!v.product.price_usd) return NextResponse.json({ error: "Sách này không có giá USD." }, { status: 400 });

  const orderCode = newOrderCode();
  const order = await createOrder({
    orderCode,
    productId: v.product.id,
    provider: "paypal",
    currency: "USD",
    amount: v.product.price_usd,
    buyerEmail: v.email,
    buyerName: v.name,
  });
  const base = siteUrl();
  const t = signOrder(orderCode);
  try {
    const pp = await createPaypalOrder({
      orderCode,
      amountUsd: v.product.price_usd,
      description: `${v.title} (ebook)`,
      returnUrl: `${base}/api/checkout/paypal/capture?order=${orderCode}&t=${t}`,
      cancelUrl: `${base}/mua/${v.product.id}?cancelled=1`,
      buyerEmail: v.email,
    });
    await updateOrder(orderCode, { provider_ref: pp.id });
    await addOrderEvent(order.id, "paypal_order_created", { paypalOrderId: pp.id });
    return NextResponse.json({ url: pp.approveUrl, orderCode });
  } catch (e) {
    await addOrderEvent(order.id, "error", { stage: "paypal_create", message: String(e) });
    return NextResponse.json({ error: "Không kết nối được PayPal. Vui lòng thử lại." }, { status: 502 });
  }
}
