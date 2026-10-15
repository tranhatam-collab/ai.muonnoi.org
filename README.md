# ai.muonnoi.org

Nhà Chung: viết và chia sẻ nhiều chủ đề có giá trị; Studio biên tập và nền tảng vận hành 10 Agent.

Nhánh mở rộng: `codex/revenueops-publishing`, từ `feat/flow-mvp-backend` tại `6c58845a716ba0ca28b42191fabb93efe9fc33db`. Đây là thay đổi để review, **HOLD cho production và thương mại**. Kết quả local không xác nhận hệ thống live hoặc doanh thu.

## Chạy và kiểm tra trên máy

Yêu cầu Node.js 24. Cài công cụ từ lockfile của module RevenueOps:

```sh
npm --prefix workers/revenueops ci --ignore-scripts --no-audit --no-fund
npm run dev:studio
```

Mở `http://127.0.0.1:8789/studio/`. Tác giả/biên tập viên trong bản thử là danh tính fixture, chỉ có trên loopback. SQLite thử nghiệm nằm ở `.local/studio.sqlite`, không có dữ liệu production. Xuất bản vẫn khóa.

```sh
npm run verify
node tools/verify-receipt.mjs
```

`verify` kiểm kiểu toàn API, kiểm thử luồng nháp/duyệt/xuất bản bằng SQLite và D1/workerd local, đóng gói website, kiểm rò file, rồi kiểm module 10 Agent và Durable Object. Build Worker dùng `--dry-run`, không deploy. Receipt theo hash nguồn: `docs/evidence/verification.json`; log chi tiết giữ local ở `.local/verification/`.

`npm run dev:revenueops` mở bàn điều hành loopback cổng 8787. Đây là module nội bộ riêng, chưa kết nối tự động với Studio.

## Phần mở rộng

- `/studio/`: sáu dạng bài, chủ đề tự chọn, nguồn tham khảo, quyền sử dụng và nhãn AI; tải bản viết về máy.
- `/api/publishing/*`: session có trạng thái active, quyền tác giả/biên tập viên, phiên bản, audit chỉ thêm, giao dịch xuất bản và chống trùng. Duyệt không cấp nhãn đã xác minh.
- `workers/revenueops`: 10 cấu hình Agent, kịch bản tài chính, quỹ đặt trước, dừng khẩn cấp, phiếu việc hằng ngày và nghiệm thu lao động. Tiền thực chưa có nguồn giữ `null`.
- Pages chỉ nhận `dist/site` từ `npm run build`. Không deploy thư mục repo gốc. Plans, Worker source, SQLite và sản phẩm private không nằm trong gói website.

Lưu ý khi nâng cấp: Bearer auto-post và Flow/n8n auto-post cũ trả `423 USE_REVIEWED_PUBLISHING_STUDIO`; không còn tự đánh dấu bài của máy là đã xác minh. Session đăng bài thông thường vẫn dùng luồng hiện có. Các API payment/mail/AI cũ còn tồn tại và cần kiểm duyệt riêng trước release.

Tài liệu canonical: [project](docs/PROJECT.md), [kế hoạch và mục tiêu](docs/PROJECT_PLAN.md), [audit và blocker](docs/AUDIT.md), [runbook](docs/OPERATIONS.md).

## Kiến trúc

- Frontend public: static HTML/CSS/JS
- Frontend admin-lite: static app shell trong `/app/*`
- Backend: Cloudflare Workers
- Database: Cloudflare D1
- Automation hiện có: Flow; module mới chọn Cloudflare Workers AI nhưng chưa bật binding/call, scheduler hoặc mạng xã hội. Hạn mức được duyệt hiện tại: 0 VND.

## Cấu trúc repo
- `/`: homepage public, route `login`, `profile`, `post`, `docs`
- `/app`: dashboard và builder nội bộ sau đăng nhập app access
- `/workers/api`: Cloudflare Worker API cho auth, social, AI, Flow API triggers và flows nội bộ
