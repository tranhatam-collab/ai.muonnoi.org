# Kế hoạch mở rộng Nhà Chung và 10 Agent — 15/10/2026

**HOLD cho mở bán và vận hành thương mại.** Đã bắt đầu mã local, chưa hoàn tất toàn bộ hệ thống. Kế hoạch này đưa tài liệu được cung cấp thành các cổng nghiệm thu; không thay gate FPOS hoặc biến mục tiêu thành lời bảo đảm.

## Quyết định hiện hành D06

Founder chọn mở rộng repo `tranhatam-collab/ai.muonnoi.org`, nhánh `codex/revenueops-publishing`, từ remote `feat/flow-mvp-backend` tại `6c58845a716ba0ca28b42191fabb93efe9fc33db`. Quyết định này thay đề xuất dùng repo/domain revenue.tranhatam.com cho phần xây dựng tiếp theo. Hạn mức 0 VND và lựa chọn Cloudflare Workers AI giữ nguyên.

Website công khai giữ `ai.muonnoi.org`: feed hiện có và `/studio/` cho mọi chủ đề có giá trị, tuân thủ quyền nguồn và pháp luật. API hiện có `api.muonnoi.org` được mở thêm `/api/publishing/*`. `ops.ai.muonnoi.org` là đề xuất cho bàn điều hành riêng sau Cloudflare Access, chưa tạo DNS hoặc deploy. Các tên trên chưa chứng minh provider ownership.

Xưởng viết đã có mã lưu nháp riêng, kiểm soát phiên bản, người biên tập độc lập và xuất bản idempotent vào feed. Chưa có cầu nối tự động từ 10 Agent sang Studio: hiện chỉ kiểm tra và chuyển nội dung bằng người phụ trách. Adapter mạng xã hội, lịch đăng thật và commerce vẫn chưa triển khai.

## 1. Mục tiêu và cách đo

Mười Agent A01–A10 có target lần lượt 1–10 triệu VND/ngày, tổng 55 triệu. Một ngày chốt theo `Asia/Ho_Chi_Minh`, lưu timestamp UTC. Báo cáo cần hai chỉ tiêu: tổng net so với 55 triệu và cả mười Agent cùng đạt target. Agent vượt không bù cho Agent thiếu.

Net = tiền ngân hàng đã đối soát − phí − chi phí − hoàn tiền − tăng ròng dự phòng nghĩa vụ. Thanh toán dự phòng phải ghi giải phóng tương ứng để tránh trừ hai lần. Thiếu ngân hàng, phí, chi phí, hoàn tiền, dự phòng hoặc phân bổ thì net/score giữ `null`. Tiền chủ nạp, vay, tự mua và giao dịch test không được làm doanh thu KPI.

Kịch bản cơ sở độc lập tái lập từ sheet `GIA_DINH`: 59 đơn, thu 131.803.000, biến phí/dự phòng 65.662.750, cố định 2.750.000, ròng giả định 63.390.250 VND/ngày. Tổng QA giả định 25,2 giờ/ngày. Kịch bản hệ số đơn 50% làm tròn xuống và biên giảm 10 điểm phần trăm cho ròng 18.821.300 VND/ngày. Chưa có dữ liệu sức mua hoặc giao dịch xác nhận các kịch bản này.

## 2. Danh mục và điều kiện sản phẩm

Registry triển khai ở `workers/revenueops/config/agents.json`. Bản gốc và tài liệu sản phẩm được giữ riêng ngoài repo công khai; không coi các gói đã hoàn thiện. A01 giá đề xuất 149.000 VND. Mọi giá vẫn chưa duyệt thương mại. Bản cũ ghi target 100–500 nghìn/ngày chỉ là lịch sử; không tự đổi báo cáo cũ sang target mới.

