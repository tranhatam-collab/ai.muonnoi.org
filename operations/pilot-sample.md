# Studio Pilot 14 ngày — bộ bàn giao mẫu cho Mộc Giấy

Ngày tạo: 17/10/2026 · Phiên bản: 1.0 · Trạng thái: `DRAFT_ONLY` · Offer: `studio-pilot-14d`.

**Đây là tình huống minh họa hư cấu, không phải khách hàng, cửa hàng hay chiến dịch đã chạy.** “Mộc Giấy” là tên giả dùng để thể hiện chất lượng bản nháp. Chưa kiểm tra quyền sử dụng tên thương hiệu này. Không có lời chứng thực, người mua, ảnh sản phẩm, dữ liệu kết quả, tài khoản nhận tin hoặc doanh thu thật trong gói này. Toàn bộ 12 nội dung cần thay thông tin giả bằng thông tin cửa hàng đã xác minh, duyệt quyền tài sản và cấu hình tài khoản trước khi phát hành. Các lời mời nhắn tin chỉ mô tả luồng khi cửa hàng đã có kênh nhận tin; hiện chưa hoạt động.

Gói mẫu giữ đúng phạm vi Pilot trong `data/offer-catalog.json`: brief thương hiệu, 12 bản nháp, lịch 14 ngày, checklist nguồn/quyền và báo cáo bàn giao. Giá và điều kiện thương mại của catalog không thay đổi. Bộ mẫu có thể dùng để đánh giá năng lực biên tập; không phải bằng chứng tạo được đơn hàng.

## 1. Brief đã điền cho tình huống minh họa

| Mục | Nội dung đã chọn |
|---|---|
| Thương hiệu giả | Mộc Giấy — một cửa hàng sổ tay thủ công giả định. |
| Sản phẩm trong scope | Sổ tay dùng để ghi chép hằng ngày và làm quà; chưa xác nhận chất liệu, kích thước, giá, tồn kho hay dịch vụ cá nhân hóa. |
| Nhóm người đọc | Người trưởng thành thích viết tay; người cần một món quà có lời nhắn riêng; chưa giả định nghề nghiệp, thu nhập hoặc tình trạng cá nhân. |
| Vấn đề nội dung | Có ảnh/quy trình sản phẩm nhưng cần chuyển thành nội dung dễ hiểu, giúp người xem chọn cách dùng và biết thông tin cần hỏi trước khi mua. |
| Mục tiêu Pilot | Bàn giao đủ 12 nội dung sử dụng được sau review; tạo một luồng hỏi nhu cầu → xác minh mẫu thực tế → tư vấn. Không đặt KPI doanh thu như điều kiện cam kết. |
| Giọng | Gần gũi, rõ, bình tĩnh; câu ngắn; mô tả chi tiết nhìn thấy; tránh “tốt nhất”, “chữa lành”, “bền vững”, “100%”, “bảo đảm”. |
| Kênh mẫu | Facebook Page cho caption và bài dài; Instagram cho carousel; Reels/YouTube Shorts/TikTok cho video dọc khi tài khoản tương ứng được chủ sở hữu cấu hình. |
| Trụ nội dung | Cách dùng trang giấy; lựa chọn theo nhu cầu; góc làm sổ; chuẩn bị món quà. |
| CTA duy nhất để nhận tư vấn | “Nhắn SỔ và cho biết bạn muốn dùng để ghi chép hay làm quà.” Chỉ kích hoạt sau khi có người/bộ phận nhận tin và năng lực phản hồi. |
| Tài sản cần chủ cửa hàng xác minh | Ảnh đúng mẫu sổ; clip quy trình thật; bảng thông số/giá hiện hành; người duyệt; quyền quay và sử dụng tài sản. Đây là đầu vào còn thiếu, không giả định đã có. |
| Người duyệt trong ví dụ | Vai trò “Chủ cửa hàng”; chưa gán tên hoặc tài khoản thật. |
| Chu kỳ | 17–30/10/2026 trong lịch minh họa; ngày phát hành thực tế chưa chốt. |
| Không thuộc scope | Tự nhận tiền, tạo đơn, trả lời bằng dữ liệu tồn kho giả, mua quảng cáo, đăng tự động, tiếp cận người chưa đồng ý. |

## 2. Sổ claim và nguồn cần kiểm chứng

Mỗi asset bên dưới tham chiếu claim ID. Nhãn `FICTIONAL_DEMO` không đồng nghĩa đã xác minh. Khi áp dụng cho khách thật, thay bằng nguồn có ngày, người xác nhận và phiên bản; không chỉ xóa nhãn.

