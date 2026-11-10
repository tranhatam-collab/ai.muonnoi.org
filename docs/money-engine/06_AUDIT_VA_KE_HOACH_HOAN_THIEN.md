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
7. **Ba reviewer độc lập đã đọc toàn bộ API Worker, Studio, intake, RevenueOps và giao diện** (mục 7). Họ tìm thêm 23 phát hiện riêng biệt, đáng kể nhất là **chiếm tài khoản bằng đăng ký trước** (A1; tôi chạy lại được trên Worker thật, mục 3.5, R5) và **cổng Studio không chặn đăng bài của thành viên** (C2). Điều đáng ghi nhận: cả ba không tìm ra lỗi trong chính các mô-đun mới của ops (Studio, intake, triage, RevenueOps, build): phân tách nhiệm vụ do SQL ép, đồng ý nằm ngay trong câu lệnh ghi, JWT Access RS256, mặc định đóng. Rủi ro dồn vào API kế thừa từ PR #1 (đăng nhập, đăng ký, thanh toán, bảng tin, n8n).

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

`postcss` chỉ chạy lúc build trên CSS của chính mình, không xử lý dữ liệu người dùng, nên chưa khai thác được ở runtime. Bản `next` 15.5.29 vẫn pin postcss 8.4.31; chỉ `next` 16.4.6 mang postcss 8.5.23. Chấp nhận tạm, đưa vào kế hoạch (mục 5, bước 2.9).

### 3.2 Nhánh ops (`npm run verify`)

166/166 pass, 0 fail, exit 0 trên Node 22.22 (gói `workers/revenueops` khai `engines >= 24`, npm chỉ cảnh báo). Gồm kiểm tra JSON/wrangler/operations, typecheck API, 13 test xuất bản trên SQLite, 5 bảo mật thanh toán/email, các test workerd + D1 cục bộ, intake (worker, UI, actions, triage, staging), Pilot (delivery, commercial, handoff, review, revise), build `dist/site` và 34 test RevenueOps.

Một dòng `FATAL ERROR: D1_ERROR: table payment_webhook_log has no column named payload_hash` trong log là **cố ý**: bài test dựng bảng thiếu cột để chứng minh webhook lỗi vẫn thử lại được (`tests/payment-email-workerd.mjs`, dòng 53 thêm cột sau đó).

Hạn chế quan trọng: các test này tự dựng bảng bằng tay, **không áp chuỗi migration thật**, nên không thấy lỗi ở mục 4 (F5).

### 3.3 Cây đã ghép (ops + cửa hàng), chỉ trong thư mục tạm

Lệnh: `git merge origin/claude/money-engine-e2e` trên đầu nhánh ops. Xung đột: `package.json`, `wrangler.json`; giải bằng `git checkout --ours` (bản ops). 85 tệp thêm sạch, không tệp nào của ops bị đổi.

| Kiểm tra trên cây ghép | Kết quả |
|---|---|
| typecheck cửa hàng | exit 0 |
| unit cửa hàng | 25/25 |
| e2e cửa hàng | 57/57 |
| `npm run verify` của ops | 166/166 |
| `dist/site` | 43 tệp; không có `apps/`, `supabase/`, `engine/`, `docs/money-engine/` (chỉ `docs/index.html`, đúng allowlist) |

Đã chạy hai lần: trước bản vá email (21 unit, 54 e2e) và sau bản vá (số ở bảng). Đây vẫn là cây tạm trên máy tôi, chưa phải nhánh thật trên GitHub; nhánh thật là bước 1.1–1.2 của kế hoạch và sẽ chạy lại trên CI.

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
| R5 | **Chiếm tài khoản bằng đăng ký trước (A1).** Kẻ tấn công `POST /api/register` với email của nạn nhân → `201`. Chủ email xin magic link → `202`, thư tới đúng chủ. Chủ bấm link → phiên của **cùng một user id** với tài khoản kẻ tấn công; cookie cũ của kẻ tấn công vẫn `200` và đăng nhập bằng mật khẩu của kẻ tấn công vẫn `200` (`audit-repro-auth.mjs`) |
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
| F10 | P3 | `postcss` trong `next` (4 advisory, chỉ lúc build); CORS cho phép mọi `http://localhost:*` kèm credentials ở production; ID `Math.random` ở nhiều nơi; `engines node >= 24` ở RevenueOps lệch với Node 22 của môi trường CI hiện tại; `fireEmail` không dùng `waitUntil` (chưa tái hiện lỗi); route công khai chỉ `publishing`/`intake` kiểm tra Origin, phần còn lại dựa vào SameSite=Lax mà `api.` và `ai.` cùng site | audit, đọc mã | Theo mục 5, bước 2.9 |