| Đợt | Gói | Điều kiện cứng trước phát hành |
|---|---|---|
| 1 | A01 | Đủ 12 quy trình, 30 prompt, 30 ngày; kiểm nội dung/license/file và người dùng thử; merchant/đối soát/giao tệp đạt |
| 1 | A02 | Chọn một ngành; đủ 20 quy trình, 40 prompt, 10 tình huống được chuyên gia rà; chưa mở ba ngành cùng lúc |
| 1 | A03 | Website được cấp quyền; tối đa 10 trang; crawler chặn IP nội bộ, redirect/rebinding, URL chứa token; mỗi phát hiện có evidence; không pentest/SEO guarantee |
| 2 | A04/A05/A07 | Dữ kiện hoặc quyền nguồn đầy đủ; fidelity/CSV/rubric, một vòng sửa, người QA có công suất; không tự thêm công dụng hoặc khách hàng |
| 2 | A08 | Một trang mẫu/7 khối/1 form; build sandbox không secret; visual/accessibility/function checks; giao source; deploy khách duyệt riêng |
| 3 | A06 | Đủ 12 bài/30 thực hành; quyền 90 ngày, support và dự phòng nghĩa vụ; không chứng chỉ hoặc hứa việc |
| 3 | A09 | Ba blueprint/module mô phỏng có test và runbook; không quảng cáo thành kết nối production đã triển khai |
| 3 | A10 | Đủ 60 SOP/100 mẫu, license, tenant/10 seats/90 ngày, IDOR/export/revoke tests và dự phòng phục vụ |

Bản tài liệu A01 có sẵn được giữ private cục bộ để QA. Các sản phẩm còn lại chưa được coi có nội dung hoàn chỉnh chỉ từ tên và kế hoạch.

## 3. Lộ trình theo dependency

T0 chỉ bắt đầu khi đủ nguồn, quyền, người phụ trách và hạn mức cho từng chặng. Khoảng ngày là dự kiến, không bảo đảm lịch hoàn thành hoặc doanh thu.

| Chặng | Cửa sổ đề xuất | Công việc | Receipt qua cổng |
|---|---|---|---|
| G0 | T0–7 | Repo/branch riêng, nhận ZIP gốc, seller/QA/finance, Access, budget, consent | Repo đúng identity, quyền thực, quyết định có phiên bản, zero-budget test |
| G1 | Ngày 8–14 | Staging A01–A03 khóa bán; payment mock, R2 private, recovery, ledger/import, workforce | E2E tiền sai/trùng/thiếu, IDOR, hai Agent cạnh tranh, restore/rollback, independent QA |
| G2 | Ngày 15–30 | Pilot A01–A03 theo từng gói đủ điều kiện, một kênh sở hữu | Đơn thật đã giao; đối soát và chi phí đầy đủ; đủ công suất QA; không P0/P1 |
| G3 | Ngày 31–60 | Chọn A04/A05/A07/A08 theo nhu cầu | Biên thực, công suất, quality và quyền nguồn đạt; ngân sách riêng được cấp |
| G4 | Ngày 61–90+ | A06/A09/A10 sau khi sản phẩm đủ | Content/license/entitlement/tenant/security đủ nguồn và nghiệm thu |
| G5 | Theo dữ liệu | Tăng từng Agent tới target | Theo dõi ≥30 ngày; tỷ lệ ngày đạt từng Agent và danh mục; dữ liệu hụt được giữ nguyên |

43 work item gốc, owner theo vai trò, acceptance và phần đã có mã nằm ở `workers/revenueops/config/backlog.json`. Không dùng số test hoặc số Agent để tính % hoàn thành kinh doanh.

## 4. Pilot tìm khách và quyết định tiếp tục

Chưa có tiền được cấp. Trong giai đoạn hiện tại chỉ chuẩn bị sản phẩm, mẫu miễn phí và bản nháp; không mua ads/API, không thuê hoặc gửi nội dung. Khi một kênh được cấp quyền, thử hai thông điệp cách nhau ít nhất 48 giờ và một CTA cùng trang mẫu. Ghi `sample_view`, `qualified_request`, `scope_accepted`, `checkout_created`, `payment_confirmed`, `bank_settled`, `delivered`, `refund_requested`; không quy lượt xem thành tiền.

