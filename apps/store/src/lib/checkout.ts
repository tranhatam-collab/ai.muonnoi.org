import { getProducts, displayTitle, type Product } from "./catalog";
import { isDeliverable, listEbookFiles } from "./storage";
import { features } from "./env";

export type CheckoutRequest = { productId: string; email: string; name?: string };

export type CheckoutValidation =
  | { ok: true; product: Product; products: Product[]; email: string; name: string | undefined; title: string }
  | { ok: false; status: number; error: string };

export async function validateCheckout(body: unknown): Promise<CheckoutValidation> {
  if (!features.checkout) return { ok: false, status: 503, error: "Cửa hàng chưa mở nhận đơn." };
  const b = (body ?? {}) as Partial<CheckoutRequest>;
  const productId = typeof b.productId === "string" ? b.productId.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const name = typeof b.name === "string" && b.name.trim() ? b.name.trim().slice(0, 120) : undefined;
  if (!/^[a-z0-9-]{1,80}$/.test(productId)) return { ok: false, status: 400, error: "Sản phẩm không hợp lệ." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { ok: false, status: 400, error: "Email không hợp lệ." };
  const products = await getProducts();
  const product = products.find((p) => p.id === productId);
  if (!product) return { ok: false, status: 404, error: "Không tìm thấy sách." };
  const files = await listEbookFiles();
  if (!isDeliverable(product, products, files)) return { ok: false, status: 409, error: "Sách chưa sẵn sàng để giao." };
  return { ok: true, product, products, email, name, title: displayTitle(product) };
}

export function clientIp(req: Request): string | null {
  const xf = req.headers.get("x-forwarded-for");
  return xf ? xf.split(",")[0].trim() : null;
}