### Tổng hợp mọi phát hiện (tôi và ba reviewer, đã gộp trùng)

33 phát hiện riêng biệt: **1 P0 có điều kiện** (F1), **5 P1** (F2, F3, F4, F5, A1), **13 P2**, **14 P3**. Đã sửa trong đợt này: F9. Các cặp trùng đã gộp: F1 = C1; F2 = C6; F4 = A3 = B5 (đăng ký không xác minh, giới hạn chỉ theo email); F6 = C4; A1 = C5; A2 = C3. Phần lớn nằm ở mã kế thừa từ PR #1; các mô-đun mới của ops (Studio, intake, triage, RevenueOps) không có phát hiện riêng.

## 5. Kế hoạch hoàn thiện

Nguyên tắc: **AI làm hết phần nội bộ dưới 0 VND; chủ dự án chỉ duyệt và cấp quyền**. Mọi bước ghi vào hạ tầng thật hoặc nhánh của nhóm khác chờ lệnh rõ ràng. Mỗi bước có tiêu chí nghiệm thu chạy được.

### Giai đoạn 0 — đã xong hôm nay (trên PR #4)

- Bản vá cửa hàng F9, 25 unit + 57 e2e xanh, `next build` xanh.
- Báo cáo này, bộ script tái hiện trong `docs/money-engine/audit/` (R1–R5, chuỗi migration, trình duyệt) và kết quả của ba reviewer độc lập (mục 7).

### Giai đoạn 1 — hợp nhất (AI làm, cần "đồng ý" của chủ dự án vì tạo nhánh và PR mới)

| Bước | Việc | Nghiệm thu |
|---|---|---|
| 1.1 | Tạo nhánh `claude/integration` từ đầu nhánh ops, ghép `claude/money-engine-e2e`, giải 2 tệp bằng bản ops | `git diff` chỉ thêm tệp mới ngoài 2 tệp gốc |
| 1.2 | Chạy lại cả ba bộ (tsc, 25 unit, 57 e2e, `npm run verify` 166, `next build`) và kiểm `dist/site` | tất cả xanh; `dist/site` đúng 43 tệp, không `apps/`, `supabase/`, `engine/` |
| 1.3 | Thêm workflow GitHub Actions: job `ops` (`npm run verify`), job `store` (tsc, unit, e2e, build), job `browser` (bộ Chromium của mục 3.4), job `audit` (`npm audit --omit=dev`, không chặn) | CI xanh trên PR; chứng minh lần đầu có CI |
| 1.4 | Mở PR nháp vào `main`; kỳ vọng Cloudflare Pages xanh | check Pages xanh |
| 1.5 | Sau khi chủ dự án duyệt: đóng #1, #2 là "đã gộp vào PR mới", đóng hoặc đổi nền #3 và #4 | không mất lịch sử; một PR duy nhất mang cả hai dòng |

Không bước nào merge vào `main`; việc merge là của chủ dự án.

### Giai đoạn 2 — bảo mật và độ tin cậy (AI làm trên nhánh ghép; mỗi mục có test hồi quy dựng từ R1–R5)

