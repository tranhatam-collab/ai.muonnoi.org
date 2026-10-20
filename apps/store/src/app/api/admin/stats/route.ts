import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { serviceClient } from "@/lib/supabase";
import { getProducts } from "@/lib/catalog";
import { isDeliverable, listEbookFiles } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Số liệu cho báo cáo ngày: doanh thu, đơn, việc chờ duyệt, sách thiếu file. */
export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const client = serviceClient();
  if (!client) return NextResponse.json({ error: "db not configured" }, { status: 503 });
  const [dash, recent, products, files] = await Promise.all([
    client.from("engine_v_dashboard").select("*").maybeSingle(),
    client.from("store_orders").select("order_code, product_id, provider, currency, amount, status, buyer_email, created_at, paid_at").order("created_at", { ascending: false }).limit(50),
    getProducts(),
    listEbookFiles(),
  ]);
  return NextResponse.json({
    dashboard: dash.data ?? null,
    dashboardError: dash.error?.message ?? null,
    recentOrders: recent.data ?? [],
    products: products.map((p) => ({ id: p.id, title: p.title, active: p.active, deliverable: isDeliverable(p, products, files), file_path: p.file_path })),
  });
}
