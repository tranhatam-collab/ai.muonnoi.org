# Runbook phát triển và tiếp nhận vận hành — cập nhật 2026-10-17

**HOLD cho live.** Chủ dự án là Founder; operational/support/security owner, escalation và SLO còn chờ chỉ định. Không coi laptop hoặc receipt local là hệ vận hành 24/7.

## Vòng chia sẻ và tiếp nhận Studio — 17/10/2026

Phạm vi: repo `tranhatam-collab/ai.muonnoi.org`, nhánh `codex/ai-muonnoi-autonomous-ops`, worktree `/private/tmp/ai-muonnoi-autonomous-ops`, baseline đầu vòng `1ea2690517796fe5802e2cdecaa23165e48047e5`. Phần này thay danh sách việc tiếp theo của vòng Pilot; receipt lịch sử giữ nguyên thời điểm. Không sửa hai checkout team khác.

### Blocker hiện hành và provider đọc lúc 08:30–08:35 (UTC+7)

| Claim/lớp | Trạng thái | Receipt và ý nghĩa |
|---|---|---|
| Chi thêm được cấp | `VERIFIED_CURRENT` | Chỉ đạo Founder: 0 VND. Không dùng số billable hiện tại để tự nâng ngân sách. |
| Workers plan | `VERIFIED_CURRENT` | Dashboard account `93112cc89181e75335cbd7ef7e392ba3`, Workers plans: **Paid — Current plan, $5/month + usage**. D1 hiển thị soft limit cho reads/writes/storage. Chưa có bằng chứng hard cap cho dự án, không hứa staging/AI miễn phí từ free-tier tài liệu. Không đổi subscription. |
| Worker cùng tên source | `VERIFIED_CURRENT` | `ai-muonnoi-api` Overview: version hiển thị `55a3c17d`, Wrangler/manual deployment lịch sử, **Bindings 0, Domains 0, workers.dev Disabled, custom domains/routes trống**. Đây không phải receipt backend vừa xây. Không dùng tên Worker để kết luận api.muonnoi.org chạy source này. |
| D1 identity | `CONTRADICTED` | Repo `workers/api/wrangler.toml` ghi `iai-flow-db` ID `3ceac8b1-1c0f-47c3-ad05-2b9da0983c32`; Dashboard toàn bộ 10 DB có tên `iai-flow-db` nhưng ID **`73993529-9b2e-42c2-8d40-5b05525ecf4b`**. Không có ID source trong danh sách. Chỉ bác bỏ phép coi cùng tên là cùng DB; chưa kết luận DB source bị xóa hay thuộc account khác. Không đọc row/data hoặc thay ID. |
| CLI deployment auth | `BLOCKED` | `wrangler whoami` báo chưa xác thực. Dashboard đang đăng nhập không đồng nghĩa CLI có quyền deploy. Không tạo token/OAuth. |
| Staging runtime | `BLOCKED` | Chưa có D1 riêng, cấu hình origin/Access và danh tính thử được chỉ định, receipt kiểm soát chi phí. Bundle local cố ý có placeholder và flags tắt. |
| Tiền đã đối soát | `BLOCKED` | Chưa kết nối nguồn đơn/giao dịch/settlement; actuals vẫn `null`. Workbook/giá/brief/receipt kỹ thuật không phải doanh thu. |

Founder đã chọn **sẽ chỉ định tài khoản Cloudflare Free riêng** trong phiên 17/10. Chưa có account ID mới; generator dùng `__CLOUDFLARE_FREE_ACCOUNT_ID_REQUIRED__` thay vì account Paid đang audit. Khi nhận ID, xác minh plan/quota/quyền và D1 riêng trước khi điền target, không suy đoán tài khoản từ tên đăng nhập.

### Implementation hiện tại

