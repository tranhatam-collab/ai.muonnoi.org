# 09 · Bằng chứng preview và staging (Giai đoạn F, H)

**Trạng thái: BLOCKED / UNVERIFIED cho phần runtime.** Không có preview hay staging nào được kiểm tra trực tiếp trong đợt này.

## Những gì không làm được và lý do

| Việc | Kết quả | Lý do |
|---|---|---|
| Mở URL preview của Pages (`*.pages.dev`) ghi trong tài liệu của ops | `http=000` (2026-11-11 08:02 UTC) | chính sách mạng của môi trường chặn đầu ra; `curl` báo địa chỉ `127.0.0.1` và không kết nối được. **Không phải bằng chứng dịch vụ ngừng** |
| Gọi `https://ai.muonnoi.org/` và `https://api.muonnoi.org/api/health` | `http=000` | như trên |
| Smoke test, health check, kiểm thử tích hợp trên staging | không thực hiện | **staging chưa tồn tại** (bộ cô lập của ops chưa tạo; chuỗi migration D1 chưa dựng lại được, xem `05`) |
| Đọc cấu hình Pages (lệnh build, nhánh production, watch paths, preview branches), nhật ký build | không thực hiện | cần quyền dashboard Cloudflare (BLOCKED) |

## Bằng chứng gián tiếp có được

| Bằng chứng | Nguồn | Giá trị |
|---|---|---|
| Pages **build** thành công trên ops `cc8ac68` (01/11 13:49Z), #2 `e74ee69` (06/11 14:03Z), #1 `6c58845` (04/06) | GitHub check runs | chỉ chứng minh build thành công, **không** chứng minh runtime hay miền |
| Preview ops ngày 16/10: deployment ID, URL alias, 30 tệp; `/login/` và `/assets/login.js` trả 200 | biên nhận `docs/OPERATIONS.md` của nhánh ops | nguồn thứ cấp, tự khai bởi ops; **UNVERIFIED** từ phía tôi |
| Cửa hàng: không có bản triển khai Vercel nào thành công (13/13 ERROR, lần cuối 20/10) | Vercel API | cửa hàng chưa có preview để kiểm |
| Trang tĩnh build từ ops: 40 lượt Chromium (20 trang × 2 cỡ màn hình) trả 200, 0 lỗi JS, 8 trang bị CSP chặn script inline | chạy cục bộ ngày 10/11 trên `dist/site`, kèm `_headers` | kiểm trên **bản build cục bộ**, không phải bản đang phát |

## Hiệu quả từ khóa bỏ qua build (M5 của `06`)

**Quan sát (không phải chứng minh):** commit `212f7bc` mang `[CF-Pages-Skip]` và `[skip ci]` được đẩy lúc 2026-11-11 08:17:41 UTC. Lúc 08:19:12 UTC (khoảng 90 giây sau), `GET commits/212f7bc.../check-runs` trả `total_count: 0` và commit status rỗng. Với các lần đẩy trước (PR #4, 10/11), check run của Pages xuất hiện trong vài giây. Kết luận: **phù hợp với việc từ khóa có tác dụng** và không tốn một lần build; chưa có nhánh đối chứng không mang từ khóa nên không thể loại trừ việc Pages lọc theo tên nhánh `ops/*`. Không tạo nhánh đối chứng vì mỗi nhánh thử tiêu một lần build và không xóa được.

## Điều kiện để chuyển thành VERIFIED

1. Owner dán 15 dòng cuối log build Pages gần nhất của `772bd99` (hoặc cấp quyền đọc dashboard cho một công cụ được duyệt).
2. Một nhánh hợp nhất (ops + cửa hàng) có Pages preview xanh, mở được URL từ một môi trường có quyền truy cập mạng.
3. Staging tách biệt do Owner duyệt tạo; sau đó mới chạy smoke test/health check.
