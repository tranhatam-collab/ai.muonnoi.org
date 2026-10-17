# Runbook phát triển và tiếp nhận vận hành — cập nhật 2026-10-17

**HOLD cho live.** Chủ dự án là Founder; operational/support/security owner, escalation và SLO còn chờ chỉ định. Không coi laptop hoặc receipt local là hệ vận hành 24/7.

## Vòng triển khai Pilot — 17/10/2026

Phạm vi cập nhật: lane `codex/ai-muonnoi-autonomous-ops`, remote `tranhatam-collab/ai.muonnoi.org`, worktree `/private/tmp/ai-muonnoi-autonomous-ops`, parent `f1be6f22ab0fbdef5c8460350d0b352d7ca44104`. Thay thông tin lane và lịch nội bộ ngày 15/10; các receipt preview lịch sử bên dưới giữ nguyên thời điểm. Không sửa hai checkout team khác.

- `/offers/brief/`: soạn/tải JSON trên máy; gửi có chủ đích khi intake được bật và có session active. Trang Pages preview chỉ hoạt động offline, không gửi tới API production.
- `/offers/sample/`: 12 bản nháp đầy đủ (4 caption, 4 kịch bản video, 3 carousel, 1 bài dài), lịch minh họa 14 ngày. Tình huống Mộc Giấy hoàn toàn hư cấu; không phải campaign hay khách hàng thật. Bản đầy đủ và quy trình bàn giao: `operations/pilot-sample.md`.
- `/api/intake/*`: default-off bằng `STUDIO_INTAKE_ENABLED`; `expected_actor_id` phải khớp session, Origin đúng, dữ liệu giới hạn và quyền tư liệu bắt buộc. Chỉ tác giả xem được brief, kể cả admin khác cũng không được đọc. Tối đa 20 brief/tài khoản; đây là quota tổng, chưa có cơ chế reset được mở.
- Mã gửi gắn với tài khoản + nội dung bất biến; timeout giữ trạng thái chờ đối soát, retry không tạo bản thứ hai. Trình duyệt chỉ lưu account ID nội bộ, request key, fingerprint và receipt ID; không tự lưu nội dung riêng tư. Không log brief.
- `0010_studio_intake.sql` là migration additive. Chưa chạy từ xa, chưa bật flag. Hai migration `0009` hiện hữu phải được đối chiếu lịch sử `d1_migrations` trước kế hoạch remote; không chạy toàn bộ seed cũ.
- Đăng nhập chỉ chấp nhận return URL cùng origin; đã chặn protocol-relative/backslash chuyển sang site ngoài.

### Receipt kiểm thử local

Ngày 17/10/2026, `npm run verify` exit 0: **75 tests, 75 pass, 0 fail/cancelled/skipped/TODO**. Theo suite: publishing 13; payment/email security 5; payment D1/workerd 1; publishing D1/workerd 1; intake D1/workerd 9; intake client 8; static/login redirect 3; RevenueOps 34; Durable Object/workerd 1. Typecheck API/module và build static/module exit 0; Worker build là dry-run. Artifact static 39 file chọn lọc, chỉ xuất thêm JSON mẫu hư cấu được chỉ định; không xuất thư mục operations hoặc Worker.

Chromium cục bộ dưới CSP đã thử: tải draft JSON (không receipt), bấm gửi fixture → receipt, reload → đối chiếu đúng một bản đã lưu. Form và sample có scrollWidth bằng 390 tại viewport 390; sample cũng không tràn tại 1440. Sample render đủ 12 nội dung và 14 ngày, mở đọc được nội dung. Có một 404 favicon trên lần mở form đầu; không thấy lỗi JavaScript/CSP. Log và ảnh ở `.local/verify-2026-10-17.log`, `output/playwright/` (ignored, chỉ dữ liệu giả lập). `npm run dev:intake` tái tạo máy chủ 127.0.0.1:8790 với SQLite tạm trong bộ nhớ; không gọi API ngoài.

Kiểm thử này chưa chứng minh đăng nhập thật, production D1, email/thanh toán, tiếp nhận người mua, hoặc deploy Worker. Tiền đã đối soát: **chưa có nguồn kết nối/receipt**, giữ actuals `null`, không ghi thành doanh thu 0 hay doanh thu dự báo.

### Receipt preview Pilot — 17/10, 08:15 giờ Việt Nam

