# Kiểm chứng kênh thanh toán trả tiền về Việt Nam

Kiểm chứng ngày 2026-10-15 bằng tìm kiếm web và email tài khoản. Nhiều trang chính thức bị chặn truy cập từ môi trường làm việc nên có mục ghi "cần xác nhận trong tài khoản".

| Kênh | Nhận tiền về VN | Phí | Kết luận |
|---|---|---|---|
| payOS (VietQR) | Có, tiền về thẳng tài khoản ngân hàng cá nhân hoặc doanh nghiệp | payOS công bố miễn phí khởi tạo, duy trì và giao dịch từ 23/01/2026 | Chọn làm kênh trong nước. Anh đã xác thực tài khoản |
| PayPal | Có. Rút về ngân hàng Việt Nam | 60.000 VND mỗi lần rút, cộng chênh lệch tỷ giá khoảng 3 đến 4%. Số dư tối thiểu để rút khoảng 10 USD | Chọn làm kênh quốc tế. Anh đã có tài khoản; nên nâng lên tài khoản Business (miễn phí) |
| Gumroad | Có. Bài trợ giúp hiện hành liệt kê Việt Nam trong danh sách trả tiền qua ngân hàng, tiền VND | 10% mỗi giao dịch, ngưỡng trả tối thiểu 100 USD, cần giấy tờ tùy thân và chứng minh cư trú | Dùng song song cho khách quốc tế, không cần viết mã |
| Amazon KDP | Không có chuyển khoản trực tiếp cho ngân hàng Việt Nam. Dùng chuyển khoản quốc tế (ngưỡng 100 USD) hoặc tài khoản nhận tiền Payoneer | Nhuận bút 35% hoặc 70% tùy giá và thị trường; Payoneer khoảng 1 đến 2% khi đổi tiền | Dùng song song. Anh đã có tài khoản KDP và Payoneer |
| Payhip | Chỉ qua PayPal (Stripe chưa hỗ trợ VN) | 5% ở gói miễn phí | Thay thế cho Gumroad nếu cần |
| Lemon Squeezy | Việt Nam có trong danh sách hỗ trợ, trả qua PayPal bằng USD | 5% cộng 0,5 USD | Không ưu tiên; thủ tục merchant of record phức tạp hơn |
| Ko-fi | Chỉ qua PayPal, chưa xác nhận | | Không ưu tiên |
| Payoneer | Có. Rút về ngân hàng VN | Khoảng 1 đến 2% đổi tiền, 1,5 USD mỗi lần rút, phí năm 29,95 USD nếu nhận dưới 2.000 USD mỗi năm | Chỉ dùng để nhận từ KDP |
| SePay, Casso | Có, tương tự payOS | SePay có gói miễn phí 50 giao dịch mỗi tháng | Dự phòng nếu payOS trục trặc |

## Quyết định

1. Trong nước: payOS. Lý do: anh đã có tài khoản xác thực, không phí, có webhook để giao sách tự động, tiền không qua trung gian.
2. Quốc tế: PayPal gọi trực tiếp từ cửa hàng (API Orders v2). Không qua Payhip hay Gumroad để không mất 5 đến 10%.
3. Sàn song song: KDP (nhận qua Payoneer) và Gumroad. Hai kênh này không cần mã, chỉ cần anh đăng theo runbook có sẵn.

## Lưu ý thuế

Cá nhân kinh doanh online có doanh thu trên ngưỡng miễn thuế phải kê khai (ngưỡng mới từ 2026 là 200 triệu đồng mỗi năm theo luật thuế sửa đổi; anh nên xác nhận với kế toán). Sổ cái `engine_revenue` ghi đủ từng khoản để kê khai khi cần.

## Nguồn

- payOS: https://payos.vn/
- PayPal Việt Nam, biểu phí: https://www.paypal.com/vn/digital-wallet/paypal-consumer-fees?locale.x=vi_VN
- Gumroad, Getting paid: https://gumroad.com/help/article/13-getting-paid và https://help.gumroad.com/article/152-can-i-use-gumroad-in-my-country
- KDP Payment Options: https://kdp.amazon.com/en_US/help/topic/GJD7DFFX6X88AK46
- Payhip, Stripe countries: https://help.payhip.com/article/65-connecting-your-stripe-account
- Lemon Squeezy, Supported Countries: https://docs.lemonsqueezy.com/help/getting-started/supported-countries
- Payoneer phí (nguồn bên thứ ba): https://vaultleap.com/blog/payoneer-fees-explained-2026
- SePay bảng giá: https://sepay.vn/bang-gia.html
- Casso webhook: https://developer.casso.vn/webhook/thiet-lap-webhook-thu-cong
