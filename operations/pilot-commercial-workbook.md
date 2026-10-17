# Sổ chuẩn bị thương mại và bàn giao Studio

Cập nhật: 17/10/2026 · Phiên bản 1.0 · Trạng thái `DRAFT_NOT_SENT` · Nguồn giá/phạm vi: `data/offer-catalog.json` tại baseline `1ea2690517796fe5802e2cdecaa23165e48047e5`.

Sổ này dành cho vận hành nội bộ, có thể dùng ngay để chuẩn bị câu trả lời có sự đồng ý, phạm vi và bàn giao. Không phải hợp đồng, hóa đơn, khách hàng hay doanh thu thực tế. Ví dụ Pilot chỉ là đề xuất hư cấu chưa gửi; chưa có bên mua, bên bán đã xác minh, kênh nhận, ngày bắt đầu, đơn hàng hoặc tài khoản nhận tiền. Không thêm dữ liệu khách hàng vào Git. Các record thật phải nằm trong hệ thống riêng có quyền truy cập và lưu vết.

Ngân sách chi thêm được cấp hiện tại là **0 VND**. Đây là giới hạn cho hành động mới, không phải khẳng định chi phí vận hành đã phát sinh bằng 0. Chi phí thực tế, tiền thu, phí giao dịch và hoàn tiền đều `null` cho tới khi có nguồn đối soát.

## 1. Quy trình từ brief tới phản hồi có phạm vi

| Bước | Việc cụ thể | Bằng chứng/đầu ra | Khi thiếu điều kiện |
|---|---|---|---|
| 1. Xác nhận tiếp nhận | Đọc brief qua nguồn được phép; kiểm receipt server, phiên bản, người gửi thuộc tài khoản đang thao tác. Tệp khách tự tải chỉ là bản nháp. | `brief_ref` và `intake_receipt_ref`; không sao chép email/số điện thoại vào repo. | Chưa có receipt: giữ `DRAFT_NOT_SENT`, không ghi lead đã nhận. |
| 2. Xác nhận được phản hồi | Kiểm khách chủ động yêu cầu hoặc có consent rõ cho chính cuộc trao đổi, kênh và mục đích. | `consent_ref`, kênh trả lời đã cấu hình, người vận hành được quyền dùng. | Chuẩn bị bản nháp nội bộ; không gửi ra kênh khác. |
| 3. Đủ điều kiện lập scope | Kiểm nhu cầu, tư liệu, quyền, dữ kiện, người duyệt, thời gian mong muốn, năng lực đáp ứng. | Record qualification; các mục thiếu được liệt kê riêng. | Hỏi tối đa nhóm thông tin thực sự cần trong một phản hồi đã được phép; không suy đoán giá/tồn kho/sản phẩm. |
| 4. Chọn gói | Dùng đúng một trong bốn offer dưới đây; chọn Pilot khi nhu cầu là thử quy trình nội dung với phạm vi nhỏ. | `offer_id`, giá đề xuất, deliverable IDs, loại file, số vòng sửa và điều kiện đầu vào. | Nhu cầu ngoài gói: ghi `NEEDS_SCOPING`, không tự cộng giá hoặc thêm tích hợp. |
| 5. Chuẩn bị đề xuất | Viết lợi ích cụ thể là đầu ra bàn giao, không hứa reach/đơn/doanh thu. Ghi rõ copy/media, nguồn, phiên bản và lịch tương đối. | Record proposal `DRAFT_NOT_SENT`. | Không chốt deadline khi đầu vào hoặc năng lực chưa xác nhận. |
| 6. Review và trả lời | Người/vai trò có quyền kiểm dữ kiện, phạm vi, giá và kênh. Chỉ gửi khi điểm đến và consent đã xác minh. | Phiên bản nội dung + hash + review receipt + message receipt nếu đã gửi. | Không có receipt gửi thì trạng thái `SENT_UNCONFIRMED`; đối chiếu trước khi thử lại. |
| 7. Xác nhận scope | Đối chiếu khách chấp nhận đúng phiên bản, đầu vào đã đủ và lịch có sức chứa. | `scope_acceptance_ref`, `confirmed_inputs_ref`, `capacity_check_ref`, `start_date`. | Chưa đủ: không mở công việc tính phí hoặc tự tạo đơn/thu tiền. |
| 8. Sản xuất và duyệt | Tạo asset theo IDs; kiểm claim và quyền; gộp feedback theo một vòng; lưu phiên bản. | Asset manifest và revision records. | Đầu vào mới thay đổi scope: nêu chênh lệch, chờ chốt phiên bản cập nhật. |
| 9. Bàn giao | Bàn giao đúng file, số lượng, quyền và phiên bản; kiểm người nhận đúng quyền. | Delivery receipt; acceptance riêng của người nhận. | “Đã gửi file” không đồng nghĩa “đã nghiệm thu”. |
| 10. Đối soát | Chỉ liên kết đơn/phiên bản đã chấp nhận với bằng chứng giao dịch từ hệ thống được phép; kiểm tiền tệ, số tiền, trạng thái, trùng ID, refund và settlement. | Reconciliation record. | Thiếu một nguồn cần thiết: `PENDING_RECONCILIATION`, các actuals chưa xác nhận để `null`. |