| ID | Nội dung được dùng | Nhãn hiện tại | Điều kiện để dùng cho cửa hàng thật |
|---|---|---|---|
| C01 | Tên Mộc Giấy và việc cửa hàng bán sổ tay thủ công | `FICTIONAL_DEMO` | Chủ cửa hàng xác nhận tên, quyền dùng thương hiệu và bằng chứng sản phẩm/quy trình. |
| C02 | Khâu xếp giấy, làm bìa, kiểm trang có trong quy trình của cửa hàng | `FICTIONAL_DEMO` | Clip gốc do cửa hàng sở hữu + người thực hiện xác nhận đúng trình tự; bỏ bước không có. |
| C03 | Có kênh tư vấn, có thể xem mẫu/thông số/giá hiện hành | `UNVERIFIED_SOURCE_REQUIRED` | URL/handle chính thức, người nhận tin, bảng thông tin có ngày; không suy ra có tồn kho hoặc giao ngay. |
| C04 | Các cách ghi chép, câu hỏi chọn sổ, gợi ý viết lời tặng | `EDITORIAL_SUGGESTION` | Nội dung tự biên soạn; trình bày là gợi ý tùy nhu cầu, không khẳng định kết quả hay lợi ích sức khỏe. |
| C05 | Màu, kích thước, số trang, chất liệu, khả năng dùng với một loại bút, giá, tồn kho, giao hàng | `NOT_CLAIMED` | Chưa đưa giá trị vào bản nháp; chỉ điền sau khi đối chiếu mẫu/bảng thông tin thật. |
| C06 | Tiết kiệm thời gian, tăng tương tác, có khách hàng hoặc doanh thu nhờ bộ nội dung | `NOT_CLAIMED` | Không có dữ liệu thực nghiệm. Không dùng kết quả giả, benchmark giả hoặc testimonial. |

## 3. Mười hai bản nháp hoàn chỉnh

### MG01 — Một trang bắt đầu vừa đủ

**Format:** caption ảnh · **Kênh chính:** Facebook · **Claim:** C01, C04 · **Trạng thái:** `DRAFT_ONLY`.

**Caption dùng sau review**

Trang đầu không cần phải đẹp.

Bạn có thể bắt đầu bằng ba dòng rất nhỏ:

– Hôm nay tôi muốn dành thời gian cho điều gì?
– Việc nào có thể làm trước?
– Có điều gì tôi muốn ghi lại để khỏi quên?

Viết xong rồi gấp sổ lại cũng được. Không cần trang trí kín trang, không cần theo kịp cách ghi chép của ai khác.

Mộc Giấy gợi ý một cách mở sổ như vậy: để trang giấy phục vụ điều bạn cần viết hôm nay.

Nếu muốn thử, hãy chọn một trong ba câu hỏi và viết câu trả lời của riêng bạn.

**Bản thích nghi Instagram:** “Trang đầu không cần phải đẹp. Chọn một câu thôi: Hôm nay mình muốn dành thời gian cho điều gì? Viết câu trả lời của bạn, rồi để trang còn lại tiếp tục vào một ngày khác.”

**Ảnh cần làm:** ảnh chụp từ trên xuống, một trang chỉ có ba câu hỏi viết bằng tay của người thực hiện; không chụp ghi chú riêng. **Alt text mẫu:** “Cuốn sổ mở trên bàn, trang giấy có ba câu hỏi để bắt đầu ghi chép.” Chỉnh alt text theo ảnh thật.

### MG02 — Video 25 giây: viết gì khi chưa có ý tưởng?

**Format:** video dọc 9:16 · **Kênh chính:** Reels · **Claim:** C04 · **Trạng thái:** `DRAFT_ONLY`.

| Thời gian | Hình quay | Lời đọc và chữ trên màn hình |
|---|---|---|
| 0–3 giây | Mở một trang trống. | “Mở sổ ra rồi chưa biết viết gì?” / Chữ: “Thử ba dòng này.” |
| 3–9 giây | Tay viết “Một việc hôm nay”. | “Dòng một: một việc bạn muốn hoàn thành hôm nay.” |
| 9–15 giây | Tay viết “Một điều cần nhớ”. | “Dòng hai: một điều cần nhớ, dù rất nhỏ.” |
| 15–21 giây | Tay viết “Một điều muốn thử”. | “Dòng ba: một điều bạn muốn thử khi có thời gian.” |
| 21–25 giây | Toàn cảnh trang có ba dòng, giữ đủ để đọc. | “Không cần viết dài. Bạn muốn bắt đầu ở dòng nào?” |

**Caption:** “Một trang trống có thể bắt đầu từ ba dòng. Đây là gợi ý, không phải quy tắc ghi chép. Chọn câu phù hợp với bạn hôm nay.”

**YouTube Shorts:** tiêu đề “Ba dòng để bắt đầu một trang sổ”; mô tả dùng caption trên. **TikTok:** mở thẳng bằng cảnh trang trống; giữ lời đọc, dùng phụ đề tự viết, không dùng nhạc chưa rõ quyền. **Âm thanh:** tiếng lật giấy tự thu hoặc giọng đọc đã có quyền dùng; không bắt buộc nhạc.

