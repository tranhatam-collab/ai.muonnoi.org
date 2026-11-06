// Đăng ký URL webhook với payOS qua route quản trị của cửa hàng.
// Dùng: SITE_URL=https://sach-muonnoi.vercel.app ADMIN_SECRET=... node scripts/confirm-payos-webhook.mjs
const site = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
const secret = process.env.ADMIN_SECRET;
if (!site || !secret) {
  console.error("Cần SITE_URL và ADMIN_SECRET.");
  process.exit(1);
}
const res = await fetch(`${site}/api/admin/payos/confirm-webhook`, { method: "POST", headers: { "x-admin-secret": secret } });
console.log(res.status, await res.text());
