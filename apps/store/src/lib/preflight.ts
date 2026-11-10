import { anonClient, serviceClient } from "./supabase";
import { config, features, siteUrl } from "./env";
import { getProducts } from "./catalog";
import { isDeliverable, listEbookFiles } from "./storage";

// Kiểm tra sẵn sàng mở bán trong một lần gọi: cấu hình, schema đã áp đủ, RLS, kho file.
// Không ghi dữ liệu thật và không lộ giá trị khóa, chỉ nói đạt hay không và vì sao.

export type Check = { name: string; ok: boolean; level: "required" | "advice"; detail: string };

const pass = (name: string, detail: string, level: Check["level"] = "required"): Check => ({ name, ok: true, level, detail });
const fail = (name: string, detail: string, level: Check["level"] = "required"): Check => ({ name, ok: false, level, detail });

export async function runPreflight(): Promise<{ ok: boolean; checks: Check[] }> {
  const checks: Check[] = [];

  const dl = config.downloadSecret ?? "";
  const admin = config.adminSecret ?? "";
  if (dl.length < 32) checks.push(fail("khóa ký link tải", "DOWNLOAD_SECRET phải dài ít nhất 32 ký tự"));
  else if (admin.length < 24) checks.push(fail("khóa quản trị", "ADMIN_SECRET phải dài ít nhất 24 ký tự"));
  else if (dl === admin) checks.push(fail("khóa bí mật", "DOWNLOAD_SECRET và ADMIN_SECRET không được trùng nhau"));
  else checks.push(pass("khóa bí mật", "đủ dài và khác nhau"));

  const site = siteUrl();
  checks.push(/^https:\/\/(?!localhost)/.test(site) ? pass("địa chỉ cửa hàng", site) : fail("địa chỉ cửa hàng", `NEXT_PUBLIC_SITE_URL phải là https, đang là ${site}`));

  const gateways = [features.payos ? "payOS" : null, features.paypal ? "PayPal" : null].filter(Boolean);
  checks.push(gateways.length ? pass("cổng thanh toán", gateways.join(", ")) : fail("cổng thanh toán", "chưa bật cổng nào (thiếu khóa payOS hoặc PayPal)"));
  if (features.paypal) {
    checks.push(
      config.paypal.env === "live"
        ? pass("chế độ PayPal", "LIVE: nhận tiền thật, phải dùng khóa live", "advice")
        : pass("chế độ PayPal", "sandbox: chưa nhận tiền thật, đúng cho giai đoạn thử", "advice"),
    );
  }
  const m = config.mail;
  checks.push(
    m.resendApiKey || (m.gmailUser && m.gmailAppPassword)
      ? pass("email giao sách", m.resendApiKey ? "Resend" : "Gmail SMTP", "advice")
      : fail("email giao sách", "chưa cấu hình; khách vẫn tải được trên trang cảm ơn nhưng không có email và không lấy lại được link", "advice"),
  );

  const service = serviceClient();
  const anon = anonClient();
  if (!service || !anon) {
    checks.push(fail("Supabase", "thiếu NEXT_PUBLIC_SUPABASE_URL, khóa công khai hoặc SUPABASE_SERVICE_ROLE_KEY"));
    return { ok: false, checks };
  }

  const db = await service.from("store_products").select("id").limit(1);
  checks.push(db.error ? fail("kết nối DB", db.error.message) : pass("kết nối DB", "đọc được store_products bằng khóa server"));

  const rpc = await service.rpc("engine_rate_limit_hit", { p_bucket: "preflight", p_limit: 1_000_000, p_window_seconds: 60 });
  checks.push(rpc.error || rpc.data !== true ? fail("migration 0002", `hàm giới hạn tốc độ chưa có hoặc lỗi: ${rpc.error?.message ?? "kết quả lạ"}`) : pass("migration 0002", "hàm giới hạn tốc độ chạy được"));

  const ledger = await service.from("engine_revenue").select("kind, refund_of_order_id").limit(1);
  checks.push(ledger.error ? fail("migration 0003", `sổ cái chưa có cột hoàn tiền: ${ledger.error.message}`) : pass("migration 0003", "sổ cái có cột kind và refund_of_order_id"));

  const active = await anon.from("store_products").select("id").eq("active", true);
  checks.push(
    active.error || !active.data?.length
      ? fail("danh mục trong DB", active.error?.message ?? "bảng store_products trống hoặc khóa công khai không đọc được (migration 0001 chưa áp?)")
      : pass("danh mục trong DB", `${active.data.length} sản phẩm đang bán, đọc bằng khóa công khai`),
  );

  // engine_settings có sẵn 3 dòng seed: khóa công khai mà thấy dòng nào là RLS đang hở.
  const leak = await anon.from("engine_settings").select("key").limit(1);
  checks.push(
    leak.error || (leak.data?.length ?? 0) === 0
      ? pass("RLS", "khóa công khai không đọc được engine_settings")
      : fail("RLS", "khóa công khai đọc được engine_settings: RLS không hoạt động, dừng ngay"),
  );

  const products = await getProducts();
  const files = await listEbookFiles();
  if (!files) checks.push(fail("kho file ebooks", "không liệt kê được kho file"));
  else {
    const missing = products.filter((p) => !isDeliverable(p, products, files)).map((p) => p.id);
    checks.push(
      missing.length === 0
        ? pass("kho file ebooks", `${products.length} sản phẩm đủ file để giao`)
        : fail("kho file ebooks", `chưa giao được: ${missing.join(", ")} (thiếu file trong bucket ebooks)`),
    );
  }

  return { ok: checks.every((c) => c.ok || c.level === "advice"), checks };
}
