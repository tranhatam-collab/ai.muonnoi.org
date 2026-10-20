import { NextResponse } from "next/server";
import { parseDownloadToken } from "@/lib/tokens";
import { getOrderByCode, logDownload } from "@/lib/orders";
import { getProducts, deliverableIds, displayTitle } from "@/lib/catalog";
import { downloadEbook } from "@/lib/storage";
import { clientIp } from "@/lib/checkout";
import { features } from "@/lib/env";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(req: Request, { params }: Ctx) {
  if (!features.db || !features.downloads) return new NextResponse("Not configured", { status: 503 });
  const { token } = await params;
  const claims = parseDownloadToken(token);
  if (!claims) return new NextResponse("Link tải không hợp lệ hoặc đã hết hạn.", { status: 403 });
  const order = await getOrderByCode(claims.o);
  if (!order || order.status !== "paid") return new NextResponse("Đơn hàng chưa thanh toán.", { status: 403 });
  const products = await getProducts();
  const ordered = products.find((p) => p.id === order.product_id);
  if (!ordered || !deliverableIds(ordered).includes(claims.p)) return new NextResponse("Sách không thuộc đơn hàng này.", { status: 403 });
  const product = products.find((p) => p.id === claims.p);
  if (!product?.file_path) return new NextResponse("Chưa có file.", { status: 404 });
  const file = await downloadEbook(product.file_path);
  if (!file) return new NextResponse("Không đọc được file.", { status: 500 });
  await logDownload(order.id, product.id, clientIp(req), req.headers.get("user-agent"));
  const ext = product.file_path.endsWith(".pdf") ? "pdf" : "epub";
  const safeName = displayTitle(product).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 _-]/g, "").trim().replace(/\s+/g, "-") || product.id;
  return new NextResponse(file.data.stream(), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${safeName}.${ext}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
