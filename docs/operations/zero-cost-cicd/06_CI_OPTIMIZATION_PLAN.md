# 06 · Kế hoạch tối ưu CI/CD (Giai đoạn E)

Nguyên tắc áp dụng: không xóa workflow (hiện không có), không đụng production, không thêm GitHub-hosted compute, mọi thay đổi ngoài repo cần Owner duyệt. Trạng thái: **DONE** (đã làm và có bằng chứng trong PR này), **OWNER** (cần Owner thao tác hoặc duyệt), **N/A** (không áp dụng vì không có workflow), **PENDING**.

## 1. Biện pháp

| # | Biện pháp | Trạng thái | Bằng chứng / ghi chú |
|---|---|---|---|
| M1 | Không thêm workflow GitHub-hosted; cấm lịch chạy, runner lớn, thiếu timeout/concurrency/permissions qua kiểm tra chính sách | **DONE** | bước `workflow-policy` của `scripts/ci/local-verify.sh`; thử âm tính: workflow xấu bị FAIL 6/6 tiêu chí, workflow mẫu đạt (`08`) |
| M2 | CI cục bộ thay GitHub-hosted: `scripts/ci/local-verify.sh` chạy dòng ops (166 test), dòng store (tsc, 25 unit, 57 e2e, audit, build), kiểm tra cấu hình, mẫu bí mật, bề mặt `dist/site`; ghi JSON có SHA và thời điểm | **DONE** | chạy trên 4 cây (`08`); không dùng mạng ngoài registry npm; không sửa tệp được theo dõi |
| M3 | Hủy lượt cũ (concurrency), timeout, bỏ retry vô hạn | **N/A** hiện tại | không có workflow; có sẵn trong mẫu `templates/ci.workflow.yml.template`, và bị ép bởi M1 nếu sau này có |
| M4 | Path filters cho monorepo | **OWNER** | GitHub: không áp dụng (0 workflow). Cloudflare Pages: đặt **Build watch paths** (dashboard) để push chỉ ảnh hưởng `apps/store/**` hay `supabase/**` không kích hoạt build trang tĩnh. Danh sách đề xuất bên dưới. Cú pháp: UNVERIFIED (tài liệu bị chặn) |
| M5 | Bỏ qua build cho commit chỉ tài liệu | **OBSERVED** (chưa có đối chứng) | commit `212f7bc` mang `[CF-Pages-Skip]` và `[skip ci]`; sau ~90 giây không có check run Pages nào (bình thường: vài giây). Chi tiết và giới hạn ở `09` |
| M6 | Kiểm soát nhánh preview của Pages (chỉ nhánh cần, loại `claude/cf-probe-*`, `claude/optimistic-sammet`) | **OWNER** | dashboard; tránh tiêu hạn mức build cho nhánh thử |
| M7 | Vercel: giữ preview theo nhánh **tắt** (đã tắt 31/10); khi bật lại, thêm "Ignored Build Step" để chỉ build khi `apps/store` đổi, và chỉ bật sau khi nhánh đích đã có thư mục `apps/store` | **OWNER** | 12/13 build lỗi trước đây do thư mục gốc `apps/store` không có ở nhánh bị build (`02`); không đổi cấu hình dự án khi chưa duyệt |
| M8 | Sửa cây `main` (package.json hỏng) và làm Pages xanh | **OWNER** (quyết định hợp nhất) | không sửa ở PR này vì hai cách sửa gần nhất đều có hệ quả: chép `package.json`/`wrangler.json` của #1 đặt output `.` và xuất bản cả thư mục gốc; cách an toàn là hợp nhất nhánh ops (có `tools/build.mjs`, output `dist/site`). Xem `13` |
| M9 | Cache phụ thuộc, giảm retention artifact | **N/A** | không có workflow, 0 artifact. Mẫu ghi chú cách bật cache đúng khóa nếu sau này cần |
| M10 | Giảm tần suất workflow định kỳ | **N/A** | không có workflow `schedule` |
| M11 | Không tự động commit output, không vòng lặp commit → workflow | **DONE** (không có cơ chế nào như vậy) | không workflow; M1 bắt buộc `permissions: contents: read` trong mẫu |
| M12 | Không chạy mã PR không tin cậy với quyền cao | **DONE** (không áp dụng) | không có `pull_request_target`/`workflow_run`; kiểm tra chính sách cảnh báo nếu xuất hiện. Quy tắc cho `local-verify.sh`: chỉ chạy trên máy không giữ bí mật hoặc với mã đã được người tin cậy xem |
| M13 | Xóa 8 nhánh `claude/cf-probe-*` và `claude/optimistic-sammet` | **OWNER** | proxy git của phiên này không cho xóa nhánh; theo nguyên tắc 1 cũng không xóa |

## 2. Build watch paths đề xuất cho Pages (UNVERIFIED cú pháp)

Bao gồm: `index.html`, `site.js`, `style.css`, `_headers`, `robots.txt`, `sitemap.xml`, `agents/**`, `app/**`, `assets/**`, `blog/**`, `data/**`, `login/**`, `offers/**`, `post/**`, `profile/**`, `studio/**`, `docs/index.html`, `tools/build.mjs`, `operations/data/pilot-sample.json`, `wrangler.json`, `package.json`.
Loại: `apps/**`, `supabase/**`, `engine/**`, `workers/**`, `tests/**`, `scripts/**`, `docs/**` (trừ `docs/index.html`).
Lý do: danh sách bao gồm đúng các tệp mà `tools/build.mjs` sao chép hoặc đọc (`operations/data/pilot-sample.json` được đọc để tạo `offers/sample/data.json`).

## 3. Quy tắc cho workflow trong tương lai

1. Không thêm workflow khi chưa có Owner duyệt bằng văn bản.
2. Chỉ `ubuntu-latest` hoặc phiên bản Ubuntu cố định; không runner lớn; không `schedule` (trừ khi Owner duyệt và có tính toán phút).
3. `permissions: contents: read`, `concurrency` với `cancel-in-progress`, `timeout-minutes` ≤ 15, không retry vô hạn, không bí mật, không commit ngược.
4. `paths` hẹp theo thư mục. Dùng mẫu `templates/ci.workflow.yml.template` (không hoạt động) làm điểm xuất phát.
5. Repo phải còn công khai thì runner tiêu chuẩn mới không tốn phí theo chính sách GitHub; **chưa xác minh** từ môi trường này (`03`, `12`).
6. Chạy `scripts/ci/local-verify.sh` trước khi thêm: bước `workflow-policy` phải PASS.

## 4. Hạn chế của kế hoạch này

Bộ CI cục bộ không đặt được commit status hay required check trên GitHub; muốn vậy cần quyền ghi trạng thái và Owner duyệt (không làm trong đợt này). Cho tới lúc đó, bằng chứng đi kèm PR là tệp `local-verify.json` do người chạy đính kèm; chưa phải cổng tự động.
