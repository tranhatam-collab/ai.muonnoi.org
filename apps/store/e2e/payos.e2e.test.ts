import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { boot, fakeEpub, type E2E } from "./harness/boot";
import { signOrder } from "@/lib/tokens";
import { invalidateFileCache } from "@/lib/storage";

// Luồng VietQR trọn vẹn trên mã thật: mở đơn, payOS gọi webhook, ghi sổ cái, gửi email, tải file.
// Postgres là thật (PGlite chạy đúng file migration); payOS, kho file và email là bản giả ở tầng fetch.

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

type Started = { status: number; url?: string; orderCode?: number; error?: string };

async function start(productId = "99-thong-diep-song", extra: Record<string, unknown> = {}): Promise<Started> {
  const res = await e2e.api.checkoutPayos({ productId, email: "Reader@Example.com", name: "Độc Giả", ...extra });
  return { status: res.status, ...((await res.json()) as object) };
}

async function pay(orderCode: number, amount: number, extra: Record<string, unknown> = {}) {
  const data = {
    orderCode,
    amount,
    description: `SACH ${orderCode}`,
    accountNumber: "0000000000",
    reference: "FT26310001",
    transactionDateTime: "2026-11-06 18:30:00",
    currency: "VND",
    paymentLinkId: `pl_${orderCode}`,
    code: "00",
    desc: "Thành công",
    ...extra,
  };
  return e2e.api.payosWebhook(await e2e.world.payosWebhook(data));
}

const events = async (orderCode: number) =>
  (await e2e.q<{ kind: string }>(`select kind from store_order_events where order_id = (select id from store_orders where order_code = $1) order by id`, [orderCode])).map((r) => r.kind);
const orderRow = async (orderCode: number) =>
  (await e2e.q<{ status: string; amount: number; currency: string; buyer_email: string; provider_ref: string; paid_at: string | null }>(`select * from store_orders where order_code = $1`, [orderCode]))[0];
const ledger = async () => e2e.q<{ amount_vnd: number; channel: string; source_ref: string }>(`select amount_vnd, channel, source_ref from engine_revenue order by id`);

test("payOS: từ lúc mở đơn đến lúc tải file, mọi bước đúng", async () => {
  // 1. Mở đơn: giá do server quyết, dù khách gửi kèm số tiền khác.
  const s = await start("99-thong-diep-song", { amount: 1000, price_vnd: 1 });
  assert.equal(s.status, 200);
  assert.ok(s.orderCode && s.url?.startsWith("https://pay.payos.test/web/"));
  const code = s.orderCode;
  let row = await orderRow(code);
  assert.equal(row.status, "pending");
  assert.equal(row.amount, 49000);
  assert.equal(row.currency, "VND");
  assert.equal(row.buyer_email, "reader@example.com");
  assert.equal(row.provider_ref, `pl_${code}`);
  const sent = e2e.world.payosRequests.at(-1)!;
  assert.equal(sent.amount, 49000);
  assert.equal(sent.description, `SACH ${code}`);
  assert.match(String(sent.returnUrl), new RegExp(`/cam-on\\?order=${code}&t=`));
  assert.deepEqual(await events(code), ["created", "payos_link_created"]);

  // 2. Trang cảm ơn khi chưa trả tiền: chưa có link.
  const t = signOrder(code);
  let status = (await (await e2e.api.order(code, t)).json()) as { status: string; links?: unknown[] };
  assert.equal(status.status, "pending");
  assert.equal(status.links, undefined);
  assert.equal((await ledger()).length, 0);

  // 3. payOS báo tiền về.
  const hook = await pay(code, 49000);
  assert.equal(hook.status, 200);
  row = await orderRow(code);
  assert.equal(row.status, "paid");
  assert.ok(row.paid_at);
  assert.deepEqual(await ledger(), [{ amount_vnd: 49000, channel: "store_payos", source_ref: String(code) }]);
  assert.equal(e2e.world.emails.length, 1);
  assert.deepEqual(e2e.world.emails[0].to, ["reader@example.com"]);
  assert.equal(e2e.world.emails[0].links.filter((l) => l.includes("/api/download/")).length, 1);
  assert.deepEqual(await events(code), ["created", "payos_link_created", "paid", "email_sent"]);

  // 4. Trang cảm ơn sau khi trả tiền: có link và biết email đã gửi.
  status = (await (await e2e.api.order(code, t)).json()) as { status: string; links?: Array<{ url: string }>; };
  assert.equal(status.status, "paid");
  assert.equal(status.links?.length, 1);
  assert.equal((status as { emailSent?: boolean }).emailSent, true);

  // 5. Tải file bằng link trong email: đúng byte, đúng loại, có nhật ký.
  const link = e2e.world.emails[0].links.find((l) => l.includes("/api/download/"))!;
  const token = link.split("/api/download/")[1];
  const dl = await e2e.api.download(token, { "x-forwarded-for": "203.0.113.9", "user-agent": "e2e-reader" });
  assert.equal(dl.status, 200);
  assert.equal(dl.headers.get("content-type"), "application/epub+zip");
  assert.match(dl.headers.get("content-disposition") ?? "", /attachment; filename="99-Thong-Diep-Song\.epub"/);
  assert.deepEqual(Buffer.from(await dl.arrayBuffer()), Buffer.from(fakeEpub("99-thong-diep-song.epub")));
  assert.deepEqual(await e2e.q(`select ip, user_agent, product_id from store_downloads`), [{ ip: "203.0.113.9", user_agent: "e2e-reader", product_id: "99-thong-diep-song" }]);

  // 6. payOS gọi lại lần hai (thường gặp): không nhân đôi doanh thu, email hay sự kiện.
  assert.equal((await pay(code, 49000)).status, 200);
  assert.equal((await ledger()).length, 1);
  assert.equal(e2e.world.emails.length, 1);
  assert.equal((await events(code)).filter((k) => k === "paid").length, 1);
});

