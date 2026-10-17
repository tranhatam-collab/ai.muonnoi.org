# Audit intake và thay đổi được phép — 2026-10-15

> Cập nhật 17/10/2026: nội dung bên dưới là snapshot 15/10 của lane cũ. Receipt hiện hành cho lane `codex/ai-muonnoi-autonomous-ops`, 75 kiểm thử local, brief intake, mẫu Pilot và lịch nội bộ nằm trong `docs/OPERATIONS.md` (mục Vòng triển khai Pilot). Đường dẫn `evidence/verification.json` trong snapshot là tương đối với thư mục docs (`docs/evidence/verification.json`); giữ là receipt lịch sử, không dùng làm kết quả kiểm thử mới. Production vẫn HOLD; triển khai static preview không đóng các gate Worker/DB/đối soát.

**Verdict: HOLD cho production/thương mại.** Phạm vi là baseline nguồn và kiểm thử local của nhánh mở rộng. Đây là verification của người xây, chưa thay independent audit/Founder acceptance. Không có phát hiện mới P0 đang khai thác được chứng minh; các blocker P1 bên dưới ngăn release.

## Identity và candidate

Remote canonical `git@github.com:tranhatam-collab/ai.muonnoi.org.git`; baseline chọn `origin/feat/flow-mvp-backend` tại `6c58845a716ba0ca28b42191fabb93efe9fc33db`, nhánh mới `codex/revenueops-publishing`. Main `3e0cac697cc36a923929d76ca63adf86440badb1` thiếu phần API/feed hiện có. Checkout khác dưới muonnoi.org cùng remote ở `2b4ab3f84c587329d2b9a44e91d32f4d0b0ee8e2` có staged/unstaged/untracked, được bảo toàn. Repo parent muonnoi.org là remote khác, không dùng thay.

Receipt đầy đủ path/working tree giữ trong `.local/source-receipt.json`. Mã đang review phải đối chiếu commit PR và hash nguồn trong `evidence/verification.json`; baseline gốc không phải SHA của implementation mới.

## Blocker và điều chỉnh

| Mức | Phát hiện ở baseline / khoảng thiếu | Hành động, phạm vi |
|---|---|---|
| P1 | Bearer/Flow auto-post đưa bài public và tự gắn is_verified=1 | Nhánh mới khóa hai đường máy bằng 423; Studio dùng review phiên bản, is_verified luôn 0. Chưa xác minh live đã dùng mã mới |
| P1 | Pages build output là repo root | Nhánh mới build allowlist vào dist/site; kiểm tra artifact loại Worker, plan, SQLite. Provider build settings chưa kiểm tra |
| P1 | Chưa có provider receipt, staging schema/auth/domain, social account/scope, ngân sách AI | Giữ publishing/AI/crons/commerce/social khóa, không deploy hay migrate remote |
| P1 | Sản phẩm A01–A10, nguồn nhu cầu/QA/merchant/đối soát chưa đủ | Theo PROJECT_PLAN và backlog; không nhận đơn hoặc báo đạt mục tiêu |
| P1 | Auth/payment/email/Flow cũ chưa có E2E, seed admin lịch sử cần xử lý khi tiếp nhận DB | Không chạy seed, không công nhận toàn API production-ready từ typecheck/bundle |

## Claim ledger

| Claim | Trạng thái | Receipt / giới hạn |
|---|---|---|
| Có executable Studio và publishing API | VERIFIED_WORKTREE_ONLY | source + SQLite negative/concurrency tests, D1/workerd local, UI fixture |
| Có 10 Agent điều phối và tính mô hình | VERIFIED_WORKTREE_ONLY | module/config, unit/API/auth, Durable Object/workerd local |
| Toàn API compile strict | VERIFIED_WORKTREE_ONLY | typecheck:api; không chứng minh flow cũ E2E |
| Tiền thực/đã đạt 55 triệu mỗi ngày | REPORTED_UNVERIFIED | mục tiêu kinh doanh, thiếu chứng từ; actuals giữ null |
| Cloudflare deployed, DNS, runtime, AI và tài khoản social | NOT_CHECKED | chưa có provider/session cần thiết và không thực hiện live actions |
| Vận hành nền, alert, DR và Founder release approval | NOT_CHECKED | chỉ có runbook/local persistence, cần receipt đúng environment |

## Kiểm chứng local

Receipt canonical: `evidence/verification.json`, command/exit/count/time/hash; raw logs không push vì có đường dẫn máy. Website UI thử lưu → gửi → reviewer độc lập → duyệt → tác giả sửa: trở về DRAFT v2; dirty form khóa submit/publish. Màn hình 390 và 1280 không tràn ngang. Ảnh `evidence/studio-desktop.jpg` là dữ liệu fixture trên loopback.

API D1/workerd tìm được khác biệt metadata do audit trigger; điều kiện cập nhật đã sửa theo số thay đổi dương và kiểm lại bằng D1 thật trong workerd local. Build module dùng `--config` tường minh để không nhận nhầm Pages config ở parent.

## Nguồn kế hoạch và thực tế

Đã đọc văn bản đính kèm, các HTML báo cáo/kế hoạch và cấu trúc workbook chín sheet/381 formula trong thư mục intake. ZIP source được báo cáo nhắc tới chưa được cung cấp. Log 47/56 test lịch sử không phải test đã chạy lại. Không đẩy tài liệu bán A01, dữ liệu nguồn, workbook hoặc thông tin tài khoản vào repo công khai. Các giả định giá/sản lượng trong module là mô hình, chưa phải giá duyệt hay số bán thực.

Các candidate trước đó trỏ về workspace repo hoặc checkout riêng dirty, nên không được dùng như bằng chứng readiness. Quyết định dùng ai.muonnoi.org dựa trên chỉ đạo D06 và phần feed/auth/Flow/API đã có ở đúng remote baseline; không phải đánh giá provider toàn portfolio.

Probe public ngày 2026-10-15T15:42Z trả HTTP 200, title “AI Muôn Nơi — Công cụ AI cho cộng đồng người Việt”, digest HTML `368c7e70d6dc0bd3b4b5d44027d52a242cf4a3f34016cbb17ccb2dfcabe9f8a5`. Đây chỉ là VERIFIED_CURRENT cho HTTP/title của trang chủ, chưa map được SHA/deployment; không chứng minh feature branch, Studio, đăng nhập hoặc API live. Công cụ web ban đầu không truy cập được; probe HTTP trực tiếp sau đó thành công, không kết luận outage.

Receipt local 2026-10-15T15:42:07–15:42:10Z: 13/13 publishing SQLite, 1/1 publishing D1/workerd, 1/1 artifact exposure, 34/34 RevenueOps, 1/1 Durable Object/workerd; tổng 50 tests, 50 pass, 0 fail/cancelled/skipped/TODO. Typecheck API/module và hai build local exit 0. Không có receipt GitHub CI hoặc production.