- Tác giả giữ brief riêng tư mặc định, kể cả brief cũ. `/offers/brief/` cho phép chia sẻ có chủ đích và thu hồi quyền xem; không mở đơn, thanh toán, email hay đăng bài. Thu hồi chặn lần đọc sau, không thể xóa thông tin người vận hành đã đọc.
- `/studio/intake/` chỉ đọc brief đang được chia sẻ; backend bắt buộc session active và ID trong `STUDIO_OPERATOR_IDS`, không kế thừa quyền admin. `STUDIO_INTAKE_ENABLED` và `STUDIO_TRIAGE_ENABLED` đều default-off.
- Trạng thái: `RECEIVED → IN_REVIEW → NEEDS_INFORMATION / PROPOSAL_READY / DECLINED`; bổ sung thông tin quay lại `IN_REVIEW`. Phản hồi hiển thị cho tác giả; không có ghi chú nội bộ trong field này. Hai trạng thái cuối kết thúc vòng xử lý, không chứng minh đã bán hay đã giao.
- Migration `0011_studio_triage.sql` tách consent/state khỏi brief bất biến và giữ event bất biến. Version, actor, request key và payload hash chống gửi lặp/ghi đè; event và state cùng transaction D1. Thu hồi chặn cả operator retry receipt cũ.
- Client chỉ lưu metadata chống trùng. Timeout giữ chưa xác nhận; cùng key chỉ retry đúng payload. Operator có thể tạm gác thao tác chưa đối soát theo brief để tiếp tục hàng chờ; khôi phục giữ key/version/hash cũ, không tạo key mới cho brief đang chờ. Nội dung phản hồi không tự lưu; bản tải về do người vận hành chủ động giữ.
- Đã xử lý response cũ quay về sau storage/account invalidation bằng epoch ở hai giao diện. Đã chuẩn hóa ID tài khoản thành chuỗi để fixture/legacy ID số hoạt động như ID text; không rewrite dữ liệu production.
- Workbook `operations/pilot-commercial-workbook.md` + JSON: bốn phạm vi khớp catalog, năm record mẫu, một đề xuất Pilot hư cấu chưa gửi, hai kịch bản công sức 8/12 giờ là giả định. Không đưa dữ liệu khách thật vào Git; operations không vào artifact web.

### Bundle staging biệt lập và lệnh local

`npm run prepare:intake:staging` chỉ sinh `.local/intake-staging/wrangler.toml` và `schema.sql`, không chạy Wrangler remote. Schema gồm base sạch + 0010 + 0011; không seed admin, người dùng hay mật khẩu; không chạy chuỗi migration legacy. Config khóa tên `ai-muonnoi-studio-staging`, placeholder D1 riêng, không custom route/cron/AI/mail/payment binding. Không dùng D1 trong source hay D1 cùng tên trên Dashboard làm staging.

Entrypoint `workers/api/src/staging.ts` chỉ có health, auth tối thiểu và intake. `STAGING_AUTH_ENABLED=false` khóa login/logout/me trước D1; chỉ mở sau receipt Access, danh tính thử và budget. Các route payment/email/AI/register/OAuth/feed/workflow cũ bị từ chối. Auth yêu cầu origin staging chính xác cho mutation, cookie host-only Secure/Lax, body tối đa 24 KB. Login rate-limit legacy vẫn có thể ghi D1 theo email khi auth được bật; không dùng kiểm soát này thay hard cap/Access. Trước rollout: xác minh tài khoản/budget, D1 riêng, origin/Access và test identities; áp schema chỉ vào DB staging đã chốt, kiểm hai phía, giữ kill switch; không chạm DNS hay secret production. Rollback bằng tắt flags/đổi artifact đã xác minh, giữ DB/event cho đối soát, không DROP dữ liệu.

Lệnh kiểm chứng: `npm run verify`; `npm run dev:intake` mở fixture 127.0.0.1:8790, SQLite trong RAM và danh tính giả lập. Endpoint `/__preview/identity` chỉ tồn tại trong server local và bị ràng buộc Host/Origin/loopback; không thuộc artifact public. Lịch mỗi giờ và hằng ngày đã đọc lại ngày 17/10: `ACTIVE`. Các lịch khác giữ receipt bảng bên dưới; không tạo bản trùng.

### Receipt local của vòng triage

`npm run verify` ngày 17/10/2026 exit 0: **100 tests, 100 pass, 0 fail/cancelled/skipped/TODO**. Các suite: publishing 13; payment/email security 5; payment D1/workerd 1; publishing D1/workerd 1; intake D1/workerd 9; intake client + numeric identity 9; action journal 12; triage D1/workerd 9; staging 3; static/login redirect 3; RevenueOps 34; Durable Object/workerd 1. Typecheck và build exit 0; Worker build là dry-run. Log `.local/verify-triage-2026-10-17-final.log` (ignored). Sau bổ sung kiểm tra manifest cho asset mới, suite static/login chạy lại 3/3.

