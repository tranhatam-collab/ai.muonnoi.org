import { NextResponse } from "next/server";
import { features } from "@/lib/env";
import { deliveryLinksFor, getOrderByCode } from "@/lib/orders";
import { verifyOrderToken } from "@/lib/tokens";
import { getProducts, displayTitle } from "@/lib/catalog";
import { serviceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

/** Trạng thái đơn cho trang cảm ơn. Cần token t (ký từ mã đơn) để tránh dò mã. */
export async function GET(req: Request, { params }: Ctx) {
  const { code } = await params;
  const t = new URL(req.url).searchParams.get("t");
  if (!/^\d{10,18}$/.test(code) || !verifyOrderToken(code, t)) return NextResponse.json({ error: "invalid" }, { status: 403 });
  if (!features.db) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const order = await getOrderByCode(Number(code));
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  const products = await getProducts();
  const product = products.find((p) => p.id === order.product_id);
  const base = { status: order.status, productTitle: product ? displayTitle(product) : order.product_id };
  if (order.status !== "paid") return NextResponse.json(base, { headers: { "Cache-Control": "no-store" } });
  const links = await deliveryLinksFor(order, products);
  let emailSent = false;
  const client = serviceClient();
  if (client) {
    const { data } = await client.from("store_order_events").select("id").eq("order_id", order.id).eq("kind", "email_sent").limit(1);
    emailSent = Boolean(data && data.length > 0);
  }
  return NextResponse.json({ ...base, links, emailSent }, { headers: { "Cache-Control": "no-store" } });
}