### MG03 — Carousel: chọn sổ bằng bốn câu hỏi

**Format:** carousel 6 trang · **Kênh chính:** Instagram · **Claim:** C03, C04, C05 · **Trạng thái:** `DRAFT_ONLY`.

1. **Bìa:** “Trước khi chọn sổ, thử trả lời bốn câu hỏi.”
2. **Bạn sẽ mang sổ đi đâu?** “Ở bàn làm việc, trong túi xách hay bên cạnh giường? Hãy hình dung nơi bạn dùng sổ nhiều nhất trước khi hỏi kích thước.”
3. **Bạn thường viết bằng gì?** “Bút bi, bút chì hay loại bút khác? Hỏi người bán về mẫu giấy và khả năng dùng với chính loại bút của bạn; đừng đoán từ ảnh.”
4. **Bạn thích trang như thế nào?** “Trang trơn, có dòng hoặc có ô phục vụ những cách viết khác nhau. Chọn theo việc bạn sẽ làm trên giấy.”
5. **Bạn cần ghi trong bao lâu?** “Một chuyến đi, một dự án hay ghi chép thường ngày? Hỏi số trang và cân nhắc lượng nội dung bạn định viết.”
6. **Kết:** “Không cần một cuốn sổ hợp với tất cả mọi người. Nếu muốn được tư vấn mẫu thực tế, nhắn SỔ và nói bạn dùng để ghi chép hay làm quà.”

**Caption:** “Đừng chọn chỉ vì ảnh đẹp. Lưu bốn câu hỏi này để kiểm tra mẫu sổ theo đúng cách bạn sẽ sử dụng. Thông số và tình trạng mẫu cần được cửa hàng xác nhận tại thời điểm tư vấn.”

**Facebook:** dùng sáu ảnh theo đúng thứ tự; đặt bốn câu hỏi ở đầu caption. Không gắn nhãn “còn hàng” khi chưa có dữ liệu. **Thiết kế:** chữ lớn, tương phản rõ, mỗi trang một câu hỏi; dùng hình tự tạo hoặc ảnh có quyền.

### MG04 — Một trang cho chuyến đi ngắn

**Format:** caption ảnh · **Kênh chính:** Facebook · **Claim:** C04 · **Trạng thái:** `DRAFT_ONLY`.

**Caption**

Không phải chuyến đi nào cũng cần một cuốn nhật ký dày.

Một trang giấy có thể dành cho bốn điều:

Nơi mình đã đến.
Một món đã thử.
Một câu đã nghe.
Một chi tiết muốn nhớ.

Bạn có thể viết ngay lúc nghỉ chân hoặc ghi lại sau khi về nhà. Nếu không muốn viết nhiều, chỉ cần một câu và một nét vẽ cũng được.

Thử đặt tiêu đề cho trang bằng ngày đi, thay vì cố nghĩ một cái tên thật hay. Phần còn lại là câu chuyện của bạn.

Bạn sẽ giữ lại chi tiết nào từ chuyến đi gần nhất?

**Instagram:** “Một nơi. Một món. Một câu. Một chi tiết. Bốn gợi ý cho trang ghi chép sau chuyến đi của bạn.” **Ảnh:** trang mẫu tự viết về một chuyến đi tưởng tượng; trên ảnh ghi “Trang minh họa”. Không dùng vé hoặc hóa đơn có dữ liệu thật.

### MG05 — Video 30 giây: nhìn một bước làm sổ

**Format:** video dọc · **Kênh chính:** Reels · **Claim:** C01, C02 · **Trạng thái:** `DRAFT_ONLY`, chờ clip quy trình thật.

| Thời gian | Hình quay dự kiến | Lời đọc và chữ |
|---|---|---|
| 0–4 giây | Cận tay xếp giấy. | “Trước khi trở thành một cuốn sổ, đây là những tờ giấy rời.” |
| 4–12 giây | Một bước xếp giấy quay liên tục, không tăng tốc gây hiểu sai. | “Ở bước này, chúng mình xếp lại phần ruột để chuẩn bị cho công đoạn tiếp theo.” |
| 12–22 giây | Cận một bước làm bìa có thật trong quy trình. | “Phần bìa được thực hiện riêng. Mỗi cảnh ở đây chỉ ghi lại một phần công việc.” |
| 22–30 giây | Mở và lật các trang của mẫu đã hoàn thiện. | “Và đây là lúc lật thử những trang đầu. Bạn muốn xem kỹ công đoạn nào trong lần sau?” |

**Caption:** “Một lát cắt trong quá trình làm sổ tại Mộc Giấy. Video không đại diện cho toàn bộ quy trình. Chúng mình sẽ ghi rõ công đoạn được quay để bạn dễ theo dõi.”

