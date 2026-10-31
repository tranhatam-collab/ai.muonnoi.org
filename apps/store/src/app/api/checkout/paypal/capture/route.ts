import { NextResponse } from "next/server";
import { addOrderEvent, deliverOrder, getOrderByCode, markOrderPaid, thankYouUrl } from "@/lib/orders";
import { capturePaypalOrder } from "@/lib/paypal";
import { checkPaypalCapture } from "@/lib/paypal-verify";
import { verifyOrderToken } from "@/lib/tokens";
import { siteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * PayPal đưa khách về đây sau khi phê duyệt. Server thu tiền theo mã đơn PayPal đã lưu lúc mở đơn,
 * không bao giờ theo mã trên URL, rồi đối chiếu mã đơn, số tiền và tiền tệ trước khi đánh dấu đã trả.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const codeStr = url.searchParams.get("order") ?? "";
  const t = url.searchParams.get("t");
  const returnedToken = url.searchParams.get("token"); // PayPal gắn ?token=<mã đơn PayPal>; chỉ để đối chiếu
  if (!/^\d{10,18}$/.test(codeStr) || !verifyOrderToken(codeStr, t)) {
    return NextResponse.redirect(`${siteUrl()}/?error=order`, 302);
  }
  const orderCode = Number(codeStr);
  const order = await getOrderByCode(orderCode);
  if (!order || order.provider !== "paypal") return NextResponse.redirect(`${siteUrl()}/?error=order`, 302);
  const done = thankYouUrl(orderCode);
  if (order.status === "paid") return NextResponse.redirect(done, 302);
  if (!order.provider_ref) {
    await addOrderEvent(order.id, "error", { stage: "paypal_capture", message: "order has no paypal reference" });
    return NextResponse.redirect(done, 302);
  }
  if (returnedToken && returnedToken !== order.provider_ref) {
    await addOrderEvent(order.id, "paypal_token_mismatch", { returned: returnedToken.slice(0, 64) });
    return NextResponse.redirect(done, 302);
  }
  try {
    const cap = await capturePaypalOrder(order.provider_ref);
    const verdict = checkPaypalCapture({ orderCode, providerRef: order.provider_ref, amountUsd: Number(order.amount) }, cap.facts);
    if (verdict.ok) {
      const { order: paid, firstTime } = await markOrderPaid(orderCode, { payload: cap.raw, buyerEmail: cap.payerEmail ?? undefined });
      if (paid && firstTime) await deliverOrder(paid);
    } else {
      await addOrderEvent(order.id, "paypal_capture_rejected", { reason: verdict.reason, paypalStatus: cap.status });
    }
  } catch (e) {
    await addOrderEvent(order.id, "error", { stage: "paypal_capture", message: String(e) });
  }
  return NextResponse.redirect(done, 302);
}
