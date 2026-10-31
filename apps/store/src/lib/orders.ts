import { serviceClient } from "./supabase";
import { createDownloadToken, signOrder } from "./tokens";
import { deliverableIds, displayTitle, getProducts, type Product } from "./catalog";
import { config, siteUrl } from "./env";
import { deliveryEmail, sendMail, type DeliveryLink } from "./mail";

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
 * Đánh dấu đã thanh toán. Idempotent: chỉ dòng đang chưa 'paid' mới được cập nhật,
 * nên hai webhook trùng nhau không gửi email hai lần.
 */
export async function markOrderPaid(orderCode: number, info: { providerRef?: string; payload?: unknown; buyerEmail?: string }): Promise<{ order: Order | null; firstTime: boolean }> {
  const existing = await getOrderByCode(orderCode);
  if (!existing) return { order: null, firstTime: false };
  const patch: Record<string, unknown> = { status: "paid", paid_at: new Date().toISOString() };
  if (info.providerRef) patch.provider_ref = info.providerRef;
  if (info.payload !== undefined) patch.provider_payload = info.payload;
  if (!existing.buyer_email && info.buyerEmail) patch.buyer_email = info.buyerEmail;
  const { data, error } = await db().from("store_orders").update(patch).eq("order_code", orderCode).neq("status", "paid").select("*");
  if (error) throw new Error(error.message);
  const rows = (data as Order[]) ?? [];
  if (rows.length === 0) return { order: existing, firstTime: false };
  await addOrderEvent(rows[0].id, "paid", { provider_ref: info.providerRef ?? null });
  return { order: rows[0], firstTime: true };
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
  });
  const result = await sendMail({ to: order.buyer_email, ...mail });
  await addOrderEvent(order.id, result.sent ? "email_sent" : "email_failed", { via: result.via, error: result.error ?? null });
}

export async function logDownload(orderId: string, productId: string, ip: string | null, userAgent: string | null): Promise<void> {
  await db().from("store_downloads").insert({ order_id: orderId, product_id: productId, ip, user_agent: userAgent });
}
