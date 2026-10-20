# Money Engine: kế hoạch và trạng thái

Cập nhật: 2026-10-20. Chủ dự án: Trần Hà Tâm. Người dựng: Claude (phiên Claude Code).

## Mục tiêu

Doanh thu đều 100.000 đến 500.000 VND mỗi ngày, hệ thống chạy trên cloud 24/7, anh dành khoảng 5 phút mỗi ngày để duyệt những việc cần người thật bấm. Tiền chỉ chảy về tài khoản đứng tên anh. Mọi cách làm đều hợp pháp: không spam, không đánh giá giả, không lừa ai. Báo cáo mỗi ngày là số thật, kể cả ngày bằng không.

## Ba động cơ

1. Sản phẩm số (nhanh nhất). Cửa hàng ebook `apps/store` bán 5 cuốn đã dàn xong trên Drive. Khách Việt trả bằng VietQR qua payOS, tiền về thẳng tài khoản ngân hàng của anh, không mất phí. Khách quốc tế trả bằng PayPal. Sách giao tự động ngay sau khi tiền về.
2. Nội dung tự chạy (cộng dồn, chậm). Mỗi ngày một bài viết ngắn quanh các cuốn sách, đăng trong mục Bài viết của cửa hàng và dẫn về trang mua. Sau này mở rộng sang các tên miền khác của anh. Hai đến ba tháng mới thấy tiền, nhưng không tốn sức.
3. B2B (lớn, không đều). Dùng Apollo đã nối để tìm khách cho VCS-EL và AI Accounting Loop. Tôi soạn sẵn danh sách và email, anh bấm gửi. Chưa khởi động vì tôi chưa có mô tả hai sản phẩm này.

Song song, không cần viết mã: đăng 5 cuốn lên Amazon KDP (anh đã có tài khoản) và Gumroad (nay trả tiền về ngân hàng Việt Nam). Chi tiết ở `02_KENH_THANH_TOAN.md`.

## Kiến trúc

- Mã nguồn: repo này, thư mục `apps/store` (Next.js 15), `supabase/migrations`, `engine`, `docs/money-engine`.
- Cửa hàng chạy trên Vercel, dự án `sach-muonnoi` (đã tạo, liên kết với repo này, thư mục gốc `apps/store`). Đẩy lên nhánh `main` là tự deploy. Địa chỉ tạm: `https://sach-muonnoi.vercel.app`.
- Sổ cái và kho file: Supabase, dự án `tranhatam-collab's Project` (mã `pyqonagrakxqjgnzaawf`, vùng Singapore). Đã khôi phục từ trạng thái tạm dừng. Schema nằm ở `supabase/migrations/0001_money_engine.sql`.
- Bộ não: một tác vụ Claude chạy mỗi sáng, đọc sổ cái, sinh nội dung, soạn outreach, ghi báo cáo và gửi email cho anh. Chỉ tạo lịch khi cửa hàng đã bán được đơn đầu tiên. Xem `04_VONG_LAP_HANG_NGAY.md`.

## Trạng thái hôm nay

| Hạng mục | Trạng thái |
|---|---|
| Mã cửa hàng (trang sách, thanh toán payOS và PayPal, webhook, giao file, bài viết, sitemap) | Xong, `npm run build` và `tsc` đạt |
| Schema Supabase | Viết xong, chưa áp. Lệnh áp bị từ chối lúc tôi xin phép, nên tôi dừng. Anh áp trong SQL Editor hoặc nhắn tôi áp |
| Dự án Vercel `sach-muonnoi` | Đã tạo, đã đặt biến môi trường công khai và hai khóa bí mật nội bộ |
| Khóa cần anh cung cấp | Supabase service role, payOS (3 khóa), PayPal (2 khóa). Xem `03_VIEC_ANH_LAM_MOT_LAN.md` |
| File EPUB trong kho | Chưa có. Anh kéo thả 5 file từ Drive vào bucket `ebooks` |
| Lịch chạy hằng ngày | Chưa tạo, đúng cam kết không tạo lịch rỗng |

## Lộ trình

- Tuần 1: anh làm checklist (khoảng 20 phút tổng cộng). Tôi xác nhận webhook, mua thử một cuốn, kiểm tra file về, rồi tạo lịch chạy hằng ngày.
- Tuần 2 đến 4: đăng KDP và Gumroad theo runbook có sẵn trên Drive. Mỗi ngày một bài viết. Bắt đầu đo: lượt xem, đơn, doanh thu theo kênh.
- Tháng 2 và 3: B2B khi có mô tả sản phẩm. Mở thêm tên miền riêng cho cửa hàng nếu số liệu tốt.

## Con số thực tế

Giá sách 49.000 đến 119.000 VND, bộ 5 cuốn 349.000 VND. Mục tiêu ngày tương đương 1 đến 5 cuốn. Tuần đầu phụ thuộc vào kênh anh đang có người theo dõi (Zalo, Facebook, TikTok Shop). Không có tệp khách sẵn thì tháng đầu chủ yếu là dựng và đo, tiền đều đến từ tháng thứ hai trở đi khi nội dung và KDP bắt đầu có lượt.
