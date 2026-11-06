import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { boot, CFG, type E2E } from "./harness/boot";
import { invalidateFileCache } from "@/lib/storage";

// Lệnh kiểm tra sẵn sàng mở bán phải đỏ đúng chỗ khi thiếu thứ gì, và xanh khi đủ.

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

type Report = { ok: boolean; checks: Array<{ name: string; ok: boolean; level: string; detail: string }> };
const run = async (): Promise<Report> => {
  const res = await e2e.api.preflight(CFG.adminSecret);
  assert.equal(res.status, 200);
  return (await res.json()) as Report;
};
const failing = (r: Report) => r.checks.filter((c) => !c.ok && c.level === "required").map((c) => c.name);

test("preflight: cần khóa quản trị", async () => {
  assert.equal((await e2e.api.preflight()).status, 403);
  assert.equal((await e2e.api.preflight("sai-khoa")).status, 403);
});

test("preflight: cấu hình đủ thì xanh, và không lộ giá trị khóa", async () => {
  const text = JSON.stringify(await run());
  const r = JSON.parse(text) as Report;
  assert.deepEqual(failing(r), []);
  assert.equal(r.ok, true);
  assert.ok(r.checks.some((c) => c.name === "chế độ PayPal" && c.detail.startsWith("sandbox")));
  for (const secret of [CFG.serviceKey, CFG.adminSecret, CFG.downloadSecret, CFG.payos.apiKey, CFG.payos.checksumKey, CFG.paypal.secret, CFG.resendKey]) {
    assert.ok(!text.includes(secret), "báo cáo không được chứa giá trị khóa");
  }
});

test("preflight: thiếu file ebook thì chỉ ra đúng sản phẩm", async () => {
  e2e.world.files.delete("troi-sinh.epub");
  invalidateFileCache();
  const r = await run();
  assert.equal(r.ok, false);
  assert.deepEqual(failing(r), ["kho file ebooks"]);
  const detail = r.checks.find((c) => c.name === "kho file ebooks")!.detail;
  assert.match(detail, /troi-sinh/);
  assert.match(detail, /bo-5-cuon/);
});

test("preflight: chưa áp migration 0002 hoặc 0003 thì đỏ đúng mục", async () => {
  await e2e.q(`alter function public.engine_rate_limit_hit(text, integer, integer) rename to engine_rate_limit_hit_off`);
  try {
    assert.deepEqual(failing(await run()), ["migration 0002"]);
  } finally {
    await e2e.q(`alter function public.engine_rate_limit_hit_off(text, integer, integer) rename to engine_rate_limit_hit`);
  }
  await e2e.q(`alter table public.engine_revenue rename column refund_of_order_id to refund_of_order_id_off`);
  try {
    assert.deepEqual(failing(await run()), ["migration 0003"]);
  } finally {
    await e2e.q(`alter table public.engine_revenue rename column refund_of_order_id_off to refund_of_order_id`);
  }
  assert.equal((await run()).ok, true);
});

test("preflight: RLS bị tắt thì báo nguy hiểm", async () => {
  await e2e.q(`alter table public.engine_settings disable row level security`);
  try {
    const r = await run();
    assert.equal(r.ok, false);
    assert.ok(failing(r).includes("RLS"));
  } finally {
    await e2e.q(`alter table public.engine_settings enable row level security`);
  }
});

test("preflight: khóa bí mật yếu hoặc trùng nhau, địa chỉ không phải https đều bị chặn", async () => {
  const saved = { dl: process.env.DOWNLOAD_SECRET, site: process.env.NEXT_PUBLIC_SITE_URL };
  try {
    process.env.DOWNLOAD_SECRET = "ngan";
    assert.ok(failing(await run()).includes("khóa ký link tải"));
    process.env.DOWNLOAD_SECRET = CFG.adminSecret.padEnd(40, "x");
    process.env.ADMIN_SECRET = process.env.DOWNLOAD_SECRET;
    const res = await e2e.api.preflight(process.env.ADMIN_SECRET);
    assert.ok(((await res.json()) as Report).checks.some((c) => c.name === "khóa bí mật" && !c.ok));
  } finally {
    process.env.DOWNLOAD_SECRET = saved.dl;
    process.env.ADMIN_SECRET = CFG.adminSecret;
  }
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  try {
    assert.ok(failing(await run()).includes("địa chỉ cửa hàng"));
  } finally {
    process.env.NEXT_PUBLIC_SITE_URL = saved.site;
  }
});

test("preflight: không có cổng thanh toán nào thì đỏ; thiếu email chỉ là lời khuyên", async () => {
  const saved = { id: process.env.PAYOS_CLIENT_ID, pp: process.env.PAYPAL_CLIENT_ID, mail: process.env.RESEND_API_KEY };
  try {
    delete process.env.RESEND_API_KEY;
    let r = await run();
    assert.equal(r.ok, true); // thiếu email không làm đỏ
    assert.equal(r.checks.find((c) => c.name === "email giao sách")?.ok, false);
    delete process.env.PAYOS_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_ID;
    r = await run();
    assert.ok(failing(r).includes("cổng thanh toán"));
  } finally {
    process.env.PAYOS_CLIENT_ID = saved.id;
    process.env.PAYPAL_CLIENT_ID = saved.pp;
    process.env.RESEND_API_KEY = saved.mail;
  }
});
