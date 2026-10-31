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
