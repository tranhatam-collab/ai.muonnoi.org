# 06 · Audit chéo các nhánh và kế hoạch hoàn thiện — 10/11/2026

**Người làm:** phiên Claude của Money Engine, độc lập với nhóm xây nhánh ops. Chỉ đọc mã, chạy kiểm thử cục bộ trong thư mục tạm và đọc trạng thái hạ tầng ở chế độ chỉ đọc. Không merge, không deploy, không ghi vào dự án hay nhánh của nhóm khác, không đụng tài nguyên chung.

**Cách đọc mức độ:** P0 = khai thác được ngay hoặc đang lộ; P1 = chặn nhận tiền thật; P2 = lỗi chức năng hoặc rủi ro vừa; P3 = vệ sinh. Mục "có điều kiện" nghĩa là mã sai chắc chắn nhưng có bị khai thác hay không phụ thuộc dữ liệu production mà tôi không có quyền xem.

## 1. Kết luận một trang

1. **Chưa nhánh nào được phép nhận tiền thật.** Không phải vì kiểm thử đỏ: cửa hàng chạy 25 unit và 57 e2e xanh, nhánh ops chạy 166 test xanh (tôi chạy lại, kết quả khớp với biên nhận 01/11 của họ). Việc chặn nằm ở bảo mật API, chuỗi migration không dựng lại được, và hạ tầng chưa có (Supabase riêng, Pages production, D1 production, khóa thanh toán).
2. **Hai dòng công việc ghép được với nhau.** Thử ghép cửa hàng vào nhánh ops trong thư mục tạm: chỉ 2 tệp gốc xung đột (`package.json`, `wrangler.json`), lấy bản của ops thì typecheck, unit, e2e, `npm run verify` đều xanh, và gói công khai `dist/site` vẫn 43 tệp, không chứa `apps/`, `supabase/`, `engine/`.
3. **Nguyên nhân Cloudflare Pages đỏ rất có thể là lệnh build.** Từ tháng 10, mọi lần build trên cây có `tools/build.mjs` đều xanh (ops, #2; #2 chạy lại ngày 06/11 vẫn xanh) và mọi lần build trên cây không có đều đỏ (main, #3, #4, ba nhánh thử cắt bớt). Biên nhận của ops ghi lệnh build của dự án Pages là `node tools/build.mjs`, thư mục `dist/site`. Kết quả xanh cũ của #1 (04/06) có trước khi dự án đổi lệnh. Ghép theo mục 2 đưa `tools/build.mjs` vào cây của cửa hàng. Cần xác nhận trong dashboard Cloudflare, tôi không có quyền.
4. **Phát hiện nặng nhất là ở API Worker kế thừa từ PR #1** (mục 4): migration gieo tài khoản admin với mật khẩu công khai và mã đăng nhập còn nhánh so mật khẩu thô (khai thác được nếu hàng đó còn ở production); API thanh toán tin số tiền và URL do người gọi gửi; webhook cho phép sự kiện muộn lật đơn đã thanh toán thành thất bại; giới hạn đăng nhập tính theo email nên vừa khóa nhầm người thật vừa không chặn dò mật khẩu theo IP. Bốn nhóm này đều có bằng chứng chạy được (mục 3.5). Lỗi migration và hash admin ghi cứng đã được CodeRabbit gắn "Critical" trên PR #1 từ 25/05/2026 mà chưa ai xử lý: PR #1 mở hơn năm tháng và chỉ có review của bot.
5. **Mã chỉ nằm trên một máy:** biên nhận của ops ghi nhánh vá bảo mật `C1` (172 test) chưa commit, chưa push, nằm trong `~/Dev/ai-muonnoi-ops` trên một máy; lần trước worktree mất, 155/156 đường dẫn bằng chứng không còn file. Cần sao lưu trước mọi việc khác.
6. **Không có CI nào trên GitHub** (không có workflow ở nhánh nào). Mọi con số "xanh" hiện chỉ do người xây tự chạy.

## 2. Bản đồ các dòng công việc (chụp 10/11/2026 05:54 UTC)

| Nhánh / PR | Head | Lớn tới đâu | Trạng thái | Pages | Ghi chú |
|---|---|---|---|---|---|
| `main` | `3e0cac6` (18/03) | nền | không đổi | đỏ | `wrangler.json` là cấu hình Worker `iai-flow-engine`, không phải cấu hình Pages |
| PR #1 `feat/flow-mvp-backend` | `6c58845` (05/06) | 13 commit, 77 tệp, +11,1k | mở, không phải nháp; chỉ có 2 review của bot CodeRabbit (25/05, 04/06), 0 review của người | xanh (04/06) | API Worker + D1 + giao diện app; `pages_build_output_dir: "."` xuất bản cả thư mục gốc |
| PR #2 `codex/revenueops-publishing` | `e74ee69` (15/10) | +1 commit trên #1, 133 tệp, +15,6k | nháp | xanh | Studio xuất bản, RevenueOps, build allowlist `dist/site` |
| **`codex/ai-muonnoi-autonomous-ops`** | `cc8ac68` (01/11) | 83 commit so với main (69 sau #2), 189 tệp, +23,8k | **không có PR** | xanh | Chứa trọn #1 và #2. 58/69 commit mới là `docs:` biên nhận hằng giờ, 9 `feat:` (intake, triage, Pilot) |
| PR #3 `claude/money-engine-draft` | `beea00a` (31/10) | 3 commit, 63 tệp, +4,5k | nháp | đỏ | cửa hàng ebook (bản nháp) |
| PR #4 `claude/money-engine-e2e` | `8caf09e` + bản vá 10/11 | 87 tệp, +6,8k | nháp, xếp chồng trên #3 | đỏ | e2e, giới hạn tốc độ, hoàn tiền, link hết hạn, preflight |
| `claude/optimistic-sammet` | `a0e5573` (26/03) | 4 commit | cũ, không PR | — | nên dọn |
| `claude/cf-probe-1..8` | — | nhánh thử | throwaway | — | 8 nhánh, proxy git chặn tôi xóa, cần xóa tay trên GitHub |

Thứ tự hợp nhất đề xuất: **ops (đã chứa #1, #2) → main**, rồi cửa hàng (#3 + #4) đặt lên trên. Cách làm và kết quả thử nằm ở mục 3.3.

Mục tiêu doanh thu của hai dòng khác nhau (cửa hàng ebook 100–500 nghìn VND/ngày; RevenueOps/Pilot 10 Agent, "55 triệu/ngày" là mục tiêu, không phải cam kết). Về kỹ thuật không mâu thuẫn; về quản trị cần một chỉ tiêu chính và một người chịu trách nhiệm cho từng bên (mục 6, quyết định 6).

## 3. Kết quả e2e tổng

### 3.1 Cửa hàng (`apps/store`, PR #4 + bản vá hôm nay)

| Kiểm tra | Kết quả |
|---|---|
| `tsc --noEmit` | exit 0 |
| unit (`npm test`) | 25/25 (21 cũ + 4 mới cho `isSafeEmail`) |
| e2e (`npm run test:e2e`, Postgres thật qua PGlite, dịch vụ ngoài giả ở `fetch`) | 57/57 (54 cũ + 3 mới: email nguy hiểm khi mở đơn, khi lấy lại link, email hợp lệ có dấu `+`) |
| `next build` | thành công, 10 trang tĩnh, 22 route, không cần biến môi trường |
| `npm audit --omit=dev` | trước: 3 (nodemailer, next, postcss). Sau khi nâng nodemailer 10.1.1 → 10.4.0: còn 2, cùng gốc `postcss` trong `next` |

`postcss` chỉ chạy lúc build trên CSS của chính mình, không xử lý dữ liệu người dùng, nên chưa khai thác được ở runtime. Bản `next` 15.5.29 vẫn pin postcss 8.4.31; chỉ `next` 16.4.6 mang postcss 8.5.23. Chấp nhận tạm, đưa vào kế hoạch (mục 5, bước 2.7).

### 3.2 Nhánh ops (`npm run verify`)

166/166 pass, 0 fail, exit 0 trên Node 22.22 (gói `workers/revenueops` khai `engines >= 24`, npm chỉ cảnh báo). Gồm kiểm tra JSON/wrangler/operations, typecheck API, 13 test xuất bản trên SQLite, 5 bảo mật thanh toán/email, các test workerd + D1 cục bộ, intake (worker, UI, actions, triage, staging), Pilot (delivery, commercial, handoff, review, revise), build `dist/site` và 34 test RevenueOps.

Một dòng `FATAL ERROR: D1_ERROR: table payment_webhook_log has no column named payload_hash` trong log là **cố ý**: bài test dựng bảng thiếu cột để chứng minh webhook lỗi vẫn thử lại được (`tests/payment-email-workerd.mjs`, dòng 53 thêm cột sau đó).

Hạn chế quan trọng: các test này tự dựng bảng bằng tay, **không áp chuỗi migration thật**, nên không thấy lỗi ở mục 4 (F5).

### 3.3 Cây đã ghép (ops + cửa hàng), chỉ trong thư mục tạm

Lệnh: `git merge origin/claude/money-engine-e2e` trên đầu nhánh ops. Xung đột: `package.json`, `wrangler.json`; giải bằng `git checkout --ours` (bản ops). 85 tệp thêm sạch, không tệp nào của ops bị đổi.

| Kiểm tra trên cây ghép | Kết quả |
|---|---|
| typecheck cửa hàng | exit 0 |
| unit cửa hàng | 21/21 (chạy trước bản vá hôm nay) |
| e2e cửa hàng | 54/54 (chạy trước bản vá hôm nay) |
| `npm run verify` của ops | 166/166 |
| `dist/site` | 43 tệp; không có `apps/`, `supabase/`, `engine/`, `docs/money-engine/` (chỉ `docs/index.html`, đúng allowlist) |

Cần chạy lại trên nhánh ghép thật sau bản vá hôm nay (bước 1.2 trong kế hoạch).

### 3.4 Trình duyệt trên gói công khai (Chromium, 20 trang × 2 cỡ màn hình = 40 lượt, có áp `_headers`)

- 40/40 lượt trả 200; 0 lỗi JS lúc chạy; 0 link nội bộ chết; 0 ảnh hỏng.
- **8 trang có script inline bị CSP `script-src 'self'` chặn** (`/app/`, `/app/login/`, `/app/dashboard/`, `/app/builder/`, `/post/`, `/profile/`, `/agents/demo-sales/`, `/agents/demo-support/`). Trình duyệt ghi "Refused to execute inline script". Hệ quả: form đăng nhập, bảng điều khiển, trang bài viết, trang hồ sơ và hai bản demo trông như chạy nhưng không phản hồi. Trang `/login/` mới của ops đã tách sang `assets/login.js` nên không bị.
- `/studio/`, `/studio/intake/`, `/offers/brief/` gọi `/api/publishing/capabilities` hoặc `/api/intake/capabilities` cùng miền và nhận 404 trên hosting tĩnh. Không có `_redirects`, Function hay route nào đưa `/api/*` của `ai.muonnoi.org` sang Worker. Đúng với trạng thái HOLD, nhưng nghĩa là ba trang này hiện chỉ là vỏ tĩnh.
- Cảnh báo "connect to localhost:8787" trên `/`, `/login/`, `/app/builder/` là do tôi chạy trên `127.0.0.1` (mã chọn API theo hostname). Không phải lỗi production, không tính.
- Một lượt (trang chủ, 390px, có CSP) đo tràn ngang 24px, không tái hiện được khi bỏ CSP. Ghi lại, chưa kết luận.

### 3.5 Bằng chứng tái hiện chạy được cho lỗi API

Chạy **mã Worker thật** (bundle từ nhánh ops) trong workerd (Miniflare) với D1 cục bộ dùng một lần; bảng thanh toán lấy từ migration 0008/0009 thật. Script nằm ở `docs/money-engine/audit/`, cách chạy ở `audit/README.md`.

| Mã | Quan sát |
|---|---|
| R1 | Hàng admin có mật khẩu đúng chuỗi mà migration 0003 gieo → `POST /api/login` trả 200, `role: admin`; `GET /api/me` cũng admin. Sau đăng nhập, mã âm thầm băm lại mật khẩu |
| R2a | 12 lần đăng nhập sai cho cùng một email từ 12 IP khác nhau → `401 ×10`, rồi `429 ×2` |
| R2b | 30 email khác nhau từ một IP → 30 lần `401`, không bao giờ `429` |
| R3a | Sự kiện `payment.completed` ký đúng cho intent không tồn tại → `200`, ghi biên nhận, không có hàng intent nào |
| R3b | `completed` rồi `failed` muộn cho cùng intent → trạng thái cuối `failed` |
| R3c | Intent 1.500.000 VND nhận sự kiện `completed` ghi số tiền 1.000 → vẫn `completed` |
| R4 | `POST /api/payment/create-intent` không đăng nhập, `amount: 1`, `returnUrl: https://evil.example/phish` → `201`; nhà cung cấp nhận `amount: 1` và `success_url` là URL kia; `GET /api/payment/<id>` không đăng nhập trả 200 kèm `checkout_url` |
| (âm tính) | Email xác nhận thanh toán gửi không qua `waitUntil`: trên workerd cục bộ cả 8/8 thư vẫn tới nhà cung cấp mail, kể cả khi nhà cung cấp trả chậm 400ms. **Không tái hiện được**, chỉ ghi là vệ sinh (P3) |

## 4. Phát hiện

| Mã | Mức | Phát hiện | Bằng chứng | Cách sửa tối thiểu |
|---|---|---|---|---|
| F1 | **P0 có điều kiện** | Migration `0003_seed_admin.sql` gieo `admin@ai.muonnoi.org` với mật khẩu là một chuỗi công khai ngay trong tệp; `handleLogin` còn nhánh so sánh mật khẩu thô với cột `users.password`. Bất kỳ DB nào có hàng đó mà cột `password` chưa bị làm trống thì ai đọc repo cũng đăng nhập được với quyền admin (R1). Migration `0006` làm trống cột đó và ghi cứng hash, salt, thuật toán PBKDF2 của admin vào repo công khai (bẻ khóa ngoại tuyến được nếu mật khẩu yếu). Ngoài ra `0006` ghi thuật toán `pbkdf2_sha256:210000` còn mã chỉ chấp nhận `:100000`, nên admin sau `0006` không đăng nhập bằng mật khẩu được. Production đang ở trạng thái nào thì tôi không biết (không có quyền đọc D1) | R1; `security-api.ts` dòng 104–109; `password.ts` dòng 1–4, 85–87; `0003`, `0006`. CodeRabbit đã gắn Critical cho hash ghi cứng ở `0006` dòng 114 (25/05/2026) | Chạy C0: hàng admin có `length(password) > 0` hoặc algo `:210000` không; xoay mật khẩu admin dù kết quả ra sao; bỏ seed khỏi migration; xóa nhánh mật khẩu thô sau khi chuyển hết hàng cũ |
| F2 | **P1** | `create-intent` không cần đăng nhập, tin `amount`, `currency`, `returnUrl` từ body; `returnUrl` đi thẳng vào `success_url` gửi nhà cung cấp (chuyển hướng sau thanh toán tới miền lạ); `GET /api/payment/:id` công khai trả cả `checkout_url`; ID sinh bằng `Math.random`. Idempotency-Key toàn cục, không gắn người gọi | R4; `payment-api.ts` dòng 47–150 | Giá lấy từ danh mục phía server; whitelist `returnUrl`; yêu cầu phiên hoặc token cho tạo và xem; `crypto.randomUUID()`. Chính là `C4` (bản vá 7 tệp đã mất) |
| F3 | **P1** | Webhook: không có máy trạng thái (`UPDATE ... WHERE id = ?`), sự kiện muộn lật `completed` thành `failed`; intent lạ vẫn nhận 200 và tiêu biên nhận; không so số tiền và tiền tệ; mọi lỗi chứa chữ "constraint" bị coi là phát lại (`isUniqueConstraintError`), nên lỗi CHECK/NOT NULL sau này sẽ trả 200 và nhà cung cấp ngừng thử lại | R3a–c; `payment-api.ts` dòng 41–44, 214–232 | Thêm `AND status = 'pending'`; trả 404/409 cho intent lạ; so khớp số tiền; chỉ coi là phát lại khi lỗi thuộc khóa chính của `payment_webhook_receipts` |
| F4 | **P1** | Giới hạn đăng nhập khóa theo email, không theo IP: ai cũng khóa được đăng nhập của người khác bằng 10 yêu cầu mỗi 10 phút; đồng thời dò mật khẩu trải rộng nhiều email từ một IP không bị chặn. Đăng ký cũng chỉ giới hạn theo email (5 lần/giờ/email, không theo IP) và mỗi lần đăng ký gửi thư chào tới địa chỉ do người gọi chọn, chưa xác minh | R2; `security-api.ts` dòng 78–91, 148–161; `rate-limit.ts` | Hai bộ đếm (IP và email), chỉ đếm lần thất bại, thời gian chờ tăng dần; đăng ký chỉ gửi thư sau khi xác minh email |
| F5 | **P1** | Chuỗi migration không áp được từ DB rỗng: `0006` đọc cột `password_hash`, `role`, `status`, `updated_at` mà bảng `users` của `0002` không có; `sessions` ở `0002` dùng cột `id` còn mã dùng `token`. Hai tệp cùng số `0009_*`. Script `d1:migrate:all:local` dừng ở 0009 đầu tiên. Không test nào áp chuỗi thật, nên lỗi không bị bắt. Hệ quả: không dựng được staging, không suy ra schema production từ repo (đúng như biên nhận 01/11 của ops) | `apply-d1-chain.mjs`: 12/13 tệp áp được, `0006_v1_security.sql` lỗi `no such column: password_hash`, để lại bảng `users_v1_security_tmp`. CodeRabbit đã gắn Critical đúng lỗi này ngày 25/05/2026 (`pulls/1/comments`), chưa sửa | Sau C0, chụp schema production làm `0000_baseline.sql`; đổi số 0009 trùng; thêm test áp chuỗi từ rỗng và so khớp mọi truy vấn trong mã với schema |
| F6 | P2 | 8 trang gốc dùng script inline bị chính CSP của site chặn (mục 3.4) | Chromium, 16 lượt | Tách ra tệp `.js` cùng nguồn (như `assets/login.js`), hoặc bỏ trang cũ khỏi allowlist |
| F7 | P2 | **Quy trình:** nhánh vá `C1` chưa push; 155/156 đường dẫn bằng chứng đã mất; 58/69 commit gần đây là biên nhận `docs:` hằng giờ, trong khi đường găng bị chặn bởi 6 mục `INFO-*` chờ chủ dự án; không có CI GitHub; tài liệu công khai chứa đường dẫn máy cá nhân, PID tiến trình và ý định hạ tầng (n8n, VPS) | `docs/OPERATIONS.md`, `docs/CONTINUOUS_AUTONOMOUS_OPS.md`; `gh api .../actions/workflows` = 0 | Sao lưu `C1` ngay; bật `AP-LOOP-POLICY` (không tạo gói mới khi đường găng bị chặn); chuyển bằng chứng sang repo private (`AP-EVIDENCE-STORE`); thêm CI |
| F8 | P2 | Pages đỏ trên main, #3, #4 (có điều kiện, xem mục 1.3) | check-run Cloudflare Pages: xanh trên `cc8ac68`, `dd3688a`, `e74ee69`; đỏ trên main và nhánh cửa hàng | Ghép theo mục 5 giai đoạn 1; xác nhận lệnh build trong dashboard |
| F9 | P2 | Cửa hàng: `nodemailer` < 10.4 có 3 lỗi phân tích địa chỉ; regex email cũ cho lọt `a,b@x.co`, `x>y@x.co`. **Đã sửa hôm nay** (`isSafeEmail`, nodemailer 10.4.0, 7 test mới) | `npm audit`, `email-address.test.ts`, 3 e2e mới | xong |
| F10 | P3 | `postcss` trong `next` (4 advisory, chỉ lúc build); CORS cho phép mọi `http://localhost:*` kèm credentials ở production; ID `Math.random` ở nhiều nơi; `engines node >= 24` ở RevenueOps lệch với Node 22 của môi trường CI hiện tại; `fireEmail` không dùng `waitUntil` (chưa tái hiện lỗi); route công khai chỉ `publishing`/`intake` kiểm tra Origin, phần còn lại dựa vào SameSite=Lax mà `api.` và `ai.` cùng site | audit, đọc mã | Theo mục 5, bước 2.7 |

## 5. Kế hoạch hoàn thiện

Nguyên tắc: **AI làm hết phần nội bộ dưới 0 VND; chủ dự án chỉ duyệt và cấp quyền**. Mọi bước ghi vào hạ tầng thật hoặc nhánh của nhóm khác chờ lệnh rõ ràng. Mỗi bước có tiêu chí nghiệm thu chạy được.

### Giai đoạn 0 — đã xong hôm nay (trên PR #4)

- Bản vá cửa hàng F9, 25 unit + 57 e2e xanh, `next build` xanh.
- Báo cáo này và bộ script tái hiện trong `docs/money-engine/audit/`.

### Giai đoạn 1 — hợp nhất (AI làm, cần "đồng ý" của chủ dự án vì tạo nhánh và PR mới)

| Bước | Việc | Nghiệm thu |
|---|---|---|
| 1.1 | Tạo nhánh `claude/integration` từ đầu nhánh ops, ghép `claude/money-engine-e2e`, giải 2 tệp bằng bản ops | `git diff` chỉ thêm tệp mới ngoài 2 tệp gốc |
| 1.2 | Chạy lại cả ba bộ (tsc, 25 unit, 57 e2e, `npm run verify` 166, `next build`) và kiểm `dist/site` | tất cả xanh; `dist/site` đúng 43 tệp, không `apps/`, `supabase/`, `engine/` |
| 1.3 | Thêm workflow GitHub Actions: job `ops` (`npm run verify`), job `store` (tsc, unit, e2e, build), job `browser` (bộ Chromium của mục 3.4), job `audit` (`npm audit --omit=dev`, không chặn) | CI xanh trên PR; chứng minh lần đầu có CI |
| 1.4 | Mở PR nháp vào `main`; kỳ vọng Cloudflare Pages xanh | check Pages xanh |
| 1.5 | Sau khi chủ dự án duyệt: đóng #1, #2 là "đã gộp vào PR mới", đóng hoặc đổi nền #3 và #4 | không mất lịch sử; một PR duy nhất mang cả hai dòng |

Không bước nào merge vào `main`; việc merge là của chủ dự án.

### Giai đoạn 2 — bảo mật và độ tin cậy (AI làm trên nhánh ghép, mỗi mục có test hồi quy dựng từ R1–R4)

| Bước | Việc | Nghiệm thu |
|---|---|---|
| 2.1 | F1: bỏ seed admin khỏi 0003/0006, xóa đường đăng nhập mật khẩu thô, kèm kịch bản chuyển hàng cũ | R1 phải trả 401; test mới |
| 2.2 | F2: giá theo danh mục phía server, whitelist `returnUrl`, xác thực create/get, ID ngẫu nhiên mạnh | R4 đảo ngược: `amount` từ client bị bỏ qua, `returnUrl` lạ bị 400 |
| 2.3 | F3: máy trạng thái, so số tiền, xử lý intent lạ, chỉ phát lại khi trùng khóa receipts | R3a–c đều bị chặn; thêm test lỗi CHECK trả 500 để nhà cung cấp thử lại |
| 2.4 | F4: hai bộ đếm IP + email, chỉ đếm lần sai, chặn thư rác khi đăng ký | R2a: người thật vẫn đăng nhập được khi kẻ khác thử sai; R2b: bị `429` theo IP |
| 2.5 | F5: sửa 0006, đổi số 0009, thêm test áp chuỗi từ rỗng và đối chiếu schema với truy vấn trong mã; baseline từ production sau C0 | chuỗi áp 13/13; test đỏ nếu thêm cột mà quên migration |
| 2.6 | F6: tách script inline hoặc gỡ trang cũ; đưa bộ Chromium vào CI | 0 lần "Refused to execute inline script" |
| 2.7 | F10: `overrides.postcss` nếu `next build` và e2e vẫn xanh, hoặc theo dõi Next 15.5.x/16; thu hẹp CORS localhost; thêm kiểm tra Origin cho mọi route đổi trạng thái; thống nhất Node 22/24 | audit sạch hoặc có ghi chú chấp nhận |
| 2.8 | Gộp phát hiện của ba reviewer độc lập (mục 7) | từng mục có test hoặc có lý do chấp nhận |

### Giai đoạn 3 — hạ tầng (cần chủ dự án; AI soạn sẵn lệnh và kiểm tra sau mỗi bước)

| Bước | Ai | Việc | Nghiệm thu |
|---|---|---|---|
| 3.1 | chủ dự án | **Sao lưu `C1`**: commit và push worktree `~/Dev/ai-muonnoi-ops` lên một nhánh riêng hoặc repo private | nhánh tồn tại trên GitHub |
| 3.2 | chủ dự án | Xác nhận form chi phí Supabase (tổ chức gói Pro, dự án mới là khoản phát sinh) | dự án `sach-muonnoi-store` xuất hiện |
| 3.3 | AI | Áp migration 0001→0003 lên dự án mới, kiểm RLS và quyền hàm, tạo bucket `ebooks`, ghi project ref vào docs (không ghi khóa) | `preflight` mục DB/migration/RLS xanh |
| 3.4 | chủ dự án | Đặt Production Branch của Vercel `sach-muonnoi` (`rootDirectory = apps/store`), dán khóa payOS, PayPal, service-role vào Vercel, tải EPUB vào bucket | `/api/admin/preflight` toàn xanh |
| 3.5 | chủ dự án | `INFO-PROD-ACCESS`: cấp người có quyền Pages `ai-muonnoi-org` và D1 production để chạy `C0` rồi `C2` | AI soạn lệnh chỉ đọc; kết quả F1 rõ ràng |
| 3.6 | AI + chủ dự án | `C2`: Pages build `node tools/build.mjs`, xuất `dist/site`, deploy preview, probe âm các đường dẫn đang lộ, rồi promote | probe âm; `wrangler.json`, `.sql`, `.ts` trả 404 trên miền thật |

### Giai đoạn 4 — chạy thật có kiểm soát

1. Mua thử 49.000 VND bằng tài khoản của chủ dự án, hoàn tiền thử, đối soát sổ cái (e2e đã chứng minh luồng; bước này chứng minh dịch vụ thật).
2. Xoay `DOWNLOAD_SECRET` và `ADMIN_SECRET`, bật nhận đơn.
3. **Chỉ sau đơn thật đầu tiên:** đặt lịch hằng ngày, mở động cơ nội dung/SEO; B2B cần chủ dự án mô tả VCS-EL và AI Accounting Loop; kênh KDP/Gumroad (lưu ý KDP Select độc quyền với "Doanh Nhân Sáng Tạo").

### Cổng "được nhận tiền thật" (tất cả phải đúng)

- [ ] F1–F5 đóng, mỗi mục có test hồi quy xanh trên CI
- [ ] CI GitHub xanh trên nhánh sẽ merge; Pages xanh; `dist/site` probe âm trên miền thật
- [ ] Supabase riêng, migration 0001→0003 đã áp, `preflight` xanh
- [ ] Mua thử và hoàn tiền thử thành công, sổ cái khớp ngân hàng
- [ ] Đã xoay mọi bí mật dùng chung; không còn mật khẩu mặc định ở môi trường nào
- [ ] Có người chịu trách nhiệm hỗ trợ và hoàn tiền (xem `INFO-PEOPLE` của ops)

## 6. Quyết định cần chủ dự án

1. **Đồng ý để tôi tạo nhánh ghép và PR nháp (giai đoạn 1)?** Đây là bước mở khóa nhiều nhất và không merge gì.
2. **Sao lưu `C1` ngay** (mục 3.1): chỉ chủ dự án làm được vì mã nằm trên máy của họ.
3. **Chi phí Supabase** (mục 3.2).
4. **Quyền production** cho Pages và D1 (mục 3.5) để đóng P0 lộ source và kiểm F1.
5. **Vercel Production Branch** của `sach-muonnoi` (mục 3.4).
6. **Một chỉ tiêu, một người chịu trách nhiệm cho mỗi bên:** cửa hàng ebook (100–500 nghìn/ngày) và gói Pilot của ops (mục tiêu 55 triệu/ngày). Hai bên dùng chung miền và repo.
7. Xóa tay 8 nhánh `claude/cf-probe-*` và nhánh cũ `claude/optimistic-sammet` trên GitHub.

## 7. Phát hiện của ba reviewer độc lập

(Phần này được bổ sung sau khi ba reviewer đọc xong ba mảng: xác thực và xã hội; tự động hóa, webhook và gọi ra ngoài; Studio, intake, RevenueOps và giao diện.)

## 8. Hạ tầng đã quan sát (chỉ đọc)

- **Supabase** (tổ chức dùng chung, `ap-southeast-1`): 6 dự án, trong đó 4 đang chạy. Dự án mới nhất `sibank-us` tạo 05/11 (không phải của Money Engine, chưa mở). **Chưa có `sach-muonnoi-store`**; hiện không dự án nào của cửa hàng bị đụng.
- **Vercel** (đội dùng chung): 7 dự án; `groundstead` tạo 06/11, `namtrieu10d` cập nhật sáng nay (ngoài phạm vi repo này). Dự án `sach-muonnoi` có đủ 13 bản build từ trước tới nay, **tất cả `ERROR`**: 1 bản mang nhãn production từ `codex/revenueops-publishing` (15/10), 11 bản từ nhánh ops (16–17/10) khi Git tích hợp còn chạy trên mọi nhánh, 1 bản từ `claude/money-engine-draft` (20/10). Từ 31/10 đã tắt bản xem trước, không có bản mới. Chưa có triển khai thành công nào của cửa hàng.
- **Cloudflare, D1 production, miền `ai.muonnoi.org`, payOS, PayPal:** không có quyền, không kiểm. Mọi nhận định về chúng là suy luận từ mã và biên nhận của ops.
- **Ngoài phạm vi:** repo `namtrieu10d` và mọi repo khác không được gắn vào phiên này. Muốn audit thêm, cần chủ dự án chỉ định repo để gắn.

## 9. Điều tôi không kiểm được

Triển khai thật (Pages, Vercel, Workers), dữ liệu D1/Supabase thật, luồng payOS và PayPal bằng khóa thật, email gửi thật, hành vi của runtime Cloudflare với `waitUntil`, và mọi thứ nằm trên máy cá nhân của các nhóm (kể cả bản vá `C1`).
