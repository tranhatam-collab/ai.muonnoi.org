# 13 · Quyết định GO / HOLD

## Quyết định: **PARTIAL**

Không tuyên bố GO. Phần việc không cần quyền ngoài (kiểm toán, tuyến CI cục bộ, hồ sơ, kiểm thử, quét bí mật) đã hoàn thành và có bằng chứng. Phần cần quyền Cloudflare, Billing hoặc quyết định của Owner ở trạng thái BLOCKED/HOLD.

## Đối chiếu tiêu chuẩn nghiệm thu

| # | Tiêu chuẩn | Trạng thái | Bằng chứng / lý do |
|---|---|---|---|
| 1 | Mã nguồn và lịch sử Git được bảo toàn | **MET** | chỉ thêm tệp; không xóa nhánh/PR, không force-push, không rewrite (`07`) |
| 2 | Không mất thay đổi đang phát triển | **MET** | cây làm việc sạch trước khi chuyển nhánh; PR #4 và các nhánh khác không đụng |
| 3 | Chức năng hiện có không suy giảm | **MET** | không đổi mã hay cấu hình sản phẩm; các bộ test của ops (166) và cửa hàng (25 + 57) vẫn PASS (`08`) |
| 4 | Required status checks còn hiệu lực | **UNKNOWN** | branch protection không đọc được; không thay đổi gì |
| 5 | Pipeline mới chạy thành công thực tế | **PARTIAL** | tuyến cục bộ chạy trên 4 cây; chưa có tuyến Cloudflare/Vercel mới nào được chuyển (BLOCKED) |
| 6 | Không cần GitHub-hosted compute phát sinh phí cho pipeline đã chuyển | **MET** | 0 workflow, 0 run; tuyến cục bộ; billing thực tế **BILLING_UNVERIFIED** |
| 7 | Không có secrets bị lộ | **MET** | quét mã, log, artifact: 0 khớp (`10`); lưu ý định danh trong tài liệu công khai |
| 8 | Preview/staging hoạt động đúng | **NOT MET** | BLOCKED: mạng chặn, staging chưa tồn tại (`09`) |
| 9 | Không thay đổi production trái phép | **MET** | không deploy, không đổi DNS/cài đặt/bí mật; chỉ đọc |
| 10 | Có phương án rollback được kiểm tra | xem `11` | mô phỏng revert |
| 11 | Có bằng chứng nguồn, SHA, run/deployment URL, thời gian | **PARTIAL** | SHA và giờ UTC có đủ; URL dashboard Cloudflare không đọc được |
| 12 | Đã xử lý hoặc ghi rõ blocker | **MET** | danh sách dưới đây |

## Blocker chưa giải quyết

| Mã | Blocker | Cần gì | Ai |
|---|---|---|---|
| B1 | Log build và cấu hình Cloudflare Pages (nguyên nhân đỏ) | dán 15 dòng cuối log build của `772bd99`, hoặc cấp quyền đọc | Owner |
| B2 | `main` có `package.json` không hợp lệ và không có bước build; Pages đỏ ở `main`, #3, #4 | quyết định hợp nhất: **ops (có `tools/build.mjs`, output `dist/site`) → main** rồi cửa hàng. Không chép `wrangler.json` của #1 vào `main` (output `.` xuất bản cả thư mục gốc) | Owner |
| B3 | Billing thực tế của GitHub Actions | người có quyền Billing chụp Usage theo repo | Owner |
| B4 | Staging chưa tồn tại; chuỗi migration D1 không dựng lại được | duyệt tạo staging cô lập trên tài khoản Free; sửa chuỗi migration | Owner + dev |
| B5 | Giới hạn gói Cloudflare/GitHub chưa đọc được | cho phép hai miền tài liệu trong cài đặt mạng của môi trường | Owner |
| B6 | Required checks/branch protection chưa đọc được | xác nhận trong Settings → Branches/Rules | Owner |
| B7 | Cửa hàng chưa có bản triển khai Vercel thành công | Production Branch cho `sach-muonnoi` sau khi cây có `apps/store` ở nhánh đó | Owner |

## Workflow

| Nhóm | Danh sách |
|---|---|
| Đã tối ưu | không có (không có workflow); thêm chính sách và công cụ kiểm tra (`scripts/ci/local-verify.sh`) |
| Chưa thay đổi | không có workflow nào để giữ hay đổi |
| GitHub-hosted Actions còn sử dụng | **không có** |

## Việc cần Owner phê duyệt

1. Hợp nhất theo B2 (AI có thể tạo nhánh ghép và PR nháp khi được đồng ý; không merge).
2. Cài đặt Pages: watch paths, kiểm soát nhánh preview (`06` M4, M6).
3. Vercel: giữ preview tắt; khi bật lại thì thêm "Ignored Build Step" (`06` M7).
4. Cho phép workflow dùng mẫu `templates/ci.workflow.yml.template` hay giữ hoàn toàn cục bộ (khuyến nghị: giữ cục bộ cho tới khi B3 có số liệu).
