/**
 * Tên file tải về: bỏ dấu tiếng Việt, giữ chữ và số, nối bằng gạch ngang.
 * Đ/đ không phân rã được trong Unicode (NFD), nên phải đổi riêng, nếu không "Điệp" thành "iep".
 */
export function safeFileName(title: string, fallback: string): string {
  const base = title
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 _-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return base || fallback;
}
