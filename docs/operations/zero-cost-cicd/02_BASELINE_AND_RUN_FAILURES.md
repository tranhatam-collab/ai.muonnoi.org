# 02 · Baseline và nguyên nhân các lần chạy lỗi (Giai đoạn A, B)

Baseline: `main` @ `3e0cac697cc36a923929d76ca63adf86440badb1` · Thu thập 2026-11-11 08:01–08:10 UTC.

Không có lần chạy GitHub Actions nào để phân tích (0 workflow, 0 run). Các "run lỗi" của repo là build của Cloudflare Pages và Vercel.

## 1. Baseline của chính `main` (PRE-EXISTING FAILURE)

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| `package.json` gốc là JSON hợp lệ | **FAIL**: `Unexpected non-whitespace character after JSON at position 555 (line 27 column 1)` | `scripts/ci/local-verify.sh` trên `3e0cac6`, `evidence/local-verify-3e0cac697cc3.json` (sha256 `d73e3cd7…10f2`); `JSON.parse` thủ công cho cùng vị trí |
| Cấu hình Pages | `wrangler.json` không phải JSON; là TOML của Worker `iai-flow-engine` (có `main`, `[[d1_databases]]`) | cùng tệp trên |
| Workflow, mẫu bí mật, tệp `.env` được theo dõi | PASS | cùng tệp trên |

Đây là lỗi có từ trước, **không do việc chuyển pipeline gây ra**. Cây ops `cc8ac68` cùng bộ kiểm tra: PASS cả tám bước (`evidence/local-verify-cc8ac689ed80.json`), nên đối chiếu trước/sau cho thấy lỗi nằm riêng ở `main`.

## 2. Vercel `sach-muonnoi`: 13 build, 13 ERROR

Nguồn: Vercel API (`list_deployments`, `list_deployment_events`, `get_deployment`) và GitHub Deployments API; đọc 2026-11-11.

| Nhóm | Số build | Nguyên nhân (nguyên văn log) | Job đã chạy chưa |
|---|---|---|---|
| Nhánh `codex/ai-muonnoi-autonomous-ops` (11 build, 16–17/10) và `codex/revenueops-publishing` (1 build mang nhãn production, 15/10) | 12 | `The specified Root Directory "apps/store" does not exist. Please update your Project Settings.` (đã đọc log của cả 12) | Máy build được cấp và repo được clone; dừng ở bước xác thực thư mục gốc, **chưa chạy lệnh build nào** |
| Nhánh `claude/money-engine-draft` @ `6601571` (20/10) | 1 | `errorStep: buildStep`, `errorCode: enoent`: `/vercel/path0/package.json: Unexpected non-whitespace character after JSON at position 555 (line 27 column 1)` | Dừng khi đọc `package.json`; **cùng lỗi với `main`** (mục 1) |

Kết luận có bằng chứng:
- 12/13 lỗi do **cấu hình dự án Vercel (thư mục gốc `apps/store`) gặp các nhánh không có thư mục đó**, vì dự án nối với cả repo và xây mọi nhánh. Không phải lỗi mã của các nhánh ops/#2.
- 1/13 lỗi do `package.json` hỏng kế thừa từ `main`; đã sửa ở PR #4 (commit `5c866c1`) nhưng chưa được kiểm lại trên Vercel vì xem trước đã tắt.
- Từ 31/10: không còn bản triển khai Vercel nào (GitHub Deployments không có bản ghi sau 2026-10-20T03:40Z dù có push ngày 31/10, 06/11, 10/11). Dòng lỗi này đã ngừng; chi phí build Vercel cho các nhánh không liên quan = 0 kể từ đó.

## 3. Cloudflare Pages: ma trận check run trên đầu mọi nhánh

Nguồn: GitHub check runs, thu thập 2026-11-11 08:04:49 UTC.

