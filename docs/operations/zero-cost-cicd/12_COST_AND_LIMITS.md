# 12 · Chi phí và giới hạn (Giai đoạn B, C)

**Không có con số chi phí nào trong tệp này được ước lượng.** Mọi giá trị tiền hoặc hạn mức chưa đọc được từ nguồn chính thức đều ghi UNVERIFIED hoặc BLOCKED.

## 1. GitHub Actions

| Mục | Giá trị | Nhãn |
|---|---|---|
| Mức sử dụng của repo này | 0 workflow, 0 run, 0 artifact | VERIFIED |
| Hóa đơn thực tế, phút đã dùng, mức bao gồm của tổ chức | | **BILLING_UNVERIFIED** (không có quyền Billing; endpoint tổ chức bị chặn) |
| Ngân sách 65 USD, spending controls | không đụng tới | VERIFIED (không có thao tác nào) |
| Runner tiêu chuẩn trên repo công khai có miễn phí không; runner lớn có tính phí không | | **UNVERIFIED** (không đọc được `docs.github.com`). Kiến thức chung: runner tiêu chuẩn của repo công khai miễn phí còn runner lớn tính phí; cần kiểm lại trước khi dựa vào |
| Repo còn công khai | có (`visibility: public`) | VERIFIED |

## 2. Cloudflare

| Mục | Giá trị | Nhãn |
|---|---|---|
| Gói của tài khoản (Free/Paid) | tài liệu của ops ghi một tài khoản "Workers Paid"; chưa rõ có phải tài khoản của dự án này | UNVERIFIED (nguồn thứ cấp) |
| Số build Pages tối đa mỗi tháng, build đồng thời, giới hạn số tệp, cỡ tệp, thời gian build | | **UNVERIFIED** (tài liệu bị chặn) |
| Số build Pages đã phát sinh | ít nhất 14 đầu nhánh có check run; riêng ngày 06/11 có 8 nhánh thử | VERIFIED một phần (chỉ đếm theo check run còn thấy) |
| Giới hạn Workers Free (yêu cầu, CPU, kích thước), D1 Free, Durable Objects | | **UNVERIFIED** |
| Workers Builds (git integration cho Workers): phút build miễn phí | | **UNVERIFIED** |

Biện pháp giảm build đã đề xuất (`06`): watch paths, từ khóa bỏ qua build, kiểm soát nhánh preview, không tạo thêm nhánh thử.

## 3. Vercel

| Mục | Giá trị | Nhãn |
|---|---|---|
| Số build của `sach-muonnoi` | 13, tất cả ERROR; 12 lỗi do thư mục gốc `apps/store` không tồn tại ở nhánh bị build, 1 lỗi do `package.json` hỏng | VERIFIED |
| Build kể từ 31/10 | 0 (preview theo nhánh đã tắt) | VERIFIED (GitHub Deployments không có bản ghi sau 20/10) |
| Gói và hạn mức của đội | | UNVERIFIED (không đọc) |

## 4. Tác động chi phí của PR này

Thêm tài liệu và một script: **không tạo tài nguyên, không workflow, không build bắt buộc**. Commit mang từ khóa bỏ qua build; nếu Pages không nhận, chi phí là một lần build trên hạ tầng Cloudflare giống mọi push khác.

## 5. Để chuyển UNVERIFIED thành VERIFIED

Cho phép `developers.cloudflare.com` và `docs.github.com` trong cài đặt mạng của môi trường kiểm toán (Owner), và/hoặc để người có quyền Billing chụp trang Usage của tổ chức theo repo `ai.muonnoi.org`.
