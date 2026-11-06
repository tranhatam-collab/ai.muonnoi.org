import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { boot, CFG, type E2E } from "./harness/boot";
import { signOrder } from "@/lib/tokens";

// Luồng PayPal trọn vẹn: tạo đơn, khách phê duyệt, server thu tiền và đối chiếu, giao sách.
// Gồm kịch bản tấn công đổi mã đơn đã được vá, và kiểm tra ranh giới sandbox/live.

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

type Started = { status: number; url?: string; orderCode: number; error?: string };

async function start(productId: string, email = "Buyer@Example.com"): Promise<Started> {
  const res = await e2e.api.checkoutPaypal({ productId, email });
  return { status: res.status, orderCode: 0, ...((await res.json()) as object) };
}
const query = (code: number, token?: string) => `order=${code}&t=${signOrder(code)}${token ? `&token=${token}` : ""}`;
const paypalId = async (code: number) => (await e2e.q<{ provider_ref: string }>(`select provider_ref from store_orders where order_code = $1`, [code]))[0].provider_ref;
const status = async (code: number) => (await e2e.q<{ status: string }>(`select status from store_orders where order_code = $1`, [code]))[0].status;
const events = async (code: number) =>
  (await e2e.q<{ kind: string; detail: Record<string, unknown> | null }>(`select kind, detail from store_order_events where order_id = (select id from store_orders where order_code = $1) order by id`, [code]));
const ledger = async () => e2e.q<{ amount: number; currency: string; amount_vnd: number; channel: string }>(`select amount, currency, amount_vnd, channel from engine_revenue order by id`);

test("PayPal: mua bản tiếng Anh từ lúc mở đơn đến lúc có email giao sách", async () => {
  const s = await start("from-zero-to-infinite");
  assert.equal(s.status, 200);
  assert.match(s.url ?? "", /^https:\/\/paypal\.e2e\.test\/checkoutnow\?token=PPORDER/);
  const code = s.orderCode;

  // Đơn: giá USD do server quyết; đơn PayPal mang mã đơn để đối chiếu.
  const [row] = await e2e.q<{ amount: number; currency: string; status: string; buyer_email: string }>(`select amount, currency, status, buyer_email from store_orders where order_code = $1`, [code]);
  assert.deepEqual(row, { amount: 3.99, currency: "USD", status: "pending", buyer_email: "buyer@example.com" });
  const pp = e2e.world.paypalOrderForCode(code);
  assert.deepEqual(pp.unit.amount, { currency_code: "USD", value: "3.99" });
  assert.equal(pp.unit.reference_id, String(code));
  assert.equal(await paypalId(code), pp.id);

  // Khách phê duyệt, PayPal đưa về URL thu tiền.
  e2e.world.approvePaypal(pp.id, "payer@example.com");
  const back = await e2e.api.paypalCapture(query(code, pp.id));
  assert.equal(back.status, 302);
  assert.match(back.headers.get("location") ?? "", new RegExp(`^${CFG.site}/cam-on\\?order=${code}&t=`));

  assert.equal(await status(code), "paid");
  assert.deepEqual(await ledger(), [{ amount: 3.99, currency: "USD", amount_vnd: 103740, channel: "store_paypal" }]);
  assert.equal(e2e.world.emails.length, 1);
  assert.deepEqual(e2e.world.emails[0].to, ["buyer@example.com"]); // email khách nhập, không phải email người trả
  assert.match(e2e.world.emails[0].subject, /^Your ebook: /);
  assert.equal(e2e.world.emails[0].links.filter((l) => l.includes("/api/download/")).length, 1);
  assert.deepEqual((await events(code)).map((e) => e.kind), ["created", "paypal_order_created", "paid", "email_sent"]);

  // Tải về được.
  const token = e2e.world.emails[0].links.find((l) => l.includes("/api/download/"))!.split("/api/download/")[1];
  const dl = await e2e.api.download(token);
  assert.equal(dl.status, 200);
  assert.match(dl.headers.get("content-disposition") ?? "", /filename="From-Zero-to-Infinite\.epub"/);

  // Khách tải lại trang thu tiền (F5, nút Back): không giao hai lần, không ghi sổ hai lần.
  assert.equal((await e2e.api.paypalCapture(query(code, pp.id))).status, 302);
  assert.equal(e2e.world.emails.length, 1);
  assert.equal((await ledger()).length, 1);
  assert.equal(e2e.world.unexpected.length, 0);
});