| Bước | Việc | Nghiệm thu |
|---|---|---|
| 2.1 | F1 (+C1): bỏ seed admin khỏi 0003/0006, xóa đường đăng nhập mật khẩu thô, kèm kịch bản chuyển hàng cũ | R1 trả 401; test mới |
| 2.2 | F2 (+C6): giá theo danh mục phía server, whitelist `returnUrl`, xác thực create/get, ID ngẫu nhiên mạnh, giới hạn tốc độ | R4 đảo ngược: `amount` từ client bị bỏ qua, `returnUrl` lạ bị 400 |
| 2.3 | F3: máy trạng thái, so số tiền, xử lý intent lạ, chỉ phát lại khi trùng khóa receipts | R3a–c đều bị chặn; thêm test lỗi CHECK trả 500 để nhà cung cấp thử lại |
| 2.4 | **Đăng ký và đăng nhập** (F4, A1, A2, A3, A5, A7, A8, B5, C3, C5): xác minh email trước khi cấp phiên hoặc liên kết; đăng nhập Google/magic link vào hàng chưa xác minh thì xóa mật khẩu và phiên cũ; hai bộ đếm IP + email chỉ đếm lần sai, thêm Turnstile; nonce cookie cho Google, magic link xác nhận bằng POST và dùng một lần; `status = 'active'` ở mọi đường; Google không tự gắn `is_verified = 1` | R2a, R2b, R5 đảo ngược; magic link lần hai bị từ chối; tài khoản bị khóa mất mọi phiên |
| 2.5 | F5: sửa 0006, đổi số 0009, thêm test áp chuỗi từ rỗng và đối chiếu schema với truy vấn trong mã; baseline từ production sau C0 | chuỗi áp 13/13; test đỏ nếu thêm cột mà quên migration |
| 2.6 | **Giao diện** (F6, C4, B3): tách script inline ra tệp `.js` cùng nguồn **đồng thời** với thoát ký tự các điểm chèn `innerHTML` (`app/dashboard/index.html:123,132`, `assets/builder.js:157`); tách trước thoát sau sẽ mở lỗ XSS đang được CSP che. Đưa bộ Chromium vào CI | 0 lần "Refused to execute inline script"; test XSS với tên flow chứa thẻ HTML |
| 2.7 | **Nội dung và thành viên** (C2, A4, A6, A9, A10, A11, B7, B8): bài của thành viên đi qua Studio hoặc ít nhất tôn trọng `STUDIO_PUBLISH_ENABLED` và `status`; trần độ dài trường, enum `post_type`, `LIMIT` cho `/api/topics`; `ON DELETE CASCADE/SET NULL` để gỡ bài không lỗi và "rejected" ẩn bài; đếm phiếu tính lại từ bảng phiếu; sửa phân trang con trỏ; ID kiểu chuỗi ở hồ sơ; nhãn AI theo danh sách cho phép | gỡ bài có hàng đợi kiểm duyệt trả 200 và bài biến mất; trang 2 của bảng tin chạy |
| 2.8 | **Tự động hóa** (B1, B2, B4, B6, B9): connection chỉ nhận origin của `FLOW_API_URL`, `redirect: "manual"`, bearer chỉ tới origin đó, bỏ dữ liệu cá nhân khỏi payload, trigger lọc theo chủ; khóa callback gắn chủ, `moderate` cần `isModerator(chủ)`, khóa lưu dạng băm; trần trigger mỗi người; flows có cột chủ | `FLOW_API_KEY` không bao giờ tới host lạ; editor không duyệt được hàng đợi |
| 2.9 | **Triển khai và vệ sinh** (F10, C7, C8, C9): build theo danh sách tệp tường minh và test kiểm toàn bộ `dist/site`; gỡ Cloudflare account ID khỏi tài liệu công khai; kiểm Origin cho mọi route đổi trạng thái, bỏ `localhost` ở production; trần bản nháp mỗi người; `overrides.postcss` hoặc Next 16; thống nhất Node 22/24 | `dist/site` khớp manifest; audit sạch hoặc có ghi chú chấp nhận |

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

Ba reviewer là ba phiên con đọc song song, mỗi phiên một mảng, **không được biết kết luận của tôi** và chỉ được đọc (không sửa, không chạy mạng). Báo cáo của họ là đầu ra mô hình, không phải bằng chứng thực thi: tôi tự đọc lại các dòng mã của những điểm nặng nhất (A1, A5, A7, A11, B1, B2) và thấy khớp; các điểm còn lại ghi theo lời reviewer. Mã dòng dưới đây thuộc `workers/api/src/`.

Một ghi chú về cách làm: reviewer A, **không do tôi yêu cầu**, đã thử ngoại tuyến 96 mật khẩu mặc định phổ biến với hash admin trong migration `0006`: không khớp. Kết quả này không chứng minh mật khẩu mạnh và tôi không tiếp tục hướng đó; việc xoay mật khẩu ở F1 vẫn cần làm.

