# 04 · Quyết định tuyến triển khai (Giai đoạn C, H)

## Tuyến chính được chọn: ROUTE A, Cloudflare Pages Git integration (cho trang tĩnh)

Kèm một tuyến phụ không tốn GitHub-hosted compute: ROUTE C-nhẹ, CI cục bộ bằng `scripts/ci/local-verify.sh`.

### Lý do

1. Hệ CI/CD duy nhất đang gắn vào push của repo và còn hoạt động là Cloudflare Pages (git integration). Nó chạy trên hạ tầng build của Cloudflare, **không dùng phút GitHub-hosted**.
2. Repo có 0 workflow GitHub Actions; không có gì để "chuyển sang" Cloudflare, chỉ có việc **làm cho build Pages đúng và không lãng phí**.
3. Build trang tĩnh đã có sẵn và kiểm thử được: `node tools/build.mjs` xuất `dist/site` (43 tệp, 348 031 byte, tệp lớn nhất 29 217 byte) với danh sách cho phép, không chứa mã nguồn hay migration. Chạy trên cây ops và cây ghép: `evidence/local-verify-cc8ac689ed80.json`, `evidence/local-verify-b643ce73bb52.json`.
4. Các tuyến khác không phù hợp:
   - ROUTE B (Workers Git integration): API Worker và RevenueOps đã là Workers, nhưng không có bằng chứng về cách chúng đang được deploy, không có staging, và deploy production bị cấm khi chưa có Owner duyệt. Chỉ đánh giá tương thích (`05`).
   - ROUTE D (No deploy): sai, vì có sản phẩm triển khai thật (Pages, Worker).

### Phân bổ theo thành phần

| Thành phần | Tuyến | Lý do và điều kiện |
|---|---|---|
| Trang tĩnh (`dist/site`) | **A**: Pages git integration | cần cây có script `build` chạy `tools/build.mjs` (chỉ ops/#2 có), output `dist/site`; không đụng nhánh production khi chưa duyệt |
| API Worker `workers/api` | giữ nguyên | cách deploy hiện tại UNVERIFIED; không thêm tự động hóa cho tới khi có staging cô lập và Owner duyệt |
| RevenueOps Worker | giữ nguyên (chưa deploy) | khóa theo biên nhận của ops; không route, không cron |
| Cửa hàng `apps/store` | **giữ Vercel** | Next.js 15 dùng `node:fs` (`src/lib/posts.ts`) và `nodemailer` (SMTP); chưa chứng minh chạy được trên Workers; quy tắc: không chuyển backend khi chưa chứng minh tương thích (`05`) |
| Kiểm thử | **C-nhẹ**: `scripts/ci/local-verify.sh` | chạy trên máy dev hoặc phiên đám mây hiện có; không runner tự lưu trữ mới, không GitHub-hosted |

## Quy trình đề xuất (Giai đoạn H)

1. **Development**: AI Dev/người viết mã, chạy `scripts/ci/local-verify.sh` trước khi đẩy.
2. **Pull Request**: PR nháp; bằng chứng là tệp `local-verify.json` đính kèm mô tả PR; Pages tạo preview nếu cây hợp lệ.
3. **Preview**: Cloudflare Pages preview cho nhánh được phép. Cửa hàng không có preview (Vercel preview đang tắt).
4. **Staging**: **chưa tồn tại**; chưa thể smoke test tích hợp. Điều kiện để tạo: Owner duyệt tài khoản/gói và tài nguyên (không tạo tài nguyên có phí).
5. **Production**: chỉ khi đủ required checks (hiện UNKNOWN), có Owner duyệt bằng văn bản, và bản build đã qua bước 1–4. Không tự deploy.

## Điều không làm

Không đổi nhánh production của Pages, không đổi DNS, không deploy production, không tạo dự án Pages mới (dự án `ai-muonnoi-org` đã có), không thêm workflow GitHub Actions.