test("PayPal: mượn mã đơn rẻ để lấy bộ sách đắt không thành công", async () => {
  const cheap = await start("99-thong-diep-song"); // 2,99 USD
  const bundle = await start("bo-5-cuon"); // 16,99 USD
  const cheapPp = await paypalId(cheap.orderCode);
  const bundlePp = await paypalId(bundle.orderCode);
  e2e.world.approvePaypal(cheapPp); // kẻ tấn công trả đơn rẻ

  // Gắn mã PayPal của đơn rẻ vào URL thu tiền của đơn đắt.
  assert.equal((await e2e.api.paypalCapture(query(bundle.orderCode, cheapPp))).status, 302);
  assert.equal(await status(bundle.orderCode), "pending");
  assert.ok((await events(bundle.orderCode)).some((e) => e.kind === "paypal_token_mismatch"));
  assert.equal(e2e.world.paypalOrders.get(cheapPp)?.status, "APPROVED"); // server không thu đơn rẻ thay cho đơn đắt

  // Bỏ tham số token: server thu đúng mã PayPal đã lưu của đơn đắt, mà đơn đó chưa được phê duyệt.
  assert.equal((await e2e.api.paypalCapture(query(bundle.orderCode))).status, 302);
  assert.equal(await status(bundle.orderCode), "pending");
  assert.ok((await events(bundle.orderCode)).some((e) => e.kind === "error"));

  // Đơn rẻ thu bằng đường của chính nó: chỉ đơn rẻ được trả, sổ cái chỉ có 2,99 USD.
  assert.equal((await e2e.api.paypalCapture(query(cheap.orderCode, cheapPp))).status, 302);
  assert.equal(await status(cheap.orderCode), "paid");
  assert.equal(await status(bundle.orderCode), "pending");
  assert.deepEqual((await ledger()).map((r) => r.amount), [2.99]);
  assert.equal(e2e.world.emails.length, 1);
  assert.equal(e2e.world.emails[0].links.filter((l) => l.includes("/api/download/")).length, 1);
});

test("PayPal: số tiền hoặc tiền tệ thu được khác đơn thì không giao sách", async () => {
  const a = await start("troi-sinh"); // 5,99 USD
  const ppA = await paypalId(a.orderCode);
  e2e.world.approvePaypal(ppA);
  e2e.world.setPaypalCaptureAmount(ppA, { currency_code: "USD", value: "0.99" });
  assert.equal((await e2e.api.paypalCapture(query(a.orderCode, ppA))).status, 302);
  assert.equal(await status(a.orderCode), "pending");
  const rejected = (await events(a.orderCode)).find((e) => e.kind === "paypal_capture_rejected");
  assert.equal(rejected?.detail?.reason, "amount_mismatch");

  const b = await start("tri-tue-khong-nguon-goc");
  const ppB = await paypalId(b.orderCode);
  e2e.world.approvePaypal(ppB);
  e2e.world.setPaypalCaptureAmount(ppB, { currency_code: "EUR", value: "5.99" });
  assert.equal((await e2e.api.paypalCapture(query(b.orderCode, ppB))).status, 302);
  assert.equal(await status(b.orderCode), "pending");
  assert.equal((await events(b.orderCode)).find((e) => e.kind === "paypal_capture_rejected")?.detail?.reason, "currency_mismatch");

  assert.equal((await ledger()).length, 0);
  assert.equal(e2e.world.emails.length, 0);
});