Quy trình 0 đồng: dùng bản nháp hiện có, file văn bản/JSON và tài sản có quyền đã được cung cấp; không tự mua quảng cáo, thêm gói trả phí, chạy API tính phí hoặc thuê người. Khi chạm giới hạn miễn phí hay cần dịch vụ ngoài, ghi blocker của phần đó và tiếp tục nội dung có thể hoàn thiện nội bộ.

## 2. Phiếu xác định nhu cầu có thể dùng ngay

Mỗi trường dưới đây có trong `record_templates.qualification` của JSON. Giá trị chưa có giữ `null`, không điền mẫu thành dữ kiện khách thật.

| Câu hỏi | Thế nào là đủ | Cách xử lý thiếu |
|---|---|---|
| Nội dung cần phục vụ nhu cầu gì? | Một sản phẩm/hoạt động, nhóm người đọc và hành động mong muốn có thể mô tả rõ. | Gợi ý khách chọn một ưu tiên; không tự đặt mục tiêu doanh số. |
| Có dữ kiện và tư liệu nào được phép dùng? | Link/file do người có quyền cung cấp, ngày hiện hành và người xác nhận. | Chỉ viết khung/gợi ý; khóa claim cần nguồn. |
| Ai duyệt? | Vai trò có thẩm quyền, kênh review và lịch phản hồi được xác nhận. | Không coi im lặng là đồng ý. |
| Kênh nào đang quản lý? | Kênh/điểm đến được xác minh; phạm vi Pilot có thể chỉ là bàn giao file. | Không đăng, không liên hệ bên ngoài để “tự tìm kênh”. |
| Mong muốn file gì? | Phân biệt caption, kịch bản/shot list, slide text, bài dài với ảnh/video dựng hoàn chỉnh. | Chốt loại file trước báo giá; không tính script là video thành phẩm. |
| Khi nào cần? | Ngày mong muốn và đầu vào dự kiến; chưa tự biến thành deadline cam kết. | Đề xuất lịch tương đối sau T0. |
| Có phù hợp gói? | Số lượng và quy trình khớp offer; quyền/claim đáp ứng được. | `NEEDS_SCOPING` hoặc `OUT_OF_SCOPE`, kèm lý do cụ thể. |

**Đoạn hỏi bổ sung đã soạn, chưa gửi:** “Để chốt đúng phạm vi, anh/chị cho biết một sản phẩm ưu tiên, nguồn thông tin được phép dùng và vai trò duyệt cuối. Với video/carousel, anh/chị cần kịch bản/chữ hay tệp đã dựng? Tôi sẽ dựa trên đầu vào đó để lập số lượng, loại file và lịch bàn giao; hiện chưa có lịch đăng hoặc khoản thanh toán nào được tạo.”

## 3. Bốn gói và manifest bàn giao đề xuất

Tất cả giá sau là **giá đề xuất từ catalog**, không phải giá trị đơn đã chốt. Các format mix và lịch dưới đây là phương án vận hành để đưa vào scope cụ thể. Catalog giữ nguyên; không suy ra đây là bổ sung điều khoản đã được khách chấp nhận. Một asset là một bản nội dung chính; biến thể theo kênh của cùng nội dung không được đếm thành asset mới để đủ số.