**Shorts:** tiêu đề “Từ giấy rời đến một trang sổ: một góc quy trình”; **TikTok:** dùng âm thanh thao tác thật, không thêm từ “hoàn toàn bằng tay” hoặc “thân thiện môi trường”. Nếu thực tế không có bước làm bìa/xếp giấy như mô tả, sửa storyboard trước khi quay và review lại C02.

### MG06 — Carousel: lời nhắn cho cuốn sổ làm quà

**Format:** carousel 5 trang · **Kênh chính:** Instagram · **Claim:** C04 · **Trạng thái:** `DRAFT_ONLY`.

1. **Bìa:** “Tặng một cuốn sổ, viết lời nhắn gì?”
2. **Cho người bắt đầu một dự án:** “Chúc bạn có thật nhiều điều muốn thử. Cuốn sổ này dành cho những ý tưởng của bạn, kể cả khi chúng còn chưa hoàn chỉnh.”
3. **Cho người thích đi đây đó:** “Mong bạn gặp nhiều điều đáng nhớ. Nếu muốn, hãy dành vài trang để giữ lại một góc của mỗi chuyến đi.”
4. **Cho chính mình:** “Không cần mọi trang đều chỉn chu. Mình được phép viết lại, gạch đi và bắt đầu ở một trang khác.”
5. **Kết:** “Chọn một lời nhắn, rồi đổi cách xưng hô và thêm một chi tiết chỉ hai người biết. Giữ riêng thông tin cá nhân; không cần đưa lời nhắn thật lên mạng.”

**Caption:** “Một lời nhắn ngắn cũng đủ để món quà mang ý nghĩa của người tặng. Ba đoạn trên là gợi ý tự biên soạn; bạn có thể sửa để đúng với mối quan hệ của mình.”

**Facebook:** chuyển thành một bài có ba đoạn trích; hỏi “Bạn thường viết lời nhắn ở trang đầu hay kẹp một tấm thiệp?”. **Tài sản:** chữ tự thiết kế trên nền đơn giản; không ngụ ý cửa hàng có dịch vụ in/khắc tên.

### MG07 — Bài dài: để cuốn sổ có một việc rõ ràng

**Format:** bài viết · **Kênh chính:** Facebook/website sau cấu hình · **Claim:** C03, C04, C05 · **Trạng thái:** `DRAFT_ONLY`.

**Tiêu đề:** “Trước khi mua một cuốn sổ mới, hãy chọn việc bạn muốn làm với nó”

Một cuốn sổ trong ảnh có thể rất đẹp, nhưng điều đáng hỏi trước tiên là: mình sẽ dùng nó vào việc gì? Không cần tìm một công dụng lớn. Một việc cụ thể, vừa với sinh hoạt của bạn, đã đủ để bắt đầu lựa chọn.

Nếu bạn muốn ghi việc mỗi ngày, hãy thử viết ra lượng thông tin thường cần ghi: vài gạch đầu dòng, lịch theo giờ hay ghi chú dài sau mỗi cuộc họp. Từ đó, bạn có thể cân nhắc kiểu trang và khoảng trống cần thiết. Đây là lựa chọn theo thói quen của bạn, không có một bố cục bắt buộc cho tất cả mọi người.

Nếu bạn muốn mang sổ theo khi ra ngoài, hãy hỏi kích thước thực tế thay vì chỉ nhìn ảnh. Bạn có thể đo ngăn túi mình thường dùng rồi so sánh với số đo cửa hàng cung cấp. Nếu sổ chủ yếu nằm trên bàn, hãy hình dung chỗ đặt sổ khi đang viết, cùng với các đồ vật khác bạn thường sử dụng.

Nếu định dùng sổ làm quà, hãy nghĩ về người nhận ở mức đơn giản: họ có thích viết tay không, thường ghi chép điều gì, có muốn mang sổ theo người không? Bạn không cần đoán sở thích quá chi tiết. Một lời nhắn do chính bạn viết có thể thể hiện ý định của món quà mà không cần thêm dịch vụ cá nhân hóa.

Loại bút cũng là một câu hỏi nên hỏi trước. Khi chưa có mẫu thử, đừng tự kết luận giấy sẽ phù hợp với mọi loại mực. Hãy cho cửa hàng biết loại bút bạn dự định dùng và đề nghị thông tin hoặc hình thử tương ứng nếu cửa hàng có. Những mô tả như “không lem” chỉ nên sử dụng khi đã có điều kiện thử và kết quả rõ ràng.

Cuối cùng, kiểm tra lại thông số, giá, tình trạng mẫu và điều kiện giao nhận tại thời điểm bạn quyết định. Bài viết giới thiệu hoặc hình ảnh cũ không thay cho xác nhận hiện tại của người bán.

Một cách bắt đầu ngắn gọn là hoàn thành câu này: “Tôi muốn dùng cuốn sổ để…”. Bạn có thể dùng câu trả lời đó khi hỏi tư vấn tại Mộc Giấy. Chúng mình sẽ trao đổi dựa trên thông tin mẫu thực tế đã được xác nhận, không chọn thay bạn chỉ vì một tấm ảnh.

