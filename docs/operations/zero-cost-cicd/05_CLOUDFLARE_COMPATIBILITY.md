# 05 · Tương thích Cloudflare (Giai đoạn C, tuyến A và B)

Nguồn: đọc cấu hình và mã trong các cây ops `cc8ac68` và PR #4 `772bd99`, 2026-11-11.
**Giới hạn gói Free/Paid của Cloudflare: UNVERIFIED.** Môi trường này không phân giải được `developers.cloudflare.com` và `docs.github.com` (lỗi DNS khi thử đọc; không điền số từ trí nhớ). Danh sách trang cần đọc lại ở cuối tệp.

## 1. Trang tĩnh → Cloudflare Pages (tuyến A)

| Kiểm tra | Kết quả | Nhãn |
|---|---|---|
| Cấu hình | `wrangler.json`: `name: ai-muonnoi-org`, `compatibility_date: 2026-03-17`, `pages_build_output_dir: dist/site` (ops/#2). Trên `main`/#3 là TOML Worker; trên #1/#4 là `.` | VERIFIED |
| Build | `node tools/build.mjs` → `dist/site`; 43 tệp, 348 031 byte, lớn nhất 29 217 byte; `tools/build.mjs` chỉ sao chép danh sách cho phép (10 thư mục + 6 tệp gốc), bỏ symlink và tệp ẩn | VERIFIED (`evidence/local-verify-cc8ac689ed80.json`) |
| Rò rỉ ra gói công khai | không có `apps/`, `supabase/`, `engine/`, `workers/`, `tools/`, `tests/`, `operations/`; `docs/` chỉ có `index.html` | VERIFIED (bước `pages-surface`) |
| Functions, `_redirects`, `_routes.json` | không có | VERIFIED |
| `_headers` | có: `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP, CORP, CSP (`script-src 'self'`); không có HSTS | VERIFIED |
| Hành vi trang | 8/20 trang dùng script inline bị chính CSP chặn; ba trang Studio/Intake gọi `/api/*` cùng miền và nhận 404 vì không có route tới Worker | VERIFIED (trình duyệt Chromium, báo cáo 06 trong `docs/money-engine/` của PR #4) |
| Giới hạn số tệp, cỡ tệp, số build mỗi tháng, build đồng thời, thời gian build | | **UNVERIFIED** |
| Cấu hình Pages hiện tại (lệnh build, thư mục gốc, nhánh production, biến môi trường, watch paths, preview branches) | | **BLOCKED** (cần quyền dashboard) |

Kết luận: về nội dung, trang tĩnh tương thích Pages; điều chặn là cây của `main`, #3, #4 **không có bước build** (xem `02`).

## 2. API Worker (`workers/api`) → Workers (tuyến B, chỉ đánh giá)

| Kiểm tra | Kết quả | Nhãn |
|---|---|---|
| Wrangler | `name = ai-muonnoi-api`, `main = src/index.ts`, `compatibility_date = 2025-01-01`, **không có `compatibility_flags`** | VERIFIED |
| API Node-only | không có `node:` import, `require`, `process.env`, `Buffer` trong `workers/api/src` | VERIFIED (grep) |
| API nền tảng dùng | WebCrypto (`crypto.subtle`: PBKDF2 100 000 vòng, HMAC), `fetch`, `AbortSignal.timeout`, `ctx.waitUntil`, D1 (prepared statement, `batch`) | VERIFIED |
| Tài nguyên | D1 binding `iai_flow_db` (`iai-flow-db`, thư mục `migrations`); route custom domain `api.muonnoi.org`; không KV/R2/Queues/DO | VERIFIED (cấu hình); tồn tại thật: UNVERIFIED |
| Biến không bí mật | `[vars]` trong `wrangler.toml` (miền, origin, cờ) | VERIFIED |
| Bí mật (chỉ tên) | `PAY_IAI_ONE_API_KEY`, `PAYMENT_WEBHOOK_SECRET`, `MAIL_API_KEY`, `INTERNAL_EMAIL_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_STATE_SECRET`; mã còn đọc `MAGIC_LINK_SECRET`, `PUBLISH_API_TOKEN`, `SESSION_SECRET`, `FLOW_API_KEY`, `AI_API_KEY` | VERIFIED (tên); giá trị: không đọc |
| Schema | chuỗi migration D1 không áp được từ DB rỗng (lỗi ở `0006`, hai tệp `0009_*`), nên **không dựng được staging từ repo** | VERIFIED (`docs/money-engine/audit/apply-d1-chain.mjs` trong PR #4: 12/13 tệp) |
| Staging | bộ cô lập `workers/api/staging` + `tools/prepare-intake-staging.mjs` có; **chưa tạo** (chờ ID tài khoản Free theo `INFO-CF-FREE` của ops) | VERIFIED (tài liệu của ops) |
| Rủi ro gói Free | băm mật khẩu PBKDF2 100 000 vòng tốn CPU mỗi lần đăng nhập/đăng ký; giới hạn CPU mỗi request của gói Free chưa kiểm được | **UNVERIFIED, cần đối chiếu tài liệu** |
| Kết luận | đã là Worker nên không cần chuyển nền tảng; **không tự động hóa deploy** cho tới khi có staging dựng được, Owner duyệt, và chuỗi migration sửa xong | |

## 3. RevenueOps Worker (`workers/revenueops`)

| Kiểm tra | Kết quả | Nhãn |
|---|---|---|
| Wrangler | `compatibility_date 2026-10-15`; `workers_dev: false`; `preview_urls: false`; `triggers.crons: []`; `observability.enabled: false`; assets binding `ASSETS` với `run_worker_first`; môi trường `staging` và `production` đã khai | VERIFIED |
| Durable Object | `COORDINATOR` → `RevenueCoordinator`, `migrations: [{ tag: v1, new_sqlite_classes }]` | VERIFIED |
| API Node-only | không có trong `src` | VERIFIED |
| Trạng thái triển khai | không route, không cron; chưa deploy theo biên nhận của ops | UNVERIFIED (nguồn thứ cấp) |
| DO SQLite trên gói Free | | **UNVERIFIED** |

## 4. Cửa hàng (`apps/store`) → Cloudflare? Không chuyển

Hiện chạy trên Vercel (`sach-muonnoi`, Next.js 15.5.28, App Router, 22 route: trang tĩnh và route động). Khả năng chạy trên Workers **chưa được chứng minh** và có các điểm cản đã thấy trong mã:

| Điểm | Chi tiết | Nhãn |
|---|---|---|
| Hệ thống tệp | `src/lib/posts.ts` dùng `node:fs` để đọc bài viết (`content/`); các trang bài viết là SSG nên đọc lúc build, nhưng chưa kiểm tra mọi đường chạy | VERIFIED (grep); hệ quả UNVERIFIED |
| SMTP | `nodemailer` qua Gmail SMTP (TCP) không chạy trên Workers; đường Resend dùng `fetch` | VERIFIED (mã); hệ quả theo kiến thức chung, UNVERIFIED với nền tảng hiện tại |
| Bộ chuyển Next → Workers và cờ Node | cần bộ chuyển (ví dụ OpenNext) và chế độ tương thích Node; chưa thử | UNVERIFIED |
| SDK | `@payos/node`, `@supabase/supabase-js` | chưa thử trên Workers |

Quyết định: **giữ Vercel** (quy tắc: không chuyển backend khi chưa chứng minh tương thích). Muốn thử: nhánh riêng, build bằng bộ chuyển, chạy lại 57 e2e; cần Owner duyệt vì tiêu build và có thể tạo tài nguyên.

## 5. Việc cần làm khi mạng cho phép (để chuyển UNVERIFIED thành VERIFIED)

Thêm `developers.cloudflare.com` và `docs.github.com` vào danh sách miền được phép của môi trường (Owner), rồi đọc: Pages limits; Pages build watch paths; Pages branch build controls và từ khóa bỏ qua build; Workers Builds limits; Workers platform limits; D1 limits và pricing; "About billing for GitHub Actions".