| Gói | Giá đề xuất | Khối lượng trong catalog | Manifest/format đề xuất |
|---|---:|---|---|
| Studio Pilot 14 ngày | 1.500.000 VND/lần | Brief, 12 bản nháp, lịch 14 ngày, checklist, báo cáo bàn giao. | `P-BRIEF`; `P-C01..04` caption; `P-V01..04` kịch bản video; `P-K01..03` carousel text; `P-A01` bài dài; `P-CAL14`; `P-RIGHTS`; `P-HANDOFF`. |
| Creator Studio | 1.990.000 VND/tháng | 20 nội dung/tháng, thư viện kịch bản, báo cáo hiệu quả, một vòng sửa mỗi asset. | `C-C01..08` caption; `C-V01..06` kịch bản; `C-K01..04` carousel text; `C-A01..02` bài dài; `C-LIB`; `C-REPORT`. |
| Team Growth Studio | 4.990.000 VND/tháng | Workflow brief-to-approval, 40 nội dung/tháng, gói phân phối đa kênh, báo cáo funnel. | `T-C01..16` caption; `T-V01..12` kịch bản; `T-K01..08` carousel text; `T-A01..04` bài dài; `T-WORKFLOW`; `T-DISTRIBUTION`; `T-FUNNEL`. |
| B2B Workflow Setup | 9.900.000 VND/lần | Bản đồ quy trình, thiết lập Studio, dashboard, tài liệu, đào tạo nghiệm thu. | `B-MAP` sơ đồ quy trình; `B-STUDIO` cấu hình/triển khai trong môi trường scope cho phép; `B-DASH` dashboard có nguồn dữ liệu; `B-DOC` hướng dẫn vận hành; `B-TRAIN` tài liệu + buổi nghiệm thu theo lịch chốt. |

**Chuẩn file nội dung:** caption là văn bản + CTA + alt text dự kiến; kịch bản video là lời đọc + timecodes + shot list + caption; carousel là chữ từng trang + thứ tự + ghi chú bố cục; bài dài có tiêu đề, nội dung, nguồn và đoạn giới thiệu. Gói đề xuất này chưa bao gồm quay, thiết kế, dựng media hoặc tự đăng. Nhu cầu media thành phẩm phải được làm rõ riêng trước khi xác nhận giá/scope; không ngụ ý giá tham khảo bao gồm mọi nhu cầu.

**Chuẩn đầu ra bổ sung:** thư viện có mục lục/tag và nguồn; gói phân phối có biến thể, điểm đến dự kiến và điều kiện duyệt; báo cáo hiệu quả/funnel chỉ điền số có nguồn, trường chưa kết nối là `null`. Workflow/dashboards B2B phải có kiểm chứng chạy thật trong môi trường được phép và hướng dẫn vận hành; một tài liệu hoặc ảnh mockup không đủ thay `B-STUDIO`/`B-DASH`.

**Lịch tương đối:** T0 chỉ được xác lập khi scope được xác nhận, đầu vào/quyền đủ, reviewer đã chỉ định và năng lực được kiểm tra. T+N dưới đây là ngày lịch, không phải tự động phát hành. Khoảng chờ đầu vào/feedback được ghi thành blocker và đề xuất ngày cập nhật; không âm thầm đổi deadline đã chốt.

| Gói | Nhịp đề xuất sau T0 | Vòng chỉnh sửa |
|---|---|---|
| Pilot | T+2 brief/manifest; T+6 batch 1 (6 asset); T+10 batch 2 (6 asset); T+12 feedback tổng hợp; T+14 bàn giao. | Đề xuất một vòng feedback gộp cho Pilot; phải được ghi trong scope chấp nhận vì catalog chưa quy định số vòng. |
| Creator | T+3 brief kỳ; T+7/14/21/28 bốn batch, mỗi batch 5; T+30 báo cáo. Tháng ngắn phải chốt ngày thực tế phù hợp. | Một vòng sửa mỗi asset theo catalog. |
| Team | T+3 workflow/brief; T+7/14/21/28 bốn batch, mỗi batch 10; T+30 báo cáo funnel. | Đề xuất một vòng gộp mỗi batch; chưa phải quyền lợi đã chốt trong catalog. |
| B2B | T+3 bản đồ; T+8 thiết lập môi trường scope; T+12 dashboard; T+16 kiểm tra/tài liệu; T+20 walkthrough/nghiệm thu. | Đề xuất một vòng rà soát mỗi deliverable, theo scope cụ thể. Đây là ước tính, không có thời hạn cố định trong catalog. |

## 4. Ví dụ đề xuất Pilot đã điền — hư cấu, chưa gửi

**Mã:** `DEMO-PILOT-PROP-001` · **Phiên bản:** 1.0 · **Trạng thái:** `DRAFT_NOT_SENT` · **Tên tình huống:** Mộc Giấy, cửa hàng sổ tay hư cấu đã dùng trong `pilot-sample.md`. Không gán công ty thật, người mua hay thông tin liên hệ.

