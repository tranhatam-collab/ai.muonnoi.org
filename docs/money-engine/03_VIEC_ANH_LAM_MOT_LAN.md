# Những việc anh làm một lần (khoảng 20 phút)

Mỗi mục có ghi vì sao tôi không tự làm được: đó là những chỗ cần đăng nhập tài khoản đứng tên anh hoặc đã bị từ chối khi tôi xin phép.

## A. Supabase (5 phút)

1. Áp schema. Vào https://supabase.com/dashboard/project/pyqonagrakxqjgnzaawf/sql/new, dán toàn bộ nội dung file `supabase/migrations/0001_money_engine.sql`, bấm Run. Hoặc nhắn tôi "áp schema" và tôi áp qua kết nối đã có. Lệnh này tạo bảng, bật RLS, tạo kho file `ebooks` và nạp sẵn danh mục sách.
2. Lấy khóa server. Project Settings, mục API Keys, copy khóa `service_role` (loại secret). Khóa này chỉ đặt trên Vercel, không gửi qua chat.
3. Tải sách lên kho. Storage, bucket `ebooks`, kéo thả 5 file từ Drive và đổi tên đúng như cột bên phải:

| File trên Drive | Tên trong kho |
|---|---|
| 01_tu_0_den_khong_gioi_han_FINAL.epub | tu-0-den-khong-gioi-han.epub |
| 02_tan_cung_mot_cuoc_song_FINAL.epub | tan-cung-mot-cuoc-song.epub |
| 03_troi_sinh_FINAL.epub | troi-sinh.epub |
| 04_tri_tue_FINAL.epub | tri-tue-khong-nguon-goc.epub |
| 99_Thong_Diep_Song_FINAL.epub | 99-thong-diep-song.epub |
| From_Zero_to_Infinite_English_International_Edition.epub | from-zero-to-infinite.epub |

Sách chỉ hiện nút mua khi file đã có trong kho. Thiếu file thì trang ghi "Sắp mở bán".

## B. payOS (5 phút)

1. Đăng nhập https://my.payos.vn, tạo Kênh thanh toán, chọn tài khoản ngân hàng nhận tiền.
2. Mở Thông tin tích hợp của kênh, copy ba giá trị: Client ID, API Key, Checksum Key.
3. Sau khi cửa hàng deploy xong với ba khóa trên, nhắn tôi "xác nhận webhook" hoặc tự chạy trong thư mục `apps/store`:

```
SITE_URL=https://sach-muonnoi.vercel.app ADMIN_SECRET=<xem trong Vercel> npm run payos:confirm-webhook
```

## C. PayPal (5 phút)

1. Vào https://developer.paypal.com/dashboard/applications/live, bấm Create App, đặt tên "Sach Tran Ha Tam".
2. Copy Client ID và Secret.
3. Nếu tài khoản PayPal còn là cá nhân, nâng lên Business (miễn phí, trong phần cài đặt tài khoản) để nhận thanh toán thương mại không bị giới hạn.

## D. Vercel (3 phút)

Vào dự án `sach-muonnoi`, Settings, Environment Variables, thêm cho cả Production và Preview:

| Biến | Giá trị |
|---|---|
| SUPABASE_SERVICE_ROLE_KEY | khóa ở bước A2 |
| PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY | ba khóa ở bước B2 |
| PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET | hai khóa ở bước C2 |
| RESEND_API_KEY hoặc cặp GMAIL_USER và GMAIL_APP_PASSWORD | tùy chọn, để gửi email giao sách. Không có thì khách vẫn tải được trên trang cảm ơn |

Các biến còn lại tôi đã đặt sẵn: địa chỉ Supabase, khóa công khai, địa chỉ site, khóa ký link tải, khóa quản trị. Sau khi thêm biến, bấm Redeploy.

## E. Tên miền riêng (tùy chọn, 5 phút)

Thêm tên miền (gợi ý `sach.muonnoi.org`) trong Vercel, Settings, Domains. Vercel sẽ chỉ bản ghi CNAME để anh thêm ở Cloudflare. Xong thì đổi biến `NEXT_PUBLIC_SITE_URL` và chạy lại xác nhận webhook ở bước B3.

## F. Mua thử (3 phút)

Mua cuốn 99 Thông Điệp Sống (49.000 VND) bằng chính tài khoản của anh. Tiền về ngân hàng anh, file về email anh. Tôi ghi đơn này là "thử nghiệm" trong sổ cái và không tính vào doanh thu.

## G. Hai câu trả lời tôi còn chờ

1. Anh đang có kênh nào thu tiền đều, hoặc tệp khách sẵn (email, Zalo, Facebook, TikTok)? Có thì tuần đầu tôi khởi động từ đó.
2. VCS-EL và AI Accounting Loop là gì, bán cho ai, giá bao nhiêu? Có mô tả một đoạn là tôi dựng động cơ B2B.
