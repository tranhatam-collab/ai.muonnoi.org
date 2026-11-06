import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { boot, CFG, type E2E } from "./harness/boot";
import { createDownloadToken, signOrder } from "@/lib/tokens";

// Giới hạn tốc độ, hoàn tiền và các lớp chặn ở tầng DB. Mỗi hạng mục đều thử cả đường đúng lẫn đường bị lạm dụng.

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

const ip = (a: string) => ({ "x-forwarded-for": a });
const checkout = (productId: string, from: string, provider: "payos" | "paypal" = "payos") =>
  (provider === "payos" ? e2e.api.checkoutPayos : e2e.api.checkoutPaypal)({ productId, email: "a@b.co" }, ip(from));

async function buyPayos(productId: string, amount: number): Promise<number> {
  const res = (await (await e2e.api.checkoutPayos({ productId, email: "reader@example.com" })).json()) as { orderCode: number };
  await e2e.api.payosWebhook(await e2e.world.payosWebhook({ orderCode: res.orderCode, amount, paymentLinkId: `pl_${res.orderCode}`, code: "00", desc: "ok" }));
  return res.orderCode;
}
const row = async (code: number) => (await e2e.q<{ status: string }>(`select status from store_orders where order_code = $1`, [code]))[0];
const ledger = async () => e2e.q<{ kind: string; amount: number; amount_vnd: number; channel: string }>(`select kind, amount, amount_vnd, channel from engine_revenue order by id`);
const kinds = async (code: number) => (await e2e.q<{ kind: string }>(`select kind from store_order_events where order_id = (select id from store_orders where order_code = $1) order by id`, [code])).map((r) => r.kind);

// ---------------------------------------------------------------- giới hạn tốc độ

test("giới hạn tốc độ: IP thứ 11 trong 10 phút bị chặn, IP khác không bị ảnh hưởng", async () => {
  for (let i = 0; i < 10; i++) assert.equal((await checkout("troi-sinh", "203.0.113.7")).status, 200, `lần ${i + 1}`);
  const blocked = await checkout("troi-sinh", "203.0.113.7");
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get("retry-after"), "600");
  assert.match(((await blocked.json()) as { error: string }).error, /quá nhanh/);
  assert.equal((await e2e.q(`select 1 from store_orders`)).length, 10); // đơn bị chặn không tạo dòng nào
  assert.equal((await checkout("troi-sinh", "198.51.100.20")).status, 200);
});

test("giới hạn tốc độ: PayOS và PayPal dùng chung một hạn mức theo IP", async () => {
  for (let i = 0; i < 5; i++) assert.equal((await checkout("troi-sinh", "203.0.113.8", "payos")).status, 200);
  for (let i = 0; i < 5; i++) assert.equal((await checkout("troi-sinh", "203.0.113.8", "paypal")).status, 200);
  assert.equal((await checkout("troi-sinh", "203.0.113.8", "paypal")).status, 429);
  assert.equal((await checkout("troi-sinh", "203.0.113.8", "payos")).status, 429);
});

test("giới hạn tốc độ: sang cửa sổ mới thì đếm lại từ đầu", async () => {
  for (let i = 0; i < 10; i++) await checkout("troi-sinh", "203.0.113.9");
  assert.equal((await checkout("troi-sinh", "203.0.113.9")).status, 429);
  await e2e.q(`update engine_rate_limits set window_start = window_start - interval '10 minutes'`);
  assert.equal((await checkout("troi-sinh", "203.0.113.9")).status, 200);
});

test("giới hạn tốc độ: đếm đúng khi nhiều yêu cầu đến cùng lúc", async () => {
  const results = await Promise.all(Array.from({ length: 16 }, () => checkout("troi-sinh", "203.0.113.10")));
  const codes = results.map((r) => r.status).sort();
  assert.equal(codes.filter((c) => c === 200).length, 10);
  assert.equal(codes.filter((c) => c === 429).length, 6);
});

test("giới hạn tốc độ: bảng đếm không giữ IP thô", async () => {
  await checkout("troi-sinh", "203.0.113.77");
  const rows = await e2e.q<{ bucket: string }>(`select bucket from engine_rate_limits`);
  assert.equal(rows.length, 1);
  assert.ok(rows[0].bucket.startsWith("checkout-ip:"));
  assert.ok(!rows[0].bucket.includes("203.0.113.77"));
});

