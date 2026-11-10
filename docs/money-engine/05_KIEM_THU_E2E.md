# Kiểm thử e2e: đã chứng minh gì và chưa chứng minh gì

Chạy: `cd apps/store && npm run test:e2e` (57 ca, khoảng 20 giây, không cần khóa hay mạng). Kèm `npm test` (25 ca đơn vị) và `npm run typecheck`. Bản kiểm chéo toàn repo (cửa hàng, nhánh ops, cây đã ghép, trình duyệt) nằm ở `06_AUDIT_VA_KE_HOACH_HOAN_THIEN.md`.

## Cách chạy

- Postgres thật: PGlite chạy đúng các file trong `supabase/migrations`, theo thứ tự tên file, trên nền các role của Supabase (`anon`, `authenticated`, `service_role`) và quyền mặc định giống Supabase. RLS, trigger, ràng buộc là thật.
- Mã ứng dụng thật: các test gọi thẳng các route handler của Next.js (`POST /api/checkout/payos`, webhook, tải file, admin...) bằng `Request` thật. Client `@supabase/supabase-js` và SDK `@payos/node` là bản thật.
- Thế giới bên ngoài giả lập ở tầng `fetch` (`apps/store/e2e/harness`): PostgREST và Storage của Supabase, payOS (kể cả chữ ký request và response theo thuật toán của SDK), PayPal sandbox, Resend. Gọi tới host nào ngoài danh sách sẽ ném lỗi, nên không thể chạm dịch vụ thật. Máy chủ PayPal live bị coi là ngoài danh sách có chủ đích, để chứng minh `PAYPAL_ENV` mặc định là sandbox.

## Đã chứng minh

| Hạng mục | Ca kiểm |
|---|---|
| Luồng payOS trọn vẹn | Mở đơn với giá do server quyết (bỏ qua số tiền khách gửi), webhook ký đúng, trạng thái paid, một dòng sổ cái, một email, tải file đúng byte, nhật ký tải. Webhook gửi lại không nhân đôi gì |
| payOS bị lạm dụng | Trả thiếu tiền, chữ ký sai, dữ liệu bị sửa, thiếu chữ ký, mã thất bại, mã đơn lạ, webhook nhắm vào đơn PayPal |
| Luồng PayPal trọn vẹn | Tạo đơn, khách phê duyệt, server thu theo mã PayPal đã lưu, đối chiếu mã đơn, số tiền, tiền tệ, giao sách bản tiếng Anh. Tải lại trang thu tiền, hai lần thu đồng thời: chỉ giao một lần |
| PayPal bị lạm dụng | Mượn mã đơn rẻ cho đơn đắt, số tiền hoặc tiền tệ thu được khác đơn, URL thu tiền sai chữ ký hoặc của đơn khác nhà cung cấp, bỏ ngang không phê duyệt |
| Ranh giới thử nghiệm và thật | Không đặt `PAYPAL_ENV` thì chỉ gọi sandbox; đặt `live` thì mới định gọi máy chủ live |
| Quyền truy cập | Trang đơn cần token đúng đơn và còn hạn; link tải cần chữ ký, còn hạn, đơn đã trả, đúng sách trong đơn; số liệu admin cần khóa; khóa công khai (anon) không đọc, không ghi được đơn, sổ cái, bảng đếm |
| Giới hạn tốc độ | IP thứ 11 trong 10 phút bị chặn, IP khác không ảnh hưởng, chia sẻ giữa payOS và PayPal, sang cửa sổ mới đếm lại, đếm đúng khi đồng thời, không lưu IP thô, anon không gọi được hàm đếm, hàm hỏng thì đóng cửa |
| Hoàn tiền | Thu hồi quyền tải, đảo sổ cái đúng số VND đã ghi lúc bán dù tỷ giá đổi, gọi lại không nhân đôi, chỉ đơn đã trả mới hoàn, webhook gửi lại không làm sống lại đơn đã hoàn |
| Tầng DB | Chặn paid sang pending, paid sang cancelled, refunded sang bất kỳ, pending sang refunded; cho phép tiền về muộn khi đơn đã hết hạn hoặc bị hủy; chạy lại cả chuỗi migration không lỗi |
| Preflight | Cần khóa quản trị; xanh khi đủ cấu hình; chỉ ra đúng sản phẩm thiếu file; đỏ đúng mục khi chưa áp 0002 hoặc 0003, khi RLS bị tắt, khi khóa yếu hoặc trùng, khi địa chỉ không phải https, khi không có cổng thanh toán; không lộ giá trị khóa |
| Email đầu vào | Chuỗi lọt regex cũ nhưng bị nodemailer < 10.1.4 hiểu thành nhiều người nhận (`a,b@x.co`, `x>y@x.co`, nháy kép, ghi chú lồng) bị từ chối ở mở đơn và ở lấy lại link; email hợp lệ có dấu `+` và chữ hoa vẫn mua được và được chuẩn hóa chữ thường |
| Lấy lại link | Email đúng nhận link trang đơn dùng được; trả lời giống hệt dù email có đơn hay không; chỉ đơn đã trả; gộp tối đa 3 đơn; lỗi email không lộ; giới hạn theo IP và theo email; token hết hạn hoặc bị kéo dài hạn đều bị từ chối |

