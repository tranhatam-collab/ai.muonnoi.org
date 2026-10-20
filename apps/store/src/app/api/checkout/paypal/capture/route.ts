import { NextResponse } from "next/server";
import { addOrderEvent, deliverOrder, getOrderByCode, markOrderPaid, thankYouUrl } from "@/lib/orders";
import { capturePaypalOrder } from "@/lib/paypal";
import { verifyOrderToken } from "@/lib/tokens";
import { siteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/** PayPal đưa khách về đây sau khi phê duyệt; server thu tiền rồi chuyển sang trang cảm ơn. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const codeStr = url.searchParams.get("order") ?? "";
  const t = url.searchParams.get("t");
  const paypalOrderId = url.searchParams.get("token"); // PayPal gắn ?token=<order id>
  if (!/^\d{10,18}$/.test(codeStr) || !verifyOrderToken(codeStr, t)) {
    return NextResponse.redirect(`${siteUrl()}/?error=order`, 302);
  }
  const orderCode = Number(codeStr);
  const order = await getOrderByCode(orderCode);
  if (!order || order.provider !== "paypal") return NextResponse.redirect(`${siteUrl()}/?error=order`, 302);
  const done = thankYouUrl(orderCode);
  if (order.status === "paid") return NextResponse.redirect(done, 302);
  const id = paypalOrderId ?? order.provider_ref;
  if (!id) return NextResponse.redirect(done, 302);
  try {
    const cap = await capturePaypalOrder(id);
    if (cap.status === "COMPLETED") {
      const { order: paid, firstTime } = await markOrderPaid(orderCode, { providerRef: cap.captureId ?? id, payload: cap.raw, buyerEmail: cap.payerEmail ?? undefined });
      if (paid && firstTime) await deliverOrder(paid);
    } else {
      await addOrderEvent(order.id, "paypal_capture_pending", { status: cap.status });
    }
  } catch (e) {
    await addOrderEvent(order.id, "error", { stage: "paypal_capture", message: String(e) });
  }
  return NextResponse.redirect(done, 302);
}
