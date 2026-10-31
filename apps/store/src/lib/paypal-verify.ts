// Kiểm tra một lần thu tiền PayPal có đúng là của đơn hàng này không.
// Hàm thuần: không gọi mạng, không đọc biến môi trường, để kiểm thử độc lập.

export type PaypalFacts = {
  orderId: string;
  status: string;
  unitCount: number;
  captureCount: number;
  captureStatus: string | null;
  currency: string | null;
  value: string | null;
  referenceId: string | null;
  customId: string | null;
};

export type ExpectedPaypalOrder = {
  orderCode: number;
  /** Mã đơn PayPal do chính server tạo và lưu lúc mở đơn. Không bao giờ lấy từ URL. */
  providerRef: string | null;
  amountUsd: number;
};

export type PaypalVerdict = { ok: true } | { ok: false; reason: string };

function toCents(v: string | null): number | null {
  if (v === null || !/^\d+(\.\d{1,2})?$/.test(v)) return null;
  return Math.round(parseFloat(v) * 100);
}

export function checkPaypalCapture(expected: ExpectedPaypalOrder, facts: PaypalFacts): PaypalVerdict {
  if (!expected.providerRef) return { ok: false, reason: "order_has_no_paypal_ref" };
  if (facts.orderId !== expected.providerRef) return { ok: false, reason: "paypal_order_id_mismatch" };
  if (facts.status !== "COMPLETED") return { ok: false, reason: `paypal_order_status_${facts.status || "unknown"}` };
  if (facts.unitCount !== 1 || facts.captureCount !== 1) return { ok: false, reason: "unexpected_unit_or_capture_count" };
  if (facts.captureStatus !== "COMPLETED") return { ok: false, reason: `paypal_capture_status_${facts.captureStatus ?? "none"}` };
  if (facts.currency !== "USD") return { ok: false, reason: "currency_mismatch" };
  const paid = toCents(facts.value);
  if (paid === null || paid !== Math.round(expected.amountUsd * 100)) return { ok: false, reason: "amount_mismatch" };
  const tag = facts.customId ?? facts.referenceId;
  if (tag !== String(expected.orderCode)) return { ok: false, reason: "order_code_mismatch" };
  return { ok: true };
}