test("PayPal: URL thu tiền sai chữ ký, sai mã hoặc của đơn khác nhà cung cấp đều bị đẩy về trang chủ", async () => {
  const s = await start("troi-sinh");
  const home = `${CFG.site}/?error=order`;
  assert.equal((await e2e.api.paypalCapture(`order=${s.orderCode}&t=${"0".repeat(32)}`)).headers.get("location"), home);
  assert.equal((await e2e.api.paypalCapture(`order=${s.orderCode}`)).headers.get("location"), home);
  assert.equal((await e2e.api.paypalCapture(query(1799999999999999))).headers.get("location"), home);
  assert.equal((await e2e.api.paypalCapture("order=abc&t=x")).headers.get("location"), home);
  const px = (await (await e2e.api.checkoutPayos({ productId: "troi-sinh", email: "a@b.co" })).json()) as { orderCode: number };
  assert.equal((await e2e.api.paypalCapture(query(px.orderCode))).headers.get("location"), home);
  assert.equal(await status(s.orderCode), "pending");
});

test("PayPal: khách bỏ ngang không phê duyệt thì đơn vẫn chờ và có nhật ký lỗi", async () => {
  const s = await start("troi-sinh");
  const pp = await paypalId(s.orderCode);
  assert.equal((await e2e.api.paypalCapture(query(s.orderCode, pp))).status, 302);
  assert.equal(await status(s.orderCode), "pending");
  assert.ok((await events(s.orderCode)).some((e) => e.kind === "error"));
  // Sau đó khách quay lại phê duyệt thật: thu tiền thành công.
  e2e.world.approvePaypal(pp);
  assert.equal((await e2e.api.paypalCapture(query(s.orderCode, pp))).status, 302);
  assert.equal(await status(s.orderCode), "paid");
});

test("PayPal: hai lần thu đồng thời vẫn chỉ giao một lần và ghi sổ một lần", async () => {
  const s = await start("troi-sinh");
  const pp = await paypalId(s.orderCode);
  e2e.world.approvePaypal(pp);
  const [r1, r2] = await Promise.all([e2e.api.paypalCapture(query(s.orderCode, pp)), e2e.api.paypalCapture(query(s.orderCode, pp))]);
  assert.equal(r1.status, 302);
  assert.equal(r2.status, 302);
  assert.equal(await status(s.orderCode), "paid");
  assert.equal(e2e.world.emails.length, 1);
  assert.equal((await ledger()).length, 1);
  assert.equal((await events(s.orderCode)).filter((e) => e.kind === "paid").length, 1);
});

test("PayPal: PayPal lỗi lúc tạo đơn thì khách thấy lỗi, đơn ghi nhận sự cố", async () => {
  e2e.world.faults.paypalCreate = true;
  const s = await start("troi-sinh");
  assert.equal(s.status, 502);
  const [row] = await e2e.q<{ order_code: number }>(`select order_code from store_orders`);
  assert.deepEqual((await events(row.order_code)).map((e) => e.kind), ["created", "error"]);
});

test("PayPal: không đặt PAYPAL_ENV thì chỉ nói chuyện với sandbox; đặt live mới chạm máy chủ thật", async () => {
  const health = (await (await e2e.api.health()).json()) as { modes?: { paypal?: string } };
  assert.equal(health.modes?.paypal, "sandbox");
  const ok = await start("troi-sinh");
  assert.equal(ok.status, 200);
  assert.equal(e2e.world.unexpected.length, 0);
  assert.ok(e2e.world.calls.every((c) => !c.includes("api-m.paypal.com")));

  process.env.PAYPAL_ENV = "live";
  try {
    const live = (await (await e2e.api.health()).json()) as { modes?: { paypal?: string } };
    assert.equal(live.modes?.paypal, "live");
    const res = await e2e.api.checkoutPaypal({ productId: "troi-sinh", email: "a@b.co" });
    assert.equal(res.status, 502); // bản giả không phục vụ máy chủ live, nên đây là bằng chứng nó định gọi máy chủ live
    assert.ok(e2e.world.unexpected.some((u) => u.includes("api-m.paypal.com")));
  } finally {
    delete process.env.PAYPAL_ENV;
  }
});
