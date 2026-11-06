import test from "node:test";
import assert from "node:assert/strict";
import { createDownloadToken, parseDownloadToken, signOrder, verifyOrderToken } from "./tokens";

const SECRET = "unit-test-secret-unit-test-secret-0123456789";
process.env.DOWNLOAD_SECRET = SECRET;

const flip = (s: string) => s.slice(0, -1) + (s.endsWith("A") ? "B" : "A");

test("token đơn hàng gắn đúng mã đơn", () => {
  const t = signOrder(179000000000001);
  assert.equal(verifyOrderToken(179000000000001, t), true);
  assert.equal(verifyOrderToken("179000000000001", t), true);
  assert.equal(verifyOrderToken(179000000000002, t), false);
  assert.equal(verifyOrderToken(179000000000001, null), false);
  assert.equal(verifyOrderToken(179000000000001, ""), false);
  assert.equal(verifyOrderToken(179000000000001, flip(t)), false);
});

test("token đơn hàng có hạn: hết hạn, sửa hạn, hoặc định dạng cũ đều bị từ chối", () => {
  const code = 179000000000001;
  assert.equal(verifyOrderToken(code, signOrder(code, 30)), true);
  assert.equal(verifyOrderToken(code, signOrder(code, -1)), false); // đã hết hạn
  const t = signOrder(code, 1);
  const [exp, sig] = t.split(".");
  const longer = (parseInt(exp, 36) + 86400 * 365).toString(36);
  assert.equal(verifyOrderToken(code, `${longer}.${sig}`), false); // kéo dài hạn mà không có khóa ký
  assert.equal(verifyOrderToken(code, `${exp}.`), false);
  assert.equal(verifyOrderToken(code, `.${sig}`), false);
  assert.equal(verifyOrderToken(code, sig), false); // định dạng cũ không có hạn
  assert.equal(verifyOrderToken(code, "zzzzzzzzzzzz.abc"), false);
  assert.match(t, /^[0-9a-z]+\.[A-Za-z0-9_-]{32}$/);
});

test("đổi khóa bí mật thì token cũ hết hiệu lực", () => {
  const t = signOrder(1);
  process.env.DOWNLOAD_SECRET = "another-secret-another-secret-another-secret-1";
  assert.equal(verifyOrderToken(1, t), false);
  process.env.DOWNLOAD_SECRET = SECRET;
  assert.equal(verifyOrderToken(1, t), true);
});

test("link tải: ký xong đọc lại đúng nội dung", () => {
  const c = parseDownloadToken(createDownloadToken(179000000000001, "troi-sinh"));
  assert.ok(c);
  assert.equal(c.o, 179000000000001);
  assert.equal(c.p, "troi-sinh");
  assert.ok(c.exp > Date.now());
});

test("link tải hết hạn bị từ chối", () => {
  assert.equal(parseDownloadToken(createDownloadToken(1, "x", -1)), null);
});

test("link tải bị sửa nội dung hoặc chữ ký thì từ chối", () => {
  const [payload, sig] = createDownloadToken(1, "99-thong-diep-song").split(".");
  const forged = Buffer.from(JSON.stringify({ o: 1, p: "bo-5-cuon", exp: Date.now() + 1e9 })).toString("base64url");
  assert.equal(parseDownloadToken(`${forged}.${sig}`), null);
  assert.equal(parseDownloadToken(`${payload}.${flip(sig)}`), null);
  for (const bad of [`${payload}.`, "", "abc", "a.b.c", "."]) assert.equal(parseDownloadToken(bad), null, bad);
});

test("thiếu khóa bí mật thì không ký bằng khóa rỗng", () => {
  delete process.env.DOWNLOAD_SECRET;
  assert.throws(() => signOrder(1));
  assert.equal(verifyOrderToken(1, "x"), false);
  process.env.DOWNLOAD_SECRET = SECRET;
});
