# Script kiểm tra chạy lại được (báo cáo 06)

Các script này chạy cục bộ, không gọi dịch vụ thật, không ghi vào repo. Mã được kiểm là nhánh `codex/ai-muonnoi-autonomous-ops` (chứa trọn PR #1 và #2); script không sửa gì ở đó. Mã tái hiện các phát hiện bảo mật không nằm ở đây (xem ghi chú đầu `../06_KIEM_TRA_CHEO_VA_KE_HOACH_HOP_NHAT.md`).

## Chuẩn bị (một lần)

```bash
git fetch origin
git worktree add --detach /tmp/ops origin/codex/ai-muonnoi-autonomous-ops
cd /tmp/ops
npm ci --prefix workers/revenueops && npm ci --prefix workers/api
node tools/build.mjs           # tạo dist/site (gói công khai)
```

Cần Node 22 trở lên. Script trình duyệt cần `playwright` và Chromium.

## Chạy

| Kiểm tra | Lệnh (từ thư mục này) | Kết quả ngày 10/11/2026 |
|---|---|---|
| F5 chuỗi migration D1 áp từ DB rỗng | `node --disable-warning=ExperimentalWarning apply-d1-chain.mjs /tmp/ops/workers/api/migrations --continue` | 12/13 áp được; `0006_v1_security.sql` lỗi `no such column: password_hash` |
| F6 trang bị CSP chặn script inline | `node csp-inline.cjs /tmp/ops/dist/site` | 8/20 trang bị chặn |
| Duyệt toàn bộ trang công khai (phone + desktop, áp `_headers`) | `node browser-e2e.cjs /tmp/ops/dist/site` | 40/40 lượt trả 200; 8 trang bị CSP chặn script inline; 3 trang Studio/Intake nhận 404 ở `/api/*` |

Sau khi sửa F5 và F6, hai kết quả đầu phải đổi thành 13/13 áp được và 0/20 trang bị chặn; nên đưa cả ba vào CI (bước 1.3 của kế hoạch).