Kiểm tra đột biến: bỏ đối chiếu mã đơn PayPal, bỏ điều kiện chống ghi trùng ở `markOrderPaid`, đưa điều kiện về `neq`, bỏ lời gọi giới hạn tốc độ, cho hàm đếm luôn trả true. Cả năm đều làm bộ e2e đỏ.

## Lỗi thật mà e2e đã bắt được

- Tên file tải về mất chữ Đ ("99 Thông Điệp Sống" thành `99-Thong-iep-Song.epub`) vì Đ không phân rã được trong Unicode. Đã sửa ở `src/lib/filename.ts`.
- Webhook payOS gửi lại sau khi đơn đã hoàn tiền sẽ làm đơn sống lại và giao sách lần nữa. Đã sửa ở `markOrderPaid` (chỉ đơn còn mở mới chuyển sang paid) và chặn thêm ở tầng DB.
- Phiên bản đầu của migration hoàn tiền bỏ chỉ mục của 0001 nên chạy lại cả chuỗi sau khi có dòng hoàn sẽ vỡ. Đã đổi sang cột `refund_of_order_id`, không đụng chỉ mục cũ.

## Chưa chứng minh

- Chưa chạy một lần nào với payOS, PayPal, Supabase, Resend thật, kể cả sandbox. Hình dạng phản hồi của các nhà cung cấp trong bộ giả lập dựa trên tài liệu và SDK, không phải trên quan sát thực. Lần mua thử 49.000 đồng ở mục F của `03_VIEC_ANH_LAM_MOT_LAN.md` vẫn là bằng chứng bắt buộc trước khi mở bán.
- Chưa áp migration lên Supabase thật. PGlite là Postgres thật nhưng không có PostgREST, gateway và Storage thật của Supabase.
- PayPal: chưa có webhook tự động cho hoàn tiền hoặc tranh chấp. Hoàn tiền và tranh chấp xử lý thủ công theo mục H của `03_VIEC_ANH_LAM_MOT_LAN.md`.
- Chưa kiểm thử giao diện trình duyệt (trang cảm ơn, form mua, form lấy lại link). Chỉ có `next build` và typecheck.
- Chưa quét bảo mật động (HawkScan cần `HAWK_API_KEY`).
- IP khách lấy từ `x-forwarded-for`. Trên Vercel header này do nền tảng đặt; ở nơi khác phải đảm bảo proxy đứng trước ghi đè nó, nếu không giới hạn theo IP có thể bị né.