**Đoạn giới thiệu Instagram:** “Bạn muốn cuốn sổ mới có một việc gì? Ghi ba việc mỗi ngày, lưu ý tưởng cho một dự án hay viết vài dòng sau chuyến đi? Hãy chọn việc trước, rồi hỏi thông số mẫu phù hợp.” Không gắn “link bio” trước khi URL bài thật tồn tại.

### MG08 — Video 20 giây: một trang dành cho ý tưởng

**Format:** video dọc · **Kênh chính:** Shorts · **Claim:** C04 · **Trạng thái:** `DRAFT_ONLY`.

| Thời gian | Hình | Lời đọc / chữ |
|---|---|---|
| 0–3 giây | Viết tiêu đề “Ý tưởng chưa cần hoàn chỉnh”. | “Ý tưởng này chưa rõ lắm? Cứ ghi lại trước.” |
| 3–8 giây | Kẻ hai cột “Điều muốn thử” và “Bước nhỏ đầu tiên”. | “Một bên là điều bạn muốn thử.” |
| 8–14 giây | Điền ví dụ “Vẽ một bưu thiếp” / “Phác ba hình nhỏ”. | “Bên còn lại là một bước nhỏ có thể làm.” |
| 14–20 giây | Giữ toàn cảnh hai cột. | “Không phải kế hoạch cố định. Chỉ là một chỗ để bắt đầu nghĩ tiếp.” |

**Tiêu đề Shorts:** “Một trang cho ý tưởng chưa hoàn chỉnh”. **Caption Reels/TikTok:** “Thử hai cột: điều muốn thử và bước nhỏ đầu tiên. Ví dụ trong video là trang minh họa do chúng mình tự viết. Bạn có thể đổi bố cục theo cách mình thích.”

**Quay:** một cảnh tay viết, không cần người mẫu; dựng phụ đề đọc được khi tắt tiếng. Không hứa bố cục sẽ tăng năng suất.

### MG09 — Những thông tin nên hỏi trước khi chọn mẫu

**Format:** caption ảnh · **Kênh chính:** Facebook · **Claim:** C03, C04, C05 · **Trạng thái:** `DRAFT_ONLY`.

**Caption**

Một tấm ảnh chưa thể trả lời hết câu hỏi về cuốn sổ.

Trước khi chọn mẫu, bạn có thể hỏi:

1. Kích thước và số trang thực tế là bao nhiêu?
2. Trang bên trong trơn, có dòng hay có ô?
3. Có ảnh chụp phần ruột và mép sổ không?
4. Mẫu này hiện có sẵn hay cần chờ?
5. Giá và điều kiện giao nhận được xác nhận vào thời điểm nào?

Mộc Giấy sẽ dùng thông tin mẫu đã được xác nhận để tư vấn. Nếu một thông tin chưa rõ, chúng mình cần kiểm tra lại trước khi trả lời.

Bạn có thể nhắn SỔ kèm mục đích sử dụng. Chưa cần quyết định mua ở bước hỏi thông tin.

**Instagram:** “Ảnh đẹp là điểm bắt đầu. Trước khi chọn sổ, hãy hỏi thêm kích thước, số trang, kiểu ruột, tình trạng mẫu và điều kiện giao nhận. Lưu danh sách này cho lần cần dùng.” **Ảnh:** năm câu hỏi dưới dạng chữ; không dựng screenshot hội thoại với khách giả.

### MG10 — Carousel: cùng một trang, ba cách dùng

**Format:** carousel 5 trang · **Kênh chính:** Instagram · **Claim:** C04 · **Trạng thái:** `DRAFT_ONLY`.

1. **Bìa:** “Cùng một trang giấy, thử ba cách dùng.”
2. **Cách một — một danh sách ngắn:** “Hôm nay: mang sách trả bạn; ghi lại ý tưởng cho cuối tuần; chuẩn bị câu hỏi cho cuộc hẹn. Ví dụ minh họa, hãy thay bằng việc của bạn.”
3. **Cách hai — một điều muốn nhớ:** “Hôm nay mình nhìn thấy một chiếc bóng cây rất đẹp trên tường. Ghi một câu, thêm một nét vẽ nếu muốn.”
4. **Cách ba — một câu hỏi mở:** “Nếu có một buổi chiều rảnh, mình muốn thử làm gì? Để chỗ trống cho câu trả lời đến sau cũng được.”
5. **Kết:** “Bạn không cần dùng tất cả. Chọn một cách phù hợp với trang giấy hôm nay.”

**Caption:** “Không có mẫu ghi chép duy nhất. Ba trang trong bài là ví dụ tự viết để bạn chọn, sửa hoặc bỏ qua. Bạn thích danh sách, một câu chuyện nhỏ hay một câu hỏi?”