### 7.1 Xác thực và xã hội (reviewer A)

Không có P0 trong mảng này: mọi route ẩn danh hoặc của thành viên đều cần đăng nhập hoặc khóa bí mật.

| Mã | Mức | Phát hiện | Chỗ trong mã | Cách sửa |
|---|---|---|---|---|
| A1 | **P1** | **Chiếm tài khoản bằng đăng ký trước.** `POST /api/register` với email nạn nhân trả 201, không cần chứng minh sở hữu email. Khi nạn nhân sau đó đăng nhập bằng Google hoặc magic link, mã tìm theo email, gặp hàng của kẻ tấn công và cấp phiên trên đúng hàng đó; mật khẩu và phiên của kẻ tấn công còn nguyên, hai bên dùng chung tài khoản | `security-api.ts:134–256`, `google-oauth-api.ts:107–110`, `magic-link-api.ts:214–220` | Xác minh email trước khi cấp phiên; khi Google/magic link đăng nhập vào hàng chưa xác minh thì xóa mật khẩu và phiên cũ |
| A2 | P2 | Tham số `state` của Google chỉ là HMAC + hạn, không gắn với trình duyệt: kẻ tấn công tự đăng nhập Google, lấy URL callback cuối và đưa nạn nhân mở, nạn nhân thành người dùng của tài khoản kẻ tấn công (login CSRF). Magic link xác minh bằng GET cùng vấn đề | `google-oauth-api.ts:141–155, 186–189`; `magic-link-api.ts:183–236` | Cookie nonce HttpOnly đặt ở `/start` và bắt buộc ở callback; magic link xác nhận bằng POST |
| A3 | P2 | Đăng ký là công cụ gửi thư rác và tạo tài khoản ảo: giới hạn theo email đích (không theo IP), mỗi lần gửi thư chào mang chữ do người gọi chọn, 409 lộ email đã tồn tại. Cùng gốc với F4 | `security-api.ts:148–152, 181, 198–226` | Giới hạn theo IP và toàn cục, Turnstile, chỉ gửi thư sau khi xác minh, phản hồi trung tính |
| A4 | P2 | Trường không giới hạn kích cỡ làm sập bảng tin: `avatar_url` và `link_url` cỡ ~1,9 MB, 20 bài/giờ, `GET /api/posts` trả hàng chục MB; `post_type` không kiểm; `/api/topics` không LIMIT | `posts-api.ts:111–113, 162–178`; `security-api.ts:313–318`; `topics-api.ts:7` | Trần `link_url` 2048, avatar 512, thân 64 KB, enum `post_type`, LIMIT |
| A5 | P2 | `users.status` không bao giờ được kiểm: sau khi khóa tài khoản, cookie cũ vẫn đăng bài, bình luận, bỏ phiếu, và đăng nhập mật khẩu, magic link, Google vẫn cấp phiên mới. Chỉ `publishing-api` và `intake-api` có kiểm | `identity.ts:44–57`; `security-api.ts:97–115`; `magic-link-api.ts:214`; `google-oauth-api.ts:107` | Truy vấn phiên và mọi đường đăng nhập yêu cầu `status = 'active'`; xóa phiên khi khóa |
| A6 | P2 | **Gỡ bài thất bại vì khóa ngoại:** `DELETE /api/posts/:id` cho bài có hàng trong `ai_moderation_queue` hoặc `publishing_drafts` trả 500 `FOREIGN KEY constraint failed`, bài vẫn công khai; quyết định "rejected" chỉ đổi hàng hàng đợi. Bình luận cha có trả lời cũng vậy (reviewer thử trên SQLite, tôi chưa tái hiện) | `posts-api.ts:262`; `comments-api.ts:133`; `ai-api.ts:138`; migration 0005, 0009 | `ON DELETE CASCADE/SET NULL`; "rejected" phải ẩn bài |
| A7 | P2 | Mọi người đăng ký bằng Google nhận `is_verified = 1`, hiển thị huy hiệu "Đã xác thực"; đăng ký bằng mật khẩu nhận 0. Không có gì tách "email đã xác minh" khỏi huy hiệu tin cậy công khai | `google-oauth-api.ts:122`; `identity.ts:83`; `site.js:445` | Chèn 0, thêm cột `email_verified` riêng |
| A8 | P3 | Magic link dùng lại được nhiều lần trong 15 phút (mỗi lần cấp phiên) dù thư ghi dùng một lần; giới hạn theo IP nên nhiều IP làm ngập một hộp thư | `magic-link-api.ts:134–139, 160–166, 201–220` | Lưu id token kèm `used_at`; giới hạn theo email |
| A9 | P3 | Đếm phiếu hạ được bằng hai lần bỏ phiếu đồng thời (cùng thấy hàng, cùng trừ); chuyển 9 lên 10 bắn lại `vote_milestone` không giới hạn | `posts-api.ts:283–312`; `comments-api.ts:158–175` | Tính lại từ bảng phiếu trong một batch; giới hạn tốc độ |
| A10 | P3 | Hồ sơ và theo dõi hỏng với người dùng có ID dạng UUID (`Number(id)` thành NaN), trong khi `users.id` thật là UUID | `users-api.ts:13, 56, 60, 83` | Xử lý ID là chuỗi |
| A11 | P3 | Phân trang bằng con trỏ gắn 3 giá trị vào 2 chỗ giữ chỗ (`binds.push(cursor.ts, cursor.ts, cursor.id)`, dòng 104–107, tôi đã đọc), nên "tải thêm" lỗi hoặc so sánh sai; thư đăng nhập gửi không qua `waitUntil` | `posts-api.ts:104–107`; `router.ts:68, 73` | `binds.push(cursor.ts, cursor.id)`; truyền `ctx` |

