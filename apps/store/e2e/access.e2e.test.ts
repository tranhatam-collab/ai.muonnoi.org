import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { boot, CFG, type E2E } from "./harness/boot";
import { createDownloadToken, signOrder } from "@/lib/tokens";
import { getProducts } from "@/lib/catalog";
import { invalidateFileCache } from "@/lib/storage";

// Ai được xem gì, ai được tải gì, ai đọc được số liệu: kiểm tra quyền trên mã thật và RLS thật.

let e2e: E2E;
before(async () => {
  e2e = await boot();
});
after(async () => {
  await e2e.close();
});
beforeEach(async () => {
  await e2e.reset();
});

/** Mua xong một sản phẩm qua payOS và trả về mã đơn. */
async function buyPayos(productId: string, amount: number, email = "reader@example.com"): Promise<number> {
  const res = (await (await e2e.api.checkoutPayos({ productId, email })).json()) as { orderCode: number };
  const data = { orderCode: res.orderCode, amount, paymentLinkId: `pl_${res.orderCode}`, code: "00", desc: "Thành công" };
  assert.equal((await e2e.api.payosWebhook(await e2e.world.payosWebhook(data))).status, 200);
  return res.orderCode;
}

test("trang trạng thái đơn: cần đúng token của chính đơn đó", async () => {
  const code = await buyPayos("troi-sinh", 119000);
  const other = await buyPayos("99-thong-diep-song", 49000);
  assert.equal((await e2e.api.order(code, null)).status, 403);
  assert.equal((await e2e.api.order(code, "x".repeat(32))).status, 403);
  assert.equal((await e2e.api.order(code, signOrder(other))).status, 403); // token của đơn khác
  assert.equal((await e2e.api.order("abc", signOrder(code))).status, 403);
  assert.equal((await e2e.api.order(1799999999999999, signOrder(1799999999999999))).status, 404);
  assert.equal((await e2e.api.order(code, signOrder(code))).status, 200);
});

test("tải sách: chỉ link hợp lệ, chưa hết hạn, của đơn đã trả và đúng sách trong đơn", async () => {
  const code = await buyPayos("troi-sinh", 119000);
  const good = createDownloadToken(code, "troi-sinh");
  assert.equal((await e2e.api.download(good)).status, 200);

  assert.equal((await e2e.api.download("rac")).status, 403);
  assert.equal((await e2e.api.download(good.slice(0, -2) + (good.endsWith("AA") ? "BB" : "AA"))).status, 403); // sửa chữ ký
  assert.equal((await e2e.api.download(createDownloadToken(code, "troi-sinh", -1))).status, 403); // hết hạn
  assert.equal((await e2e.api.download(createDownloadToken(code, "tri-tue-khong-nguon-goc"))).status, 403); // sách không thuộc đơn
  assert.equal((await e2e.api.download(createDownloadToken(code, "bo-5-cuon"))).status, 403); // bộ không thuộc đơn lẻ
  assert.equal((await e2e.api.download(createDownloadToken(1799999999999999, "troi-sinh"))).status, 403); // đơn không tồn tại

  // Đơn chưa trả tiền thì token hợp lệ về chữ ký cũng không tải được.
  const pending = (await (await e2e.api.checkoutPayos({ productId: "troi-sinh", email: "a@b.co" })).json()) as { orderCode: number };
  assert.equal((await e2e.api.download(createDownloadToken(pending.orderCode, "troi-sinh"))).status, 403);

  // File biến mất khỏi kho sau khi bán: báo lỗi, không ghi nhật ký tải.
  const before = (await e2e.q(`select 1 from store_downloads`)).length;
  e2e.world.files.delete("troi-sinh.epub");
  assert.equal((await e2e.api.download(good)).status, 500);
  assert.equal((await e2e.q(`select 1 from store_downloads`)).length, before);
});

