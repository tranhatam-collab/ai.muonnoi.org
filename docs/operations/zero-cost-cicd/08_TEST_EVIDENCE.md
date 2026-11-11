# 08 · Bằng chứng kiểm thử (Giai đoạn F)

Công cụ: `scripts/ci/local-verify.sh` (Node 22.22.0, npm 10.9.4, Linux). Mọi lần chạy ngày 2026-11-11, UTC. Kết quả máy đọc được ở `evidence/`; log chi tiết nằm trong thư mục tạm của phiên (không đưa vào repo công khai), kèm sha256 của tệp JSON.

## 1. Các lần chạy

| # | Cây | SHA | Giờ UTC | Kết quả | Chi tiết |
|---|---|---|---|---|---|
| 1 | `main` (baseline) | `3e0cac697cc3` | 08:07:08 | **FAIL** (4 PASS, 1 WARN, 1 FAIL, 1 SKIP) | `root-package-json` FAIL (vị trí 555, dòng 27); `pages-output-dir` WARN (không phải JSON); `lanes` SKIP vì `package.json` hỏng |
| 2 | ops | `cc8ac689ed80` | 08:07:08–08:07:34 | **PASS** (8/8) | `ops-verify` **166/166** (26 s); `pages-surface`: `dist/site` 43 tệp, không lộ thư mục nội bộ |
| 3 | PR #4 (cửa hàng) | `772bd997653c` | 08:08:05–08:08:50 | PASS_WITH_WARNINGS (10 PASS, 2 WARN) | cài theo lockfile 11 s; `tsc` PASS; unit **25/25**; e2e **57/57** (10 s); `next build` PASS (20 s); WARN: `pages-output-dir` = `.`, `store-audit` = 2 lỗ hổng (1 moderate, 1 high) |
| 4 | cây ghép cục bộ (ops + cửa hàng) | `b643ce73bb52` (chỉ cục bộ) | 08:08:51–08:09:58 | PASS_WITH_WARNINGS (12 PASS, 1 WARN) | `ops-verify` 166/166; `pages-surface` 43 tệp; `tsc` PASS; unit 25/25; e2e 57/57; build PASS; WARN: `store-audit` |

## 2. Đối chiếu trước/sau (PRE-EXISTING FAILURE)

Lỗi duy nhất ở bảng trên là `root-package-json` trên `main` (lần 1). Cùng bước trên cây ops (lần 2), PR #4 (lần 3) và cây ghép (lần 4): PASS. Vậy đây là **lỗi có sẵn của `main`**, không phải lỗi phát sinh từ pipeline mới. Cùng lỗi là nguyên nhân Vercel build hỏng cho `claude/money-engine-draft` (`02`).

## 3. Theo từng hạng mục của Giai đoạn F

| Hạng mục | Kết quả | Nhãn |
|---|---|---|
| Cài dependency theo lockfile | `npm ci` cho `apps/store` (lần 3) và `workers/api`, `workers/revenueops` (đã cài trong cây ops/ghép) | VERIFIED |
| Lint | không có bước lint thật: script `lint` gốc chỉ in thông báo; không cấu hình ESLint chạy được trong các dòng đã chạy | **NOT AVAILABLE** (không giả vờ PASS) |
| Typecheck | `tsc --noEmit` cửa hàng PASS; `typecheck:api` và typecheck RevenueOps nằm trong `npm run verify` PASS | VERIFIED |
| Unit | cửa hàng 25/25; ops: các bộ trong 166 | VERIFIED |
| Integration/e2e | cửa hàng 57 e2e trên Postgres thật (PGlite) với dịch vụ ngoài giả ở tầng `fetch`; ops: các test workerd + D1 cục bộ nằm trong 166 | VERIFIED (chưa gọi dịch vụ thật) |
| Build production | `next build` PASS; `tools/build.mjs` → `dist/site` 43 tệp | VERIFIED |
| Kiểm tra cấu hình build | `pages-output-dir`: ops `dist/site` PASS; #4 `.` WARN; `main` WARN (không phải JSON) | VERIFIED |
| Bí mật trong mã được theo dõi | 0 khớp mẫu trên 4 cây | VERIFIED |
| Bí mật trong log chạy | 0 khớp mẫu trong 4 thư mục log (180 KB) | VERIFIED |
| Bí mật trong artifact build | 0 khớp mẫu trong `dist/site` của cây ops và cây ghép | VERIFIED |
| Bảo mật phụ thuộc | cửa hàng: 2 lỗ hổng ở `postcss` bên trong `next` (4 advisory, chỉ lúc build, sửa cần Next 16); `workers/api` 0; `workers/revenueops` 0 (`npm audit --omit=dev`, 08:14 UTC) | VERIFIED |
| So sánh hành vi với phiên bản đang chạy | **không áp dụng**: không workflow nào được chuyển, không deploy nào thay đổi | N/A |
| Trang chính/API/đăng nhập/route quan trọng | e2e cửa hàng bao phủ route cửa hàng; trang tĩnh duyệt bằng Chromium ngày 10/11 (báo cáo 06 trong `docs/money-engine/` của PR #4); **không kiểm được bản đang chạy thật** (mạng bị chặn) | VERIFIED một phần |
| Preview/staging | xem `09` | BLOCKED |
| Rollback | mô phỏng `git revert` commit `212f7bc`: cây sau revert trùng cây `main`, 0 tệp khác | VERIFIED |

## 4. Kiểm thử âm tính của chính công cụ

| Tình huống | Kết quả mong đợi | Kết quả |
|---|---|---|
| Repo tạm có workflow xấu (`schedule`, runner `ubuntu-latest-8-cores`, `pull_request_target`, thiếu timeout/concurrency/permissions) và một chuỗi giống khóa API | `workflow-policy` FAIL, `secret-patterns` FAIL, thoát mã 1 | đúng: 6/6 vi phạm được nêu, `leak.js` bị chỉ tên (không in nội dung) |
| Repo tạm có workflow đúng chính sách (mẫu `ci.workflow.yml.template` đặt vào `.github/workflows/`) | `workflow-policy` PASS | đúng |
| Cây có `package.json` hỏng | `root-package-json` FAIL, dòng ops SKIP có lý do | đúng (lần 1) |

## 5. Giới hạn

Công cụ kiểm tra chính sách workflow chỉ dựa trên `grep`, có thể sai với YAML bất thường. Không thay cho việc đọc workflow. Không có bước nào được cho là thành công khi test lỗi: `store-audit` được báo WARN (không PASS) vì còn 2 lỗ hổng chưa sửa.