**Facebook:** đăng từng ảnh theo thứ tự kèm caption. **Thiết kế:** gắn “Trang minh họa” trên những ảnh có ví dụ viết tay; không dùng tên, lịch hẹn hoặc địa điểm cá nhân thật.

### MG11 — Video 25 giây: trước khi tặng sổ

**Format:** video dọc · **Kênh chính:** Reels · **Claim:** C04 · **Trạng thái:** `DRAFT_ONLY`.

| Thời gian | Hình | Lời đọc / chữ |
|---|---|---|
| 0–4 giây | Đặt cuốn sổ cạnh một tờ giấy nhỏ. | “Trước khi tặng một cuốn sổ, bạn có thể thêm điều này.” |
| 4–11 giây | Viết lời nhắn mẫu. | “Một câu do chính bạn viết: Mong bạn có nhiều điều muốn ghi lại.” |
| 11–18 giây | Gấp tờ lời nhắn, đặt cạnh sổ. | “Không cần lời thật dài. Thêm cách xưng hô của hai người là được.” |
| 18–25 giây | Bố cục món quà và lời nhắn, không quay thông tin người nhận. | “Giữ lời nhắn thật ở riêng. Video này chỉ dùng chữ minh họa.” |

**Caption:** “Gợi ý dành cho người tặng: tự viết một lời nhắn ngắn và đặt cùng cuốn sổ. Đây là hướng dẫn trình bày tại nhà, không phải thông báo dịch vụ gói quà của cửa hàng.”

**Shorts:** tiêu đề “Một lời nhắn ngắn khi tặng sổ”. **TikTok:** giữ toàn bộ lời đọc, thêm phụ đề; không dùng hình ảnh người nhận nếu chưa có quyền.

### MG12 — Chọn một việc cho cuốn sổ tiếp theo

**Format:** caption ảnh · **Kênh chính:** Facebook · **Claim:** C01, C03, C04 · **Trạng thái:** `DRAFT_ONLY`.

**Caption**

Nếu cuốn sổ tiếp theo chỉ cần có một việc, bạn muốn đó là việc gì?

Ghi vài dòng mỗi ngày.
Giữ ý tưởng cho một dự án.
Nhớ một chuyến đi.
Hay gửi tặng một người bạn.

Hãy bắt đầu từ cách bạn muốn sử dụng, rồi kiểm tra mẫu sổ thực tế. Kích thước, kiểu trang, giá và tình trạng mẫu cần được xác nhận trước khi chọn.

Nếu muốn trao đổi cùng Mộc Giấy, nhắn SỔ và nói bạn đang tìm sổ để ghi chép hay làm quà. Chúng mình sẽ hỏi thêm nhu cầu và trả lời theo thông tin đã kiểm tra. Bạn có thể dừng cuộc trao đổi bất cứ lúc nào.

**Instagram:** “Cuốn sổ tiếp theo của bạn sẽ dành cho điều gì? Ghi chép hay làm quà? Khi cần tư vấn mẫu thực tế, nhắn SỔ kèm nhu cầu của bạn.” **Ảnh:** một mẫu sổ thật có quyền sử dụng sau khi xác nhận; không thêm badge giảm giá, số lượng khan hiếm hay đánh giá giả.

## 4. Lịch 14 ngày và điểm kiểm tra

Đây là lịch chuẩn bị/phát hành **đề xuất**, không phải lịch đã đăng hoặc bằng chứng automation social hoạt động. Cột thời điểm 19:30 là giả định để lập lịch, chưa được tối ưu bằng dữ liệu. Hai ngày review không bổ sung vào con số 12 nội dung.

| Ngày | Ngày minh họa | Nội dung chính | Việc cần hoàn thành trước khi cho phép đăng |
|---|---|---|---|
| D01 | 17/10/2026 | MG01 · caption · 19:30 | Xác nhận brief, tên thật và ảnh; ghi version người duyệt. |
| D02 | 18/10/2026 | MG02 · video · 19:30 | Quay trang mẫu; soát phụ đề, quyền giọng/âm thanh. |
| D03 | 19/10/2026 | MG03 · carousel · 19:30 | Xác minh kênh nhận tin; không biến câu hỏi thành thông số thật. |
| D04 | 20/10/2026 | MG04 · caption · 19:30 | Ảnh ghi rõ minh họa; không có thông tin chuyến đi thật. |
| D05 | 21/10/2026 | MG05 · video · 19:30 | Đối chiếu C02 với quy trình và clip thật; sửa bước không đúng. |
| D06 | 22/10/2026 | MG06 · carousel · 19:30 | Soát câu chữ; không ngụ ý dịch vụ khắc tên/gói quà. |
| D07 | 23/10/2026 | Review tuần 1, không đăng thêm | Nếu đã đăng hợp lệ: lưu post ID và số liệu do nền tảng cung cấp; nếu chưa đăng: `NOT_PUBLISHED`, metrics `null`. |
| D08 | 24/10/2026 | MG07 · bài dài · 19:30 | Duyệt mọi thông tin sản phẩm; chỉ gắn URL bài nếu đã có. |
| D09 | 25/10/2026 | MG08 · video · 19:30 | Kiểm phụ đề, ví dụ tự biên soạn, không claim năng suất. |
| D10 | 26/10/2026 | MG09 · caption · 19:30 | Kiểm tra người nhận tin và bảng sản phẩm hiện hành. |
| D11 | 27/10/2026 | MG10 · carousel · 19:30 | Gắn nhãn trang minh họa; kiểm tra riêng tư ảnh. |
| D12 | 28/10/2026 | MG11 · video · 19:30 | Không hứa dịch vụ gói quà; kiểm quyền tài sản. |
| D13 | 29/10/2026 | MG12 · caption · 19:30 | CTA chỉ dùng nếu kênh thật sẵn sàng nhận nhu cầu. |
| D14 | 30/10/2026 | Review, bàn giao, không đăng thêm | Đối soát đủ 12 asset, phiên bản, quyết định; tổng hợp số liệu có nguồn hoặc ghi chưa có. |

