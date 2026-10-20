export function formatVND(amount: number | null | undefined): string {
  if (amount == null) return "";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
}

export function formatUSD(amount: number | null | undefined): string {
  if (amount == null) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

/** Mã đơn: 15 chữ số, tăng dần theo thời gian, an toàn cho payOS (số nguyên < 2^53). */
export function newOrderCode(): number {
  return Date.now() * 100 + Math.floor(Math.random() * 100);
}