| Nhánh | Head | Kết quả | Thời điểm |
|---|---|---|---|
| `main` (= probe-5) | `3e0cac6` | **failure** | 06/11 14:04Z |
| `feat/flow-mvp-backend` (#1) | `6c58845` | success | 04/06 |
| `codex/revenueops-publishing` (#2, = probe-4) | `e74ee69` | success (chạy lại 06/11 14:03Z) | 06/11 |
| `codex/ai-muonnoi-autonomous-ops` | `cc8ac68` | success | 01/11 13:49Z |
| `claude/money-engine-draft` (#3) | `beea00a` | **failure** | 31/10 |
| `claude/money-engine-e2e` (#4) | `772bd99` | **failure** | 10/11 06:29Z |
| `claude/optimistic-sammet` | `a0e5573` | success | 26/03 |
| `claude/cf-probe-1, 2, 3, 6, 7, 8` | nhiều SHA | **failure** (cả sáu) | 06/11 |

Phân loại: thông báo của bot ghi `title: "Building"`, `summary: "Build failed."`, nên **build đã chạy rồi mới thất bại** (không phải "chưa có job nào chạy"). Nhật ký build nằm trong dashboard Cloudflare: **BLOCKED**.

Đối chiếu nội dung từng cây với kết quả Pages (đọc bằng `git show`/`git ls-tree`, 2026-11-11):

| Cây | `package.json` gốc | script `build` | `tools/build.mjs` | Pages output | Kết quả Pages |
|---|---|---|---|---|---|
| `main` (= probe-5) | **không hợp lệ** | n/a | không | (TOML Worker) | failure |
| probe-1, 2, 3, 6, 7, 8 | hợp lệ | **không có** | không | `.` | failure (cả sáu) |
| #3 `beea00a` | **không hợp lệ** (cùng lỗi với `main`) | n/a | không | (TOML Worker) | failure |
| #4 `772bd99` (sau `5c866c1`) | hợp lệ | **không có** | không | `.` | failure |
| #2 `e74ee69` (= probe-4) | hợp lệ | có (`node tools/build.mjs`) | **có** | `dist/site` | success (chạy lại 06/11) |
| ops `cc8ac68` | hợp lệ | có | **có** | `dist/site` | success |
| #1 `6c58845` (04/06), `optimistic-sammet` (26/03) | hợp lệ | không có | không | `.` / n/a | success **cũ**, có trước tháng 10 |

Ghi chú: #3 mang nguyên `package.json` và `wrangler.json` của `main`, nên đỏ vì H1. #4 thay hai tệp bằng bản của #1 (hợp lệ) nhưng vẫn đỏ vì thiếu bước build (H2).

Quy luật quan sát được trên mọi lần build từ 15/10 trở đi (9 đầu nhánh): **xanh khi và chỉ khi cây có script `build` chạy `tools/build.mjs` và thư mục đầu ra `dist/site`**. Hai kết quả xanh cũ (#1, `optimistic-sammet`) có trước thời điểm đó và không mâu thuẫn.

Hai giả thuyết còn lại, chưa phân định được nếu không có log:

| | Giả thuyết | Ủng hộ |
|---|---|---|
| H1 | Trên `main`/#3, `npm install` hoặc `npm run build` hỏng vì `package.json` không hợp lệ | cùng lỗi làm Vercel hỏng; chỉ giải thích được `main` và #3, không giải thích #4 và 6 nhánh thử (đều có `package.json` hợp lệ) |
| H2 | Dự án Pages chạy `npm run build` (hoặc `node tools/build.mjs`) rồi lấy `dist/site`; cây nào không có bước đó thì đỏ | giải thích được **mọi** lần đỏ và mọi lần xanh từ tháng 10; biên nhận của ops ghi lệnh build `node tools/build.mjs`, output `dist/site` |

**H2 là giả thuyết được ưu tiên.** Chưa có log build nên vẫn **UNVERIFIED**.

Cách phân định, **cần Owner (một phút)**: mở build log gần nhất của commit `772bd99` hoặc `79ec0c9` (liên kết "View logs" trong bình luận bot của PR #4) và dán 15 dòng cuối. Không tạo thêm nhánh thử: mỗi nhánh thử tiêu một lần build và không xóa được.

## 4. Kết luận nguyên nhân

| Hệ | Nguyên nhân | Mức chắc chắn |
|---|---|---|
| Vercel | thư mục gốc `apps/store` không tồn tại ở nhánh bị build; `package.json` của `main` hỏng | **VERIFIED** (log nguyên văn) |
| Cloudflare Pages | cây không có cấu hình build đúng (H1 và/hoặc H2) | **UNVERIFIED** (thiếu log) |
| GitHub Actions | không có run | **VERIFIED** (API) |