Nếu chưa đủ điều kiện vào ngày đề xuất, giữ asset ở `DRAFT_ONLY`; dời ngày thực tế sau khi người duyệt chấp nhận. Không bù lịch bằng đăng hàng loạt hoặc liên hệ người chưa đồng ý.

## 5. Hai kịch bản bán hàng có sự đồng ý

Hai script này dành cho **bán Studio Pilot của AI Muôn Nơi**, tách với CTA nhắn SỔ của cửa hàng mẫu. Chỉ gửi trong cuộc trao đổi mà khách đã chủ động yêu cầu hoặc đã đồng ý nhận thông tin. Chưa gửi tin nào. Không dùng cho danh sách thu thập hoặc nhắn hàng loạt.

**S01 — trả lời người đã yêu cầu xem mẫu:**

“Cảm ơn bạn đã yêu cầu xem Studio Pilot. Đây là bộ minh họa cho một cửa hàng sổ tay giả định: 12 bản nháp, lịch 14 ngày và checklist kiểm chứng. Với thương hiệu của bạn, chúng tôi bắt đầu từ thông tin sản phẩm và tài sản bạn có quyền dùng, rồi bàn giao nội dung để bạn duyệt. Nếu muốn trao đổi tiếp, bạn cho biết sản phẩm chính và kênh đang quản lý. Chưa có khoản phí hoặc đăng bài nào ở bước xem mẫu.”

**S02 — một lần hỏi tiếp sau khi đã được phép liên hệ lại:**

“Chào bạn, tôi gửi tiếp theo lịch bạn đã đồng ý. Sau khi xem bộ mẫu, bạn muốn ưu tiên video ngắn, bài viết hay carousel trong Pilot? Tôi có thể tổng hợp phạm vi phù hợp để bạn xem trước khi quyết định. Nếu chưa cần, chỉ cần nói dừng; chúng tôi sẽ không gửi thêm về đề xuất này.”

Không gắn tên khách, lời hứa tiết kiệm thời gian hoặc giá khác catalog. Trước khi gửi báo giá thật, ghi phiên bản offer, bên bán, phạm vi, điều kiện thanh toán và địa chỉ nhận đã xác minh trong hệ thống riêng; không lưu dữ liệu cá nhân vào repo này.

## 6. Checklist nguồn, quyền và review

| Kiểm tra | Hiện trạng mẫu | Bằng chứng cần khi áp dụng thật |
|---|---|---|
| Nội dung chữ | Tự biên soạn cho ví dụ, `DRAFT_ONLY` | Người duyệt xác nhận phù hợp thương hiệu và sản phẩm. |
| Tên và thông tin sản phẩm | Hư cấu/chưa xác minh | Chủ thương hiệu xác nhận + tài liệu có ngày. |
| Ảnh/video | Chỉ có shot list, chưa có media | File gốc, chủ sở hữu, phạm vi được dùng, xác nhận người xuất hiện nếu có. |
| Nhạc/giọng/font/stock | Chưa đưa tài sản bên thứ ba vào | Nguồn, quyền dùng đúng kênh và mục đích; không coi tài sản tìm thấy trên mạng là được phép. |
| Claim C01–C03 | Chưa đủ để phát hành thương mại | Nguồn đối chiếu, người review, ngày, phiên bản asset. |
| Lời hứa/khách hàng/kết quả | Không có | Không thêm đánh giá hoặc số liệu không có bằng chứng. |
| Dữ liệu cá nhân | Không có dữ liệu khách hàng thật | Soát ảnh, metadata, screenshot trước khi dùng. |
| Khả năng tiếp cận | Có hướng dẫn alt text/phụ đề | Kiểm tra alt text đúng ảnh và phụ đề đúng âm thanh của media cuối. |
| Tài khoản/điểm đến | Chưa cấu hình | Tài khoản thuộc quyền quản lý, scope đăng/nhận tin, approved asset hash. |
| Quyết định cuối | Chưa có | Người duyệt, thời điểm, version/hash, phạm vi kênh và lịch cụ thể. |