Reviewer cũng kiểm tra và thấy ổn: SQL luôn tham số hóa; token HMAC-SHA256 so sánh hằng thời gian, có hạn, kiểm lại loại/người/email; phiên `randomUUID` (không cố định phiên), cookie HttpOnly, Secure, Lax; `role`, `status`, `is_verified` không bao giờ lấy từ client; xóa, bỏ phiếu, lưu, theo dõi, thông báo đều theo người dùng của phiên; JSON công khai không có email. Một nhận xét thêm: không có kiểm Origin ngoài Studio/intake, chỉ SameSite=Lax bảo vệ, mà `api.` và `ai.` cùng site.

### 7.2 Tự động hóa, webhook và gọi ra ngoài (reviewer B)

Không có P0. Các phát hiện dưới đây cần tài khoản "staff" (`admin`, `moderator`, `editor`); người tự đăng ký chỉ là `member` và bị 403 ở mọi route flow, connection, trigger, execution, draft.

| Mã | Mức | Phát hiện | Chỗ trong mã | Cách sửa |
|---|---|---|---|---|
| B1 | P2 (reviewer: P1; tôi hạ vì cần staff) | **SSRF và lộ `FLOW_API_KEY`.** `api_base_url` của connection chỉ kiểm giao thức http/https; mọi lần gọi trigger gắn `Authorization: Bearer FLOW_API_KEY` vào host đó. `fireFlowTriggers` không lọc theo chủ trigger, nên email người đăng ký mới (payload `user_registered`) và mọi sự kiện bài, bình luận, bỏ phiếu đều tới trigger của bất kỳ staff nào. Tôi đã đọc: không có kiểm host, IP, chuyển hướng | `n8n-api.ts:85–97, 200–208, 295–303`; `lib/webhooks.ts:31–43, 74–86` | Chỉ nhận origin của `FLOW_API_URL` (so khớp chính xác, kiểm lại lúc gửi), `redirect: "manual"`, chỉ gửi bearer tới origin đó, bỏ dữ liệu cá nhân khỏi payload |
| B2 | P2 | **Khóa callback không gắn với chủ.** `X-Connection-Key` của bất kỳ connection nào cho phép `moderate` (bỏ qua `isModerator`, `reviewed_by` để trống) và `notify` tới bất kỳ `user_id`, không giới hạn, không chống phát lại. Một editor thành "moderator" và có thể gieo thông báo "Hệ thống" cho ai cũng được. Tôi đã đọc | `webhook-inbound-api.ts:5–15, 35–37, 58–61`; `ai-api.ts:128` | Tra chủ của khóa, yêu cầu `isModerator(chủ)` cho `moderate`, giới hạn `notify`, lưu khóa dạng băm |
| B3 | P3 (reviewer: P2, PLAUSIBLE) | XSS lưu từ editor sang admin qua tên flow: dashboard chèn `${flow.name}` bằng `innerHTML`. CSP `script-src 'self'` chặn được, nhưng chính CSP đó cũng chặn script inline của trang (F6), nên cần xem header thật | `flows-api.ts:18, 26–39`; `app/dashboard/index.html:120–127` | `textContent`, kiểm tra tên phía server |
| B4 | P3 | Số trigger mỗi người không giới hạn, mỗi sự kiện gọi tuần tự cho tất cả; `/test` và `/run` không giới hạn (`/run` ghi "success" mà không chạy gì) | `n8n-api.ts:178–208, 295`; `webhooks.ts:31–63`; `flows-api.ts:107–114` | Trần trigger mỗi người, `LIMIT`, giới hạn tốc độ |
| B5 | P2 | Hạn mức theo người dùng vượt được bằng nhiều tài khoản (cùng gốc A3/F4): mỗi tài khoản 20 tóm tắt AI/giờ, 10 verify/giờ, 20 bài/giờ có gọi AI kiểm duyệt nếu bật AI | `ai-api.ts:14–19, 72–77`; `posts-api.ts:152, 206` | Giới hạn theo IP và toàn cục, xác minh email trước khi dùng AI |
| B6 | P3 | Khóa connection lưu thô, trả lại ở mọi lần liệt kê; xóa connection hoặc trigger vi phạm khóa ngoại (`n8n_webhooks.connection_id`, `n8n_trigger_log.webhook_id` không có `ON DELETE`) nên khóa lộ không thu hồi được | `n8n-api.ts:66, 75, 131, 242`; migration 0005 | Lưu băm, hiện một lần, xóa theo tầng, thêm vô hiệu hóa |
| B7 | P3 | Nhãn do mô hình AI trả về được chèn nguyên, kể cả `verified`, và giao diện hiển thị thành huy hiệu "Đã kiểm nguồn" | `lib/ai.ts:51–56`; `site.js:119–134` | Danh sách nhãn cho phép, không bao giờ `verified` hoặc `hot` |
| B8 | P3 | Tóm tắt AI chấp nhận mọi `post_id`, không kiểm `visibility = 'public'`, kết quả lưu ở `ai_jobs` (staff đọc được) | `ai-api.ts:29–32, 91–94` | Kiểm `visibility` |
| B9 | P3 | `index.ts` trả nguyên `error.message` (có chữ ràng buộc D1; cookie phiên hỏng cho 500 "URI malformed"); flows, drafts, executions không có chủ nên mọi staff đọc, ghi, chạy mọi flow; token push mobile bị gắn lại cho người gọi, không trần | `index.ts:19–25`; `flows-api.ts:18, 66`; `mobile-api.ts` | Thông báo lỗi chung, thêm cột chủ, trần token |

