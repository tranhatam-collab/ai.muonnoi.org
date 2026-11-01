# Runbook phát triển và tiếp nhận vận hành — cập nhật 2026-11-01

**NO_GO cho live:** public source/migration exposure được xác minh lại ngày 01/11/2026. Chủ dự án là Founder; operational/support/security owner, escalation và SLO còn chờ chỉ định. Không coi laptop hoặc receipt local là hệ vận hành 24/7.

Các vòng 17–28/10/2026 đã chuyển nguyên văn sang `docs/operations-archive/OPERATIONS_ROUNDS_2026-10.md`.

## Vòng Claude — đối soát Giai đoạn 1 — 01/11/2026, 19:37 (UTC+7)

**Verdict: `HOLD` · production `NO_GO` · docs đối soát vào nhánh ops qua commit chứa dòng này; nhánh vá `C1` chưa commit, chưa push; chưa deploy.** Source: `tranhatam-collab/ai.muonnoi.org` · `codex/ai-muonnoi-autonomous-ops` · base `dd3688a3a7686b51b80c49c308db66c487379397` · worktree mới `~/Dev/ai-muonnoi-ops`.

**Blocker:** cần `INFO-PROD-ACCESS` cho `C0` và `C2`. Live vẫn trả 200 cho `wrangler.json`, migration `.sql`, `workers/api/wrangler.toml`, source `.ts`, `package.json`, `tsconfig.base.json`. Deployment ID, deployed SHA, custom-domain mapping và schema D1 production vẫn chưa rõ.

**Sự cố:** worktree `/private/tmp/ai-muonnoi-autonomous-ops` hỏng và gần hết `.local/` đã mất; 155/156 đường dẫn evidence trong docs không còn file. Docs tracked không mất. Chi tiết ở `docs/CONTINUOUS_AUTONOMOUS_OPS.md` §0.

**Evidence:**
- Clone mới khớp `origin` tại `dd3688a`. 20 file còn sót được chép vào `.local/rescued-from-tmp-20261101/` kèm `MANIFEST.sha256`.
- `npm run verify` trên HEAD sạch: tests **166**, pass **166**, fail/cancelled/skipped/todo 0, exit 0 (`.local/receipts/baseline-verify-20261101T122948Z.log`, SHA-256 `1c048003c8871145839a8979de698d420fa6bba048deecb3254b9236fdec160b`).
- Live probe HEAD: `.local/continuous/live-head-probe-20261101T123531Z/receipt.json`, SHA-256 `3c58ba555eb5cd9b62f4ed517789eec8110fcf01394fb28a69c066cc9d219dbc`; 7 request, body 0, retry 0.
- Nhánh vá `C1` (worktree riêng, chưa commit, base `dd3688a`): tests **172**, pass **172**, fail 0, exit 0 (`.local/receipts/fix-verify-20261101T123403Z.log`, SHA-256 `b48f0c6a0f0c29d42ab5968127cdbfe1c47e01f18f10538ee64a73e5e4af6119`). Trên source chưa vá, 4/6 test mới fail; 2 test còn lại kiểm tra hành vi giữ nguyên nên pass cả hai phía. Build 43 file, không có file cấm.

**Work completed:** gắn nhãn hàng §3 có artifact đã mất; sửa bảng lịch theo thực tế; thêm đường găng `C0`–`C6`; đóng băng `3fa` theo `AP-WAVE`; ghi chú 3 AP mất artifact; thêm `INFO-PROD-ACCESS`, `AP-P0-SEC-FIX`, `AP-LOOP-POLICY`, `AP-EVIDENCE-STORE` ở trạng thái chờ; tách lưu trữ vòng cũ.

**Đính chính:** một đánh giá trước đó về `P0-SEC` đã kết luận quá mức. Hạng mục này là có điều kiện và RG3 giữ `HOLD` tới khi `C0` có kết quả.

Target, forecast, pipeline, invoiced, paid, refunds, fees và collected cash actual đều `null`.

**Việc tiếp theo:** `C0` khi có `INFO-PROD-ACCESS`. Việc AI làm được trong lúc chờ: `C3` (commit và push docs khi được duyệt) và `C4`.

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