Chromium local dưới CSP: tạo brief → riêng tư → cấp quyền → operator thấy đúng một brief → lưu phản hồi → tác giả thấy phản hồi → thu hồi → queue operator trống. Giao diện tác giả và operator đều có `scrollWidth=390` tại viewport 390. Ảnh fixture ở `output/playwright/triage-mobile.png`, `brief-revoked-mobile.png`; không phải dữ liệu khách thật. Lần smoke đầu phát hiện ID số được SQLite chuyển thành text khác dạng; đã sửa canonical actor và thêm regression, rồi tái tạo fixture và chạy lại thành công. Favicon local chưa có (404); không thấy lỗi CSP/JavaScript trong happy path sau sửa.

Failure path trong Chromium: chặn phản hồi sau khi backend local đã commit → giữ pending → đọc history đối chiếu đúng receipt; chặn trước khi gửi → tạm gác → chọn lại brief → nhập lại đúng nội dung → xác nhận thành công với **cùng request key**, phiên bản tăng đúng một. Queue cập nhật cùng trạng thái detail sau lưu/đối soát. Desktop 1440 có scrollWidth=1440; ảnh `output/playwright/triage-desktop.png`. Hai lỗi mạng trong console ở failure path là do route.abort chủ động của test, không diễn giải thành happy-path lỗi.

Các receipt này chỉ chứng minh local source/test; chưa chứng minh auth thật, remote D1, staging deployment, production, kênh bán hàng hay thu tiền. Artifact web hiện **43 file public chọn lọc**; workbook/schema/source Worker không thuộc artifact. Giá và hai phép tính công sức trong workbook đã kiểm khớp catalog và tổng; chỉ kiểm schema subset tại local, chưa chạy validator JSON Schema đầy đủ.

### Receipt GitHub và preview triage — 17/10, 08:40 (UTC+7)

- Source push thành công: `785c7da623e4bbaaa4a3426345dea289eb760c71` vào đúng nhánh `codex/ai-muonnoi-autonomous-ops`. Không merge production.
- Cloudflare Pages deployment **`a1dea1f2-e456-483f-b809-9d57009961b7`**, status **success**, duration 18 giây; log clone đúng full SHA, build `node tools/build.mjs`, output `dist/site`, 43 file chọn lọc/42 assets + rule headers, không có Functions.
- Preview đã mở bằng trình duyệt: https://a1dea1f2.ai-muonnoi-org.pages.dev/studio/intake/ — ghi rõ offline, không tải brief khách, nút đọc/ghi disabled; không có error/warning trong log tab tại lần kiểm. Đó là receipt trang tĩnh, không phải backend live.
- Sau receipt code này, Founder chọn tài khoản Free riêng: chỉ đổi placeholder account trong generator + assertion tương ứng và tài liệu, không đổi asset web; staging suite chạy lại **3/3**, exit 0. Chờ account ID mới và danh tính thử, không dùng account Paid vừa audit.

## Vòng triển khai Pilot — receipt lịch sử 17/10/2026

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

### Việc tự động tiếp theo (cập nhật sau vòng triage)

1. Đối chiếu source/preview của thay đổi triage với receipt mới nhất; Pages preview giữ offline, không gọi production intake.
2. Giải quyết ánh xạ Worker/D1 và hạn mức 0 VND trước staging remote; không thay ID cùng tên, không dùng Paid như tài khoản Free. Chuẩn bị Access/test identities/CLI auth theo tài khoản được chỉ định.
3. Tiếp tục gói bàn giao và rehearsal từ brief → scope → review → acceptance → đối soát bằng dữ liệu hư cấu; dùng workbook có sẵn, không tự ghi lead hay tiền thật.
4. Sau khi có URL/ID tài khoản mạng xã hội do Founder quản lý và integration được cấu hình, thực hiện hành động được phép ở đúng điểm đến và lưu receipt; hiện chưa có danh sách đó.

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