**Mục tiêu:** chuẩn bị một bộ nội dung giải thích cách dùng sổ và cách hỏi thông tin mẫu thực tế. Đầu ra cần đọc/dùng để quay/thiết kế sau review; không coi đây là chiến dịch đã tạo khách hàng.

**Phạm vi đề xuất:** 12 bản nháp gồm 4 caption, 4 kịch bản video dọc, 3 carousel chữ và 1 bài dài; một brief, lịch 14 ngày, checklist claim/quyền, báo cáo bàn giao. Các mã `P-C01..04`, `P-V01..04`, `P-K01..03`, `P-A01` là asset thực hiện trong đề xuất, độc lập với `MG01..MG12` của bộ minh họa công khai. Một vòng feedback gộp được đề xuất trong bản này; chưa có khách chấp nhận.

**Giá đề xuất:** 1.500.000 VND một lần, khớp catalog. Giá cuối, bên bán, cách thanh toán và các thông tin cần có của giao dịch chưa được xác lập. Không suy ra đã bao gồm hoặc miễn bất kỳ loại thuế/phí nào; không tạo hóa đơn hay yêu cầu chuyển tiền bằng ví dụ này.

**Đầu vào cần có để bắt đầu:** danh sách sản phẩm/thông số được xác nhận; nguồn ảnh/clip có quyền; kênh nội dung và kênh phản hồi được xác minh nếu dùng CTA; vai trò duyệt. Với tình huống hư cấu này, tất cả receipt đầu vào thật đang `null`. T0 và ngày bàn giao thực tế cũng `null`.

**Nhịp bàn giao:** sau T0, chốt brief vào T+2; giao sáu asset đầu vào T+6; sáu asset còn lại T+10; nhận feedback gộp dự kiến T+12; bàn giao phiên bản được chọn T+14. Nếu reviewer chưa phản hồi, trạng thái là chờ review, không tự ghi đã duyệt.

**Cách nghiệm thu:** đúng 12 asset khác nhau; đủ câu chữ, CTA/câu kết, format, nguồn/claim và version; các claim dùng thương mại có bằng chứng; file mở được; lỗi/feedback trong scope đã giải quyết; người có quyền ghi nhận chấp nhận đúng manifest. Các con số tương tác/lead/tiền thu không phải điều kiện được bảo đảm.

**Ngoài scope:** quay/dựng ảnh video, media buying, tự đăng, nhắn người chưa đồng ý, tư vấn bằng thông số/tồn kho chưa kiểm chứng, tích hợp API hoặc cam kết bán hàng. Nếu cần những mục này, phải xác lập scope bổ sung trước khi thực hiện; mẫu này chưa báo giá bổ sung.

**Đoạn phản hồi đề xuất đã soạn, chưa gửi:** “Với nhu cầu giới thiệu cách dùng sổ, đề xuất Pilot gồm 12 bản nháp, lịch 14 ngày và bộ review nguồn/quyền. Video được bàn giao dưới dạng kịch bản, lời đọc và shot list; carousel là chữ từng trang. Giá tham khảo của Pilot là 1.500.000 VND. Lịch cụ thể chỉ bắt đầu sau khi thông tin sản phẩm, tư liệu, người duyệt và phạm vi được xác nhận. Anh/chị có thể đánh dấu phần cần thay đổi trước khi quyết định; bản này chưa tạo đơn, thanh toán hoặc lịch đăng.”

## 5. Kiểm soát bàn giao và chỉnh sửa

**Bảng nghiệm thu dùng cho cả bốn gói:**

| Hạng mục | Điều kiện kiểm được | Receipt |
|---|---|---|
| Đúng scope | IDs và số lượng khớp phiên bản proposal đã chấp nhận. | `scope_version`, `scope_acceptance_ref`. |
| Đúng nội dung | Asset có format/copy/nguồn/quyền và người review; không dùng dữ kiện hư cấu như thật. | `manifest_ref`, review receipt từng asset. |
| Đúng file | File mở được, đúng version/hash, người nhận được phép truy cập. | `delivery_receipt_ref`, file/hash list. |
| Đúng chỉnh sửa | Mỗi feedback có asset/version và quyết định; không đếm thêm copy sửa thành asset mới. | Revision tracker. |
| Đúng kết quả kỹ thuật | Riêng workflow/dashboard: có kiểm tra trong môi trường scope, bằng chứng truy xuất nguồn, quyền và handoff. | `verification_refs`, `environment_ref`. |
| Đúng quyết định | Người nhận có quyền chấp nhận đúng phiên bản; giao file không tự tạo acceptance. | `acceptance_ref`, thời điểm. |