test("giới hạn tốc độ: khóa công khai không gọi được hàm đếm và không đụng được bảng đếm", async () => {
  const anon = { apikey: CFG.anonKey, authorization: `Bearer ${CFG.anonKey}`, "content-type": "application/json" };
  const rpc = await fetch(`${CFG.supabaseUrl}/rest/v1/rpc/engine_rate_limit_hit`, { method: "POST", headers: anon, body: JSON.stringify({ p_bucket: "x", p_limit: 1, p_window_seconds: 60 }) });
  assert.ok(rpc.status === 401 || rpc.status === 403, `anon gọi được hàm đếm: ${rpc.status}`);
  const tbl = await fetch(`${CFG.supabaseUrl}/rest/v1/engine_rate_limits?select=*`, { headers: anon });
  assert.ok(tbl.status === 401 || tbl.status === 403 || (await tbl.json()).length === 0);
  const ins = await fetch(`${CFG.supabaseUrl}/rest/v1/engine_rate_limits`, { method: "POST", headers: anon, body: JSON.stringify({ bucket: "x", window_start: new Date().toISOString(), hits: 0 }) });
  assert.ok(ins.status === 401 || ins.status === 403, `anon ghi được bảng đếm: ${ins.status}`);
});

test("giới hạn tốc độ: hàm đếm hỏng thì đóng cửa (503), không bỏ qua giới hạn", async () => {
  await e2e.q(`alter function public.engine_rate_limit_hit(text, integer, integer) rename to engine_rate_limit_hit_off`);
  try {
    const res = await checkout("troi-sinh", "203.0.113.11");
    assert.equal(res.status, 503);
    assert.equal((await e2e.q(`select 1 from store_orders`)).length, 0);
  } finally {
    await e2e.q(`alter function public.engine_rate_limit_hit_off(text, integer, integer) rename to engine_rate_limit_hit`);
  }
  assert.equal((await checkout("troi-sinh", "203.0.113.11")).status, 200);
});

// ---------------------------------------------------------------- hoàn tiền

test("hoàn tiền: thu hồi quyền tải, đảo sổ cái về 0, ghi nhật ký, gọi lại không nhân đôi", async () => {
  const code = await buyPayos("99-thong-diep-song", 49000);
  const link = createDownloadToken(code, "99-thong-diep-song");
  assert.equal((await e2e.api.download(link)).status, 200);
  assert.deepEqual(await ledger(), [{ kind: "sale", amount: 49000, amount_vnd: 49000, channel: "store_payos" }]);

  assert.equal((await e2e.api.adminRefund(code)).status, 403); // không có khóa
  assert.equal((await e2e.api.adminRefund(code, "sai-khoa")).status, 403);
  const res = await e2e.api.adminRefund(code, CFG.adminSecret, { reason: "Khách xin hoàn trong 7 ngày" });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { orderCode: code, status: "refunded", alreadyRefunded: false });

  assert.equal((await row(code)).status, "refunded");
  assert.deepEqual(await ledger(), [
    { kind: "sale", amount: 49000, amount_vnd: 49000, channel: "store_payos" },
    { kind: "refund", amount: -49000, amount_vnd: -49000, channel: "store_payos" },
  ]);
  const [dash] = await e2e.q<{ today_vnd: number }>(`select today_vnd from engine_v_dashboard`);
  assert.equal(dash.today_vnd, 0);
  const detail = (await e2e.q<{ detail: { reason: string; by: string } }>(`select detail from store_order_events where kind = 'refunded'`))[0].detail;
  assert.deepEqual(detail, { reason: "Khách xin hoàn trong 7 ngày", by: "admin" });

  // Link đã phát ra trước đó ngừng hoạt động; trang đơn không còn link.
  assert.equal((await e2e.api.download(link)).status, 403);
  const page = (await (await e2e.api.order(code, signOrder(code))).json()) as { status: string; links?: unknown };
  assert.deepEqual(page, { status: "refunded", productTitle: "99 Thông Điệp Sống" });

  // Gọi lại: vẫn 200, không thêm dòng sổ cái, không thêm sự kiện.
  const again = await e2e.api.adminRefund(code, CFG.adminSecret);
  assert.equal(again.status, 200);
  assert.equal(((await again.json()) as { alreadyRefunded: boolean }).alreadyRefunded, true);
  assert.equal((await ledger()).length, 2);
  assert.equal((await kinds(code)).filter((k) => k === "refunded").length, 1);
});

test("hoàn tiền: webhook payOS gửi lại sau hoàn tiền không làm sống lại đơn", async () => {
  const code = await buyPayos("troi-sinh", 119000);
  assert.equal((await e2e.api.adminRefund(code, CFG.adminSecret)).status, 200);
  const emails = e2e.world.emails.length;

  const replay = await e2e.api.payosWebhook(await e2e.world.payosWebhook({ orderCode: code, amount: 119000, paymentLinkId: `pl_${code}`, code: "00", desc: "ok" }));
  assert.equal(replay.status, 200); // vẫn 200 để payOS ngừng gửi lại
  assert.equal((await row(code)).status, "refunded");
  assert.equal(e2e.world.emails.length, emails); // không giao lại sách
  assert.equal((await ledger()).length, 2);
  assert.equal((await kinds(code)).filter((k) => k === "paid").length, 1);
});

