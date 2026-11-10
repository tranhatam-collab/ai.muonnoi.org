import test from "node:test";
import assert from "node:assert/strict";
import { isSafeEmail } from "./email-address";

test("email thật được chấp nhận, kể cả dấu cộng, dấu chấm, nháy đơn và miền punycode", () => {
  for (const ok of [
    "a@b.co",
    "reader@example.com",
    "first.last+tag@sub.example.vn",
    "o'brien@example.ie",
    "user_name-1@mail-server.example.org",
    "x@example.xn--p1ai",
    "READER@Example.COM",
  ]) assert.equal(isSafeEmail(ok), true, ok);
});

test("ba dạng chuỗi gây sai người nhận trong nodemailer < 10.1.4 bị từ chối", () => {
  assert.equal(isSafeEmail('"a;b"@evil.co'), false); // chấm phẩy và nháy kép
  assert.equal(isSafeEmail("victim,attacker@evil.co"), false); // dấu phẩy: hai người nhận
  assert.equal(isSafeEmail("x>y@evil.co"), false); // ngoặc nhọn đóng sớm
  assert.equal(isSafeEmail("x<y@evil.co"), false);
  assert.equal(isSafeEmail("a(comment)@evil.co"), false); // ghi chú lồng
  assert.equal(isSafeEmail("a;b@evil.co"), false);
});

test("hình dạng sai bị từ chối", () => {
  for (const bad of [
    "",
    "a",
    "a@",
    "@b.co",
    "a@b",
    "a@b.c",
    "a@b.c0",
    "a b@c.co",
    "a@b .co",
    "a@b@c.co",
    ".a@b.co",
    "a.@b.co",
    "a..b@c.co",
    "a@-b.co",
    "a@b-.co",
    "a@b..co",
    "a@b.co.",
    "tâm@example.com",
    "a@ví-dụ.vn",
    "a@b.co\r\nBcc: x@y.zz",
    "a@[127.0.0.1]",
    `${"a".repeat(65)}@b.co`,
    `a@${"b".repeat(64)}.co`,
    `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}.com`, // dài hơn 254
  ]) assert.equal(isSafeEmail(bad), false, JSON.stringify(bad));
});

test("giới hạn đúng ở 64 ký tự phần tên và 254 ký tự toàn chuỗi", () => {
  assert.equal(isSafeEmail(`${"a".repeat(64)}@b.co`), true);
  const long = `a@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}.${"e".repeat(55)}.com`; // 2 + 63*3 + 55 + 4 + 3 = 253
  assert.equal(long.length <= 254, true);
  assert.equal(isSafeEmail(long), true);
});
