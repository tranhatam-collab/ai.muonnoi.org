# Founder chỉ phê duyệt — AI làm hết việc còn lại

**Ngày:** 2026-10-19 · `Asia/Ho_Chi_Minh`  
**Quy tắc cứng:** Founder **không** bị giao việc vận hành. AI tự làm mọi việc nội bộ dưới 0 VND. Khi thiếu secret/account/consent, AI **đánh dấu BLOCKED**, xếp vào hàng chờ thông tin, rồi **chuyển sang việc khác ngay** — không idle, không nhắc Founder “làm giúp”.

## Hộp duyệt duy nhất (chỉ tick)

| ID | Duyệt gì | AI đã chuẩn bị sẵn | Trạng thái |
|---|---|---|---|
| AP-PORTFOLIO | 14 SKU (S01–S04 + A01–A10) | `docs/PRODUCT_PORTFOLIO_1_TO_3_YEARS_FOUNDER_APPROVAL.md` | ☐ |
| AP-WAVE | Thứ tự mở sóng | cùng file §6 | ☐ |
| AP-PRICE | Giá = đề xuất chưa thương mại | cùng file | ☐ |
| AP-AUTONOMY | Mỗi SKU đủ cổng trước đơn thật | cùng file | ☐ |
| AP-NO-GUARANTEE | Target ≠ cam kết doanh thu | cùng file | ☐ |
| AP-PILOT-DIRTY | Commit 3 tệp `pilot-revise` + tests (8/8 pass) | `.local/continuous/pilot-dirty-baseline-20261019T111829Z/` | ☐ |
| AP-PUSH | Push nhánh ops lên origin (ahead local) | commits docs đã có local | ☐ |

Trả lời một dòng khi duyệt, ví dụ: `Duyệt AP-PORTFOLIO AP-WAVE AP-PRICE AP-AUTONOMY AP-NO-GUARANTEE` — không cần làm thêm bước nào.

## Hàng chờ thông tin (Founder gửi khi sẵn sàng — không phải việc phải làm ngay)

| Mã | Thông tin | AI sẽ làm ngay khi nhận |
|---|---|---|
| INFO-CF-FREE | Cloudflare **Free** account ID | Điền staging kit; không đụng Paid |
| INFO-MERCHANT | Merchant + bank chỉ đọc | Contract test; importer |
| INFO-CHANNEL | Một kênh sở hữu + consent | Pilot nội dung; không ads |
| INFO-PEOPLE | Seller / QA / finance / on-call | Gắn escalation trong OPERATIONS |

Thiếu các INFO-* **không** dừng vòng giờ. AI tiếp tục probe, fixture, test, docs, A01 outline.

## Việc AI không bao giờ nhờ Founder làm

Chạy test, viết receipt, sửa docs, chuẩn bị staging local, probe domain, đóng gói baseline, tạo outline A01, cập nhật hàng đợi, restart loop, mở form Automation (Founder chỉ bật lịch nếu muốn bền ngoài chat — không bắt buộc cho vòng trong phiên).
