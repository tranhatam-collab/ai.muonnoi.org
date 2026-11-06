import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { boot, CFG, type E2E } from "./harness/boot";
import { signOrder } from "@/lib/tokens";

// Lấy lại link tải qua email và token trang đơn hàng có hạn dùng.

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
const GENERIC = { ok: true, message: "Nếu email này có đơn đã thanh toán, chúng tôi vừa gửi link tải mới vào đó." };

async function buy(productId: string, amount: number, email: string): Promise<number> {
  const res = (await (await e2e.api.checkoutPayos({ productId, email })).json()) as { orderCode: number };
  await e2e.api.payosWebhook(await e2e.world.payosWebhook({ orderCode: res.orderCode, amount, paymentLinkId: `pl_${res.orderCode}`, code: "00", desc: "ok" }));
  return res.orderCode;
}
const pageLinks = (emailIndex: number) => e2e.world.emails[emailIndex].links.filter((l) => l.includes("/cam-on?order="));

test("lấy lại link: email đúng nhận được link trang đơn hàng dùng được ngay", async () => {
  const code = await buy("troi-sinh", 119000, "reader@example.com");
  assert.equal(e2e.world.emails.length, 1);
  assert.match(e2e.world.emails[0].text, /dùng được 90 ngày/);
  assert.ok(e2e.world.emails[0].links.some((l) => l === `${CFG.site}/lay-lai-link`));

  const res = await e2e.api.resend({ email: "  Reader@Example.com " }, ip("203.0.113.1"));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), GENERIC);
  assert.equal(e2e.world.emails.length, 2);
  const mail = e2e.world.emails[1];
  assert.deepEqual(mail.to, ["reader@example.com"]);
  assert.equal(mail.subject, "Link tải sách của bạn");
  const link = pageLinks(1)[0];
  assert.ok(link, "email phải có link trang đơn hàng");

  // Link trong email mở được trang đơn hàng và cấp link tải mới.
  const t = new URL(link).searchParams.get("t");
  const page = (await (await e2e.api.order(code, t)).json()) as { status: string; links: Array<{ url: string }> };
  assert.equal(page.status, "paid");
  assert.equal(page.links.length, 1);
  const dl = await e2e.api.download(page.links[0].url.split("/api/download/")[1]);
  assert.equal(dl.status, 200);
  assert.ok((await e2e.q(`select 1 from store_order_events where kind = 'links_resent'`)).length === 1);
});

test("lấy lại link: trả cùng một nội dung dù email có đơn hay không, nên không dò được người mua", async () => {
  await buy("troi-sinh", 119000, "reader@example.com");
  const before = e2e.world.emails.length;
  const known = await e2e.api.resend({ email: "reader@example.com" }, ip("203.0.113.2"));
  const unknown = await e2e.api.resend({ email: "nguoi-la@example.com" }, ip("203.0.113.3"));
  assert.equal(known.status, unknown.status);
  assert.deepEqual(await known.json(), await unknown.json());
  assert.equal(e2e.world.emails.length, before + 1); // chỉ email có đơn mới thật sự nhận thư
  assert.ok(!e2e.world.emails.some((m) => m.to.includes("nguoi-la@example.com")));
});

test("lấy lại link: chỉ đơn đã trả; đơn chờ hoặc đã hoàn tiền không được gửi", async () => {
  const email = "mixed@example.com";
  await e2e.api.checkoutPayos({ email, productId: "troi-sinh" }); // đơn chờ
  const refunded = await buy("tri-tue-khong-nguon-goc", 119000, email);
  await e2e.api.adminRefund(refunded, CFG.adminSecret);
  const before = e2e.world.emails.length;
  assert.equal((await e2e.api.resend({ email }, ip("203.0.113.4"))).status, 200);
  assert.equal(e2e.world.emails.length, before);

  const paid = await buy("99-thong-diep-song", 49000, email);
  assert.equal((await e2e.api.resend({ email }, ip("203.0.113.5"))).status, 200);
  const links = pageLinks(e2e.world.emails.length - 1);
  assert.deepEqual(links.map((l) => new URL(l).searchParams.get("order")), [String(paid)]);
});