Reviewer cũng kiểm tra và thấy ổn: auto-post bị khóa cứng (423), `POST /api/posts` từ chối Bearer và ép `is_verified = 0`, nên không callback nào đăng bài dưới danh nghĩa hệ thống hoặc người khác; liệt kê, xóa, test và log của connection, trigger đều theo `user_id`; SQL tham số hóa; hàng đợi kiểm duyệt và quyết định cần `isModerator`; mặt phẳng email nội bộ đóng khi thiếu `INTERNAL_EMAIL_TOKEN`; URL mail và AI lấy từ biến môi trường; khóa callback ngẫu nhiên 122 bit; mẫu email thoát ký tự; `staging.ts` có allowlist hẹp.

### 7.3 Studio, intake, RevenueOps, giao diện (reviewer C)

Mảng này gồm các mô-đun mới của ops cộng với giao diện và cấu hình build. Reviewer không tìm thấy lỗi riêng trong Studio, intake, triage, staging worker và RevenueOps; các phát hiện dưới đây nằm ở route kế thừa mà các mô-đun mới dựa vào, ở giao diện và ở build.

| Mã | Mức | Phát hiện | Chỗ trong mã | Cách sửa |
|---|---|---|---|---|
| C1 | (trùng F1) | Mật khẩu admin gieo vẫn có thể được chấp nhận nếu production chưa làm trống cột. Thêm một hệ quả: admin là người duyệt của Studio, nên chiếm admin cho phép duyệt bài của người khác (tự duyệt bài của mình vẫn bị SQL chặn) | `0003:2`; `security-api.ts:106`; `publishing-api.ts:80` | Như F1 |
| C2 | P2 | **Cổng Studio không chặn đăng bài.** Bất kỳ thành viên nào (đăng ký mở) `POST /api/posts` là có ngay một hàng `visibility = 'public'` (20 bài/giờ/tài khoản), không qua duyệt, bất chấp `STUDIO_PUBLISH_ENABLED=false` và `users.status`; còn kích hoạt kiểm duyệt AI và trigger flow. Chỉ Bearer và `ai_bot` bị chặn (423). Tôi đã đọc: cờ chỉ được dùng trong `publishing-api.ts` | `posts-api.ts:143–200`; `wrangler.toml:8` | Đưa bài của thành viên qua Studio, hoặc ít nhất kiểm cùng cờ và `status` |
| C3 | P2 (trùng A2) | Login CSRF: kẻ tấn công đưa nạn nhân URL callback/magic link của chính mình; nạn nhân thành người dùng của tài khoản đó, rồi gửi brief hoặc bản nháp, kẻ tấn công đăng nhập và đọc `GET /api/intake/briefs`, gồm cả `contact`. `/api/login` cũng không kiểm Origin và đọc JSON bất kể Content-Type (`staging.ts` thì có kiểm) | `magic-link-api.ts:124, 220–236`; `google-oauth-api.ts:141, 186`; `security-api.ts:70`; `request-object.ts:3` | Nonce cookie, xác nhận bằng POST, kiểm Origin ở route auth, hiện tên tài khoản trên trang brief |
| C4 | P2 (trùng F6) | CSP chặn được XSS nhưng cũng làm hỏng 7–8 trang. Reviewer không thấy script cùng nguồn nào phản chiếu dữ liệu nhập; `studio.js`, `triage.js`, `intake.js`, `actions.js`, `sample.js`, `site.js` dùng `textContent` hoặc `escHtml`. Lưu ý: **tách script ra ngoài sẽ làm lộ các điểm chèn chưa thoát** ở `app/dashboard/index.html:123,132` và `assets/builder.js:157`. Trang chi tiết bài (`post/index.html`) chết nên liên kết "đã xuất bản" của Studio (`studio.js:37`) không hiển thị; `static.test.mjs:17` chỉ kiểm trang login | `_headers:9`; các trang nêu trên | Tách script và thoát ký tự cùng lúc |
| C5 | P2 (trùng A1) | Đăng ký chưa xác minh cộng với việc Google/magic link gắn chủ thật vào hàng có sẵn. Thêm kịch bản: kẻ tấn công đăng ký trước địa chỉ sắp trở thành reviewer hoặc operator (`STUDIO_OPERATOR_IDS`, role) và giữ quyền mật khẩu, kể cả với các brief được chia sẻ | `security-api.ts:134`; `google-oauth-api.ts:107`; `magic-link-api.ts:214` | Như A1 |
| C6 | P2 (trùng F2) | Payment intent ẩn danh, `amount`, `purpose`, `returnUrl` do người gọi chọn, `GET /api/payment/:id` không xác thực | `payment-api.ts:47–140`; `router.ts:50` | Như F2 |
| C7 | P3 | Bản nháp Studio không có trần mỗi người và không giới hạn tốc độ (50 KB/bản nháp + dòng audit); cộng với việc có thể tạo tài khoản không giới hạn, có thể làm cạn D1 | `publishing-api.ts:87–99`; `security-api.ts:148–153` | Giới hạn theo IP và toàn cục, Turnstile, trần bản nháp |
| C8 | P3 | `publishing-api` chỉ kiểm Origin ở thao tác ghi (`intake-api` kiểm cả đọc). CORS có credentials chấp nhận các origin anh em và mọi `http://localhost:*`, cookie Lax được gửi từ origin cùng site, nên một subdomain bị chiếm có thể đọc mọi bản nháp với tư cách reviewer và gọi các route ghi cũ không kiểm Origin | `publishing-api.ts:75, 84`; `intake-api.ts:185`; `response.ts:3–11, 29`; `wrangler.toml:13` | Áp kiểm Origin của intake cho mọi route, bỏ localhost ở production |
| C9 | P3 | `tools/build.mjs` xuất bản mọi `.html/.js/.json` dưới mười thư mục, còn `static.test.mjs` chỉ kiểm vài tệp có tên, nên một tệp lạc hoặc chưa theo dõi có thể lọt khi tải thẳng. Repo công khai chứa một Cloudflare account ID (`docs/operations-archive/OPERATIONS_ROUNDS_2026-10.md:2460`, tôi đã xác nhận có và không chép lại; cùng dòng ghi gói Workers là Paid) | `build.mjs:11–15`; `static.test.mjs:5–9` | Manifest tệp tường minh; gỡ ID khỏi tài liệu công khai |