Giả thuyết đầu: hướng dẫn giảm sai sót so với tiết kiệm thời gian. Mốc học đề xuất 100 lượt vào phù hợp với self-serve hoặc 10 trao đổi tự nguyện đủ điều kiện với B2B, không đủ để tuyên bố độ tin cậy thống kê. 3–5 đơn đầu chỉ cho quyết định học tiếp. Trước scale cần ít nhất 20 đơn đã giao có chi phí/QA/hoàn tiền đầy đủ và người có thẩm quyền xem mẫu thật.

Dừng hành động/kênh bị ảnh hưởng khi có spam complaint, mất consent, sai dữ kiện, rò dữ liệu, lỗi tiền, không còn quỹ hoặc công suất QA. Giữ nghĩa vụ với khách/người làm đã nhận, không bỏ nghĩa vụ để bảo vệ KPI.

## 5. Người thật và ngân sách

Quỹ giao hàng cơ bản phải có trước khi nhận nghĩa vụ; không hẹn “AI đạt doanh thu mới trả công”. Quỹ mở rộng chỉ dùng tiền tự do sau nghĩa vụ: `max(0,min(trần còn lại,tiền tự do,30% phần vượt − đã đặt trước))`; tỷ lệ 30% còn là đề xuất. Quyền thuê hiện tại bằng 0.

Agent viết brief và gợi ý; người quản lý thật quyết định đề nghị việc. Worker chấp thuận scope, công, deadline và hợp đồng; reviewer khác người tạo/làm; finance khác các bên duyệt khoản phải trả. AI không quyết định tuyển/chấm dứt việc, không ký thay, không trả tiền hoặc dùng thuộc tính nhạy cảm để sàng lọc. Hợp đồng, quyền dữ liệu và nghĩa vụ lao động/thuế cần được người chuyên môn kiểm tra cho hồ sơ cụ thể.

## 6. Nhịp hằng ngày và tự động hóa

Lịch dự kiến ở `workers/revenueops/config/schedule.json`, tất cả `enabled=false`. Một dispatcher điều phối 10 cấu hình. Không tạo thêm 10 lịch ChatGPT, không thay hai lịch cũ được báo cáo nhắc tới. Đầu ngày kiểm quyền/quỹ/công suất → nghĩa vụ đã bán → QA/support → đối soát → bản nháp tiếp cận → cải thiện sản phẩm. Cuối ngày chốt hoặc giữ unknown; hôm sau đọc close hôm trước.

Xuất bản tự động chỉ sau khi có provider/account/scope/consent, bản đã duyệt hoặc rule duyệt có phiên bản, rate limit và kill switch. Chống trùng bằng account+content hash+schedule slot; timeout UNKNOWN không đăng lại mù quáng. Không hứa hoạt động nền khi chưa có runtime, scheduler và monitoring đã nghiệm thu.

## 7. Nghiệm thu và chuyển production

Yêu cầu độc lập với người xây: kiểm auth/IDOR, payment/receiver/reference, tiền thiếu/trùng/hoàn, costs/reserves, recovery/email/R2, budget/timeout, dữ liệu nguồn và AI eval 100 mẫu (50 sạch/20 thiếu/20 injection/10 ngoại lệ), sandbox A03/A08, tải, accessibility/mobile, alert/restore/rollback. Sau đó RG0–RG13 và Founder sign-off gắn đúng SHA/deployment/scope.

Mục tiêu SLO 99,5% pilot và giao tự động ≥95% chỉ là đề xuất cho lúc có telemetry, không phải số đã đạt. Không tự tăng maturity từ tài liệu hoặc kết quả local.
