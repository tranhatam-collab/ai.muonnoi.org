import test from "node:test";
import assert from "node:assert/strict";
import { safeFileName } from "./filename";

test("tên file giữ đủ chữ khi bỏ dấu, kể cả Đ và đ", () => {
  assert.equal(safeFileName("99 Thông Điệp Sống", "x"), "99-Thong-Diep-Song");
  assert.equal(safeFileName("Từ 0 Đến Không Giới Hạn", "x"), "Tu-0-Den-Khong-Gioi-Han");
  assert.equal(safeFileName("Tận Cùng Một Cuộc Sống", "x"), "Tan-Cung-Mot-Cuoc-Song");
  assert.equal(safeFileName("Trồi Sinh", "x"), "Troi-Sinh");
  assert.equal(safeFileName("đường đi", "x"), "duong-di");
});

test("tên tiếng Anh giữ nguyên, ký tự lạ bị bỏ, rỗng thì dùng tên dự phòng", () => {
  assert.equal(safeFileName("From Zero to Infinite", "x"), "From-Zero-to-Infinite");
  assert.equal(safeFileName('Sách: "A/B" <script>', "x"), "Sach-AB-script");
  assert.equal(safeFileName("!!!", "bo-5-cuon"), "bo-5-cuon");
  assert.equal(safeFileName("   ", "bo-5-cuon"), "bo-5-cuon");
});