## 7. Tiêu chí nghiệm thu và đo lường

**Nghiệm thu bàn giao nội dung** có thể kiểm tra ngay: đủ 12 asset duy nhất, gồm 4 caption, 4 video, 3 carousel và 1 bài dài; mỗi asset có copy hoàn chỉnh, CTA hoặc câu kết, chỉ dẫn tài sản, kênh chính, cách thích nghi và claim ID; lịch có đủ 14 ngày; đủ 2 script tiếp nhận khách đã đồng ý; không có số liệu kết quả hoặc testimonial giả. Media hoàn chỉnh và quyền phát hành là công việc tiếp theo, không được tính là đã bàn giao trong mẫu chữ này.

**Nghiệm thu cho khách thật** cần thêm: brief được xác nhận, mọi claim thật đã có nguồn, toàn bộ media theo scope có quyền sử dụng, mọi yêu cầu chỉnh sửa trong scope đã được quyết định, gói bàn giao có manifest và người nhận xác nhận. Copy được duyệt không tự động cấp quyền đăng.

| Chỉ số | Định nghĩa | Trạng thái ban đầu |
|---|---|---|
| Asset đã duyệt | Số asset có quyết định duyệt đúng phiên bản / 12 | `null`: chưa có người duyệt khách thật. |
| Asset đã đăng | Số asset có post ID, URL, thời điểm và tài khoản khớp | `null`: chưa kết nối nguồn; không báo 12 bài đã đăng. |
| Cuộc hỏi nhu cầu | Hội thoại đầu tiên có sự đồng ý, phân biệt theo ID tại hệ thống riêng | `null`: chưa có kênh/nguồn. |
| Lead phù hợp | Hội thoại có nhu cầu, kênh quản lý, người quyết định và đồng ý nhận đề xuất | `null`: chưa có dữ liệu. |
| Báo giá / đơn | Bản báo giá được gửi theo yêu cầu / đơn có điều kiện được chấp nhận | `null`: chưa có dữ liệu. |
| Tiền thu đã đối soát | Giao dịch hợp lệ khớp đơn và chứng từ; tách hoàn tiền | `null`: chưa có nguồn giao dịch; không phải dự báo bằng 0. |

Chỉ tính tỷ lệ chuyển đổi nếu tử số, mẫu số, kỳ đo và nguồn đều có dữ liệu. Số thiếu là `null`, không phải 0. Bộ mẫu không đặt mức reach hoặc doanh thu được bảo đảm.

## 8. Ví dụ chỉnh sửa và bàn giao

**Yêu cầu chỉnh sửa giả định, không phải feedback khách thật:** “Tôi muốn MG01 ngắn hơn và ít cảm xúc hơn.”

**MG01 v1.1 đề xuất:**

“Chưa biết viết gì ở trang đầu? Thử ba dòng:
1. Việc muốn làm hôm nay.
2. Điều cần nhớ.
3. Ý tưởng muốn thử.

Bạn có thể bắt đầu từ một dòng rồi viết tiếp khi cần. Mộc Giấy gợi ý một cách dùng trang giấy; hãy sửa cho hợp thói quen của bạn.”

**Bản ghi chỉnh sửa mẫu:** request `DEMO-REV-001`; asset `MG01`; từ v1.0 sang v1.1; lý do “rút gọn giọng”; C01/C04 không đổi; trạng thái `DRAFT_ONLY`; người duyệt thật `null`; chưa thay bản chính trước khi có lựa chọn. Đây là ví dụ cách ghi lịch sử, không phải receipt phê duyệt.

**Lời bàn giao mẫu:**

“Gửi bạn bộ Studio Pilot gồm brief, 12 bản nháp, lịch 14 ngày, sổ claim và checklist quyền sử dụng. MG01 có thêm một phương án rút gọn để bạn so sánh; tổng số nội dung chính vẫn là 12. Vui lòng phản hồi theo mã asset và câu cần sửa. Các mục C01–C03 cùng ảnh/video cần được đối chiếu với cửa hàng thật trước khi phát hành. Gói này chưa bao gồm bằng chứng đăng bài, hội thoại khách hoặc doanh thu. Sau khi các mục được duyệt, phiên bản được chọn sẽ được ghi vào manifest bàn giao.”

**Manifest của gói hiện tại:** `pilot-sample.md` là nội dung đọc; `data/pilot-sample.json` là chỉ mục máy đọc gồm 12 asset, 14 ngày và các trạng thái. Bàn giao nguồn chữ minh họa có thể xác nhận bằng kiểm đếm file; không nâng thành bằng chứng hoàn thành Pilot cho một khách hàng thật.
