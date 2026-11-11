# 10 · Kiểm toán bảo mật và bí mật của CI/CD (Giai đoạn F)

Phạm vi: bí mật, quyền của pipeline và bề mặt xuất bản. **Không** gồm lỗ hổng mức ứng dụng của API Worker và cửa hàng: các phát hiện đó được giao riêng cho Owner vì repo này công khai, và không nêu ở đây.

## 1. Kết quả quét

| Kiểm tra | Phạm vi | Kết quả |
|---|---|---|
| Mẫu khóa (Stripe-kiểu `sk_live`, `sk-ant`, `ghp_`, `github_pat_`, `AKIA`, `xox`, khóa riêng PEM, JWT, `AIza`, `re_`, `SG.`) trong tệp được theo dõi | 4 cây: `main`, ops, PR #4, cây ghép | 0 khớp |
| Cùng mẫu trong log của bốn lần chạy `local-verify` | 180 KB | 0 khớp |
| Cùng mẫu trong artifact build `dist/site` | cây ops, cây ghép | 0 khớp |
| Tệp môi trường được theo dõi | 4 cây | chỉ `.env.example` (gốc: 4 biến cấu hình; cửa hàng: danh sách tên ở mục 2); không `.env`, `.dev.vars`, `.pem`, `.p12` |
| Workflow GitHub Actions dùng bí mật | không có workflow | không áp dụng |

Công cụ: `scripts/ci/local-verify.sh` (bước `secret-patterns`, `tracked-env-files`) và `grep` thủ công trên log và `dist/site`. Chỉ in tên tệp khi khớp, không in nội dung.

## 2. Bí mật theo tên (không đọc giá trị)

| Nơi | Tên |
|---|---|
| API Worker (khai trong `workers/api/wrangler.toml`) | `PAY_IAI_ONE_API_KEY`, `PAYMENT_WEBHOOK_SECRET`, `MAIL_API_KEY`, `INTERNAL_EMAIL_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_STATE_SECRET`; mã còn đọc `MAGIC_LINK_SECRET`, `PUBLISH_API_TOKEN`, `SESSION_SECRET`, `FLOW_API_KEY`, `AI_API_KEY` |
| Cửa hàng (`apps/store/.env.example`; đặt trên Vercel) | `SUPABASE_SERVICE_ROLE_KEY`, `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `DOWNLOAD_SECRET`, `RESEND_API_KEY`, `GMAIL_APP_PASSWORD`, `ADMIN_SECRET` (tên biến công khai: `NEXT_PUBLIC_*`) |
| Cloudflare Pages | không biết (BLOCKED); trang tĩnh không cần bí mật runtime |

## 3. Quyền của pipeline

- Không có workflow nên không có `GITHUB_TOKEN` nào được cấp cho job; không có `pull_request_target`, `workflow_run`, hành động bên thứ ba.
- Mẫu workflow (không hoạt động) đặt `permissions: contents: read`, `persist-credentials: false`, không dùng bí mật.
- Chính sách `workflow-policy` cảnh báo `pull_request_target` và `workflow_run`, và chặn `schedule` cùng runner lớn.
- Cloudflare Pages và Vercel xây mã của PR trên hạ tầng của họ; nếu dự án đặt biến môi trường production cho **preview**, mã PR có thể đọc chúng. Cần Owner xác nhận biến nào đang bật cho preview (BLOCKED với Pages; với Vercel đã tắt preview).

## 4. Mã không tin cậy

`local-verify.sh` không đọc biến bí mật và không in môi trường, nhưng các lệnh nó chạy (`npm ci`, `npm test`, `next build`, script của repo) thực thi mã của cây đang kiểm. Vì vậy: **chỉ chạy trên cây đã được người tin cậy xem, hoặc trên máy không giữ bí mật**. Không chạy mã PR từ nguồn lạ trên máy chứa khóa.

## 5. Bề mặt xuất bản

- `dist/site` từ ops: 43 tệp theo danh sách cho phép; không có `apps/`, `supabase/`, `engine/`, `workers/`, `tools/`, `tests/`, `operations/`; `docs/` chỉ `index.html` (bước `pages-surface`).
- Cây #1/#4 đặt Pages output là `.` (cảnh báo `pages-output-dir`): xuất bản cả thư mục gốc của repo công khai. Không dùng cấu hình này cho production.
- Repo công khai nên mọi nội dung đã commit là công khai. Một số **định danh** (ID tài khoản Cloudflare, ID cơ sở dữ liệu D1) xuất hiện trong cấu hình hoặc tài liệu của các nhánh khác. Chúng không phải khóa bí mật, nhưng là phơi bày không cần thiết; đề xuất Owner chuyển bằng chứng vận hành sang repo riêng tư (`AP-EVIDENCE-STORE` của nhóm ops). Không chép các ID đó vào hồ sơ này.

## 6. Việc cần Owner

1. Xoay `DOWNLOAD_SECRET` và `ADMIN_SECRET` trước khi mở bán (kế hoạch Money Engine đã ghi).
2. Xác nhận biến môi trường nào của Pages và Vercel bật cho preview.
3. Quyết định chuyển bằng chứng vận hành chứa định danh sang repo riêng tư.