Reviewer cũng kiểm tra và thấy ổn: **Studio** (người duyệt và chủ bản nháp lấy từ phiên cộng vai trò trong DB, không từ client; không tự duyệt được, bị chặn cả ở mã lẫn SQL `reviewer_id <> author_id` và CHECK ở `0009:13`; sửa bản nháp đặt lại trạng thái duyệt; mọi chuyển trạng thái là so sánh-và-đổi theo phiên bản; xuất bản là một batch nguyên tử với `posts.source_draft_id` duy nhất nên không đăng đôi; SQL tham số hóa; hiển thị văn bản thuần). **Intake/triage** (chỉ chủ đọc, đồng ý được ép ngay trong SQL ghi, danh sách operator đóng khi thiếu cấu hình, biên nhận theo (actor, khóa), hạn mức nằm trong câu INSERT, không ghi PII vào log). **Staging worker** (allowlist route, CORS viết lại, giới hạn thân, auth mặc định tắt, script chuẩn bị từ chối ID D1 production). **RevenueOps** (JWT RS256 kiểm kid/iss/aud/exp/nbf, không nhận jku/jwk, vai trò chỉ từ cấu hình server, 503 khi thiếu biến Access, kiểm Origin ở POST, tách worker/reviewer/finance, mặc định ngân sách 0 và dừng khẩn cấp, không có AI binding hay cron, checkout trả 423; actor dev chỉ nằm ở `tools/dev.mjs` và không được `worker.ts` import). **Build** (bỏ symlink và tệp ẩn, `docs/` chỉ `index.html`, mẫu công khai được kiểm là hư cấu, `dist/site` hiện tại không có worker, migration, kế hoạch hay bí mật, không thấy khóa hay token trong cây tệp).