**Quy trình một yêu cầu sửa:** nhận feedback → gắn asset ID và version → phân loại `WITHIN_SCOPE`/`NEEDS_SCOPE_CHANGE` → nêu đề xuất câu sửa → review dữ kiện → tạo version mới → người duyệt chọn → ghi resolution receipt. Không xóa phiên bản cũ. Không tự đặt `ACCEPTED` khi hết thời gian.

**Ví dụ sửa hư cấu:** asset `P-C01`, v1.0: “Một cuốn sổ cho những ý tưởng của bạn.” Feedback giả định: “Muốn câu kết có hành động cụ thể.” v1.1 đề xuất: “Chọn một ý tưởng bạn muốn thử và ghi bước đầu tiên vào trang hôm nay.” Phân loại `WITHIN_SCOPE`; claim là gợi ý biên tập; kết quả vẫn `DRAFT_NOT_SENT`, chưa có reviewer thật. Đây là mẫu ghi nhận, không phải hoạt động khách hàng.

**Mẫu lời bàn giao đã soạn:** “Bộ bàn giao gồm manifest, file theo từng mã và ghi chú review. Vui lòng đối chiếu phiên bản scope và đánh dấu chấp nhận hoặc yêu cầu sửa theo mã asset. Những chỉ số chưa có nguồn được để trống có chủ đích. File đã bàn giao chưa đồng nghĩa quyền tự phát hành; việc đăng cần đúng tài khoản, phiên bản và quyết định được ghi nhận.”

## 6. Mẫu đối soát và cách đọc số tiền

JSON có record reconciliation dùng cùng một cấu trúc cho bốn offer. Các trường tiền có đơn vị VND, số nguyên hoặc `null`; giá trị gross, hoàn tiền và phí không âm, còn net settlement có thể âm nếu kỳ đối soát gồm hoàn tiền/phí lớn hơn tiền nhận. Không lấy tổng giá đề xuất làm tiền đã thu.

| Trường | Ý nghĩa | Trạng thái trước nguồn thật |
|---|---|---|
| `proposed_amount_vnd` | Giá từ đề xuất, chưa phải đơn | Theo catalog nếu đã chọn offer; trong blank record là `null`. |
| `accepted_order_amount_vnd` | Giá trị scope/đơn đã được xác nhận | `null`. |
| `gross_paid_vnd` | Tổng giao dịch tiền về đã xác minh | `null`. |
| `refunds_vnd` | Hoàn tiền đã xác minh trong cùng kỳ/đơn | `null`; chỉ dùng 0 khi đã kiểm nguồn. |
| `payment_fees_vnd` | Phí giao dịch đã xác minh | `null`. |
| `net_settled_vnd` | Tiền settlement: gross − refunds − fees, khi cả ba đủ và phạm vi khớp | `null`. |
| `other_actual_costs_vnd` | Chi phí thực tế ngoài phí thanh toán | `null`; trần chi thêm 0 không chứng minh giá trị trường này. |

Đối chiếu: order ID + phiên bản + tiền tệ + transaction ID duy nhất + trạng thái provider + settlement/source record. Thu một phần, chênh lệch giá, nghi trùng, hoàn tiền hoặc thiếu nguồn đều cần ghi discrepancy; không đánh dấu hoàn tất chỉ vì webhook HTTP 200. Thu tiền không tự chứng minh việc bàn giao; bàn giao không tự chứng minh thu tiền. Khi chưa có source liên quan, giữ actuals `null` và báo `PENDING_RECONCILIATION`.

## 7. Hai kịch bản công sức/chi phí giả định

Không phải timesheet hay chi phí đã phát sinh. Cùng dùng giá đề xuất Pilot 1.500.000 VND. Đơn giá công sức quy đổi giả định 100.000 VND/giờ chỉ để đánh giá nguồn lực; không phải khoản phải trả hay ngân sách được phép chi. Chi phí API, vận hành, thuế/phí, media và giao dịch thực tế chưa biết.

