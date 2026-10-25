# Founder chỉ phê duyệt — AI làm hết việc còn lại

**Ngày:** 2026-10-25 · `Asia/Ho_Chi_Minh` (cập nhật từ 2026-10-19)  
**Quy tắc cứng:** Founder **không** bị giao việc vận hành. AI tự làm mọi việc nội bộ dưới 0 VND. Khi thiếu secret/account/consent, AI **đánh dấu BLOCKED**, xếp vào hàng chờ thông tin, rồi **chuyển sang việc khác ngay** — không idle, không nhắc Founder “làm giúp”.

**Founder direction 25/10/2026:** “Duyệt tất cả”; build/dev tự động liên tục 24/24; mục tiêu bắt đầu thu tiền sớm; sẵn sàng cấp phép `n8n.muonnoi.org` + VPS nếu AI dùng cho lịch tự động 100%.

**Phạm vi duyệt có hiệu lực ngay:** các `AP-*` đánh dấu ✅ bên dưới.  
**Không suy diễn từ “duyệt tất cả”:** live `GO`, sale-ready, thanh toán thật, hay deploy production khi P0 exposure còn `NO_GO` và `AP-DEPLOY-CANDIDATE` thiếu identity provider.

## Hộp duyệt duy nhất (chỉ tick)

| ID | Duyệt gì | AI đã chuẩn bị sẵn | Trạng thái |
|---|---|---|---|
| AP-PORTFOLIO | 14 SKU (S01–S04 + A01–A10) | `docs/PRODUCT_PORTFOLIO_1_TO_3_YEARS_FOUNDER_APPROVAL.md` | ✅ 2026-10-25 — Founder “Duyệt tất cả” |
| AP-WAVE | Thứ tự mở sóng | cùng file §6 | ✅ 2026-10-25 — Founder “Duyệt tất cả” |
| AP-PRICE | Giá = đề xuất chưa thương mại | cùng file | ✅ 2026-10-25 — Founder “Duyệt tất cả” · **không** = giá đã bán / cam kết doanh thu |
| AP-AUTONOMY | Mỗi SKU đủ cổng trước đơn thật | cùng file | ✅ 2026-10-25 — Founder “Duyệt tất cả” · cổng ngoài vẫn `BLOCKED` tới khi có INFO-* |
| AP-NO-GUARANTEE | Target ≠ cam kết doanh thu | cùng file | ✅ 2026-10-25 — Founder “Duyệt tất cả” |
| AP-PILOT-DIRTY | Commit 3 tệp `pilot-revise` + tests (8/8 pass) | `.local/continuous/pilot-dirty-baseline-20261019T111829Z/` | ✅ 2026-10-25 — được phép commit khi lane còn dirty và test xanh; hiện worktree không còn 3 tệp dirty đó |
| AP-PUBLIC-OUTPUT-PATCH | Chấp nhận candidate 3 tệp cô lập output public; loại source, config và migration khỏi Pages | `.local/continuous/predeploy-acceptance-matrix-20261021T122019Z/` · patch SHA-256 `4b581d4cb940be3924fc9525a8a40f1ecc188601f722011133e82c020b937beb` · đúng 3 tệp · Pilot bị loại khỏi scope | ✅ 2026-10-25 — chấp nhận **candidate** · **không** tự deploy |
| AP-PAYMENT-SOURCE | Chấp nhận candidate 7 tệp payment đã khóa catalog/idempotency; loại toàn bộ tệp Pilot | `.local/continuous/predeploy-acceptance-matrix-20261021T122019Z/` · patch SHA-256 `ad985bd6129e05582b925d996bb7a682442d6ec3096b1007cdd834b239b114ca` · đúng 7 tệp · Pilot bị loại khỏi scope | ✅ 2026-10-25 — chấp nhận **candidate** · **không** bật thanh toán live |
| AP-DEPLOY-CANDIDATE | Chấp nhận một candidate deploy bất biến sau khi có đủ identity provider | Chưa đủ điều kiện: cần exact full SHA, provider deployment ID và provider build receipt; probe đang `BLOCKED_MISSING_DEPLOYMENT` | ☐ **HOLD** — “duyệt tất cả” **không** phủ điều kiện identity; live vẫn `NO_GO` (P0 source/migration exposure) |
| AP-PUSH | Push nhánh ops lên origin (ahead local) | commits docs đã có local | ✅ 2026-10-25 — AI được push `codex/ai-muonnoi-autonomous-ops` |
| AP-N8N-OPS | Dùng `n8n.muonnoi.org` + VPS sẵn có để lịch/workflow ops 24/7 (không payment/social ads khi thiếu gate) | Packet thiết kế local sẽ gắn digest khi có `INFO-N8N-ACCESS` | ✅ **ý định** 2026-10-25 — **chưa thực thi** tới khi có `INFO-N8N-ACCESS` (credential/scope). Cấm workflow thu tiền / đăng ads / đụng secret production trước gate |