test("lấy lại link: nhiều đơn thì gộp vào một email, tối đa 3 đơn mới nhất", async () => {
  const email = "fan@example.com";
  const codes = [] as number[];
  for (const [id, amount] of [["troi-sinh", 119000], ["tri-tue-khong-nguon-goc", 119000], ["99-thong-diep-song", 49000], ["tu-0-den-khong-gioi-han", 99000]] as const) {
    codes.push(await buy(id, amount, email));
  }
  const before = e2e.world.emails.length;
  assert.equal((await e2e.api.resend({ email }, ip("203.0.113.6"))).status, 200);
  assert.equal(e2e.world.emails.length, before + 1);
  const shown = pageLinks(e2e.world.emails.length - 1).map((l) => Number(new URL(l).searchParams.get("order")));
  assert.deepEqual(shown.sort(), codes.slice(1).sort()); // bỏ đơn cũ nhất
});

test("lấy lại link: email lỗi vẫn trả 200 chung và ghi nhật ký, không lộ gì", async () => {
  const code = await buy("troi-sinh", 119000, "reader@example.com");
  e2e.world.faults.resend = true;
  const res = await e2e.api.resend({ email: "reader@example.com" }, ip("203.0.113.7"));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), GENERIC);
  const kinds = (await e2e.q<{ kind: string }>(`select kind from store_order_events where order_id = (select id from store_orders where order_code = $1) order by id`, [code])).map((r) => r.kind);
  assert.ok(kinds.includes("links_resend_failed"));
});

test("lấy lại link: kiểm tra đầu vào", async () => {
  assert.equal((await e2e.api.resend({ email: "khong-phai-email" }, ip("203.0.113.8"))).status, 400);
  assert.equal((await e2e.api.resend({}, ip("203.0.113.8"))).status, 400);
  assert.equal((await e2e.api.resend({ email: 123 }, ip("203.0.113.8"))).status, 400);
  assert.equal((await e2e.api.resendRaw("{hỏng")).status, 400);
});

test("lấy lại link: giới hạn 3 lần mỗi ngày cho một email và 5 lần mỗi giờ cho một IP", async () => {
  // Cùng một email từ nhiều IP khác nhau: lần thứ 4 bị chặn.
  for (let i = 0; i < 3; i++) assert.equal((await e2e.api.resend({ email: "victim@example.com" }, ip(`198.51.100.${10 + i}`))).status, 200);
  const blocked = await e2e.api.resend({ email: "victim@example.com" }, ip("198.51.100.99"));
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get("retry-after"), "86400");

  // Cùng một IP với nhiều email khác nhau: lần thứ 6 bị chặn.
  for (let i = 0; i < 5; i++) assert.equal((await e2e.api.resend({ email: `u${i}@example.com` }, ip("203.0.113.50"))).status, 200);
  assert.equal((await e2e.api.resend({ email: "u9@example.com" }, ip("203.0.113.50"))).status, 429);
});

test("token trang đơn hàng: hết hạn thì bị từ chối, sửa hạn dùng thì bị từ chối", async () => {
  const code = await buy("troi-sinh", 119000, "reader@example.com");
  assert.equal((await e2e.api.order(code, signOrder(code))).status, 200);
  assert.equal((await e2e.api.order(code, signOrder(code, -1))).status, 403);
  const [exp, sig] = signOrder(code, 1).split(".");
  const stretched = `${(parseInt(exp, 36) + 86400 * 400).toString(36)}.${sig}`;
  assert.equal((await e2e.api.order(code, stretched)).status, 403);
  // Token của đơn khác, dù còn hạn, không dùng được.
  const other = await buy("99-thong-diep-song", 49000, "other@example.com");
  assert.equal((await e2e.api.order(code, signOrder(other))).status, 403);
});

test("hạn dùng token đọc từ ORDER_TOKEN_TTL_DAYS", async () => {
  process.env.ORDER_TOKEN_TTL_DAYS = "7";
  try {
    await buy("troi-sinh", 119000, "reader@example.com");
    assert.match(e2e.world.emails[0].text, /dùng được 7 ngày/);
    const t = new URL(pageLinks(0)[0]).searchParams.get("t")!;
    const days = (parseInt(t.split(".")[0], 36) * 1000 - Date.now()) / 86400_000;
    assert.ok(days > 6.99 && days <= 7.01, `hạn còn ${days} ngày`);
  } finally {
    delete process.env.ORDER_TOKEN_TTL_DAYS;
  }
});