test("payOS: trả thiếu tiền thì không giao sách", async () => {
  const { orderCode } = await start();
  assert.equal((await pay(orderCode!, 48000)).status, 200);
  assert.equal((await orderRow(orderCode!)).status, "pending");
  assert.equal((await ledger()).length, 0);
  assert.equal(e2e.world.emails.length, 0);
  assert.ok((await events(orderCode!)).includes("payos_underpaid"));
});

test("payOS: chữ ký sai hoặc dữ liệu bị sửa giữa đường đều bị từ chối", async () => {
  const { orderCode } = await start();
  const forged = await e2e.world.payosWebhook({ orderCode, amount: 49000, paymentLinkId: `pl_${orderCode}`, code: "00" }, { tamper: true });
  assert.equal((await e2e.api.payosWebhook(forged)).status, 400);
  assert.equal((await e2e.api.payosWebhook({ code: "00", success: true, data: { orderCode, amount: 49000, code: "00" }, signature: "0".repeat(64) })).status, 400);
  assert.equal((await e2e.api.payosWebhook({ code: "00", success: true, data: { orderCode, amount: 49000, code: "00" } })).status, 400);
  assert.equal((await orderRow(orderCode!)).status, "pending");
  assert.equal((await ledger()).length, 0);
});

test("payOS: webhook báo thất bại không đánh dấu đã trả", async () => {
  const { orderCode } = await start();
  assert.equal((await pay(orderCode!, 49000, { code: "01", desc: "Giao dịch thất bại" })).status, 200);
  assert.equal((await orderRow(orderCode!)).status, "pending");
  assert.ok((await events(orderCode!)).includes("payos_webhook_nonsuccess"));
});

test("payOS: mã đơn lạ vẫn trả 200 (gói thử lúc xác nhận webhook) nhưng không làm gì", async () => {
  const res = await pay(1799999999999999, 49000);
  assert.equal(res.status, 200);
  assert.equal(((await res.json()) as { note?: string }).note, "order not found");
  assert.equal((await e2e.q(`select 1 from store_orders`)).length, 0);
});

test("payOS: webhook không thể đánh dấu đã trả một đơn PayPal", async () => {
  const pp = (await (await e2e.api.checkoutPaypal({ productId: "99-thong-diep-song", email: "a@b.co" })).json()) as { orderCode: number };
  const res = await pay(pp.orderCode, 49000);
  assert.equal(res.status, 200);
  assert.equal((await orderRow(pp.orderCode)).status, "pending");
  assert.equal((await ledger()).length, 0);
});

test("payOS: bộ 5 cuốn giao đủ 5 link và cả 5 đều tải được", async () => {
  const s = await start("bo-5-cuon");
  assert.equal(s.status, 200);
  const row = await orderRow(s.orderCode!);
  assert.equal(row.amount, 349000);
  assert.equal((await pay(s.orderCode!, 349000)).status, 200);
  const links = e2e.world.emails[0].links.filter((l) => l.includes("/api/download/"));
  assert.equal(links.length, 5);
  for (const l of links) {
    const res = await e2e.api.download(l.split("/api/download/")[1]);
    assert.equal(res.status, 200);
  }
  assert.equal((await e2e.q(`select 1 from store_downloads`)).length, 5);
  assert.deepEqual((await ledger()).map((r) => r.amount_vnd), [349000]);
});

test("payOS: kiểm tra đầu vào khi mở đơn", async () => {
  assert.equal((await start("99-thong-diep-song", { email: "khong-phai-email" })).status, 400);
  assert.equal((await start("khong-ton-tai")).status, 404);
  assert.equal((await start("doanh-nhan-sang-tao")).status, 404); // bản nháp, chưa bán
  assert.equal((await start("../etc/passwd")).status, 400);
  assert.equal((await e2e.api.checkoutPayosRaw("{không phải json")).status, 400);

  // Sách chưa có file trong kho thì không bán.
  e2e.world.files.delete("troi-sinh.epub");
  invalidateFileCache();
  assert.equal((await start("troi-sinh")).status, 409);
  assert.equal((await start("bo-5-cuon")).status, 409); // bộ thiếu một cuốn cũng không bán
  assert.equal((await e2e.q(`select 1 from store_orders`)).length, 0);
});

test("payOS: payOS lỗi lúc tạo link thì khách thấy lỗi và đơn ghi nhận sự cố", async () => {
  e2e.world.faults.payosCreate = true;
  const s = await start();
  assert.equal(s.status, 502);
  assert.equal(s.url, undefined);
  const [row] = await e2e.q<{ order_code: number; status: string }>(`select order_code, status from store_orders`);
  assert.equal(row.status, "pending");
  assert.deepEqual(await events(row.order_code), ["created", "error"]);
});

test("payOS: Resend lỗi thì đơn vẫn là đã trả và khách vẫn lấy được link ở trang cảm ơn", async () => {
  const { orderCode } = await start();
  e2e.world.faults.resend = true;
  assert.equal((await pay(orderCode!, 49000)).status, 200);
  assert.equal((await orderRow(orderCode!)).status, "paid");
  assert.ok((await events(orderCode!)).includes("email_failed"));
  const s = (await (await e2e.api.order(orderCode!, signOrder(orderCode!))).json()) as { status: string; links: unknown[]; emailSent: boolean };
  assert.equal(s.status, "paid");
  assert.equal(s.links.length, 1);
  assert.equal(s.emailSent, false);
});
