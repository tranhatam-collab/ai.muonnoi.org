# 07 · Thay đổi và diff (Giai đoạn D, E)

Nhánh: `ops/zero-cost-cicd-20261111` tạo từ `origin/main` @ `3e0cac697cc36a923929d76ca63adf86440badb1` lúc 2026-11-11 (cây làm việc sạch trước khi chuyển nhánh).

## Nguyên tắc của diff

- **Chỉ thêm tệp mới.** Không sửa, không xóa tệp nào đã có trên `main`. Không đụng `package.json`, `wrangler.json`, `_headers`, mã nguồn sản phẩm hay cấu hình triển khai.
- Không có workflow GitHub Actions được thêm, sửa hay vô hiệu hóa (không có workflow nào).
- Commit mang từ khóa `[CF-Pages-Skip]` và `[skip ci]` để tránh một lần build Pages vô ích (hiệu quả được ghi ở `09`).

## Tệp được thêm

| Tệp | Mục đích |
|---|---|
| `scripts/ci/local-verify.sh` (186 dòng, sha256 `2049a1ef…0ee1`) | CI cục bộ: không dùng GitHub-hosted compute; kiểm tra cấu hình, chính sách workflow, mẫu bí mật, chạy dòng ops và store, ghi JSON |
| `docs/operations/zero-cost-cicd/01…14_*.md` | 14 hồ sơ bàn giao |
| `docs/operations/zero-cost-cicd/templates/ci.workflow.yml.template` (sha256 `d9b037f1…0c7d`) | mẫu workflow **không hoạt động**, đạt chính sách khi thử trong repo tạm |
| `docs/operations/zero-cost-cicd/evidence/local-verify-*.json` | kết quả máy đọc được của 4 lần chạy (SHA đầy đủ, thời điểm UTC, từng bước) |

`evidence/` sha256: `main` `3e0cac697cc3` → `d73e3cd7…10f2`; ops `cc8ac689ed80` → `7759ef30…75e3`; PR #4 `772bd997653c` → `734ff3df…7a22`; cây ghép cục bộ `b643ce73bb52` → `1ba629f0…2c58` (SHA này chưa từng được đẩy lên remote; đây là cây tạm của phiên).

## Cấu hình CI/CD cũ được bảo toàn

Không có cấu hình GitHub Actions để chụp (0 workflow). Cấu hình liên quan nằm trong Git history của `main` và không bị đổi:
`package.json` (blob của `3e0cac6`, không hợp lệ), `wrangler.json` (TOML Worker), `_headers`, `tsconfig.base.json`. Cài đặt dashboard của Cloudflare Pages và Vercel **không đọc được hoặc không đổi**; không có thay đổi cài đặt nào được thực hiện trong đợt này, nên không có gì cần chụp để khôi phục.

## Việc đã làm ngoài Git

Chỉ đọc: GitHub API (repo, deployments, check runs), Vercel API (deployments, events, project). Không ghi vào GitHub (ngoài việc đẩy nhánh và mở PR của chính đợt này), không ghi vào Vercel hay Cloudflare.
