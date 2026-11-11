# 03 · Kiểm toán sử dụng GitHub Actions và chi phí (Giai đoạn B)

Thu thập 2026-11-11 08:01–08:05 UTC, chỉ đọc.

## Kết luận

| Mục | Trạng thái |
|---|---|
| Chi phí GitHub Actions thực tế (billing) | **BILLING_UNVERIFIED**: không có quyền đọc. Endpoint cấp tổ chức bị chặn ("sessions are bound to their configured repositories"); endpoint Actions cấp repo cho settings, runners, secrets, variables, cache usage bị proxy chặn (HTTP 403) |
| Mức sử dụng Actions **của repo này** | **VERIFIED = 0**: 0 workflow (cả workflow động như Dependabot, CodeQL hoặc Pages dựng bằng Actions), 0 lần chạy, 0 artifact, 0 tệp `.github/` ở cả 15 nhánh |
| Ngân sách 65 USD và spending controls | **Không đụng tới** |
| Chi phí gán cho repo này bằng ước lượng | **Không ước lượng**; không ghi số tiền nào |

Hệ quả: với repo này, "giảm phí GitHub-hosted Actions xuống 0" **đã đạt về mức sử dụng** (không có gì chạy), nhưng không chứng minh được rằng hóa đơn của tổ chức bằng 0, vì phí có thể đến từ repo khác (ngoài phạm vi) hoặc từ tính năng ngoài workflow. Số liệu hóa đơn phải do người có quyền Billing đọc.

## Bằng chứng

| Truy vấn | Kết quả | Nhãn |
|---|---|---|
| `GET repos/.../actions/workflows` | `total_count: 0` | VERIFIED |
| `GET repos/.../actions/runs?per_page=5` | `total_count: 0` | VERIFIED |
| `GET repos/.../actions/artifacts?per_page=1` | `total_count: 0` | VERIFIED |
| `git ls-tree -r --name-only <nhánh>` với 15 nhánh remote, lọc `^.github/` | 0 tệp ở mọi nhánh | VERIFIED |
| `GET repos/.../actions/permissions`, `/actions/runners`, `/actions/secrets`, `/actions/variables`, `/actions/cache/usage` | HTTP 403 "Access to this GitHub Actions path is not permitted through this proxy" | BLOCKED |
| `GET orgs/tranhatam-collab/settings/billing/actions` | bị chặn: phiên chỉ gắn với repo được cấu hình | BLOCKED |
| `GET repos/.../branches/main/protection` | HTTP 403 "Resource not accessible by integration" | BLOCKED |
| `GET repos/.../rulesets` | `[]` | VERIFIED |

## Phân tích 30 ngày và tháng hiện tại

Không có run nào để phân tích theo workflow, thời lượng, tỷ lệ lỗi, retry hay trùng lặp. Phần "workflow chạy nhiều nhất, lâu nhất, lỗi nhiều nhất" **không áp dụng** cho GitHub Actions ở repo này; các lần build lỗi thực tế thuộc Vercel và Cloudflare Pages, phân tích ở `02`.

## Điều Owner có thể xác nhận nhanh (không cần AI)

1. Settings → Billing → Usage (tổ chức): lọc theo Repository để xem `ai.muonnoi.org` có dòng Actions nào không.
2. Settings → Actions → General của repo: xem "Allow all actions" hay giới hạn; có runner tự lưu trữ nào không.
3. Settings → Branches/Rules: có required status check nào đang bắt `Cloudflare Pages` không (ảnh hưởng tới cách xử lý khi sửa đỏ Pages).
