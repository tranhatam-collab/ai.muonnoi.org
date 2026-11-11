# 01 · Kiểm kê repository (Giai đoạn A)

Chương trình: DEVOPS-ZERO-COST-CF-20261111 · Chụp lúc 2026-11-11 08:01–08:10 UTC · Phạm vi: chỉ repo `tranhatam-collab/ai.muonnoi.org`.
Nhãn bằng chứng: **VERIFIED** (đọc trực tiếp, có nguồn), **UNVERIFIED** (suy luận hoặc nguồn thứ cấp), **BLOCKED** (không có quyền hoặc mạng chặn).

## 1. Định danh và quyền

| Mục | Giá trị | Nhãn / nguồn |
|---|---|---|
| Repo | `tranhatam-collab/ai.muonnoi.org`, **công khai**, không archived, không fork | VERIFIED `gh api repos/...` |
| Nhánh mặc định | `main` @ `3e0cac697cc36a923929d76ca63adf86440badb1` (2026-03-18) | VERIFIED |
| Quyền token phiên này | API báo `admin/maintain/push/pull/triage = true` | VERIFIED nhưng không dùng hết: proxy chặn các đường Actions settings, runners, secrets, variables, environments, cache usage; cổng tích hợp trả 403 cho branch protection; endpoint cấp tổ chức bị chặn ("sessions are bound to their configured repositories") |
| Rulesets | danh sách rỗng `[]` | VERIFIED |
| Branch protection / required checks của `main` | không đọc được (HTTP 403) | BLOCKED → coi là UNKNOWN |
| Cloudflare, DNS, D1 production, Supabase của người khác | không có quyền | BLOCKED |

## 2. Git lúc bắt đầu

- Nhánh làm việc khi nhận lệnh: `claude/money-engine-e2e` @ `772bd997653c77d4d7ce1fceed5f295771cd4549`; `git status` sạch (0 thay đổi chưa commit).
- Baseline của chương trình: `origin/main` @ `3e0cac697cc3`. Nhánh `ops/zero-cost-cicd-20261111` tạo từ baseline, **không** từ nhánh PR #4, để PR này không kéo theo công việc chưa được duyệt của #3/#4.
- Ba worktree phụ (chỉ đọc/thử nghiệm, nằm ngoài repo, trong thư mục tạm của phiên): ops `cc8ac68`, PR #4 `772bd99`, cây ghép cục bộ `b643ce7` (chưa từng đẩy lên remote).
- Ngoài ra còn tệp chưa theo dõi `apps/store/.next/` là sản phẩm build của chính phiên này từ nhánh PR #4; không đụng tới.

## 3. Nhánh và PR (15 nhánh remote)

| Nhánh | Head | Ngày | PR | Ghi chú |
|---|---|---|---|---|
| `main` | `3e0cac6` | 18/03 | — | `package.json` gốc **không phải JSON hợp lệ** (mục 6); `wrangler.json` là TOML cấu hình Worker |
| `feat/flow-mvp-backend` | `6c58845` | 05/06 | #1 mở, không nháp | API Worker + D1 + app; `pages_build_output_dir: "."` |
| `codex/revenueops-publishing` | `e74ee69` | 15/10 | #2 nháp | Studio, RevenueOps, build `dist/site` |
| `codex/ai-muonnoi-autonomous-ops` | `cc8ac68` | 01/11 | không có | chứa trọn #1 và #2; 83 commit trên main |
| `claude/money-engine-draft` | `beea00a` | 31/10 | #3 nháp | cửa hàng ebook (bản nháp) |
| `claude/money-engine-e2e` | `772bd99` | 10/11 | #4 nháp | e2e, giới hạn tốc độ, hoàn tiền, bản vá email |
| `claude/optimistic-sammet` | `a0e5573` | 26/03 | không có | nhánh cũ |
| `claude/cf-probe-1..8` | xem Git | 06/11 | không có | 8 nhánh thử; probe-4 = đầu #2, probe-5 = `main` |

Không nhánh nào bị xóa, không PR nào bị đóng.

## 4. Runtime, package manager, workspace

| Dòng | Thư mục | Công cụ | Ràng buộc phiên bản | Lockfile |
|---|---|---|---|---|
| Trang tĩnh + công cụ ops | gốc | npm, script `node` | `engines.node >= 20` | không có |
| API Worker | `workers/api` | npm, wrangler `^4.75.0` | không khai | `package-lock.json` |
| RevenueOps Worker | `workers/revenueops` | npm, TypeScript 7.0.2, wrangler 4.151.0, miniflare 5.20261012.0-beta (ghim cứng) | `engines.node >= 24` (môi trường kiểm thử chạy Node 22.22: chỉ cảnh báo) | `package-lock.json` |
| Cửa hàng | `apps/store` | npm, Next.js 15.5.28, React 19, TypeScript 5.9 | `engines.node >= 22` | `package-lock.json` |
| `main` | gốc | Vite/React (`dev`, `build: vite build`) | không | không |

Không có pnpm/yarn/bun, không có `.nvmrc`. Không có workspace npm: mỗi thư mục tự cài riêng.

