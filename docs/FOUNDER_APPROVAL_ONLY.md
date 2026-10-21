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
| AP-PUBLIC-OUTPUT-PATCH | Chấp nhận candidate 3 tệp cô lập output public; loại source, config và migration khỏi Pages | `.local/continuous/predeploy-acceptance-matrix-20261021T122019Z/` · patch SHA-256 `4b581d4cb940be3924fc9525a8a40f1ecc188601f722011133e82c020b937beb` · đúng 3 tệp · Pilot bị loại khỏi scope | ☐ |
| AP-PAYMENT-SOURCE | Chấp nhận candidate 7 tệp payment đã khóa catalog/idempotency; loại toàn bộ tệp Pilot | `.local/continuous/predeploy-acceptance-matrix-20261021T122019Z/` · patch SHA-256 `ad985bd6129e05582b925d996bb7a682442d6ec3096b1007cdd834b239b114ca` · đúng 7 tệp · Pilot bị loại khỏi scope | ☐ |
| AP-DEPLOY-CANDIDATE | Chấp nhận một candidate deploy bất biến sau khi có đủ identity provider | Chưa đủ điều kiện: cần exact full SHA, provider deployment ID và provider build receipt; probe đang `BLOCKED_MISSING_DEPLOYMENT` | ☐ |
| AP-PUSH | Push nhánh ops lên origin (ahead local) | commits docs đã có local | ☐ |

Trả lời một dòng khi duyệt, ví dụ: `Duyệt AP-PORTFOLIO AP-WAVE AP-PRICE AP-AUTONOMY AP-NO-GUARANTEE` — không cần làm thêm bước nào.

Ba mục predeploy trên chỉ gắn quyết định với đúng digest/candidate được nêu. Chúng **không tự cấp quyền commit, push hoặc deploy**. `AP-DEPLOY-CANDIDATE` chỉ có hiệu lực khi AI đã điền đủ exact full SHA, provider deployment ID và provider build receipt vào receipt bất biến; hiện vẫn `HOLD_NOT_DEPLOYABLE`, `production_apply=false`, live `NO_GO`, sale-ready **0** và toàn bộ target/forecast/pipeline/invoiced/paid/refunds/fees/collected cash là `null`.

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

## Owner-input packet (không secret)

Điền công khai tại `.local/continuous/owner-input-packet-20261020T205255Z/packet.json` (7 gate + 2 test identity). Không dán password/OTP/API token.
