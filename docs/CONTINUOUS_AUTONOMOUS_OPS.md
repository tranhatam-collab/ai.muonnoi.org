# Kế hoạch vận hành tự động liên tục — 19/10/2026

**Mục tiêu Founder:** AI làm việc tự động 100%. Founder **chỉ phê duyệt** (và gửi INFO khi sẵn sàng). Founder **không** bị giao việc vận hành. AI **không idle chờ** Founder — mục thiếu INFO đánh `BLOCKED` rồi chuyển việc khác ngay. Hộp duyệt duy nhất: `docs/FOUNDER_APPROVAL_ONLY.md`.

**HOLD cho live/thương mại** vẫn giữ cho đến khi có receipt gate tương ứng. Kế hoạch này không cấp quyền deploy, DNS, secret, thanh toán, đăng mạng xã hội hoặc chi tiền.

## 1. Source và lịch

| Trường | Giá trị |
|---|---|
| Repo | `tranhatam-collab/ai.muonnoi.org` |
| Nhánh | `codex/ai-muonnoi-autonomous-ops` |
| Worktree | `/private/tmp/ai-muonnoi-autonomous-ops` |
| Ngân sách | 0 VND |
| AI provider đã chọn | Cloudflare Workers AI — chưa bật binding |
| Lịch Codex | `ai-muonnoi-continuous-revenue-execution` `ACTIVE` `FREQ=HOURLY` — đang `usage_limit_exceeded` tới khoảng 24/10/2026 08:02 |
| Lịch Cursor (phiên này) | Loop monitored mỗi 3600 giây · sentinel `AGENT_LOOP_TICK_muonnoi_hourly` · PID xem OPERATIONS mới nhất; Automation Glass form đã mở để Founder bật lịch bền ngoài phiên chat (một lần) |
| Lịch Worker | `workers/revenueops/config/schedule.json` — tất cả `enabled=false` (0 VND; không tự bật phí) |
| Chế độ Founder | **100% tự động nội bộ** — AI không hỏi từng giờ; chỉ báo khi cần `AP-*`, Free account ID, merchant, kênh, hoặc P0/P1 có evidence |

## 2. Phân công

### AI tự làm mỗi giờ (không hỏi)

1. Khóa identity: remote, nhánh, HEAD, worktree dirty.
2. Đọc `docs/OPERATIONS.md` mục mới nhất; chọn đúng **một** việc nội bộ còn làm được.
3. Thực hiện tới receipt (test/build/local CLI/probe đọc-only).
4. Cập nhật `docs/OPERATIONS.md` với thời điểm, SHA, exit code, giới hạn.
5. Bảo toàn lane team và file dirty chưa được giao.
6. Actuals thiếu nguồn giữ `null`. Không bịa doanh thu, không nâng preview thành production.

### Chỉ báo Founder khi (duyệt / INFO — không giao việc)

- Cập nhật `docs/FOUNDER_APPROVAL_ONLY.md` rồi thông báo ngắn: có mục `AP-*` sẵn sàng tick.
- INFO-* AI không tự lấy được (Free account, merchant, kênh, people) — liệt kê, **không** yêu cầu Founder tự cấu hình/deploy/test.
- P0/P1 mới có bằng chứng.
- Hết việc nội bộ an toàn dưới hạn mức 0 VND (hiếm; thường luôn còn docs/fixture/probe).

### Cấm khi thiếu quyền rõ

Deploy production, Reactivate DNS, đổi secret, migration remote vào DB đang phục vụ, thanh toán, email/SMS, đăng mạng xã hội, ads, thuê người, mở AI/cron có phí.

## 3. Hàng đợi nội bộ ưu tiên (có thể chạy khi thiếu account Free)

Trạng thái đối chiếu Sóng 0 (`docs/PRODUCT_PORTFOLIO_1_TO_3_YEARS_FOUNDER_APPROVAL.md` §6):

| # | Việc | Trạng thái |
|---|---|---|
| 0a | Identity + zero-budget + Studio review khóa auto-post | Xong (local) |
| 0b | Staging kit local + checklist đọc-only | Xong — `docs/STAGING_KIT_CHECKLIST.md`; `npm run prepare:intake:staging`; placeholder Free account / D1 |
| 0c | Portfolio 14 SKU thuyết minh Founder | Xong draft — chờ `AP-*` |
| 1 | Củng cố test/tooling Pilot (revision, handoff, recovery, artifact boundary) | Dirty còn đó; test `node --test` 8/8 pass trên worktree |
| 2 | Probe đọc-only domain/DNS/HTTP/CSP; ghi receipt, không sửa | **Revalidated** `2026-10-19T12:25:37Z` — body SHA unchanged; domain≠Pages ops vẫn `CONTRADICTED` |
| 3 | Đóng gói diff local thành baseline review có hash độc lập | **Xong local** — `.local/continuous/pilot-dirty-baseline-20261019T111829Z/` |
| 3b | Hộp duyệt Founder-only | **Xong** — `docs/FOUNDER_APPROVAL_ONLY.md` |
| 3c | A01 outline + 30 prompt skeleton + mẫu HTML (không bán) | **Xong local** — `.local/continuous/a01-prep-20261019T1226/` (12/30/1; practice_days 0/30) |
| 3d | A01 30 ngày thực hành skeleton + license draft local | Tiếp theo |
| 4 | Staging remote biệt lập trên Cloudflare Free | `BLOCKED` INFO-CF-FREE — **không dừng hàng đợi** |
| 5 | Runbook/receipt liên tục; không tạo lịch trùng | Loop PID **31600** (tick `2026-10-20T06:47:00Z`) |

Thứ tự mỗi giờ: việc mở nhỏ nhất số → bỏ qua `BLOCKED` → không commit Pilot dirty trừ khi `AP-PILOT-DIRTY`.

## 4. Khi có đầu vào Founder

| Đầu vào | Việc AI làm ngay |
|---|---|
| Account ID Cloudflare Free | Xác minh plan/quota; điền staging kit; không dùng account Paid làm Free |
| Access + 2 danh tính thử | E2E auth/triage trên staging biệt lập |
| Merchant/đối soát | Contract test + importer chỉ đọc; test loại khỏi KPI |
| Một kênh sở hữu + consent | Pilot nội dung không ads; đo sample_view… không quy thành tiền |

## 5. Định nghĩa “đã chạy liên tục”

Một vòng đạt khi có: source receipt, một việc hoàn tất hoặc `BLOCKED` có lý do cụ thể, cập nhật OPERATIONS, và không chờ Founder nếu còn việc nội bộ. Lịch chỉ “sống” khi host còn quota/session; Codex hết hạn mức thì Cursor loop hoặc Automation Glass phải thay thế cho đến khi Codex chạy lại.
