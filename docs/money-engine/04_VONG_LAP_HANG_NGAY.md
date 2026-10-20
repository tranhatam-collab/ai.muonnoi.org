# Vòng lặp hằng ngày

Chỉ tạo lịch khi cửa hàng đã bán được đơn thử nghiệm đầu tiên. Lịch là một tác vụ Claude chạy lúc 07:00 giờ Việt Nam, trong môi trường có repo này cùng các kết nối Supabase, Gmail, Google Drive, Apollo, Vercel.

## Mỗi sáng tác vụ làm gì

1. Đọc sổ cái: view `engine_v_dashboard`, đơn hàng 24 giờ qua, việc chờ duyệt trong `engine_approvals`.
2. Kiểm tra cửa hàng: gọi `/api/health` và `/api/admin/stats`, ghi nhận sách thiếu file, đơn treo quá 1 giờ, lỗi webhook.
3. Ghi doanh thu kênh ngoài: tìm trong Gmail email báo bán hàng từ KDP, Gumroad, TikTok Shop; ghi vào `engine_revenue` kèm mã email để không ghi trùng.
4. Sinh một bài viết mới (300 đến 700 từ, tiếng Việt, giọng quan sát, không hứa hẹn kết quả) vào `apps/store/content/posts`, gắn với một cuốn sách, mở PR vào `main`. Bài chỉ lên khi anh duyệt PR. Sau 2 tuần nếu bài nào cũng ổn, chuyển sang tự merge.
5. Soạn outreach B2B (khi có mô tả sản phẩm): tìm 10 khách phù hợp trên Apollo, soạn email, ghi vào `engine_approvals` loại `send_email`. Không gửi.
6. Viết báo cáo một trang vào `engine_daily_reports` và gửi email cho anh. Mẫu bên dưới.

## Điều tác vụ không bao giờ làm

- Không gửi email cho khách hay đối tác khi chưa có dòng `approved` trong `engine_approvals`.
- Không đổi giá, không tắt sản phẩm, không đổi khóa.
- Không đẩy thẳng lên `main`; mọi thay đổi mã và nội dung đi qua PR.
- Không tạo tài khoản, không nhập thông tin thanh toán, không chuyển tiền.

## Mẫu báo cáo

```
BÁO CÁO NGÀY 2026-11-01

Tiền hôm nay: 198.000 VND (2 đơn: payOS 1, PayPal 1)
7 ngày: 1.240.000 VND. Tháng này: 1.240.000 VND. Mục tiêu ngày: 100.000 đến 500.000 VND.

Cần anh (≤ 5 phút):
1. Duyệt PR #12: bài "Đọc chậm một cuốn sách ngắn" (1 phút)
2. Duyệt 3 email outreach trong engine_approvals #41, #42, #43 (3 phút)

Tôi đã làm:
- Ghi 1 đơn KDP từ email báo cáo nhuận bút (0,70 USD)
- Sinh bài viết mới, mở PR #12
- Không có lỗi webhook. 2 đơn treo đã hết hạn, không cần xử lý.

Việc chưa xong: sách Doanh Nhân Sáng Tạo chờ anh duyệt phát hành.
```

## Lời nhắc dùng cho tác vụ (để anh kiểm tra nội dung)

Toàn văn ở `engine/DAILY_PROMPT.md`. Khi tạo lịch tôi dùng đúng nội dung đó, mọi thay đổi sau này đều đi qua PR.
