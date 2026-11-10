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
7. Mất link: `/lay-lai-link` (`POST /api/orders/resend`) gửi lại email chứa link trang đơn hàng mới. Luôn trả cùng một nội dung dù email có đơn hay không.

Đơn chuyển sang `paid` thì trigger trong Postgres tự ghi dòng doanh thu vào `engine_revenue`. Chuyển sang `refunded` thì trigger ghi thêm một dòng âm đúng bằng số đã ghi lúc bán. Luồng trạng thái được chặn ở tầng DB (migration 0003): đơn đã hoàn tiền không sống lại được, kể cả khi webhook gửi lại.

Các route công khai có giới hạn tốc độ theo IP (mở đơn 10 lần mỗi 10 phút; lấy lại link 5 lần mỗi giờ cho một IP và 3 lần mỗi ngày cho một email), đếm bằng Postgres (migration 0002) nên mọi instance serverless dùng chung một bộ đếm.

## Quản trị

- `GET /api/health`: trạng thái cấu hình, không lộ khóa.
- `GET /api/admin/stats` (header `x-admin-secret`): số liệu cho báo cáo ngày.
- `GET /api/admin/preflight` (header `x-admin-secret`): kiểm tra sẵn sàng mở bán trong một lần gọi (độ mạnh khóa, cổng thanh toán và chế độ PayPal, migration 0001 đến 0003, RLS, kho file). Không lộ giá trị khóa.
- `POST /api/admin/payos/confirm-webhook` (header `x-admin-secret`): đăng ký URL webhook với payOS.
- `POST /api/admin/orders/[mã đơn]/refund` (header `x-admin-secret`, thân tùy chọn `{"reason":"..."}`): ghi nhận đơn đã hoàn tiền. Hoàn tiền trong bảng điều khiển payOS hoặc PayPal trước; route này không chuyển tiền, chỉ thu hồi quyền tải và đảo sổ cái. Gọi lại an toàn.
- `node scripts/upload-ebooks.mjs ./sach/*.epub`: tải file lên kho bằng khóa service role.

## Kiểm thử

```
npm test            # kiểm thử đơn vị
npm run test:e2e    # 57 ca e2e trên Postgres thật (PGlite) với payOS, PayPal, kho file và email giả lập
npm run typecheck
```

Bộ e2e chạy nguyên mã route thật và đúng các file `supabase/migrations`, không cần khóa hay mạng. Phạm vi và giới hạn: `docs/money-engine/05_KIEM_THU_E2E.md`.

## Bài viết

Mỗi file `content/posts/<slug>.md` với frontmatter `title`, `date`, `description`, `product`. Deploy là lên trang.