test("hoàn tiền: đơn USD đảo đúng số VND đã ghi lúc bán dù tỷ giá đã đổi", async () => {
  const pp = (await (await e2e.api.checkoutPaypal({ productId: "troi-sinh", email: "a@b.co" })).json()) as { orderCode: number };
  const id = e2e.world.paypalOrderForCode(pp.orderCode).id;
  e2e.world.approvePaypal(id);
  await e2e.api.paypalCapture(`order=${pp.orderCode}&t=${signOrder(pp.orderCode)}&token=${id}`);
  assert.deepEqual(await ledger(), [{ kind: "sale", amount: 5.99, amount_vnd: 155740, channel: "store_paypal" }]);

  await e2e.q(`update engine_settings set value = '27500' where key = 'usd_vnd_rate'`);
  assert.equal((await e2e.api.adminRefund(pp.orderCode, CFG.adminSecret)).status, 200);
  assert.deepEqual(await ledger(), [
    { kind: "sale", amount: 5.99, amount_vnd: 155740, channel: "store_paypal" },
    { kind: "refund", amount: -5.99, amount_vnd: -155740, channel: "store_paypal" },
  ]);
  assert.equal((await e2e.q<{ net: number }>(`select sum(amount_vnd) as net from engine_revenue`))[0].net, 0);
});

test("hoàn tiền: chỉ đơn đã trả mới hoàn được; mã sai hoặc không tồn tại bị từ chối", async () => {
  const pending = (await (await e2e.api.checkoutPayos({ productId: "troi-sinh", email: "a@b.co" })).json()) as { orderCode: number };
  const r = await e2e.api.adminRefund(pending.orderCode, CFG.adminSecret);
  assert.equal(r.status, 409);
  assert.equal((await row(pending.orderCode)).status, "pending");
  assert.equal((await e2e.api.adminRefund(1799999999999999, CFG.adminSecret)).status, 404);
  assert.equal((await e2e.api.adminRefund("abc", CFG.adminSecret)).status, 400);
  assert.equal((await ledger()).length, 0);
});

// ---------------------------------------------------------------- tầng DB

test("DB chặn chuyển trạng thái sai luồng, kể cả khi mã ứng dụng có lỗi", async () => {
  const code = await buyPayos("troi-sinh", 119000);
  const rejects = async (sql: string, label: string) => {
    await assert.rejects(() => e2e.q(sql), /đơn|hoàn tiền|trả/, label);
  };
  await rejects(`update store_orders set status = 'pending' where order_code = ${code}`, "paid -> pending");
  await rejects(`update store_orders set status = 'cancelled' where order_code = ${code}`, "paid -> cancelled");
  await e2e.api.adminRefund(code, CFG.adminSecret);
  await rejects(`update store_orders set status = 'paid' where order_code = ${code}`, "refunded -> paid");
  await rejects(`update store_orders set status = 'pending' where order_code = ${code}`, "refunded -> pending");

  const pending = (await (await e2e.api.checkoutPayos({ productId: "troi-sinh", email: "a@b.co" })).json()) as { orderCode: number };
  await rejects(`update store_orders set status = 'refunded' where order_code = ${pending.orderCode}`, "pending -> refunded");
  assert.equal((await row(pending.orderCode)).status, "pending");
});

test("tiền về muộn sau khi đơn đã hết hạn hoặc bị hủy vẫn được giao sách", async () => {
  for (const state of ["expired", "cancelled"]) {
    await e2e.reset();
    const s = (await (await e2e.api.checkoutPayos({ productId: "troi-sinh", email: "late@example.com" })).json()) as { orderCode: number };
    await e2e.q(`update store_orders set status = '${state}' where order_code = $1`, [s.orderCode]);
    assert.equal((await e2e.api.payosWebhook(await e2e.world.payosWebhook({ orderCode: s.orderCode, amount: 119000, paymentLinkId: `pl_${s.orderCode}`, code: "00", desc: "ok" }))).status, 200);
    assert.equal((await row(s.orderCode)).status, "paid", state);
    assert.equal(e2e.world.emails.length, 1, state);
    assert.equal((await ledger()).length, 1, state);
  }
});

test("migration chạy lại lần hai không lỗi và không đổi dữ liệu", async () => {
  const code = await buyPayos("troi-sinh", 119000);
  await e2e.api.adminRefund(code, CFG.adminSecret);
  const { readdirSync, readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { migrationsDir } = await import("./harness/pg");
  for (const file of readdirSync(migrationsDir()).filter((f) => f.endsWith(".sql")).sort()) {
    await e2e.pg.exec(readFileSync(join(migrationsDir(), file), "utf8"));
  }
  assert.equal((await ledger()).length, 2);
  assert.equal((await row(code)).status, "refunded");
});
