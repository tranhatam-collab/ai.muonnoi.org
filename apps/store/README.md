# sach-muonnoi-store

Cửa hàng ebook của Trần Hà Tâm. Next.js 15, App Router, TypeScript. Thanh toán VietQR (payOS) và PayPal, giao file EPUB tự động từ kho Supabase Storage.

## Chạy thử

```
npm install
cp .env.example .env.local   # điền khóa
npm run dev
```

Không có khóa thì trang vẫn chạy với danh mục trong `src/data/products.json`, nút mua ẩn.

## Luồng mua

1. `/sach/[slug]` trang sách. Nút mua chỉ hiện khi file đã có trong kho và cửa hàng đã cấu hình (`/api/health`).
2. `/mua/[slug]` nhập email, chọn VietQR hoặc PayPal.
3. VietQR: `POST /api/checkout/payos` tạo đơn `pending` và link payOS. Khách quét mã. payOS gọi `POST /api/webhooks/payos` khi tiền về; server kiểm chữ ký, đánh dấu `paid`, gửi email link tải.
4. PayPal: `POST /api/checkout/paypal` tạo đơn và PayPal order. Khách phê duyệt rồi về `GET /api/checkout/paypal/capture`, server thu tiền, đánh dấu `paid`.
5. `/cam-on?order=&t=` tự hỏi `GET /api/orders/[code]` vài giây một lần, hiện link tải khi đã trả.
6. `GET /api/download/[token]` kiểm token ký HMAC (hạn 72 giờ), đơn đã trả, rồi phát file từ kho riêng tư.

Đơn chuyển sang `paid` thì trigger trong Postgres tự ghi dòng doanh thu vào `engine_revenue`.

## Quản trị

- `GET /api/health`: trạng thái cấu hình, không lộ khóa.
- `GET /api/admin/stats` (header `x-admin-secret`): số liệu cho báo cáo ngày.
- `POST /api/admin/payos/confirm-webhook` (header `x-admin-secret`): đăng ký URL webhook với payOS.
- `node scripts/upload-ebooks.mjs ./sach/*.epub`: tải file lên kho bằng khóa service role.

## Bài viết

Mỗi file `content/posts/<slug>.md` với frontmatter `title`, `date`, `description`, `product`. Deploy là lên trang.
