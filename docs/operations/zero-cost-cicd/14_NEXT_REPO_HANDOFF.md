# 14 · Bàn giao cho repository tiếp theo

## Có thể chuyển sang repository tiếp theo: **YES**

Các blocker của repo này (`13`: B1–B7) đều thuộc về Owner và độc lập với repo khác; không có phụ thuộc kỹ thuật chặn việc bắt đầu kiểm toán chỉ đọc ở repo tiếp theo. Trạng thái của repo này vẫn là **PARTIAL**.

## Cách chạy lại cho một repo mới (cùng thứ tự Giai đoạn A–I)

1. **Chỉ đọc trước.** Ghi SHA nhánh mặc định, `git status`, danh sách nhánh/PR. Chưa ghi gì.
2. **Có workflow GitHub Actions không?** `git ls-tree -r --name-only <nhánh>` lọc `^.github/` trên mọi nhánh, và `gh api repos/<o>/<r>/actions/workflows`, `.../actions/runs?per_page=5`. Với repo này: 0 và 0, nên "phí Actions" không đến từ repo này.
3. **Tìm hệ CI thực tế**: `gh api repos/<o>/<r>/commits/<sha>/check-runs` trên đầu mỗi nhánh (tên app: Cloudflare, Vercel, bot review); `gh api repos/<o>/<r>/deployments`.
4. **Đọc log lỗi ở nguồn.** Với Vercel: API `list_deployment_events` và `get_deployment` cho lỗi nguyên văn (đã chỉ ra 12/13 lỗi do thư mục gốc không tồn tại). Với Cloudflare: cần quyền dashboard, nếu không thì BLOCKED và xin Owner dán log.
5. **Kiểm tra tệp cấu hình hợp lệ trước tiên**: `JSON.parse(package.json)`, `wrangler.*`. Lỗi cấu hình thấp nhất thường là nguyên nhân của cả Vercel lẫn Pages.
6. **Đối chiếu nội dung từng cây với kết quả CI** (bảng cây × script build × kết quả); đừng tạo nhánh thử mới: mỗi nhánh tiêu một lần build và không xóa được.
7. **Dùng `scripts/ci/local-verify.sh`** (chép sang repo mới, điều chỉnh dòng ops/store theo cấu trúc) cho kiểm thử cục bộ; chạy kèm kiểm tra chính sách workflow.
8. **Không đụng cài đặt dashboard, DNS, bí mật, production** khi chưa duyệt. Ghi BLOCKED cùng quyền cần thiết.
9. **Hồ sơ**: 14 tệp như thư mục này; chỗ thiếu bằng chứng ghi PENDING/UNVERIFIED.

## Bài học từ repo này

| Bài học | Ý nghĩa |
|---|---|
| Phí "GitHub Actions" có thể không đến từ repo đang mở | kiểm `actions/workflows` và `runs` trước khi tối ưu bất cứ thứ gì |
| Lỗi "CI đỏ" ở đây là của Vercel và Cloudflare Pages, không phải Actions | hai hệ này tự build mọi nhánh; cần kiểm soát nhánh và watch paths |
| `package.json` hỏng ở nhánh mặc định làm hỏng mọi build kế thừa | đặt kiểm tra `package.json` hợp lệ làm bước đầu của mọi CI |
| Cấu hình Pages `.` xuất bản cả repo công khai | luôn kiểm `pages_build_output_dir` và bề mặt `dist` (`pages-surface`) |
| Mạng của môi trường kiểm toán chặn tài liệu nhà cung cấp | xin Owner cho phép `developers.cloudflare.com`, `docs.github.com` ngay từ đầu, nếu không mọi giới hạn gói là UNVERIFIED |
| Repo công khai: kết quả kiểm toán mức ứng dụng phải giao riêng | không đăng chi tiết lỗ hổng lên repo công khai |

## Việc còn mở của repo này (để người tiếp quản không phải đoán)

Xem `13`: B1–B7 và bốn việc cần Owner phê duyệt. Việc kỹ thuật AI có thể làm ngay khi được đồng ý: tạo nhánh ghép ops + cửa hàng và PR nháp, chạy lại `local-verify.sh` trên nhánh thật, cập nhật `08` và `09` khi Pages có kết quả mới.
