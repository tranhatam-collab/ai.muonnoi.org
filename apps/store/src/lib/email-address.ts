/**
 * Kiểm tra email đầu vào cho thanh toán và lấy lại link.
 *
 * Chặt hơn regex cũ `^[^\s@]+@[^\s@]+\.[^\s@]+$`: phần tên chỉ nhận ký tự ASCII hợp lệ của RFC 5322 (không dấu phẩy,
 * chấm phẩy, ngoặc nhọn, ngoặc kép, ngoặc đơn), phần miền chỉ nhận nhãn chữ-số-gạch ngang. Nhờ vậy những chuỗi mà bộ phân
 * tích địa chỉ của nodemailer từng hiểu sai (GHSA-8c8m-p3m8-cjg8, GHSA-m943-m63m-w62w, GHSA-85x2-q946-cp5h) không đi
 * tiếp được tới lúc gửi thư, kể cả khi sau này ai đó hạ phiên bản thư viện.
 *
 * Đổi lại, địa chỉ có ký tự ngoài ASCII (EAI) bị từ chối; chấp nhận được vì nhà cung cấp phổ biến ở Việt Nam đều dùng ASCII.
 */
const LOCAL = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/;

export function isSafeEmail(value: string): boolean {
  if (typeof value !== "string" || value.length > 254) return false;
  const v = value.toLowerCase();
  const at = v.indexOf("@");
  if (at < 1 || at !== v.lastIndexOf("@")) return false;
  const local = v.slice(0, at);
  const labels = v.slice(at + 1).split(".");
  if (local.length > 64 || !LOCAL.test(local)) return false;
  if (labels.length < 2 || labels.some((label) => !LABEL.test(label))) return false;
  return TLD.test(labels[labels.length - 1]);
}
