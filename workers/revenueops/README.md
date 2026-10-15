# RevenueOps module

Nền tảng local cho 10 cấu hình Agent, nằm trong repo ai.muonnoi.org theo quyết định Founder ngày 2026-10-15. Tài liệu canonical là `../../docs/PROJECT.md`, `../../docs/PROJECT_PLAN.md` và `../../docs/OPERATIONS.md`.

Node 24: `npm ci --ignore-scripts --no-audit --no-fund`, `npm run dev` để mở loopback cổng 8787. Không expose server dev ra Internet. Trên Cloudflare, API nội bộ yêu cầu Access RS256 JWT, issuer/audience và role map phía server; config chưa khai báo route/AI/crons.

`npm run verify`, `npm run typecheck`, `npm run build` (dry-run), `npm run test:worker`. `backup:local` và `restore:drill` dùng SQLite riêng trên máy, chưa chứng minh restore production.

Policy mặc định 0 VND, emergency stop, AI/hiring/commerce/publishing/scheduler tắt. `run-daily` chỉ tạo phiếu chuẩn bị deterministic không trùng theo ngày Việt Nam. Chưa có bridge tự động sang Studio, adapter social, checkout/delivery, bank reconciliation import hoặc người thật được chỉ định. Giá và tiền trong scenario là giả định, actuals thiếu chứng từ giữ null.