- Source đã push: `9dc2611104995a735d7c5b336a74bc1baec0d77c`, đúng repo/nhánh ở trên; worktree sạch sau commit.
- Cloudflare Pages deployment: `e87fac08-cd2c-4fe9-8526-21df1fbec21a`; Dashboard báo `success`, duration 20 giây; log clone đúng full SHA, chạy `node tools/build.mjs`, đọc `pages_build_output_dir: dist/site`, build 39 file (38 assets upload và một rule headers).
- Mẫu đã mở bằng trình duyệt: https://e87fac08.ai-muonnoi-org.pages.dev/offers/sample/ — DOM đủ 12 asset, 14 ngày; không có console error/warning được thu trên tab này.
- Brief đã mở: https://e87fac08.ai-muonnoi-org.pages.dev/offers/brief/ — ghi rõ bản xem trước, các nút gửi/đối chiếu online disabled; không thao tác gửi dữ liệu trên preview.
- Probe HTTP trực tiếp để so hash bị HTTP 403; vì vậy byte-for-byte hash live chưa được xác nhận. Receipt trình duyệt và provider không bị diễn giải thành bằng chứng cho việc so hash đó.
- Không deploy Worker, áp migration, đổi DNS/secrets hoặc mở intake production trong bước này. Latest production row trên Pages vẫn là snapshot lịch sử `65d8737`; chưa kết luận custom domain đang phục vụ artifact nào từ row này.

Lịch mỗi giờ đã cập nhật thành công qua Codex, giữ `ACTIVE`: mỗi vòng chọn việc nội bộ còn khả thi và làm tới receipt, ưu tiên provider/staging, operator triage có phân quyền/đồng ý chia sẻ và gói bàn giao; không tạo lịch trùng hoặc nâng ngân sách.

### Lịch nội bộ đã kiểm tra lại

Các cấu hình Codex heartbeat cùng chat đều `ACTIVE` tại lần đọc 17/10; giờ theo Asia/Ho_Chi_Minh:

| Nhịp | Giờ / mục tiêu |
|---|---|
| Mỗi giờ | Kiểm tra source/gates và hoàn thành việc nội bộ tiếp theo; thông báo khi thay đổi có ý nghĩa |
| Hằng ngày | 08:00 — vận hành, nội dung, kiểm thử, receipt |
| Hằng tuần | Thứ Hai 09:00 — funnel, delivery, chi phí và tiền đã đối soát |
| Hằng tháng | Ngày 1, 10:00 — báo cáo vận hành và kế hoạch tháng |
| Hằng năm | Ngày 2/1, 11:00 — chiến lược, khả năng khôi phục, quyền truy cập |

Đây là lịch gọi chat Codex; cần host/scheduler hoạt động. Chưa có receipt bảo đảm chạy liên tục 24/7 ở hạ tầng ngoài. Worker cron, social scheduler, AI calls và kế toán thanh toán vẫn chưa được kích hoạt.

### Việc tự động tiếp theo

1. Chốt source và đối chiếu preview artifact cho thay đổi Pilot; giữ preview offline intake.
2. Đọc metadata Worker/Pages/D1 bằng tài khoản đã được cung cấp, lập bản đồ staging biệt lập và kế hoạch migration có rollback; chưa suy đoán production route.
3. Hoàn thiện operator triage có phân quyền/đồng ý chia sẻ trước khi bật intake khách thật. Bản hiện tại chỉ cho tác giả đọc, chưa là hàng đợi tiếp nhận của bộ phận xử lý.
4. Sau khi có tên/ID tài khoản do Founder quản lý, cấu hình từng kênh và lưu receipt. Chưa có danh sách cụ thể thì tiếp tục nội dung và kiểm thử, không gửi thử tới người ngoài.

## Môi trường và dữ liệu

Frontend build từ root bằng `npm run build`, artifact duy nhất là `dist/site`. API cũ trỏ D1 production trong `workers/api/wrangler.toml`; không chạy migration script vào target đó để thử nghiệm. Module RevenueOps có config dev/staging/production riêng, không route, không cron, không AI binding. Không reuse D1/DO production làm test.

Studio development server chỉ phục vụ allowlist ba asset và publishing API tại 127.0.0.1:8789. Hai danh tính fixture khác nhau mô phỏng tác giả và reviewer; không phải đăng nhập thật. Module RevenueOps ở 127.0.0.1:8787 inject actor local có quyền owner. Không expose hai server này ra LAN/tunnel.

## Staging trước release

