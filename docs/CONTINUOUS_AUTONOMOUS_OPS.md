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
| 3c | A01 outline + 30 prompt skeleton + mẫu HTML (không bán) | **Xong local** — `.local/continuous/a01-prep-20261019T1226/` (12/30/30 practice + license; sync outline) |
| 3d | A01 30 ngày thực hành skeleton + license draft local | **Xong local** — `.local/continuous/a01-practice-20261020T1432/` (30 ngày, 6 bảng, license nháp; chưa bán) |
| 3e | A01 validator tái lập với receipt digest + tamper probe | **Xong local** — `.local/continuous/a01-validator-20261020T1440/`; positive exit 0, byte-change probe bị từ chối exit 1 |
| 3f | A01 entitlement/revoke fixture deny-by-default local | **Xong local** — `.local/continuous/a01-entitlement-20261020T1450/`; 24 checks, use-after-revoke và ID reuse bị chặn |
| 3g | A01 delivery/recovery rehearsal có manifest + failure path | **Xong local** — `.local/continuous/a01-delivery-recovery-20261020T1538/`; 8 file/36.076 bytes, 7 failure path bị chặn |
| 3h | A01 measurement/reconciliation rehearsal, actuals null khi thiếu nguồn | **Xong local** — `.local/continuous/a01-measurement-20261020T1641/`; 30 checks, test reconciliation không nâng actuals |
| 3i | A02 candidate matrix theo ngành, chỉ local draft có source/rights gate | **Xong local** — `.local/continuous/a02-candidate-matrix-20261020T1744/`; 3 candidate, 0 selected, 0 verified cases |
| 3j | A02 retail structure + evidence packet fail closed | **Xong local** — `.local/continuous/a02-retail-draft-20261020T1800/`; 20 quy trình, 40 prompt, 10 case hư cấu, evidence counts 0 |
| 3k | S01/A01 checkout + merchant launch gate local, khóa catalog/giá/receipt | **Xong local** — `.local/continuous/s01-a01-checkout-gate-20261020T1845/`; 54 checks, `RECONCILED_TEST_ONLY`, actuals null; production create-intent chưa catalog-bound |
| 3l | Candidate hardening create-intent catalog-bound + test, không deploy | **Xong local** — `.local/continuous/create-intent-harden-20261020T125229Z/` · **15/15** checks · `applied_to_production=false` · P1 production còn mở |
| 3m | A03 crawler sandbox contract + SSRF refusal fixtures | **Xong local** — `.local/continuous/a03-crawler-sandbox-20261020T2035/`; 63 checks, DNS/HTTP requests 0, actuals null |
| 3n | A03 packet hư cấu: 10 trang, evidence schema, 20 finding ưu tiên | **Xong local** — `.local/continuous/a03-report-packet-20261020T135600Z/` · **77 checks** · auth trống · live_fetch=false |
| 3o | A04 CSV schema + rubric dữ kiện (local draft, không đăng sàn) | **Xong local** — `.local/continuous/a04-csv-rubric-20261020T2135/`; 20 row, 53 checks, source/rights/ready rows đều 0 |
| 3p | A05 source-rights + fidelity contract cho input được cấp quyền | **Xong local** — `.local/continuous/a05-rights-fidelity-20261020T155311Z/` 29 checks + `a05-source-rights-fidelity-20261020T2255/` 44 checks; sources/rights 0, content generated false |
| 3q | A06 entitlement 90 ngày + revoke fixture (local) | **Xong local** — `.local/continuous/a06-entitlement-20261020T165316Z/` · 12 bài + 30 thực hành skeleton · **25 checks** · revoke + support cap |
| 3r | A07 brand-brief calendar contract (30 ngày, không ads/inbox) | Tiếp theo |
| 4 | Staging remote biệt lập trên Cloudflare Free | `BLOCKED` INFO-CF-FREE — **không dừng hàng đợi** |
| 5 | Runbook/receipt liên tục; không tạo lịch trùng | Loop PID **53356** · tick `2026-10-20T16:52:11Z` |

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
