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

Quy trình, chạy trong worktree tạm ngoài repo (2026-11-11), hai lần:

1. Khi nhánh chỉ có commit đầu `212f7bc`: `git revert --no-edit 212f7bc`, rồi so mã băm cây với `origin/main`. Kết quả: cây sau revert `72729fdf2eb2b8d0de82dcc14135464770f99f72` **bằng đúng** cây `origin/main`; 0 tệp khác.
2. Với trạng thái cuối của nhánh (commit đầu cộng commit cập nhật bằng chứng, nội dung giống hệt cây sẽ được commit): `git revert --no-edit origin/main..HEAD` (hoàn tác cả hai theo thứ tự ngược), rồi so mã băm cây. Kết quả được ghi trong mô tả PR #5 kèm SHA cuối cùng (không ghi ở đây để tránh tham chiếu vòng).

Hiểu đúng: revert riêng commit đầu **sau khi** có commit thứ hai sẽ xung đột (hai commit sửa cùng tệp); khi nhánh có nhiều commit, hoàn tác cả dải `origin/main..HEAD` hoặc commit merge.

## Điều không thể khôi phục bằng Git

Hiệu quả của việc đẩy nhánh (một lần build Pages có thể đã chạy, thông báo của bot trên PR). Không ảnh hưởng tới production.