1. Khóa repo/commit/artifact, đọc provider metadata và xác định branch production hiện hành; không giả định feature branch là live.
2. Tạo kế hoạch staging biệt lập sau khi xác nhận tài khoản, free quota và hạn mức; cần quyết định riêng nếu có thể phát sinh phí. Không copy production secrets/data vào code.
3. Kiểm schema hiện tại sau 0008; backup trước khi áp dụng migration thêm 0009. Không chạy seed admin lịch sử 0003/0006. Test migration trên bản sao được làm sạch rồi mới xin thực hiện remote.
4. Đăng nhập thật bằng hai danh tính được chỉ định; thử active/suspended/expired session, quyền tác giả, reviewer độc lập, stale version, nguồn, sửa sau duyệt, gửi lặp và audit. Kiểm CSP, CORS, cookie API/frontend, public feed/post route.
5. `STUDIO_PUBLISH_ENABLED=false` đến khi nghiệm thu và approval gắn đúng SHA/environment. Việc bật không tự bật social hoặc Workers AI.
6. RevenueOps cần Access issuer/audience, server role mapping, DO persistence, provider cost controls và AI eval độc lập. Giữ kill switch; không đưa session Studio sang DO như một actor tự khai.
7. RG0–RG13, monitoring, restore/rollback và Founder domain sign-off phải có receipt trước release. Local D1/workerd chỉ chứng minh môi trường local.

### Receipt preview Pages — 2026-10-16

Cloudflare Pages đã xuất bản preview cho nhánh `codex/ai-muonnoi-autonomous-ops` tại commit `46885ac`:

- deployment ID: `c2c99973-2bcd-4556-ba15-f5154a302797`;
- URL: `https://c2c99973.ai-muonnoi-org.pages.dev`;
- alias: `https://codex-ai-muonnoi-autonomous.ai-muonnoi-org.pages.dev`;
- status: success, 16 giây;
- build command: `node tools/build.mjs`;
- artifact: `dist/site`, 30 tệp public được chọn lọc, không gồm Worker source, plan, secret hoặc dữ liệu runtime.

`/login/` và `/assets/login.js` trên preview đều trả `200`; CSP đang là `script-src 'self'`, do đó script login cùng nguồn được phép tải. Đây chỉ là receipt artifact tĩnh; không xác nhận OAuth, session, Worker API, email, payment hay production.

Custom domain `ai.muonnoi.org` trong project Pages hiện `Inactive` và Dashboard yêu cầu CNAME `ai` trỏ tới `ai-muonnoi-org.pages.dev`. Không reactivate hoặc sửa DNS cho đến khi xác định lại binding live hiện hành, branch production, Worker API, D1 migration, secret và rollback receipt. Preview không chuyển traffic production.

## Dừng và khôi phục

Studio: tắt `STUDIO_PUBLISH_ENABLED`, giữ bản nháp và audit. Không xóa bài/lịch sử bằng SQL để che sự cố; xử lý bài đã public qua quy trình moderation có người chịu trách nhiệm. Rollback API về artifact đã xác minh; migration 0009 là additive và giữ dữ liệu, không drop bảng để rollback. Restore phải thử trên DB biệt lập và đối chiếu số bài, source_draft_id duy nhất, revision và audit trước khi phục hồi thật.

RevenueOps: owner gọi POST `/api/stop` từ đúng origin sau Access; lệnh dừng được lưu bền. Giữ quỹ/nghĩa vụ đã nhận. `npm --prefix workers/revenueops run backup:local` rồi `restore:drill` chỉ kiểm SQLite local. Backup/restore D1/DO production, retention, encryption, RPO/RTO và rollback deployment hiện chưa kiểm tra.

## Nhịp làm việc và kênh

Lịch Worker đề xuất 08:00/12:30/17:30/23:45 Asia/Ho_Chi_Minh ở registry đều disabled. `run-daily` hiện tạo 10 phiếu chuẩn bị không dùng AI, không gửi nội dung. Lịch chat Codex ở bảng cập nhật phía trên là lớp điều phối riêng; không kích hoạt social scheduler hoặc AI runtime.

Trước mỗi kết nối kênh: account/page ID và owner, OAuth scope tối thiểu, hạn mức, expiry/revocation, người duyệt, quyền nội dung và mục tiêu bài. Dùng API chính thức được nền tảng cho phép. Adapter phải chống trùng theo account+content hash+slot; timeout đánh dấu UNKNOWN, kiểm tra provider trước retry. Dừng kênh khi mất quyền, sai nội dung, phản ánh spam hoặc hết hạn mức. Chưa có adapter social executable.

## Theo dõi và hỗ trợ

Trước live phải chốt SLI save/review/publish, tỉ lệ lỗi, độ trễ hàng chờ, duplicate count, số lần denied, chi phí theo nguồn, backup và restore. SLO 99,5% pilot là đề xuất cần phê duyệt. Audit không lưu token/raw prompt; log ứng dụng cũ cần rà soát riêng. Chưa có alert route hay synthetic monitor thật; không hứa trực vận hành khi chưa có owner và receipt.
