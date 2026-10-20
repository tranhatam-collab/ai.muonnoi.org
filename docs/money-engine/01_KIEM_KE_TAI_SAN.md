# Kiểm kê tài sản (từ Gmail, Drive, Vercel, Supabase đã nối)

Ngày kiểm kê: 2026-10-15. Chỉ ghi tên tài khoản và trạng thái, không ghi số tài khoản hay mã định danh.

## Tài khoản nhận tiền đã có

| Kênh | Trạng thái | Ghi chú |
|---|---|---|
| PayPal | Đang hoạt động, đứng tên anh | Có giao dịch tháng 10/2026. Rút về ngân hàng Việt Nam được, phí 60.000 VND mỗi lần |
| payOS (cổng VietQR của Casso) | Đã xác thực tài khoản tháng 5/2026 | Tiền về thẳng ngân hàng, miễn phí giao dịch. Cần tạo kênh thanh toán để lấy khóa tích hợp |
| Payoneer | Có tài khoản từ 2024, có tài khoản nhận USD và EUR | Tháng 8/2025 Payoneer báo sẽ đóng tài khoản nhận tiền không hoạt động; cần đăng nhập kiểm tra. Dùng để nhận tiền từ Amazon KDP |
| Amazon KDP | Có tài khoản | Tháng 5/2026 có thay đổi thông tin ngân hàng và yêu cầu xác minh danh tính. Cần xác nhận đã xong chưa |
| TikTok Shop (bán hàng) | Đang hoạt động | Có thông báo cần cung cấp mã số thuế (8 và 9/2026) |
| Lazada (gian hàng MANDALA) | Ngừng hoạt động từ 2025 | Có thể dùng lại nếu bán sách in |
| Gumroad | Chưa thấy tài khoản bán | Chỉ nhận bản tin của một người bán khác |
| Stripe | Không có tài khoản bán | Chỉ là khách của dịch vụ khác. Stripe chưa hỗ trợ Việt Nam |

## Sách sẵn sàng bán (Drive, thư mục `bien_tap_sach_chuan_xuat_ban_amazon`)

| Mã sản phẩm | Sách | File trên Drive | Ghi chú |
|---|---|---|---|
| tu-0-den-khong-gioi-han | Từ 0 Đến Không Giới Hạn (Sáng tạo trong im lặng) | 01_tu_0_den_khong_gioi_han_FINAL.epub | 56.705 từ, QA 100/100 |
| tan-cung-mot-cuoc-song | Tận Cùng Một Cuộc Sống | 02_tan_cung_mot_cuoc_song_FINAL.epub | Có mô tả KDP sẵn |
| troi-sinh | Trồi Sinh (Triết lý mới của một nền kinh tế thế giới) | 03_troi_sinh_FINAL.epub | 77.801 từ |
| tri-tue-khong-nguon-goc | Trí Tuệ Không Nguồn Gốc | 04_tri_tue_FINAL.epub | 90.208 từ |
| 99-thong-diep-song | 99 Thông Điệp Sống | 99_Thong_Diep_Song_FINAL.epub | Sách ngắn, 99 câu |
| from-zero-to-infinite | From Zero to Infinite (bản tiếng Anh) | From_Zero_to_Infinite_English_International_Edition.epub | 14.693 từ, audit nội bộ đánh giá còn ngắn cho KDP in; bán ebook vẫn ổn |

Bản nháp chưa bán: Khởi Nghiệp Tỉnh Thức, Doanh Nhân Sáng Tạo (đã khóa bản thảo 45.105 từ), Giá Trị Tự Thân (31.475 từ). Đã có trong sổ cái với `active = false`.

Ngoài ra trên Drive có bộ 9 cuốn "Sự Kết Thúc Vĩ Đại, Một Kỷ Nguyên" với mục lục hoàn chỉnh, bộ sách "999.999 ý tưởng", và hơn 20 thư mục sách khác. Đây là nguyên liệu cho giai đoạn sau.

Tài liệu quy trình có sẵn: thẻ nhận dạng từng cuốn, gói sản xuất (packet) từng cuốn, runbook đăng KDP ngày 2026-05-02 (giá dự kiến: bìa mềm 13,99 USD, Kindle 6,99 USD), kế hoạch audit và viết tiếp 1+5 cuốn ngày 2026-06-13.

## Hạ tầng

| Nơi | Có gì |
|---|---|
| Vercel (team tranhatam-6714) | 3 dự án đang chạy: visamuonnoi.org, ap.omdalat.com, agent.iai.one. Thêm dự án mới `sach-muonnoi` cho cửa hàng |
| Supabase | 3 dự án đều đang tạm dừng (omone, computer.iai.one, tranhatam-collab's Project). Đã khôi phục dự án thứ ba để làm sổ cái |
| GitHub | Repo này (ai.muonnoi.org), hiện là trang tĩnh trên Cloudflare Pages |
| Tên miền trên Vercel | Không có tên miền đăng ký tại Vercel; các tên miền trỏ từ nơi khác (nhiều khả năng Cloudflare) |

## Tệp khách và kênh phân phối

Chưa tìm thấy danh sách email, nhóm Zalo hay trang mạng xã hội trong dữ liệu đã nối. TikTok Shop có hoạt động mua bán. Đây là câu hỏi 1/3 còn chờ anh trả lời.