## 5. Môi trường

| Thành phần | Dev | Preview | Staging | Production | Nhãn |
|---|---|---|---|---|---|
| Trang tĩnh `ai.muonnoi.org` | `python3 -m http.server` / `tools/*-preview.mjs` | Cloudflare Pages (xây trên mọi nhánh, `*.pages.dev`) | chưa có | Pages project `ai-muonnoi-org`; miền tùy chỉnh được biên nhận của ops ghi là **Inactive** (01/11); nhánh production **chưa rõ** | UNVERIFIED (nguồn thứ cấp: `docs/OPERATIONS.md` của ops) |
| API Worker `ai-muonnoi-api` | `wrangler dev` cổng 8787 | không | bộ staging cô lập có script chuẩn bị, **chưa tạo** | route `api.muonnoi.org` (custom domain) trong `wrangler.toml`; đang chạy mã nào thì chưa rõ | UNVERIFIED |
| RevenueOps Worker | `npm --prefix workers/revenueops run dev` | không | cấu hình `env.staging` có, chưa deploy | cấu hình `env.production` có, **không route, không cron**, chưa deploy | VERIFIED (cấu hình) / UNVERIFIED (trạng thái deploy) |
| Cửa hàng `apps/store` | `next dev` | Vercel (đã tắt preview theo nhánh từ 31/10) | chưa có | Vercel `sach-muonnoi`: chưa có bản triển khai thành công nào | VERIFIED (Vercel API) |

Cloudflare tài nguyên khai báo trong mã: Pages project `ai-muonnoi-org`; D1 binding `iai_flow_db` (tên cơ sở dữ liệu `iai-flow-db`) ở `workers/api/wrangler.toml`; Durable Object `RevenueCoordinator` (SQLite) và binding assets ở RevenueOps. Không thấy KV, R2, Queues khai báo. `wrangler.json` trên `main` khai một D1 cùng tên nhưng **id khác** với `workers/api/wrangler.toml` của #1/ops: cơ sở dữ liệu nào thực sự tồn tại là UNVERIFIED (không chép id vào hồ sơ).

DNS, tên miền, định tuyến thật: **BLOCKED**. Mọi yêu cầu HTTP từ môi trường này tới `ai.muonnoi.org`, `api.muonnoi.org` và `*.pages.dev` trả `http=000` (chính sách mạng của môi trường, không phải bằng chứng ngừng dịch vụ).

## 6. Workflow GitHub Actions và hệ CI thực tế

**Không có workflow GitHub Actions nào** ở bất kỳ nhánh nào (`git ls-tree` cả 15 nhánh: 0 tệp dưới `.github/`; `actions/workflows` total_count 0; `actions/runs` total_count 0; artifacts 0).

CI thực tế của repo là ba hệ ngoài GitHub Actions:

| Hệ | Kích hoạt | Phân loại | Bằng chứng |
|---|---|---|---|
| Cloudflare Pages (git integration, app `cloudflare-workers-and-pages`) | mỗi lần push mọi nhánh, comment + check run `Cloudflare Pages` | **ACTIVE**; có phải required check hay không: **UNKNOWN** (branch protection không đọc được) | check run trên 14 đầu nhánh; xanh ở #1, #2, ops, `optimistic-sammet`; đỏ ở `main` (cũng là probe-5), #3, #4 và 6 nhánh thử khác |
| Vercel (git integration, dự án `sach-muonnoi`, thư mục gốc `apps/store`) | trước 31/10 mọi nhánh; từ 31/10 đã tắt bản xem trước | **ACTIVE nhưng đã bị chặn có chủ đích**; 13 lần build, 13 lần ERROR (xem 02) | Vercel API, GitHub Deployments (13 bản ghi: 12 Preview, 1 Production; lần cuối 20/10) |
| CodeRabbit (review bot) | PR; bỏ qua PR nháp | **ACTIVE** (không tốn runner) | check run `skipped` trên #3, #4 |

Không có self-hosted runner nào được biết tới; API runners bị proxy chặn nên **UNKNOWN**, nhưng không workflow nào tồn tại để dùng chúng.

## 7. Thay đổi cấu hình có thể ảnh hưởng pipeline

1. `main`: `package.json` gốc gồm một JSON đúng rồi tới dấu `---` và một khối Markdown dán thêm (một tài liệu thứ hai); `JSON.parse` lỗi tại vị trí 555 (dòng 27). npm, Vercel và mọi bước cài đặt đọc tệp này đều hỏng. Xem `02`.
2. #1 thay `package.json` hợp lệ và đặt Pages output `.` (xuất bản cả thư mục gốc, kể cả mã nguồn và migration của repo công khai).
3. #2 và ops thêm `tools/build.mjs` (danh sách cho phép, 43 tệp) và đặt output `dist/site`.
4. PR #4 chép nguyên văn `package.json` và `wrangler.json` của #1 (commit `5c866c1`).
5. 31/10: bản xem trước theo nhánh của Vercel `sach-muonnoi` bị tắt.
