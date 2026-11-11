# 11 · Kế hoạch rollback (Giai đoạn D, F)

## Phạm vi thay đổi cần khôi phục

Theo `07`: chỉ **thêm** tệp (`scripts/ci/`, `docs/operations/zero-cost-cicd/`). Không đổi cấu hình Cloudflare, Vercel, GitHub (ngoài việc đẩy nhánh và mở PR), DNS hay bí mật. Do đó rollback chỉ là loại bỏ các tệp thêm.

## Các tình huống

| Tình huống | Cách khôi phục | Kiểm tra |
|---|---|---|
| PR chưa merge | đóng PR (không xóa nhánh; chính sách của chương trình) | `main` không đổi |
| Đã merge | `git revert -m 1 <commit merge>` (hoặc `git revert <commit>` nếu squash/rebase) trên nhánh mới, mở PR | cây sau revert phải bằng cây `main` trước merge |
| Từ khóa `[CF-Pages-Skip]` làm mất một lần build cần thiết | đẩy một commit không mang từ khóa để Pages build lại | check run `Cloudflare Pages` xuất hiện |
| Sau này có thay đổi dashboard Pages/Vercel | trước khi đổi, ghi giá trị cũ (ảnh chụp hoặc xuất cài đặt) vào PR; khôi phục bằng đặt lại đúng các giá trị đó | so sánh giá trị sau khi khôi phục |
| Sau này hợp nhất ops + cửa hàng gây lỗi | `git revert -m 1` của merge; Pages production giữ nguyên cho tới khi Owner promote, và có thể đưa về bản triển khai trước trong dashboard (UNVERIFIED) | `local-verify.sh` trên cây sau revert |

## Kiểm tra rollback (mô phỏng, không đụng remote)

Quy trình đã chạy trong một worktree tạm: checkout commit của nhánh này, `git revert --no-edit` cho từng commit của nhánh, rồi so sánh mã băm cây với `origin/main`.

Kết quả: **PENDING**, được điền sau khi các commit của nhánh đã có SHA cuối cùng (xem mục "Kết quả mô phỏng" bên dưới khi có).

## Điều không thể khôi phục bằng Git

Hiệu quả của việc đẩy nhánh (một lần build Pages có thể đã chạy, thông báo của bot trên PR). Không ảnh hưởng tới production.