| Hạng mục | A — đầu vào rõ, ít sửa | B — cần kiểm tra nguồn nhiều hơn |
|---|---:|---:|
| Xác định nhu cầu | 0,5 giờ | 1 giờ |
| Chốt scope/manifest | 0,5 giờ | 1 giờ |
| Kiểm tra nguồn | 1 giờ | 2 giờ |
| Viết 12 asset | 3 giờ | 4 giờ |
| Review | 1,5 giờ | 2 giờ |
| Một vòng sửa gộp | 1 giờ | 1,5 giờ |
| Bàn giao | 0,5 giờ | 0,5 giờ |
| Tổng công sức giả định | **8 giờ** | **12 giờ** |
| Công sức quy đổi | **800.000 VND** | **1.200.000 VND** |
| Giá đề xuất trừ công sức quy đổi | **700.000 VND** | **300.000 VND** |
| Dư địa phần trăm trước chi phí chưa biết | **46,67%** | **20%** |

Dòng “dư địa” không phải lợi nhuận, dòng tiền hoặc gross margin đã đo. Nếu chỉ dành giả định 20 giờ/tuần và dự phòng 20% cho lỗi/điều phối thì còn 16 giờ lập kế hoạch: tối đa lý thuyết `floor(16/8) = 2` Pilot kiểu A hoặc `floor(16/12) = 1` Pilot kiểu B mỗi tuần. Đây là trần tính toán, chưa chứng minh có nhân lực/tài khoản/khả năng phục vụ hay có khách. Không cộng hai mức thành ba Pilot. Lịch 14 ngày và thời gian chờ review làm số đơn đồng thời khác số đơn/tuần; phải kiểm công việc đang mở trước khi chốt.

Chưa đưa ước tính thời gian Creator/Team/B2B thành cam kết năng lực; cần timebox thử nghiệm từng workflow và đầu vào cụ thể trước khi xếp lịch. Không dùng tỷ lệ công sức Pilot để suy ra tuyến tính độ khó của thiết lập B2B.

## 8. Cấu trúc bản ghi máy đọc và kiểm tra

`data/pilot-commercial-workbook.json` chứa bốn scope cards, ví dụ đề xuất Pilot, hai capacity scenarios và năm record trống có JSON Schema: `qualification`, `proposal`, `acceptance`, `revision`, `reconciliation`. Trường ID/ref chưa có là `null`; status ghi đúng loại record. Mọi ví dụ thương mại chưa gửi dùng `DRAFT_NOT_SENT`; actuals và receipt thật đều `null`.

Chỉ chuyển sang bản ghi hoạt động khi có nguồn thật. Các schema phục vụ kiểm cấu trúc nội bộ; không thay quyền truy cập, kiểm tra consent, nguồn claim, hay đối soát giao dịch tại runtime. Khóa không được khai báo bị từ chối bằng `additionalProperties: false` để tránh vô tình đẩy dữ liệu liên hệ/bí mật vào mẫu này.

### Diễn tập local — bổ sung 17/10/2026

`npm run rehearse:commercial` tạo receipt mới trong `.local/commercial-rehearsals/`, chỉ dùng fixture hư cấu có tiền tố `DEMO-`. Luồng gồm 16 lần chuyển trạng thái và tám tình huống bị từ chối có chủ đích; `actuals` luôn `null`. Tệp nguồn, scope và các phiếu trống không bị điền thành khách thật. Lệnh không nhận file khách hàng, không gửi, không gọi provider hay mở cổng API.

`tools/commercial-records.mjs` kiểm năm record bằng tập keyword schema đang dùng, từ chối keyword chưa hỗ trợ và ref ngoài/có vòng lặp; đây không phải bộ JSON Schema tổng quát. Kiểm thêm: consent/điểm đến/quyền và capacity phải có ref trước đủ điều kiện; scope có đầy đủ deliverable; trạng thái gửi chưa rõ phải đối soát; nghiệm thu phải có manifest, review, delivery, người duyệt, thời điểm và không còn revision mở. Thay manifest sau chỉnh sửa phải trở lại review, bỏ receipt cũ. Record đã chốt không được viết lại dưới cùng danh tính trong diễn tập.

Đối soát yêu cầu order/provider/transaction/settlement refs, tiền nguyên an toàn, tổng net khớp gross − refunds − fees. Thu một phần, dữ liệu thiếu, ID trùng hoặc discrepancy mở không được ghi `RECONCILED`; net âm có thể hợp lệ khi dữ liệu đầy đủ và phép tính khớp. `other_actual_costs_vnd` vẫn có thể `null`; net settlement không phải lợi nhuận. Ref được điền chỉ vượt qua kiểm cấu trúc, không chứng minh ref có thật hoặc đã được xác minh. Các guard này chưa gắn vào API production và không cấp quyền gửi/thu tiền.
