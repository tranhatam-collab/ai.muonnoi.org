import { serviceClient } from "./supabase";
import { createDownloadToken, signOrder } from "./tokens";
import { deliverableIds, displayTitle, getProducts, type Product } from "./catalog";
import { config, siteUrl } from "./env";
import { deliveryEmail, resendEmail, sendMail, type DeliveryLink } from "./mail";

export type OrderStatus = "pending" | "paid" | "cancelled" | "expired" | "refunded";

export type Order = {
  id: string;
  order_code: number;
  product_id: string;
  provider: "payos" | "paypal" | "manual";
  currency: "VND" | "USD";
  amount: number;
  status: OrderStatus;
  buyer_email: string | null;
  buyer_name: string | null;
  provider_ref: string | null;
  provider_payload: unknown;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

function db() {
  const c = serviceClient();
  if (!c) throw new Error("Sổ cái chưa sẵn sàng (thiếu SUPABASE_SERVICE_ROLE_KEY)");
  return c;
}

export async function createOrder(input: {
  orderCode: number;
  productId: string;
  provider: Order["provider"];
  currency: Order["currency"];
  amount: number;
  buyerEmail?: string;
  buyerName?: string;
}): Promise<Order> {
  const { data, error } = await db()
    .from("store_orders")
    .insert({
      order_code: input.orderCode,
      product_id: input.productId,
      provider: input.provider,
      currency: input.currency,
      amount: input.amount,
      buyer_email: input.buyerEmail ?? null,
      buyer_name: input.buyerName ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(`Không tạo được đơn: ${error?.message ?? "unknown"}`);
  const order = data as Order;
  await addOrderEvent(order.id, "created", { provider: input.provider, amount: input.amount, currency: input.currency });
  return order;
}

export async function getOrderByCode(orderCode: number): Promise<Order | null> {
  const { data, error } = await db().from("store_orders").select("*").eq("order_code", orderCode).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Order | null) ?? null;
}

export async function updateOrder(orderCode: number, patch: Partial<Pick<Order, "status" | "provider_ref" | "provider_payload" | "buyer_email" | "buyer_name">>): Promise<void> {
  const { error } = await db().from("store_orders").update(patch).eq("order_code", orderCode);
  if (error) throw new Error(error.message);
}

export async function addOrderEvent(orderId: string, kind: string, detail?: unknown): Promise<void> {
  await db().from("store_order_events").insert({ order_id: orderId, kind, detail: detail ?? null });
}

/**
 * Đánh dấu đã thanh toán. Idempotent: chỉ đơn còn mở (pending, cancelled, expired) mới được cập nhật,
 * nên hai webhook trùng nhau không gửi email hai lần, và webhook gửi lại không làm sống lại đơn đã hoàn tiền.
 */
export async function markOrderPaid(orderCode: number, info: { providerRef?: string; payload?: unknown; buyerEmail?: string }): Promise<{ order: Order | null; firstTime: boolean }> {
  const existing = await getOrderByCode(orderCode);
  if (!existing) return { order: null, firstTime: false };
  const patch: Record<string, unknown> = { status: "paid", paid_at: new Date().toISOString() };
  if (info.providerRef) patch.provider_ref = info.providerRef;
  if (info.payload !== undefined) patch.provider_payload = info.payload;
  if (!existing.buyer_email && info.buyerEmail) patch.buyer_email = info.buyerEmail;
  const { data, error } = await db().from("store_orders").update(patch).eq("order_code", orderCode).in("status", ["pending", "cancelled", "expired"]).select("*");
  if (error) throw new Error(error.message);
  const rows = (data as Order[]) ?? [];
  if (rows.length === 0) return { order: existing, firstTime: false };
  await addOrderEvent(rows[0].id, "paid", { provider_ref: info.providerRef ?? null });
  return { order: rows[0], firstTime: true };
}

export type RefundResult = { ok: true; order: Order; already: boolean } | { ok: false; status: 404 | 409; error: string };

/**
 * Ghi nhận đơn đã hoàn tiền (chủ cửa hàng đã hoàn trong bảng điều khiển payOS hoặc PayPal).
 * Hàm này không chuyển tiền. Link tải ngừng hoạt động ngay vì chỉ đơn 'paid' mới tải được,
 * và trigger ở DB ghi một dòng âm vào sổ cái. Gọi lại nhiều lần an toàn.
 */
export async function refundOrder(orderCode: number, reason?: string): Promise<RefundResult> {
  const existing = await getOrderByCode(orderCode);
  if (!existing) return { ok: false, status: 404, error: "Không tìm thấy đơn." };
  if (existing.status === "refunded") return { ok: true, order: existing, already: true };
  if (existing.status !== "paid") return { ok: false, status: 409, error: `Chỉ hoàn tiền được đơn đã trả, đơn này đang ở trạng thái ${existing.status}.` };
  const { data, error } = await db().from("store_orders").update({ status: "refunded" }).eq("order_code", orderCode).eq("status", "paid").select("*");
  if (error) throw new Error(error.message);
  const rows = (data as Order[]) ?? [];
  if (rows.length === 0) {
    const now = await getOrderByCode(orderCode);
    if (now?.status === "refunded") return { ok: true, order: now, already: true };
    return { ok: false, status: 409, error: "Đơn vừa đổi trạng thái, hãy thử lại." };
  }
  await addOrderEvent(rows[0].id, "refunded", { reason: reason?.slice(0, 500) ?? null, by: "admin" });
  return { ok: true, order: rows[0], already: false };
}

export function thankYouUrl(orderCode: number): string {
  return `${siteUrl()}/cam-on?order=${orderCode}&t=${signOrder(orderCode)}`;
}

export async function deliveryLinksFor(order: Order, products?: Product[]): Promise<DeliveryLink[]> {
  const all = products ?? (await getProducts());
  const product = all.find((p) => p.id === order.product_id);
  if (!product) return [];
  return deliverableIds(product).map((id) => {
    const item = all.find((p) => p.id === id);
    return {
      title: item ? displayTitle(item) : id,
      url: `${siteUrl()}/api/download/${createDownloadToken(order.order_code, id)}`,
    };
  });
}

/** Gửi email giao sách (nếu có email và có cấu hình gửi). Ghi lại kết quả vào nhật ký đơn. */
export async function deliverOrder(order: Order): Promise<void> {
  if (!order.buyer_email) {
    await addOrderEvent(order.id, "email_skipped", { reason: "no_email" });
    return;
  }
  const products = await getProducts();
  const product = products.find((p) => p.id === order.product_id);
  const links = await deliveryLinksFor(order, products);
  const mail = deliveryEmail({
    lang: product?.lang ?? "vi",
    productTitle: product ? displayTitle(product) : order.product_id,
    orderCode: order.order_code,
    links,
    ttlHours: config.downloadTtlHours,
    thankYouUrl: thankYouUrl(order.order_code),
    pageDays: config.orderTokenTtlDays,
    resendUrl: `${siteUrl()}/lay-lai-link`,
  });
  const result = await sendMail({ to: order.buyer_email, ...mail });
  await addOrderEvent(order.id, result.sent ? "email_sent" : "email_failed", { via: result.via, error: result.error ?? null });
}

export async function logDownload(orderId: string, productId: string, ip: string | null, userAgent: string | null): Promise<void> {
  await db().from("store_downloads").insert({ order_id: orderId, product_id: productId, ip, user_agent: userAgent });
}

/** Các đơn đã trả gần nhất của một email (tối đa 3), để gửi lại link tải. */
export async function paidOrdersByEmail(email: string, limit = 3): Promise<Order[]> {
  const { data, error } = await db()
    .from("store_orders")
    .select("*")
    .eq("buyer_email", email.trim().toLowerCase())
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as Order[]) ?? [];
}

/** Gửi một email liệt kê trang đơn hàng (link mới) của các đơn đã trả. Ghi kết quả vào nhật ký đơn mới nhất. */
export async function resendLinks(email: string): Promise<{ orders: number; sent: boolean }> {
  const orders = await paidOrdersByEmail(email);
  if (orders.length === 0) return { orders: 0, sent: false };
  const products = await getProducts();
  const items = orders.map((o) => {
    const p = products.find((x) => x.id === o.product_id);
    return { title: p ? displayTitle(p) : o.product_id, orderCode: o.order_code, url: thankYouUrl(o.order_code) };
  });
  const newest = products.find((x) => x.id === orders[0].product_id);
  const mail = resendEmail({ lang: newest?.lang ?? "vi", items, pageDays: config.orderTokenTtlDays });
  const result = await sendMail({ to: email.trim().toLowerCase(), ...mail });
  await addOrderEvent(orders[0].id, result.sent ? "links_resent" : "links_resend_failed", { via: result.via, orders: orders.length, error: result.error ?? null });
  return { orders: orders.length, sent: result.sent };
}