test("số liệu admin: cần khóa, và khớp với sổ cái", async () => {
  assert.equal((await e2e.api.adminStats()).status, 403);
  assert.equal((await e2e.api.adminStats("sai-khoa")).status, 403);

  await buyPayos("99-thong-diep-song", 49000);
  const pp = (await (await e2e.api.checkoutPaypal({ productId: "from-zero-to-infinite", email: "en@example.com" })).json()) as { orderCode: number };
  const id = e2e.world.paypalOrderForCode(pp.orderCode).id;
  e2e.world.approvePaypal(id);
  await e2e.api.paypalCapture(`order=${pp.orderCode}&t=${signOrder(pp.orderCode)}&token=${id}`);

  const res = await e2e.api.adminStats(CFG.adminSecret);
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    dashboard: { today_vnd: number; orders_paid_today: number; orders_pending_24h: number };
    dashboardError: string | null;
    recentOrders: Array<{ order_code: number; status: string }>;
    products: Array<{ id: string; deliverable: boolean }>;
  };
  assert.equal(body.dashboardError, null);
  assert.equal(body.dashboard.today_vnd, 49000 + 103740);
  assert.equal(body.dashboard.orders_paid_today, 2);
  assert.equal(body.recentOrders.length, 2);
  assert.ok(body.products.filter((p) => p.id !== "bo-5-cuon").every((p) => p.deliverable));
  assert.equal(body.products.find((p) => p.id === "bo-5-cuon")?.deliverable, true);

  // Thiếu một file thì cuốn đó và bộ chứa nó đều báo chưa giao được.
  e2e.world.files.delete("troi-sinh.epub");
  invalidateFileCache();
  const after = (await (await e2e.api.adminStats(CFG.adminSecret)).json()) as typeof body;
  assert.equal(after.products.find((p) => p.id === "troi-sinh")?.deliverable, false);
  assert.equal(after.products.find((p) => p.id === "bo-5-cuon")?.deliverable, false);
  assert.equal(after.products.find((p) => p.id === "tri-tue-khong-nguon-goc")?.deliverable, true);
});

test("danh mục đọc từ DB bằng khóa công khai và chỉ thấy sách đang bán", async () => {
  const before = await getProducts();
  assert.equal(before.length, 7);
  assert.ok(!before.some((p) => p.id === "doanh-nhan-sang-tao")); // bản nháp
  // Đổi giá trong DB phải hiện ra ngay: chứng tỏ đây là đọc DB chứ không phải bản JSON dự phòng.
  await e2e.q(`update store_products set price_vnd = 129000 where id = 'troi-sinh'`);
  try {
    assert.equal((await getProducts()).find((p) => p.id === "troi-sinh")?.price_vnd, 129000);
    // Và đơn mới lấy đúng giá mới từ DB.
    const res = (await (await e2e.api.checkoutPayos({ productId: "troi-sinh", email: "a@b.co" })).json()) as { orderCode: number };
    assert.equal((await e2e.q<{ amount: number }>(`select amount from store_orders where order_code = $1`, [res.orderCode]))[0].amount, 129000);
  } finally {
    await e2e.q(`update store_products set price_vnd = 119000 where id = 'troi-sinh'`);
  }
});

test("khóa công khai (anon) không đọc được đơn, sổ cái, nhật ký và không ghi được gì", async () => {
  await buyPayos("troi-sinh", 119000);
  const rest = (path: string, init: RequestInit = {}) =>
    fetch(`${CFG.supabaseUrl}/rest/v1/${path}`, { ...init, headers: { apikey: CFG.anonKey, authorization: `Bearer ${CFG.anonKey}`, "content-type": "application/json", ...init.headers } });
  for (const table of ["store_orders", "store_order_events", "store_downloads", "engine_revenue", "engine_settings", "engine_approvals"]) {
    const res = await rest(`${table}?select=*`);
    assert.deepEqual(await res.json(), [], `anon thấy dữ liệu của ${table}`);
  }
  const dash = ((await (await rest("engine_v_dashboard?select=*")).json()) as Array<{ today_vnd: number }>)[0];
  assert.equal(dash.today_vnd, 0); // view security_invoker: anon thấy số 0, không thấy doanh thu
  const write = await rest("store_orders", { method: "POST", body: JSON.stringify({ order_code: 1, product_id: "troi-sinh", provider: "manual", currency: "VND", amount: 1000, status: "paid" }) });
  assert.ok(write.status === 401 || write.status === 403, `anon ghi được đơn: ${write.status}`);
  const patch = await rest("store_products?id=eq.troi-sinh", { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify({ price_vnd: 1000 }) });
  assert.deepEqual(patch.status === 200 ? await patch.json() : [], []);
  assert.equal((await e2e.q<{ price_vnd: number }>(`select price_vnd from store_products where id = 'troi-sinh'`))[0].price_vnd, 119000);
  const bad = await fetch(`${CFG.supabaseUrl}/rest/v1/store_orders?select=*`, { headers: { apikey: "khoa-gia" } });
  assert.equal(bad.status, 401);
});

test("thiếu khóa ký link tải thì cửa hàng đóng nhận đơn và tải về trả 503", async () => {
  const saved = process.env.DOWNLOAD_SECRET;
  delete process.env.DOWNLOAD_SECRET;
  try {
    assert.equal((await e2e.api.checkoutPayos({ productId: "troi-sinh", email: "a@b.co" })).status, 503);
    assert.equal((await e2e.api.download("bat-ky")).status, 503);
  } finally {
    process.env.DOWNLOAD_SECRET = saved;
  }
});