## 8. Hạ tầng đã quan sát (chỉ đọc)

- **Supabase** (tổ chức dùng chung, `ap-southeast-1`): 6 dự án, trong đó 4 đang chạy. Dự án mới nhất `sibank-us` tạo 05/11 (không phải của Money Engine, chưa mở). **Chưa có `sach-muonnoi-store`**; hiện không dự án nào của cửa hàng bị đụng.
- **Vercel** (đội dùng chung): 7 dự án; `groundstead` tạo 06/11, `namtrieu10d` cập nhật sáng nay (ngoài phạm vi repo này). Dự án `sach-muonnoi` có đủ 13 bản build từ trước tới nay, **tất cả `ERROR`**: 1 bản mang nhãn production từ `codex/revenueops-publishing` (15/10), 11 bản từ nhánh ops (16–17/10) khi Git tích hợp còn chạy trên mọi nhánh, 1 bản từ `claude/money-engine-draft` (20/10). Từ 31/10 đã tắt bản xem trước, không có bản mới. Chưa có triển khai thành công nào của cửa hàng.
- **Cloudflare, D1 production, miền `ai.muonnoi.org`, payOS, PayPal:** không có quyền, không kiểm. Mọi nhận định về chúng là suy luận từ mã và biên nhận của ops.
- **Ngoài phạm vi:** repo `namtrieu10d` và mọi repo khác không được gắn vào phiên này. Muốn audit thêm, cần chủ dự án chỉ định repo để gắn.

## 9. Điều tôi không kiểm được

Triển khai thật (Pages, Vercel, Workers), dữ liệu D1/Supabase thật, luồng payOS và PayPal bằng khóa thật, email gửi thật, hành vi của runtime Cloudflare với `waitUntil`, và mọi thứ nằm trên máy cá nhân của các nhóm (kể cả bản vá `C1`).