Ba mục predeploy trên chỉ gắn quyết định với đúng digest/candidate được nêu. Chúng **không tự cấp quyền deploy**. `AP-DEPLOY-CANDIDATE` chỉ có hiệu lực khi AI đã điền đủ exact full SHA, provider deployment ID và provider build receipt vào receipt bất biến; hiện vẫn `HOLD_NOT_DEPLOYABLE`, `production_apply=false`, live `NO_GO`, sale-ready **0** và toàn bộ target/forecast/pipeline/invoiced/paid/refunds/fees/collected cash là `null`.

## Hàng chờ thông tin (Founder gửi khi sẵn sàng — không phải việc phải làm ngay)

| Mã | Thông tin | AI sẽ làm ngay khi nhận |
|---|---|---|
| INFO-CF-FREE | Cloudflare **Free** account ID | Điền staging kit; không đụng Paid |
| INFO-MERCHANT | Merchant + bank chỉ đọc | Contract test; importer |
| INFO-CHANNEL | Một kênh sở hữu + consent | Pilot nội dung; không ads |
| INFO-PEOPLE | Seller / QA / finance / on-call | Gắn escalation trong OPERATIONS |
| INFO-N8N-ACCESS | Quyền vào `n8n.muonnoi.org` + VPS: URL đã biết; cần **API key hoặc account ops** (không paste vào chat nếu có thể dùng secret store), quyền tạo workflow, và phạm vi VPS (SSH user / docker / chỉ n8n UI). Không gửi password trong chat plaintext nếu tránh được. | Dựng workflow hourly tick → khóa repo → một việc nội bộ → cập nhật OPERATIONS; fail-closed; **không** payment/live deploy từ n8n cho tới khi P0 đóng + `AP-DEPLOY-CANDIDATE` đủ identity |

Thiếu các INFO-* **không** dừng vòng giờ Cursor. AI tiếp tục packet local A05→A10, probe đọc-only, docs.

## Đường tới “ngày đầu kiếm tiền” (evidence, không cam kết)

Thứ tự bắt buộc (không rút ngắn bằng n8n):

1. Đóng P0 public source/migration exposure bằng deploy candidate đã duyệt (`AP-PUBLIC-OUTPUT-PATCH` + `AP-DEPLOY-CANDIDATE` đủ SHA/provider receipt) → re-probe live âm tính.
2. Staging Free (`INFO-CF-FREE`) + merchant (`INFO-MERCHANT`) + kênh (`INFO-CHANNEL`) cho SKU mở đầu (S01/A01).
3. Checkout/catalog-bound thật; actuals từ đối soát — không bịa doanh thu từ fixture.

n8n/VPS chỉ thay **lịch host 24/7** cho vòng ops nội bộ; **không** tự tạo doanh thu.

## Việc AI không bao giờ nhờ Founder làm

Chạy test, viết receipt, sửa docs, chuẩn bị staging local, probe domain, đóng gói baseline, cập nhật hàng đợi, restart loop Cursor, thiết kế workflow n8n (khi có access), mở form Automation (Founder chỉ bật lịch Cursor Glass nếu muốn — không bắt buộc khi đã có n8n).

## Owner-input packet (không secret)

Điền công khai tại `.local/continuous/owner-input-packet-20261020T205255Z/packet.json` (7 gate + 2 test identity). Không dán password/OTP/API token.
