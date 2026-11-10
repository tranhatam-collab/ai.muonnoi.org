# Bằng chứng tái hiện của báo cáo 06

Các script này chứng minh từng phát hiện trong `../06_AUDIT_VA_KE_HOACH_HOAN_THIEN.md`. Tất cả chạy cục bộ, không gọi dịch vụ thật, không ghi vào repo. Mã được kiểm là nhánh `codex/ai-muonnoi-autonomous-ops` (chứa trọn PR #1 và #2); script không sửa gì ở đó.

## Chuẩn bị (một lần)

```bash
git fetch origin
git worktree add --detach /tmp/ops origin/codex/ai-muonnoi-autonomous-ops
cd /tmp/ops
npm ci --prefix workers/revenueops && npm ci --prefix workers/api
node tools/bundle-api.mjs      # tạo .local/api-worker.mjs (Worker thật, đã bundle)
node tools/build.mjs           # tạo dist/site (gói công khai)
```

Cần Node 22 trở lên. Script trình duyệt cần `playwright` và Chromium.

## Chạy

| Phát hiện | Lệnh (từ thư mục này) | Kết quả ngày 10/11/2026 |
|---|---|---|
| F5 chuỗi migration | `node --disable-warning=ExperimentalWarning apply-d1-chain.mjs /tmp/ops/workers/api/migrations --continue` | 12/13 áp được; `0006_v1_security.sql` lỗi `no such column: password_hash` |
| F1–F4 lỗi API | `node --disable-warning=ExperimentalWarning audit-repro.mjs /tmp/ops` | xem bảng dưới |
| A1 chiếm tài khoản bằng đăng ký trước (R5) | `node --disable-warning=ExperimentalWarning audit-repro-auth.mjs /tmp/ops` | cùng một user id cho cả kẻ tấn công và chủ email; cookie cũ và mật khẩu của kẻ tấn công vẫn dùng được |
| Thư xác nhận (âm tính) | `node --disable-warning=ExperimentalWarning audit-repro-mail.mjs /tmp/ops 400` | 8/8 thư tới nhà cung cấp: không tái hiện được lỗi nghi ngờ |
| F6 CSP chặn script inline | `node csp-inline.cjs /tmp/ops/dist/site` | 8/20 trang bị chặn |
| Duyệt toàn bộ trang công khai | `node browser-e2e.cjs /tmp/ops/dist/site` | 40/40 lượt trả 200; 8 trang bị CSP chặn script inline; 3 trang Studio/Intake nhận 404 ở `/api/*` |

`audit-repro.mjs` chạy Worker thật trong workerd (Miniflare) với D1 dùng một lần. Bảng thanh toán lấy từ migration 0008 và 0009 thật; bảng `users`, `sessions`, `rate_limits` dựng theo trạng thái cuối mà migration 0006 định tạo (vì 0006 không chạy được từ đầu).

| Mã | Đầu ra hiện tại (lỗi còn) | Đầu ra mong muốn sau khi sửa |
|---|---|---|
| R1 | đăng nhập bằng mật khẩu gieo trả 200, vai trò `admin` | 401 |
| R2a | `401 ×10` rồi `429 ×2` cho cùng một email từ 12 IP khác nhau | người thật vẫn đăng nhập được khi kẻ khác thử sai; khóa tính theo IP và theo lần sai |
| R2b | 30 email từ một IP chỉ ra `401` | đến một ngưỡng thì `429` theo IP |
| R3a | sự kiện cho intent không tồn tại trả 200 và tiêu biên nhận | 404 hoặc 409, không tiêu biên nhận |
| R3b | `completed` rồi `failed` muộn → `failed` | giữ `completed` |
| R3c | số tiền 1.000 cho intent 1.500.000 vẫn `completed` | từ chối hoặc đánh dấu lệch tiền |
| R4 | tạo intent không đăng nhập, `amount: 1`, `returnUrl` lạ được chuyển nguyên cho nhà cung cấp; xem intent không cần đăng nhập | số tiền theo danh mục phía server, `returnUrl` lạ bị 400, xem intent cần xác thực |
| R5 | đăng ký trước bằng email người khác rồi chủ email đăng nhập bằng magic link: cùng một tài khoản, kẻ tấn công còn phiên và mật khẩu | đăng ký không cấp phiên cho tới khi xác minh email; đăng nhập vào hàng chưa xác minh xóa mật khẩu và phiên cũ |

Sau khi sửa, nên chuyển các dòng R1–R5 thành test hồi quy trong CI (bước 2.1–2.4 của kế hoạch).
