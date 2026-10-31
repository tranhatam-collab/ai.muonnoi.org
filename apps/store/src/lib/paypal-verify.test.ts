import test from "node:test";
import assert from "node:assert/strict";
import { checkPaypalCapture, type ExpectedPaypalOrder, type PaypalFacts } from "./paypal-verify";

const expected: ExpectedPaypalOrder = { orderCode: 179000000000001, providerRef: "PP-ORDER-A", amountUsd: 16.99 };
const good: PaypalFacts = {
  orderId: "PP-ORDER-A",
  status: "COMPLETED",
  unitCount: 1,
  captureCount: 1,
  captureStatus: "COMPLETED",
  currency: "USD",
  value: "16.99",
  referenceId: "179000000000001",
  customId: "179000000000001",
};
const verdict = (facts: Partial<PaypalFacts>, exp: Partial<ExpectedPaypalOrder> = {}) => {
  const v = checkPaypalCapture({ ...expected, ...exp }, { ...good, ...facts });
  return v.ok ? "ok" : v.reason;
};

test("đúng đơn, đúng tiền, đúng tiền tệ thì chấp nhận", () => {
  assert.equal(verdict({}), "ok");
});

test("tấn công: dùng chứng từ PayPal của đơn rẻ để mở đơn đắt", () => {
  // Kẻ tấn công trả 2,99 USD cho đơn B, rồi gắn mã đơn PayPal của B vào URL trả về của đơn A.
  const fromOrderB: Partial<PaypalFacts> = { orderId: "PP-ORDER-B", value: "2.99", customId: "179000000000002", referenceId: "179000000000002" };
  assert.equal(verdict(fromOrderB), "paypal_order_id_mismatch");
});

test("tấn công: mã đơn PayPal đúng nhưng số tiền thu được thấp hơn", () => {
  assert.equal(verdict({ value: "2.99" }), "amount_mismatch");
});

test("số tiền thu nhiều hơn cũng không tự động chấp nhận", () => {
  assert.equal(verdict({ value: "20.00" }), "amount_mismatch");
});

test("giá trị tiền không hợp lệ bị từ chối", () => {
  for (const value of ["16.999", "abc", "-16.99", "", null]) assert.equal(verdict({ value }), "amount_mismatch");
});

test("không bị lỗi số thực với các mức giá thật của cửa hàng", () => {
  for (const [usd, text] of [[4.99, "4.99"], [5.99, "5.99"], [2.99, "2.99"], [3.99, "3.99"], [16.99, "16.99"]] as const) {
    assert.equal(verdict({ value: text }, { amountUsd: usd }), "ok", text);
  }
});

test("sai tiền tệ bị từ chối", () => {
  assert.equal(verdict({ currency: "EUR" }), "currency_mismatch");
  assert.equal(verdict({ currency: null }), "currency_mismatch");
});

test("đơn hoặc lần thu chưa COMPLETED bị từ chối", () => {
  assert.equal(verdict({ status: "APPROVED" }), "paypal_order_status_APPROVED");
  assert.equal(verdict({ captureStatus: "PENDING" }), "paypal_capture_status_PENDING");
});

test("không có lần thu nào, hoặc nhiều hơn một, bị từ chối", () => {
  assert.equal(verdict({ captureCount: 0, captureStatus: null }), "unexpected_unit_or_capture_count");
  assert.equal(verdict({ captureCount: 2 }), "unexpected_unit_or_capture_count");
  assert.equal(verdict({ unitCount: 2 }), "unexpected_unit_or_capture_count");
});

test("mã đơn trong dữ liệu PayPal không khớp thì từ chối", () => {
  assert.equal(verdict({ customId: "1", referenceId: "1" }), "order_code_mismatch");
});

test("chỉ có reference_id vẫn đối chiếu được", () => {
  assert.equal(verdict({ customId: null }), "ok");
  assert.equal(verdict({ customId: null, referenceId: "2" }), "order_code_mismatch");
});

test("đơn chưa có mã PayPal đã lưu thì từ chối", () => {
  assert.equal(verdict({}, { providerRef: null }), "order_has_no_paypal_ref");
});
