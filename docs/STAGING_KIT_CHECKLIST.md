# Checklist staging kit (đọc-only) — chờ Cloudflare Free account

**Status:** `READY_LOCAL_ONLY` · không áp remote · không deploy  
**Updated:** 2026-10-19  
**Generator:** `npm run prepare:intake:staging` → `.local/intake-staging/`  
**Placeholders bắt buộc:**

| Placeholder | Ý nghĩa |
|---|---|
| `__CLOUDFLARE_FREE_ACCOUNT_ID_REQUIRED__` | Account Free riêng Founder chỉ định — **không** dùng account Paid đã audit |
| `__SEPARATE_STAGING_D1_ID_REQUIRED__` | D1 staging mới, ID khác production `3ceac8b1-…` và khác DB cùng tên trên Dashboard Paid |

## A. Trước khi điền ID (AI đã/đang làm)

- [x] Entrypoint staging chỉ health/auth tối thiểu/intake (`workers/api/src/staging.ts`)
- [x] Flags mặc định tắt: `STAGING_AUTH_ENABLED`, `STUDIO_INTAKE_ENABLED`, `STUDIO_TRIAGE_ENABLED`
- [x] Không route/cron/AI/mail/payment binding trong bundle
- [x] Schema = base sạch + 0010 + 0011; không seed admin/mật khẩu
- [x] Generator từ chối argv remote và ID production
- [x] Suite `npm run test:intake:staging` phải pass trước mỗi lần giao bundle

## B. Khi Founder gửi Free account ID (AI làm, không hỏi lại từng bước nhỏ)

1. Xác minh plan = Free / quota đọc-only; dừng nếu Paid hoặc thiếu quyền.
2. Tạo D1 **tên mới** trên đúng Free account; ghi ID thật thay placeholder (chỉ trong `.local/`, không commit secret).
3. Điền `account_id` + `database_id` vào bản sao local của `wrangler.toml` staging.
4. `APP_ORIGIN` = origin staging thật (HTTPS); cập nhật CORS/cookie cho đúng host.
5. Chỉ định 2 test identities + `STUDIO_OPERATOR_IDS`.
6. Apply schema **chỉ** vào D1 staging đã chốt; đối chiếu bảng; giữ kill switch.
7. Bật `STAGING_AUTH_ENABLED` sau Access/receipt; intake/triage vẫn tắt đến nghiệm thu.
8. Chạy E2E local/staging theo OPERATIONS; ghi receipt SHA/environment.
9. Không đụng DNS production, custom domain Inactive, Worker production, secret production.

## C. Cấm

- Copy production D1/data/secrets vào staging
- Dùng DB cùng tên trên account Paid như Free
- `wrangler deploy` / migrate remote trước khi A–B đủ
- Mở publishing/AI/social/cron có phí dưới hạn mức 0 VND hiện hành

## D. Receipt tối thiểu mỗi lần regenerate local

```text
command: npm run prepare:intake:staging
account_id_in_bundle: __CLOUDFLARE_FREE_ACCOUNT_ID_REQUIRED__
d1_id_in_bundle: __SEPARATE_STAGING_D1_ID_REQUIRED__
remote_applied: false
tests: intake-staging suite exit code + counts
```
