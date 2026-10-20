# Runbook phát triển và tiếp nhận vận hành — cập nhật 2026-10-20

**HOLD cho live.** Chủ dự án là Founder; operational/support/security owner, escalation và SLO còn chờ chỉ định. Không coi laptop hoặc receipt local là hệ vận hành 24/7.

## Vòng giờ Cursor — A05 rights/fidelity contract — 20/10/2026, 22:53 (UTC+7)

Source: `tranhatam-collab/ai.muonnoi.org` · `codex/ai-muonnoi-autonomous-ops` · HEAD `cba2d1e`. Tick `AGENT_LOOP_TICK_muonnoi_hourly` `2026-10-20T15:52:11Z`. Loop PID **53356**. Pilot dirty bảo toàn. 0 VND. Không publish/voice-clone.

| Việc | Trạng thái | Evidence |
|---|---|---|
| A04 CSV (Codex) | `VERIFIED_WORKTREE_ONLY` | Revalidate **53/53 PASS** · `BLOCKED_SOURCE_DATA` · ready rows 0 |
| A05 rights/fidelity | `VERIFIED_WORKTREE_ONLY` | `.local/continuous/a05-rights-fidelity-20261020T155311Z/` · **29/29** · refuse without rights · sources_ready **0** · `content_generated=false` |
| Actuals | null | `DRAFT_NOT_FOR_SALE` |

**Việc tự động tiếp theo:** A06 entitlement 90 ngày + revoke fixture (local). Không chờ Founder.

## Vòng Codex — A04 CSV 20 sản phẩm + rubric dữ kiện — 20/10/2026, 21:35 (UTC+7)

Source khóa tại `tranhatam-collab/ai.muonnoi.org` · remote `git@github.com:tranhatam-collab/ai.muonnoi.org.git` · nhánh `codex/ai-muonnoi-autonomous-ops` · HEAD `cba2d1e917dd90e3825905fa293a35c745507c86`. Ba tệp Pilot dirty được bảo toàn; không commit/push/deploy/DNS/secret/migration. Ngân sách 0 VND.

`VERIFIED_WORKTREE_ONLY`: `.local/continuous/a04-csv-rubric-20261020T2135/` đã materialize schema, rubric 10 tiêu chí, CSV intake đúng 20 dòng và validator fail-closed cho A04. Mỗi dòng muốn sang `DRAFT_READY` phải có source/rights receipt, tối thiểu 5 fact, tiêu đề/mô tả, đúng 3 FAQ và claim map chỉ tham chiếu fact key hiện có. `REVIEWED` buộc reviewer receipt; scope chỉ cho `REVISION_0` hoặc `REVISION_1`; không có đường publish.

Test exit 0 với **53 checks**. Validator chặn thiếu/sai source-rights receipt, JSON/fact/FAQ thiếu, claim tuyệt đối, claim khách cấm, claim map ngoài nguồn, vòng sửa thứ hai, reviewer thiếu, row trùng/thiếu và nội dung được viết trước nguồn. Template thực tế giữ 20 row trống, source receipts 0, rights receipts 0, ready/reviewed rows 0, verdict `BLOCKED_SOURCE_DATA`. External actions 0, `commercial_effect=false`; target/forecast/pipeline/invoiced/paid/refunds/fees/collected cash đều `null`. Receipt: `receipt.json` trong cùng thư mục.

Giới hạn: chưa có dữ liệu sản phẩm khách, quyền sử dụng, reviewer hoặc demand signal; các dòng CSV không phải nội dung sản phẩm hoàn tất. A04 vẫn `DRAFT_NOT_FOR_SALE` và HOLD thương mại.

**Việc tự động tiếp theo:** dựng A05 source-rights + fidelity contract cho input văn bản/bản ghi được cấp quyền; không tạo nội dung khi receipt còn thiếu.

## Vòng giờ Cursor — A03 report packet hư cấu — 20/10/2026, 20:55 (UTC+7)

Source: `tranhatam-collab/ai.muonnoi.org` · `codex/ai-muonnoi-autonomous-ops` · HEAD `fdf1489`. Tick `AGENT_LOOP_TICK_muonnoi_hourly` `2026-10-20T13:55:02Z`. Loop PID **53356**. Pilot dirty bảo toàn. 0 VND. Không crawl/DNS/deploy.

| Việc | Trạng thái | Evidence |
|---|---|---|
| A03 sandbox (Codex) | `VERIFIED_WORKTREE_ONLY` | Revalidate `node …/a03-crawler-sandbox-20261020T2035/test.mjs` **63/63 PASS** |
| A03 packet 10 trang / 20 finding | `VERIFIED_WORKTREE_ONLY` | `.local/continuous/a03-report-packet-20261020T135600Z/` · test **77/77** · `live_fetch=false` · authorization `EMPTY_REQUIRED` |
| Actuals | null | Không bán · không pentest/SEO guarantee |

**Việc tự động tiếp theo:** A04 CSV schema + rubric dữ kiện (local draft, không đăng sàn). Không chờ Founder.

## Vòng Codex — A03 crawler sandbox + SSRF refusal — 20/10/2026, 20:34 (UTC+7)

Source khóa tại `tranhatam-collab/ai.muonnoi.org` · remote `git@github.com:tranhatam-collab/ai.muonnoi.org.git` · nhánh `codex/ai-muonnoi-autonomous-ops` · HEAD `fdf1489801f08241857369f5607377530357e9e2`. Ba tệp Pilot dirty được bảo toàn; không commit/push/deploy/DNS/secret/migration. Ngân sách 0 VND.

`VERIFIED_WORKTREE_ONLY`: `.local/continuous/a03-crawler-sandbox-20261020T2035/` đã materialize contract crawler local cho A03: bắt buộc authorization/scope receipt hư cấu, khóa đúng một HTTPS origin, tối đa 10 trang, GET/HEAD, bỏ credentials, redirect thủ công tối đa ba hop, pin toàn bộ DNS set trước fetch, HTML tối đa 2 MB và timeout 10 giây. Fixture không thực hiện DNS/HTTP thật.

Test exit 0 với **63 checks**. Failure path đã phủ IP loopback/private/link-local/metadata/reserved/multicast/documentation, IPv6 local và IPv4-mapped, IP literal, hostname local, URL chứa token, port/scheme/method sai, redirect khác origin, DNS rebinding, vượt page cap, status/content-type/size sai. Network requests 0, external actions 0, `commercial_effect=false`; target/forecast/pipeline/invoiced/paid/refunds/fees/collected cash đều `null`. Receipt: `receipt.json` trong cùng thư mục.

Giới hạn: chưa có website khách được cấp quyền, target URL, DNS/runtime receipt hoặc crawler production; A03 vẫn `DRAFT_NOT_FOR_SALE` và HOLD thương mại.

**Việc tự động tiếp theo:** dựng packet báo cáo A03 hư cấu đủ 10 trang, evidence schema và 20 finding ưu tiên; source/authorization/customer acceptance còn thiếu phải giữ trống, không gắn claim thật.

## Vòng trực tiếp Founder “chạy luôn” — create-intent candidate — 20/10/2026, 19:52 (UTC+7)

Source: `tranhatam-collab/ai.muonnoi.org` · `codex/ai-muonnoi-autonomous-ops` · HEAD `ed1df9a`. Pilot dirty + docs dirty bảo toàn trước commit vòng này. 0 VND. Không deploy/DNS/push/production patch.

| Việc | Trạng thái | Evidence |
|---|---|---|
| A01 content pack | `VERIFIED_WORKTREE_ONLY` | 12 quy trình · 30 prompt · 30 ngày · license · bảng — practice receipt `a01-practice-20261020T1432` |
| create-intent catalog-bound candidate | `VERIFIED_WORKTREE_ONLY` | `.local/continuous/create-intent-harden-20261020T125229Z/` · test **15/15 pass** · `applied_to_production=false` |
| Production create-intent | `P1` mở | Vẫn nhận amount caller; candidate **chưa** wire vào `payment-api.ts` |
| Live probes (đọc-only) | `VERIFIED_CURRENT` | `ai.muonnoi.org` 200 · body SHA `984e4db6…525187` UNCHANGED · `ailamviec/health` ok · n8n 200 |
| Commercial | HOLD | Actuals null · không bán |

**Việc tự động tiếp theo:** A03 crawler sandbox + SSRF refusal fixtures (local); hoặc wire create-intent candidate **chỉ sau** Founder duyệt AP + review. Không chờ Founder để làm A03.

## Vòng Codex — S01/A01 checkout + merchant launch gate — 20/10/2026, 18:46 (UTC+7)

Source khóa tại `tranhatam-collab/ai.muonnoi.org` · remote `git@github.com:tranhatam-collab/ai.muonnoi.org.git` · nhánh `codex/ai-muonnoi-autonomous-ops` · HEAD `ed1df9a81f370520de40751b6bced933c34a06e5`. Năm tệp tracked dirty được bảo toàn; không commit/push/deploy/DNS/secret/migration. Ngân sách 0 VND.

`VERIFIED_WORKTREE_ONLY`: `.local/continuous/s01-a01-checkout-gate-20261020T1845/` đã materialize checkout/merchant gate fail-closed cho S01 `studio-pilot-14d` (giá đề xuất 1.500.000 VND) và A01 (giá đề xuất 149.000 VND). Fixture chỉ nhận environment hư cấu local và buộc đủ seller, price approval, license, merchant, webhook signing, refund, reconciliation source và owned-channel ref; khóa SKU/giá/VND; chặn idempotency conflict, webhook thiếu/sai chữ ký, mismatch intent/amount/currency, outcome chưa rõ và reconciliation thiếu settlement/fee/refund hoặc còn discrepancy.

Test exit 0 với **54 checks**. Chuỗi test hợp lệ chỉ kết thúc ở `RECONCILED_TEST_ONLY`; `commercial_effect=false`, external actions 0 và mọi actuals vẫn `null`. Receipt: `receipt.json` trong cùng thư mục, gắn hash catalog S01, cấu hình A01, payment source, fixture và test result.

`VERIFIED_HEAD_ONLY`: webhook production ở `workers/api/src/api/payment-api.ts` đang fail-closed khi thiếu secret/chữ ký. `P1`: create-intent hiện parse `amount` do caller gửi, chỉ kiểm tra số dương rồi lưu; chưa khóa vào catalog, SKU, trạng thái giá được duyệt hoặc merchant launch gate. Vì vậy fixture local không nâng checkout production thành sẵn sàng mở bán.

**Việc tự động tiếp theo:** dựng candidate contract hardening cho create-intent trong lane tách biệt, kèm test catalog-bound và migration-compatible; không chạm production hay ba tệp Pilot dirty. HOLD live/thương mại giữ nguyên cho tới khi source fix được review cùng seller/legal/price/merchant receipt thật.

## Vòng trực tiếp — ưu tiên doanh thu + A02 retail structure — 20/10/2026, 17:58 (UTC+7)

Đã cập nhật **lịch heartbeat hiện có** `ai-muonnoi-continuous-revenue-execution`, vẫn chạy mỗi giờ và không tạo lịch trùng. Lịch mới dồn đường găng vào S01/A01, yêu cầu mỗi vòng tạo deliverable sản phẩm cụ thể, giảm lặp probe không đổi và chuyển ngay sang A02–A10 khi gate ngoài bị chặn.

Source: `tranhatam-collab/ai.muonnoi.org` · nhánh `codex/ai-muonnoi-autonomous-ops` · HEAD `ed1df9a81f370520de40751b6bced933c34a06e5`. Năm tệp tracked dirty được giữ nguyên; không commit/push/deploy/DNS/secret/migration. Ngân sách 0 VND.

`VERIFIED_CURRENT` local: `.local/continuous/a02-retail-draft-20261020T1800/` đã materialize **20 quy trình, 40 prompt và 10 case bán lẻ hư cấu**. Validator/test exit 0 với 15 checks; chặn tự nâng thành đã chọn/đã duyệt/đã có evidence. Source packet còn trống đúng thực tế: authoritative sources 0, rights receipts 0, expert review receipts 0. Receipt: `receipt.json` trong cùng thư mục.

Giới hạn: đây là structure-only draft `DRAFT_NOT_FOR_SALE`; candidate bán lẻ chưa được chọn, chưa expert review và chưa sale-ready. Actuals null; external actions 0; HOLD live/thương mại không đổi.

**Việc tự động tiếp theo:** dựng A03 crawler sandbox contract + SSRF refusal fixtures; A02 chỉ được nâng tiếp khi có source/rights/expert receipt thật.

## Vòng Codex — A02 candidate matrix theo ngành — 20/10/2026, 17:45 (UTC+7)

Source: `tranhatam-collab/ai.muonnoi.org` · remote `git@github.com:tranhatam-collab/ai.muonnoi.org.git` · nhánh `codex/ai-muonnoi-autonomous-ops` · HEAD `ed1df9a81f370520de40751b6bced933c34a06e5`. Năm tệp tracked dirty được giữ nguyên; không commit/push/deploy/DNS/secret/migration. Ngân sách 0 VND.

`VERIFIED_CURRENT` public HTTP: live/Pages production/ops preview vẫn giữ ba digest `984e4db6…525187`, `f1d25e37…857216`, `0edb5b54…135c85`; live không khớp hai Pages deployment. Receipt: `.local/continuous/mapping-recheck-20261020T1744/receipt.json`.

`VERIFIED_CURRENT` local: `.local/continuous/a02-candidate-matrix-20261020T1744/` khóa ma trận ba candidate bán lẻ/lưu trú/dịch vụ theo hai nguồn kế hoạch nội bộ đã hash. Validator + test exit 0 với **16 checks**; selected candidates 0, verified cases 0, external sources 0, rights receipts 0, expert review receipts 0. Bán lẻ chỉ là `A02-RETAIL_UNAPPROVED`, không phải lựa chọn đã duyệt. Các test chặn tự chọn ngành, nâng readiness, gắn quyền/case không có evidence, điền actuals hoặc coi giá đề xuất là đã duyệt.

Receipt: `receipt.json` trong cùng thư mục. Đây không phải market validation, quyền nội dung, expert review, phê duyệt giá hoặc sale readiness. External actions 0; actuals null; HOLD live/thương mại không đổi.

**Việc tự động tiếp theo:** tạo packet template cho nguồn/quyền/10 case/expert review của candidate bán lẻ; dữ liệu chưa có giữ trống và fail closed.

## Vòng Codex — A01 measurement/reconciliation rehearsal — 20/10/2026, 16:42 (UTC+7)

Source: `tranhatam-collab/ai.muonnoi.org` · remote `git@github.com:tranhatam-collab/ai.muonnoi.org.git` · nhánh `codex/ai-muonnoi-autonomous-ops` · HEAD `ed1df9a81f370520de40751b6bced933c34a06e5`. Năm tệp tracked dirty được giữ nguyên; không commit/push/deploy/DNS/secret/migration. Ngân sách 0 VND.

`VERIFIED_CURRENT` public HTTP: live/Pages production/ops preview giữ ba digest `984e4db6…525187`, `f1d25e37…857216`, `0edb5b54…135c85`; live vẫn không khớp hai Pages deployment. Receipt: `.local/continuous/mapping-recheck-20261020T1641/receipt.json`.

`VERIFIED_CURRENT` local: `.local/continuous/a01-measurement-20261020T1641/` tách plan (`target`, `pipeline`, `invoiced`), giao dịch thử (`paid`, `refund`, `fee`) và actuals. Test exit 0 với **30 checks**; phủ thiếu nguồn, thiếu invoice, outcome chưa rõ, thanh toán một phần, discrepancy, trùng transaction, sai currency/provider/SKU/order, sai phép đối soát. Một reconciliation `TEST_ONLY` tính đúng 100.000 − 10.000 − 2.000 = 88.000 VND nhưng không nâng sang actuals; mọi actuals vẫn null.

Receipt: `receipt.json` trong cùng thư mục. Các số nêu trên là fixture local, không phải forecast đã duyệt, pipeline thật, hóa đơn, tiền thu, hoàn tiền hoặc doanh thu. External actions 0; HOLD live/thương mại không đổi.

**Việc tự động tiếp theo:** lập candidate matrix A02 theo ngành dưới dạng nháp local để chọn một ngành có nguồn/quyền/phạm vi rõ; chưa tạo claim sản phẩm hoặc mở bán.

## Vòng Codex — A01 delivery/recovery rehearsal + mapping recheck — 20/10/2026, 15:41 (UTC+7)

Source: `tranhatam-collab/ai.muonnoi.org` · remote `git@github.com:tranhatam-collab/ai.muonnoi.org.git` · nhánh `codex/ai-muonnoi-autonomous-ops` · HEAD `ed1df9a81f370520de40751b6bced933c34a06e5`. Năm tệp tracked dirty được giữ nguyên; không commit/push/deploy/DNS/secret/migration. Ngân sách 0 VND.

`VERIFIED_CURRENT` public HTTP: live domain SHA `984e4db6…525187`, Pages production SHA `f1d25e37…857216`, ops preview SHA `0edb5b54…135c85`; ba digest không đổi và live vẫn không khớp hai Pages deployment. Dashboard provider không recheck được vì máy đang khóa; không suy trạng thái provider mới. Receipt: `.local/continuous/mapping-recheck-20261020T1538/receipt.json`.

`VERIFIED_CURRENT` local: `.local/continuous/a01-delivery-recovery-20261020T1538/` đóng gói 8 file A01, 36.076 bytes, theo manifest SHA-256 `c1d7fefc…84362`, rồi xác minh bản recovery cách ly có cùng file count/bytes/digest. Test exit 0 với 10 checks; từ chối 7 failure path: trusted manifest sai, file bị sửa, file thiếu, file thừa, symlink, hardlink và path manifest không an toàn. Receipt: `receipt.json` trong cùng thư mục.

Giới hạn: đây là copy/restore hư cấu local, không phải backup/restore production, giao hàng, acceptance, approval pháp lý hoặc revenue. External actions 0; actuals null; HOLD live/thương mại không đổi.

**Việc tự động tiếp theo:** tạo A01 measurement/reconciliation rehearsal tách target, pipeline, invoiced, paid, refunds, fees và collected cash; mọi nguồn thiếu giữ null.

## Vòng Codex — A01 entitlement/revoke rehearsal — 20/10/2026, 14:48 (UTC+7)

Source: `tranhatam-collab/ai.muonnoi.org` · remote `git@github.com:tranhatam-collab/ai.muonnoi.org.git` · nhánh `codex/ai-muonnoi-autonomous-ops` · HEAD `ed1df9a81f370520de40751b6bced933c34a06e5`. Năm tệp tracked dirty được giữ nguyên; không commit/push/deploy/DNS/secret/migration. Ngân sách 0 VND.

`VERIFIED_CURRENT` local: `.local/continuous/a01-entitlement-20261020T1450/` chứa state machine entitlement/revoke hư cấu, gắn đúng receipt bundle A01. Test exit 0 với **24 checks**: mặc định từ chối khi chưa có entitlement; chặn receipt bundle sai, actor/SKU/environment sai, trước hạn và hết hạn; chỉ trả `TEST_ALLOW` trong cửa sổ hợp lệ; thu hồi xong chặn dùng lại; không tái sử dụng entitlement ID; lặp đúng revocation receipt là idempotent và receipt khác bị xung đột. Mọi nhánh đều `commercial_effect=false`, external actions 0, actuals null.

Receipt: `.local/continuous/a01-entitlement-20261020T1450/receipt.json`. Đây chỉ là rehearsal trong bộ nhớ local, không tạo đơn hàng, quyền khách thật, giao hàng, chấp thuận, approval pháp lý hoặc doanh thu. HOLD live/thương mại không đổi.

**Việc tự động tiếp theo:** tạo rehearsal A01 delivery/recovery có manifest khóa digest và phủ failure path; staging remote vẫn bỏ qua cho tới khi có đúng account Cloudflare Free.

## Vòng Codex — validator A01 tái lập — 20/10/2026, 14:44 (UTC+7)

Source: `tranhatam-collab/ai.muonnoi.org` · nhánh `codex/ai-muonnoi-autonomous-ops` · HEAD `ed1df9a81f370520de40751b6bced933c34a06e5`. Năm tệp tracked dirty được giữ nguyên; không commit/push/deploy/DNS/secret/migration. Ngân sách 0 VND.

`VERIFIED_CURRENT` local: `.local/continuous/a01-validator-20261020T1440/validate.mjs` kiểm receipt theo digest tin cậy, ba artifact A01, ba artifact nguồn, cấu trúc 30 prompt/30 ngày/12 quy trình/30 đầu ra/6 bảng, license gate và mọi actuals null. Positive probe exit 0. Negative probe đổi một giá trị trong `practice-30.json` bị từ chối với exit 1, mã `ARTIFACT_DIGEST_MISMATCH`. Receipt: `.local/continuous/a01-validator-20261020T1440/receipt.json`; validator SHA-256 `69f40f53…3dd8`.

Giới hạn: validator và receipt đều nằm trong `.local`, chỉ chứng minh toàn vẹn/cấu trúc bundle local tại HEAD nêu trên. Đây không phải sale, delivery, deployment, approval hoặc revenue. Actuals null; HOLD live/thương mại không đổi.

**Việc tự động tiếp theo:** tạo fixture entitlement/revoke local có deny-by-default và receipt thu hồi; bỏ qua staging remote cho tới khi có đúng account Cloudflare Free.

## Vòng Codex — A01 30 ngày + provider recheck — 20/10/2026, 14:36 (UTC+7)

Source: `tranhatam-collab/ai.muonnoi.org` · remote `git@github.com:tranhatam-collab/ai.muonnoi.org.git` · nhánh `codex/ai-muonnoi-autonomous-ops` · HEAD `ed1df9a81f370520de40751b6bced933c34a06e5` (ahead 14). Ba tệp Pilot dirty được giữ nguyên; không commit/push/deploy/DNS/secret/migration. Ngân sách 0 VND.

| Việc | Trạng thái | Evidence |
|---|---|---|
| A01 thực hành | `VERIFIED_CURRENT` local | `.local/continuous/a01-practice-20261020T1432/practice-30.json`: 30 ngày duy nhất, 30 đầu ra, phủ P01–P12; mọi actuals null |
| A01 bảng mẫu | `VERIFIED_CURRENT` local | 6 schema bảng: nguồn, lịch, claim, quyền, manifest và ledger; external actions 0 |
| A01 license | `DRAFT_NOT_FOR_SALE` | Điều khoản còn để mở bên bán, user/term, giá, hoàn tiền, support và pháp lý; chưa cấp quyền thương mại |
| Receipt A01 | `VERIFIED_CURRENT` local | `receipt.json` SHA-256 `c880706d…d77b60`; verifier đọc lại hash cả ba artifact: OK |
| Cloudflare account hiện tại | `VERIFIED_CURRENT` provider | Account `93112…2ba3` vẫn **Paid current plan**; không dùng làm staging 0 đồng; account Free riêng vẫn chưa được cung cấp |
| Pages production | `VERIFIED_CURRENT` provider | `feat/flow-mvp-backend` · `65d8737` · deployment `a6623203-b04e-46c2-852c-6a41eee99fe0` |
| Preview nhánh ops | `VERIFIED_CURRENT` provider | Vẫn dừng tại `6252af1` · deployment `7e579cd6-bd4a-4db8-9060-98668a1d5105`; HEAD hiện tại chưa deploy |
| Custom domain | `CONTRADICTED` với Pages mapping | Dashboard Pages vẫn ghi `ai.muonnoi.org` `Inactive`; HTTP body domain SHA `984e4db6…525187` không khớp production Pages hoặc preview ops |
| Lane khác | Bảo toàn | Dashboard có `claude/money-engine-draft` `6601571`, `No deployment available`; không đọc sâu, không chỉnh |

Provider receipt: `.local/continuous/provider-recheck-20261020T1436/receipt.json`. Ba public body SHA/byte không đổi so với probe 19/10. Workers AI vẫn là provider đã chọn nhưng binding chưa bật. Actuals null; chưa có sale, delivery hoặc revenue đã đối soát.

**Việc tự động tiếp theo:** tạo validator tái lập cho bundle A01 hoặc fixture entitlement/revoke local; bỏ qua staging remote cho tới khi có đúng account Free. HOLD live/thương mại không đổi.

## Vòng giờ Cursor — A01 30 prompt skeleton — 20/10/2026, 13:47 (UTC+7)

Source: `tranhatam-collab/ai.muonnoi.org` · `codex/ai-muonnoi-autonomous-ops` · HEAD `0e2e380` (ahead 13 trước commit). Tick `AGENT_LOOP_TICK_muonnoi_hourly` `2026-10-20T06:47:00Z`. Loop PID **31600**. 0 VND. Không deploy/DNS/push. Ba tệp Pilot dirty bảo toàn.

| Việc | Trạng thái | Evidence |
|---|---|---|
| A01 prompts | `VERIFIED_WORKTREE_ONLY` | `.local/continuous/a01-prep-20261019T1226/prompts-30.json` — **30/30** skeleton; SHA `32edef12…18ab9c` |
| A01 free sample HTML | `VERIFIED_WORKTREE_ONLY` | `free-sample.html` — local fixture; `DRAFT_NOT_FOR_SALE`; không publish |
| Outline counts | Cập nhật | processes 12 · prompts 30 · free_sample 1 · practice_days **0/30** |
| Commercial | HOLD | Không bán; không hứa thu nhập |

**Việc tự động tiếp theo:** skeleton 30 ngày thực hành A01 + license draft dưới `.local`; hoặc revalidate domain probe. Không chờ Founder.

## Vòng tự động — Founder chỉ duyệt · probe + A01 outline — 19/10/2026, 19:25 (UTC+7)

Source: `tranhatam-collab/ai.muonnoi.org` · `codex/ai-muonnoi-autonomous-ops` · HEAD `6f29c4d` (ahead 12 trước commit). Founder: **chỉ phê duyệt, không bị giao việc**. Loop PID **57320** còn chạy. 0 VND. Không deploy/DNS/push.

| Việc | Trạng thái | Evidence |
|---|---|---|
| Policy Founder-only | `VERIFIED_WORKTREE_ONLY` | `docs/FOUNDER_APPROVAL_ONLY.md` + cập nhật `CONTINUOUS_AUTONOMOUS_OPS` |
| Domain probe | `VERIFIED_CURRENT` | HTTP/2 200; body SHA `984e4db6…525187` **UNCHANGED**; A `104.21.93.187`; CSP `script-src 'self'`; receipt `.local/continuous/domain-probe-20261019T122537Z/` |
| Domain = Pages ops | `CONTRADICTED` | Không đổi so với audit trước; không Reactivate DNS |
| A01 prep | `VERIFIED_WORKTREE_ONLY` | Outline 12 quy trình local; prompts 0/30; `DRAFT_NOT_FOR_SALE` |
| Pilot dirty | Bảo toàn | Chờ `AP-PILOT-DIRTY` — AI không nhờ Founder sửa code |

**Việc tự động tiếp theo:** điền 30 prompt skeleton A01 + mẫu miễn phí HTML dưới `.local` (không publish); hoặc thêm test fixture A01 inventory. Không chờ Founder.

## Vòng tự động — 100% nội bộ + baseline Pilot dirty — 19/10/2026, 18:18 (UTC+7)

Source: remote `git@github.com:tranhatam-collab/ai.muonnoi.org.git`, nhánh `codex/ai-muonnoi-autonomous-ops`, HEAD `b1152f7` (ahead 11 trước commit vòng này). Founder yêu cầu **tất cả 100% tự động**. 0 VND. Không deploy/DNS/push.

| Việc | Trạng thái | Evidence |
|---|---|---|
| Loop cũ PID 16445 | `aborted` | terminal 642408 — không còn tick sau `09:55:43Z` |
| Loop monitored mới | `ACTIVE` | PID **57320** · sentinel `AGENT_LOOP_TICK_muonnoi_hourly` · tick đầu ~1h sau 18:18 VN |
| Automation Glass | Form mở | Founder bật một lần để lịch bền ngoài phiên chat |
| Baseline 3 tệp Pilot dirty | `VERIFIED_WORKTREE_ONLY` | `.local/continuous/pilot-dirty-baseline-20261019T111829Z/` — SHA-256 từng file; `node --test` **8/8 pass**, 0 fail; `committed=false` |
| Code dirty | Bảo toàn | Không commit `pilot-revise` / tests cho đến khi Founder duyệt |

Actuals null. HOLD live không đổi. Portfolio vẫn chờ `AP-*`.

**Việc tự động tiếp theo:** revalidate probe domain đọc-only (HTTP/DNS/CSP) và ghi receipt; hoặc chuẩn bị A01 nội dung fixture dưới 0 VND. Không hỏi Founder từng giờ.

## Vòng giờ Cursor — hàng đợi Sóng 0 trong CONTINUOUS_OPS — 19/10/2026, 16:55 (UTC+7)

Source: remote `git@github.com:tranhatam-collab/ai.muonnoi.org.git`, nhánh `codex/ai-muonnoi-autonomous-ops`, HEAD `2d4e7d9` (ahead 10 trước commit vòng này). Ba tệp dirty Pilot bảo toàn. Tick `AGENT_LOOP_TICK_muonnoi_hourly` lúc `2026-10-19T09:55:43Z`. Loop PID 16445 còn chạy. 0 VND. Không deploy/DNS/remote.

`VERIFIED_WORKTREE_ONLY`: cập nhật `docs/CONTINUOUS_AUTONOMOUS_OPS.md` §3 — bảng trạng thái Sóng 0 (0a–0c xong local/draft; mục 1 dirty Pilot; mục 4 BLOCKED Free account; quy tắc chọn việc mỗi giờ). Actuals null. HOLD không đổi. Portfolio vẫn `DRAFT_AWAITING_FOUNDER_APPROVAL`.

**Việc tự động tiếp theo:** đóng gói 3 tệp Pilot dirty thành baseline review có hash (không commit code), hoặc revalidate probe domain đọc-only. Không chờ Founder nếu còn việc an toàn.

## Vòng giờ Cursor — gắn staging vào Sóng 0 — 19/10/2026, 15:56 (UTC+7)

Source: remote `git@github.com:tranhatam-collab/ai.muonnoi.org.git`, nhánh `codex/ai-muonnoi-autonomous-ops`, HEAD `296d746` (ahead 8 trước commit vòng này). Ba tệp dirty implementation/test bảo toàn. Tick `AGENT_LOOP_TICK_muonnoi_hourly` lúc `2026-10-19T08:55:43Z`. 0 VND. Không deploy/DNS/remote.

`VERIFIED_WORKTREE_ONLY`: cập nhật `docs/PRODUCT_PORTFOLIO_1_TO_3_YEARS_FOUNDER_APPROVAL.md` mục Sóng 0 — đánh dấu staging kit local + checklist `docs/STAGING_KIT_CHECKLIST.md` đã có; giữ mục remote Free account / merchant / kênh / người là chờ Founder; thêm câu truy vết mọi SKU phụ thuộc Sóng 0. Actuals null. HOLD không đổi.

**Việc tự động tiếp theo:** củng cố 3 tệp Pilot dirty thành gói review có hash mới (không commit code trừ khi Founder duyệt), hoặc thêm mục Sóng 0 vào `CONTINUOUS_AUTONOMOUS_OPS.md` hàng đợi. Không chờ Founder nếu còn việc docs/test an toàn.

## Vòng giờ Cursor — staging checklist — 19/10/2026, 14:56 (UTC+7)

Source: remote `git@github.com:tranhatam-collab/ai.muonnoi.org.git`, nhánh `codex/ai-muonnoi-autonomous-ops`, worktree `/private/tmp/ai-muonnoi-autonomous-ops`, HEAD `555e32acbbc82222ab9a7a0d516a7c4d59cba24e` (ahead 7). Ba tệp dirty implementation/test được bảo toàn. Tick `AGENT_LOOP_TICK_muonnoi_hourly` lúc `2026-10-19T07:55:43Z`. Ngân sách 0 VND. Không deploy/DNS/remote.

| Lớp | Trạng thái | Receipt |
|---|---|---|
| Checklist staging | `VERIFIED_WORKTREE_ONLY` | `docs/STAGING_KIT_CHECKLIST.md` — bước A local xong; bước B chờ Free account ID |
| Bundle local | `VERIFIED_CURRENT` | `npm run prepare:intake:staging` exit 0; `account_id=__CLOUDFLARE_FREE_ACCOUNT_ID_REQUIRED__`; `database_id=__SEPARATE_STAGING_D1_ID_REQUIRED__`; không chứa production D1 |
| Test | `VERIFIED_CURRENT` | `npm run test:intake:staging` **3/3 pass**, 0 fail/cancelled/skipped/TODO |
| Remote | `BLOCKED` | Chưa có Free account ID; `remote_applied=false` |

Receipt: `.local/continuous/staging-checklist-20261019T145626/receipt.json`. Actuals null. External actions 0. HOLD live không đổi.

**Việc tự động tiếp theo:** gắn checklist staging vào `PRODUCT_PORTFOLIO` Sóng 0 (một đoạn truy vết); hoặc củng cố test Pilot còn dirty thành baseline review khi Founder chưa duyệt commit riêng. Không chờ Founder nếu còn việc nội bộ.

## Thuyết minh danh mục 1–3 năm chờ duyệt — 19/10/2026, 14:32 (UTC+7)

Đã tạo `docs/PRODUCT_PORTFOLIO_1_TO_3_YEARS_FOUNDER_APPROVAL.md`: 4 offer Studio + 10 Agent A01–A10, mỗi dòng độc lập/tự chủ, kế hoạch chuẩn bị hoàn hảo trước mở bán, lộ trình 1–3 năm. Trạng thái `DRAFT_AWAITING_FOUNDER_APPROVAL`. Giá và target là đề xuất; actuals null; HOLD live. AI tiếp tục chuẩn bị nội bộ dưới 0 VND theo CONTINUOUS_AUTONOMOUS_OPS; không chờ duyệt từng giờ.

## Kế hoạch liên tục + đối chiếu DNS/HTTP — 19/10/2026, 13:54 (UTC+7)

Phạm vi: remote `git@github.com:tranhatam-collab/ai.muonnoi.org.git`, nhánh `codex/ai-muonnoi-autonomous-ops`, worktree `/private/tmp/ai-muonnoi-autonomous-ops`, HEAD `a7aba972742d5931214e10ee053279b7efc0c1f8` (ahead 4). Bảo toàn thay đổi dirty trước đó. Ngân sách 0 VND. Không deploy, không Reactivate DNS, không push.

**Verdict vận hành:** lịch Codex mỗi giờ vẫn `ACTIVE` nhưng lần gọi gần nhất `2026-10-19T05:58:24Z` (12:58 VN) vẫn `usage_limit_exceeded`. Đã lập kế hoạch tự động liên tục tại `docs/CONTINUOUS_AUTONOMOUS_OPS.md`. Đã mở form Automation Glass trong Cursor để Founder bật lịch bền ngoài phiên chat. Đã bật loop cục bộ mỗi 3600 giây trong phiên này (`AGENT_LOOP_TICK_muonnoi_hourly`).

| Claim | Trạng thái | Evidence |
|---|---|---|
| DNS A `ai.muonnoi.org` | `VERIFIED_CURRENT` | dig @1.1.1.1: `104.21.93.187`, `172.67.214.1`, TTL 300; NS zone `davina/justin.ns.cloudflare.com` |
| CNAME `ai.muonnoi.org` | `VERIFIED_CURRENT` | dig +short CNAME trống; không có answer CNAME trong probe |
| HTTP live domain | `VERIFIED_CURRENT` | `https://ai.muonnoi.org/` HTTP/2 200, title `AI Muôn Nơi — Công cụ AI cho cộng đồng người Việt`, body SHA-256 `984e4db663f1e0f57786c81a2959a447a56ecefccc127ea9a1fa2cd37b525187`, 15971 bytes, `server: cloudflare`, `cf-cache-status: DYNAMIC` |
| Preview ops `7e579cd6` / alias nhánh | `VERIFIED_CURRENT` | Cùng title `Nhà Chung | Viết và chia sẻ điều có giá trị`, cùng body SHA-256 `0edb5b54c59a892e1c22ee3c55c334f614fb21e7adf4de8dec5d76a0a4135c85` |
| Pages production row `a6623203` | `VERIFIED_CURRENT` | Title khác: `Nhà Chung | Nơi cộng đồng và AI cùng nhìn rõ vấn đề hơn`, body SHA-256 `f1d25e3709ac79d4763acaf17e65e78bc2c879f07d5a200470c6b88067857216` |
| Domain = Pages deployment đã audit | `CONTRADICTED` | Body/title domain **không khớp** preview ops lẫn production row Pages. Pages từng ghi custom domain Inactive vẫn tương thích với việc traffic domain đi đường khác trong Cloudflare; chưa khóa Worker/route/project nào đang phục vụ |
| Staging/Free/merchant | `BLOCKED` | Chưa có account Free ID, Access identity, merchant, kênh |

Receipt: `.local/continuous/dns-route-20261019T135354/compare-receipt.json` và `probes.txt`. HTTP 200 không chứng minh Studio/API/auth. Actuals null. External actions 0.

**Đã làm tiếp ngay trong cùng giờ:** đóng gói 3 tệp dirty còn lại (`tests/pilot-revise.test.mjs`, `tests/static.test.mjs`, `tools/pilot-revise.mjs`) tại `.local/continuous/dirty-baseline-20261019T135535/`, diff SHA-256 `fb6c80c6c2c06fb2538fb133510008584692a32b93ff194f5f73ce807d288e8f` (khớp gói review-FgQEvy trước đó), suite liên quan 16/16 pass. Loop hàng giờ Cursor đã được phê duyệt và đang chạy (PID 16445), tick đầu sau ~60 phút.

**Việc tự động tiếp theo (không chờ Founder):** viết checklist staging kit đọc-only từ placeholder `__CLOUDFLARE_FREE_ACCOUNT_ID_REQUIRED__`; giữ dirty chưa commit cho đến khi Founder phê duyệt commit riêng; mỗi giờ loop chọn việc nội bộ tiếp theo.

**Chỉ cần Founder khi:** bật Automation Glass (form đã mở), cấp account ID Cloudflare Free / Access / merchant / kênh, hoặc phê duyệt commit/push/deploy. Không cần trả lời để AI tiếp tục việc nội bộ.

## Replay gói review từ HEAD — 18/10/2026, 15:31 (UTC+7)

Đã xác minh lại remote `git@github.com:tranhatam-collab/ai.muonnoi.org.git`, nhánh `codex/ai-muonnoi-autonomous-ops`, HEAD `a7aba972742d5931214e10ee053279b7efc0c1f8`; bốn tệp dirty giữ nguyên. Trích đúng ba file gốc từ HEAD vào thư mục biệt lập `/private/tmp/ai-muonnoi-patch-replay-DiDtzX`, xác minh hash patch đã lưu rồi apply check và apply tại bản sao: cả hai exit 0. Ba file sau replay khớp hash worktree trong receipt; cả ba đạt `node --check`.

Receipt `.local/review-packages/review-FgQEvy/replay-receipt.json`. Phạm vi `VERIFIED_CURRENT` là tái tạo ba file từ baseline + patch và kiểm cú pháp; không phải full test trên checkout độc lập hoặc receipt deploy. Không sửa lane team, staging config hay dữ liệu cũ. Provider/preview/mapping không được kiểm lại vòng này; giữ nguyên thời điểm receipt trước. Actuals null, external actions 0, HOLD không đổi.

Bước tiếp theo: đối chiếu DNS/route phía provider để khóa origin thực tế, trước khi chuẩn bị phát hành; gói patch hiện đã có evidence tái tạo độc lập để review.

## Gói diff review và DNS — 18/10/2026, 14:23 (UTC+7)

Repo/remote/nhánh/HEAD không đổi; bảo toàn bốn tệp dirty. DNS đọc ngoài sandbox trả A `104.21.93.187`, `172.67.214.1`, TTL 300; truy vấn CNAME không có answer. Kết quả này không xác định origin/deployment sau proxy và không tự bác bỏ trạng thái Pages Inactive đã quan sát. Preview/provider chưa đọc lại vòng này.

Đã đóng gói ba tệp implementation/test thay đổi thành `.local/review-packages/review-FgQEvy/implementation.patch`, SHA-256 `fb6c80c6c2c06fb2538fb133510008584692a32b93ff194f5f73ce807d288e8f`. Receipt cùng thư mục lưu base HEAD `a7aba972742d5931214e10ee053279b7efc0c1f8` và hash từng tệp. `git apply --reverse --check` exit 0, chỉ kiểm không sửa worktree. Gói không bao gồm runbook hoặc bốn commit local trước baseline.

Năm suite liên quan chạy cùng nhau: exit 0, 35 tests / 35 pass / 0 fail / 0 cancelled / 0 skipped / 0 TODO. Đây là gói review local, không phải commit, approval hay deploy; actuals null. Giữ HOLD. Bước tiếp theo: đối chiếu origin bằng cấu hình DNS/route provider đọc-only và kiểm baseline candidate trước bất kỳ phát hành nào.

## Xác minh build preview và biên artifact — 18/10/2026, 13:21 (UTC+7)

Cùng HEAD `a7aba972742d5931214e10ee053279b7efc0c1f8`, remote và nhánh ops như dưới; bảo toàn ba tệp dirty trước vòng. `VERIFIED_CURRENT` provider cho **preview lịch sử** `7e579cd6-bd4a-4db8-9060-98668a1d5105`: Dashboard Details báo success, source `6252af1cf2f4b6e13fbd73e29e2a5dee38360535`, build 17/10 04:02 UTC, 14 giây. Log đọc được: output `dist/site`, 43 tệp curated, upload 42 assets, một header rule, không có Functions. Không phải deployment của HEAD/worktree hiện tại; không nâng gate production hoặc custom domain.

`VERIFIED_WORKTREE_ONLY`: tăng kiểm tra static để duyệt cây tệp artifact thực tế, từ chối symlink và đối chiếu toàn bộ file với manifest; trước đây chỉ kiểm danh sách manifest và một phần thư mục. Build local tạo 43 tệp; static/login tests 3/3 pass, fail/cancelled/skipped/TODO 0. Negative probe chèn một tệp hư cấu ngoài danh sách làm test thất bại đúng assertion (exit 1); đã dọn đúng probe và chạy lại 3/3 pass. Không deploy, không gửi dữ liệu, actuals null.

Giữ HOLD: account Free, nguồn giao dịch, mapping domain và các gate live chưa đủ. Bước tiếp theo là kiểm mapping domain bằng nguồn DNS/provider hiện tại, sau đó gom thay đổi local đã kiểm chứng thành baseline review được; không coi build xanh là nghiệm thu.

## HTTP live và chuỗi revision — 18/10/2026, 12:16 (UTC+7)

**HOLD; chưa chứng minh domain ngừng phục vụ.** HEAD/remote/nhánh không đổi (`a7aba972742d5931214e10ee053279b7efc0c1f8`, `tranhatam-collab/ai.muonnoi.org`, `codex/ai-muonnoi-autonomous-ops`); ba tệp dirty được bảo toàn. `curl -I --max-time 20 https://ai.muonnoi.org` ngoài sandbox trả exit 0, HTTP/2 200, HTML, thời điểm response 05:16:06 GMT, CF-Ray `a4c511a979c009dc-HKG`. Lần chạy trong sandbox exit 6 không được dùng làm bằng chứng DNS production hỏng. HTTP 200 không chứng minh luồng ứng dụng hay mapping đúng deployment; trạng thái Pages Inactive ở vòng trước chưa đủ kết luận outage. CSP response vẫn `script-src 'self'`.

`VERIFIED_WORKTREE_ONLY`: thêm ca hai revision liên tiếp, kiểm digest candidate mới thay giá trị cũ, revision_of trỏ đúng parent trực tiếp, nội dung sửa ở vòng đầu và acceptance trống được giữ. Ba suite revise/review/handoff exit 0: **32 tests / 32 pass / 0 fail / 0 cancelled / 0 skipped / 0 TODO**. Chưa commit/push/deploy; actuals null.

Việc tiếp theo: đọc chi tiết build preview và kiểm chứng mapping domain tại provider, không sửa DNS/Reactivate khi nguyên nhân chưa rõ. Không tạo thêm lịch hoặc dùng HTTP 200 để đóng gate live.

## Provider và provenance revision — 18/10/2026, 10:33 (UTC+7)

**HOLD: Cloudflare Pages hiển thị custom domain `ai.muonnoi.org` là `Inactive`.** Đây là trạng thái provider đọc trực tiếp tại tab Custom domains của project `ai-muonnoi-org`, account `93112cc89181e75335cbd7ef7e392ba3`; chưa kiểm DNS hoặc HTTP live nên chưa kết luận nguyên nhân hay phạm vi gián đoạn. Không bấm Reactivate, không sửa DNS.

`VERIFIED_CURRENT` provider: production vẫn nhánh `feat/flow-mvp-backend`, commit `65d873734495297aa23461d81f90231abcb82bc5`, deployment `a6623203-b04e-46c2-852c-6a41eee99fe0`. Preview đầu danh sách của nhánh ops là commit `6252af1cf2f4b6e13fbd73e29e2a5dee38360535`, deployment `7e579cd6-bd4a-4db8-9060-98668a1d5105`, URL `https://7e579cd6.ai-muonnoi-org.pages.dev`. Không suy ra build thành công từ việc có URL; chưa mở trang chi tiết build. Dashboard đọc được, tab cũ biến mất không phải bằng chứng mất đăng nhập.

`VERIFIED_WORKTREE_ONLY`: bổ sung `candidate_manifest_sha256` vào manifest và receipt của revision để truy ngược đúng candidate đã cung cấp byte sửa đổi, bên cạnh baseline digest. Giữ nguyên snapshot lịch sử và các thay đổi dirty trước đó. Baseline repo/nhánh như trên: HEAD `a7aba972742d5931214e10ee053279b7efc0c1f8`. Chưa commit/push/deploy.

Kiểm thử ba suite revise/review/handoff: exit 0, 31 tests / 31 pass / 0 fail / 0 cancelled / 0 skipped / 0 TODO. Bổ sung assertion provenance vào ca sửa draft; nghiệm thu và actuals vẫn không được tạo. Việc tiếp theo: đọc chi tiết build preview và kiểm DNS/HTTP domain để phân biệt mapping provider với live; tiếp tục chờ account Free và nguồn đối soát.

## Diễn tập khôi phục local — 18/10/2026, 09:25 (UTC+7)

Repo/remote/nhánh giữ nguyên như mục dưới; HEAD `a7aba972742d5931214e10ee053279b7efc0c1f8`, hai tệp dirty được bảo toàn. Đã đóng gói snapshot `pilot-QuFMm1` thành tar, lưu digest riêng, giải nén sang thư mục mới và kiểm toàn vẹn bằng manifest digest của receipt trước. Kết quả `VERIFIED_CURRENT` chỉ trong local: 20 tệp/12 nội dung khớp; handoff vẫn `REVIEW_REQUIRED`; bản sao thử bị sửa nội dung bị từ chối; nguồn gốc kiểm lại không đổi. Lệnh Node với tar tạo/giải nén và hai verifier hiện có exit 0. Không có tác động bên ngoài, actuals null.

Receipt: `.local/pilot-recovery/restore-4tX11z/receipt.json`. Archive SHA-256 `5c25409fdad57d826d3a04753aa158da19b4beab9260dafffbf444f6796d1621`. Đây là khôi phục trên cùng máy trong thư mục tạm, **chưa chứng minh backup ngoài máy hoặc DR production**.

Inventory trình duyệt hiện tại không có tab nào trong in-app browser; preview và mapping production chưa được xác minh lại (`NOT_CHECKED`). Giữ HOLD và blocker account Free/kênh bán/đối soát. Bước tiếp theo: xác minh provider bằng Dashboard đọc-only và chuẩn bị nơi lưu backup ngoài thư mục tạm khi điểm đến được xác định; không coi archive local là đã đóng gate backup production.

## Receipt rehearsal lưu trên đĩa — 18/10/2026, 08:32 (UTC+7)

Cùng repo/nhánh và HEAD `a7aba972742d5931214e10ee053279b7efc0c1f8`; worktree DIRTY với hai tệp của vòng trước, được bảo toàn. Đã tạo mới bộ mẫu hư cấu bằng CLI hiện có, không thay snapshot lịch sử. Artifact `.local/pilot-deliveries/pilot-QuFMm1`: 20 tệp, 12 nội dung; manifest SHA-256 `1fa88a9c9dcc83e7eba46e6af893350ad6791646421e8b2df82f32c433cd4381`. Kiểm lại toàn vẹn sau khi tạo handoff đạt `VERIFIED_LOCAL_INTEGRITY_ONLY` (exit 0).

Receipt `.local/pilot-handoffs/handoff-bTEBKR/receipt.json`, SHA-256 `444b3c198f0f8a82b7fda6b2cff00e07b299a3bdb51dbaa90c22c0833816e73f`; `run-receipt.json` lưu thời điểm, đường dẫn, digest độc lập và kết quả kiểm lại. Handoff xác minh 12 nội dung + 4 tài liệu hỗ trợ, vẫn `REVIEW_REQUIRED`, external actions 0 và toàn bộ actuals null. Các tệp local nằm trong thư mục tạm của máy, chưa phải backup bền vững hoặc bàn giao khách hàng.

Không kiểm lại provider/live ở vòng này; không nâng receipt production lịch sử thành hiện hành. Giữ HOLD và các blocker tài khoản Free/kênh bán/đối soát đã ghi. Việc tiếp theo: kiểm chứng sao lưu–khôi phục bộ rehearsal bằng digest đã lưu, trước khi tuyên bố khả năng hồi phục.

## Kiểm chứng nối snapshot sửa đổi với handoff — 18/10/2026

Baseline `a7aba972742d5931214e10ee053279b7efc0c1f8`, remote `git@github.com:tranhatam-collab/ai.muonnoi.org.git`, nhánh `codex/ai-muonnoi-autonomous-ops`, worktree `/private/tmp/ai-muonnoi-autonomous-ops`. Thay đổi vòng này chỉ ở test và runbook, chưa commit/push/deploy.

- `VERIFIED_WORKTREE_ONLY`: thêm kiểm thử tích hợp sửa draft → snapshot mới → bản sao nguyên byte → so sánh → handoff. Cả 16 comment và ba file hồ sơ đều `UNCHANGED`; handoff vẫn `REVIEW_REQUIRED`. Digest hoặc manifest reference của bản cũ đều bị từ chối; acceptance cũ giữ nguyên byte, actuals null, external actions 0.
- `VERIFIED_CURRENT` ở local: `node --test tests/pilot-revise.test.mjs tests/pilot-review.test.mjs tests/pilot-handoff.test.mjs`, exit 0, **31 tests / 31 pass / 0 fail / 0 cancelled / 0 skipped / 0 TODO**. Fixture hư cấu được tạo rồi dọn bởi test; đây không phải receipt bàn giao khách hàng. Không chạy lại full verify vì chỉ thêm test tích hợp.
- `NOT_CHECKED` hiện tại: preview, mapping production và trạng thái quota lịch. Tab Dashboard cũ không còn tìm thấy; các thông tin provider và lỗi quota trong mục 17/10 là receipt lịch sử, không phải xác nhận hiện hành.
- `BLOCKED`: chưa có tài khoản Cloudflare Free được chỉ định, tài khoản bán và nguồn đối soát. Giữ HOLD cho live, actuals null và ngân sách 0 đồng.

Việc tiếp theo: tạo gói rehearsal bền vững kèm digest độc lập và receipt có thể kiểm lại; xác minh provider bằng phiên đọc hợp lệ khi có. Không dùng kết quả kiểm thử để suy ra nghiệm thu hoặc doanh thu.

## Vòng cắt snapshot từ comment byte — 17/10/2026, 23:12 (UTC+7)

Phạm vi: repo `tranhatam-collab/ai.muonnoi.org`, remote `git@github.com:tranhatam-collab/ai.muonnoi.org.git`, nhánh `codex/ai-muonnoi-autonomous-ops`, worktree `/private/tmp/ai-muonnoi-autonomous-ops`. Baseline đầu vòng **`1916fb2f2d3780bb60faaef9ba7300fb6df1db05`**. Code mới **`fc5ea26e0423e3b038c91f6445e31b35e9c5f683`**. Không deploy, không push, không đụng snapshot cũ.

**Blocker hiện hành:** lịch Codex mỗi giờ vẫn `ACTIVE` trong file nhưng các nhịp 12:03, 13:05 và 14:11 dừng vì `usage_limit_exceeded`; Codex báo thử lại 08:02 ngày 24/10/2026. Chưa có account ID Cloudflare Free, kênh bán hay nguồn đối soát. Actuals giữ `null`. Hạn mức chi thêm 0 VND.

| Lớp | Trạng thái | Receipt |
|---|---|---|
| Snapshot mới từ comment | `VERIFIED_CURRENT` | `tools/pilot-revise.mjs` chỉ sao các file được comment `BYTE_CHANGED` sang thư mục mới. `acceptance.json` và `metrics.json` không lấy từ bản candidate. Không có thay đổi byte thì không tạo snapshot. |
| Acceptance bản cũ | `VERIFIED_CURRENT` | Byte `acceptance.json` của snapshot cũ giữ nguyên trước và sau lệnh. Đối chiếu lại trả `REVIEW_COMMENTS_ONLY`, `acceptance_created: false`, actuals null. |
| Kiểm thử | `VERIFIED_CURRENT` | `npm run verify` exit 0 lúc 23:12. Suite `test:pilot:revise` là **4 tests / 4 pass / 0 fail, cancelled, skipped, TODO**. Tổng **166 tests / 166 pass / 0 fail, cancelled, skipped, TODO**, bằng 162 ca vòng trước cộng 4 ca mới. Build static 43 file. Worker build là dry-run. |
| Production | `BLOCKED` | Không tạo deployment. Pages production vẫn `feat/flow-mvp-backend`, row `65d8737`. |

Lệnh: `npm run revise:pilot:snapshot -- BASELINE_DIR BASELINE_SHA256 CANDIDATE_DIR CANDIDATE_SHA256`. Snapshot mới nằm trong `.local/pilot-deliveries/`. Receipt nằm trong `.local/pilot-revisions/`, không vào Git. Đây là mẫu hư cấu, chưa nghiệm thu, chưa đăng và chưa có tiền.

**Việc tự động tiếp theo:** đối chiếu snapshot mới với một bản sao nguyên byte để mọi comment trở lại `UNCHANGED`, và gắn digest mới vào hồ sơ handoff local mà không tạo acceptance. Không tạo lịch Codex trùng. Không push vòng này.

## Vòng so sánh phiên bản bàn giao — 17/10/2026, 21:49 (UTC+7)

Phạm vi: repo `tranhatam-collab/ai.muonnoi.org`, remote `git@github.com:tranhatam-collab/ai.muonnoi.org.git`, nhánh `codex/ai-muonnoi-autonomous-ops`, worktree `/private/tmp/ai-muonnoi-autonomous-ops`. Baseline đầu vòng **`6252af1cf2f4b6e13fbd73e29e2a5dee38360535`**, sạch. Code mới **`92515a1dff75e4fad1a30af265a006e45cdcd676`**. Phần này cập nhật việc tiếp theo; không sửa snapshot, handoff hay receipt lịch sử, không deploy và không push.

**Blocker hiện hành:** chưa có account ID Cloudflare Free riêng, staging/Access/D1/test identities, tài khoản/kênh bán hoặc nguồn giao dịch. Actuals tiếp tục `null`. Hạn mức chi thêm vẫn 0 VND. Không bật AI, social, checkout hay cron Worker.

| Lớp | Trạng thái | Receipt |
|---|---|---|
| So sánh hai phiên bản local | `VERIFIED_CURRENT` | `tools/pilot-review.mjs` kiểm toàn vẹn cả hai snapshot bằng digest độc lập, rồi xuất comment cho đúng 12 nội dung và 4 tài liệu hỗ trợ. `UNCHANGED` hoặc `BYTE_CHANGED`. Đổi mã asset bị từ chối. |
| Không tạo nghiệm thu | `VERIFIED_CURRENT` | `acceptance.json` và `metrics.json` phải giữ nguyên byte và còn trống. Approval gắn sẵn trong `review.json` bị từ chối. Kết quả là `REVIEW_COMMENTS_ONLY`, `acceptance_created: false`, actuals null, external actions 0. Không ghi ngược vào snapshot. |
| Kiểm thử | `VERIFIED_CURRENT` | `npm run verify` exit 0 lúc 21:49. Suite mới `test:pilot:review` là **7 tests / 7 pass / 0 fail, cancelled, skipped, TODO**. Tổng cộng từ các suite của lệnh verify: **162 tests / 162 pass / 0 fail, cancelled, skipped, TODO**, tức 155 ca của vòng handoff cộng 7 ca mới. Typecheck, build static 43 file và Worker dry-run đạt. Không có log GitHub CI. |
| Preview và production | `NOT_CHECKED` vòng này / `BLOCKED` production | Không tạo deployment mới. Receipt preview gần nhất vẫn là `470bd5d2-82d4-498d-9001-a3d54deba2c2` của baseline trước handoff. Pages production vẫn `feat/flow-mvp-backend`, row `65d8737`. |

Lệnh: `npm run compare:pilot:review -- BASELINE_DIR BASELINE_SHA256 CANDIDATE_DIR CANDIDATE_SHA256`. Cả hai thư mục phải nằm trong `.local/pilot-deliveries`. Output nằm ở `.local/pilot-reviews/`, không vào Git và không vào artifact Pages. Comment chỉ mô tả khác biệt byte của mẫu hư cấu; không phải duyệt chất lượng, chấp thuận khách, đăng bài hay thu tiền.

**Việc tự động tiếp theo:** tạo một snapshot phiên bản mới từ comment `BYTE_CHANGED` mà không sửa acceptance của snapshot cũ, rồi đối chiếu lại bằng cùng lệnh. Khi có account ID Cloudflare Free, kiểm plan/quota/quyền rồi mới chuẩn bị staging biệt lập. Không tạo lịch trùng với lịch Codex đang ACTIVE. Không push vòng này.

## Vòng nối hồ sơ với bộ bàn giao — 17/10/2026, 11:01 (UTC+7)

Phạm vi: repo `tranhatam-collab/ai.muonnoi.org`, remote `git@github.com:tranhatam-collab/ai.muonnoi.org.git`, nhánh `codex/ai-muonnoi-autonomous-ops`, worktree `/private/tmp/ai-muonnoi-autonomous-ops`. Baseline đầu vòng **`8ffa88a7cba211a3acf4ebcb712a1f6551f44f5f`**, sạch; code mới **`55761276c47a4ebcd803facf198c3e7231d5ce2a`**, sạch khi chạy CLI. Phần này cập nhật việc tiếp theo; giữ nguyên snapshot bàn giao và receipt lịch sử, không sửa checkout team.

**Blocker hiện hành:** chưa có account ID Cloudflare Free riêng, staging/Access/D1/test identities hoặc tài khoản/kênh bán và nguồn giao dịch được cấu hình. Chưa có tiền đã đối soát; các actuals tiếp tục `null`. Hạn mức chi thêm vẫn 0 VND, không bật AI/social hay ghi production.

| Lớp | Trạng thái | Receipt |
|---|---|---|
| Artifact và hồ sơ | `VERIFIED_CURRENT` | `tools/pilot-handoff.mjs` kiểm toàn vẹn snapshot bằng digest độc lập, hash workbook, rồi đối chiếu offer/brief/capacity/proposal/order/phiên bản/scope/tiền tệ/số tiền/vòng sửa/thời lượng/manifest. Bảng coverage gắn từng deliverable với hash tệp. |
| Phạm vi và review | `VERIFIED_CURRENT` | Đủ **12 nội dung chính + 4 tài liệu hỗ trợ**, không tính thành 16 nội dung bán. Snapshot giữ `NOT_REVIEWED`, phiếu fixture ở `REVIEWING` và đối soát `PENDING_RECONCILIATION`; checker không cho gán accepted, receipt cũ hoặc actuals vào bộ này. Giá và refs trong case đều là fixture, không phải đơn đã nhận. |
| Kiểm thử | `VERIFIED_CURRENT` | `npm run verify` exit 0: **155 tests / 155 pass / 0 fail, cancelled, skipped, TODO**; tăng 19 ca handoff. Typecheck/static build/Worker dry-run đạt. Log `.local/verify-handoff-2026-10-17.log`; artifact public vẫn 43 file, không chứa công cụ/operations/receipt local. |
| CLI và receipt | `VERIFIED_CURRENT` | Đã chạy CLI trên snapshot có sẵn, đọc lại receipt, kiểm SHA-256, rồi kiểm lại hồ sơ và coverage từ receipt đã lưu. Không thay byte hoặc trạng thái snapshot nguồn. Output `VERIFIED_LOCAL_LINKS_ONLY`, gate `REVIEW_REQUIRED`, external actions 0, actuals null. Đây chỉ là toàn vẹn và tính nhất quán local, chưa xác minh quyền/khách/receipt ngoài hệ thống. |
| Preview baseline | `VERIFIED_CURRENT` | Dashboard **`470bd5d2-82d4-498d-9001-a3d54deba2c2`**, success lúc 10:00 ngày 17/10, 16 giây; log clone đúng full SHA `8ffa88a7cba211a3acf4ebcb712a1f6551f44f5f`, output `dist/site`, 43 file/42 assets + header, không Functions. URL `https://470bd5d2.ai-muonnoi-org.pages.dev`. Receipt này thuộc baseline trước code handoff. |
| Production/provider | `BLOCKED` | Trang Pages hiện vẫn ghi production branch `feat/flow-mvp-backend`, row `65d8737`, URL `https://a6623203.ai-muonnoi-org.pages.dev`. Chưa đối chiếu được custom domain với Worker/D1 hiện hành; không đổi mapping, không deploy backend. |

Bảng đọc: `.local/pilot-handoffs/handoff-0Emvpz/README.md`; receipt: `.local/pilot-handoffs/handoff-0Emvpz/receipt.json`; digest **`29d34d3ddda81870139f8a663b76058311d0909f8ea569111df3164b3fdb260e`**. Receipt tóm tắt độc lập `.local/pilot-handoff-receipt-2026-10-17.json`. Snapshot nguồn vẫn `.local/pilot-deliveries/pilot-k2nuLL`, HEAD khi tạo `61181630b06bf0be134f63e7b1dbce2cd190a625`, manifest **`df491a87d5dde76434022b8d10deef7346f49ee47e44667b02ad6acc2c3bc322`**. Hash workbook đúng bản đi kèm snapshot; source của verifier và source của artifact được ghi riêng. `git check-ignore` xác nhận receipt không vào Git.

**Việc tự động tiếp theo:** bổ sung cách review/so sánh phiên bản bàn giao local và xuất phản hồi theo mã asset, dùng dữ liệu hư cấu, không tự tạo acceptance. Khi có tài khoản Free cụ thể, kiểm provider/quota/quyền rồi thực hiện staging biệt lập theo gate. Lịch mỗi giờ hiện hữu đã gọi vòng này; không tạo lịch trùng.

## Vòng diễn tập nghiệm thu và đối soát — 17/10/2026, 09:59 (UTC+7)

Phạm vi: đúng remote `git@github.com:tranhatam-collab/ai.muonnoi.org.git`, nhánh `codex/ai-muonnoi-autonomous-ops`, worktree `/private/tmp/ai-muonnoi-autonomous-ops`. Baseline đầu vòng `7c090f467cb6a479cfb0f92ae8e98378a95111af`, sạch. Code mới commit **`5705c1da3a2e93ae64b689c461eef0eb53a88440`**; receipt diễn tập sinh từ worktree sạch tại SHA này. Không đổi các checkout team. Phần này cập nhật việc tiếp theo, giữ nguyên receipt cũ và bộ Pilot đã đóng gói.

**HOLD chưa đổi:** chưa nhận account ID Cloudflare Free riêng, danh tính thử, cấu hình staging/Access/D1 hoặc kênh bán hàng và nguồn đối soát thật. Chưa có bằng chứng thu tiền; actuals giữ `null`. Không dùng số tiền fixture làm forecast, pipeline hay tiền thực thu.

- `VERIFIED_CURRENT` — `tools/commercial-records.mjs` kiểm năm loại hồ sơ: qualification, proposal, acceptance, revision, reconciliation. Dùng đúng tập keyword schema có trong workbook, từ chối keyword/ref chưa hỗ trợ; chưa phải JSON Schema engine tổng quát. Kiểm trường bắt buộc, ref trùng, ngày/thời gian, VND nguyên an toàn và trạng thái. Ref có chữ chỉ vượt kiểm cấu trúc, không chứng minh consent/quyền/receipt thật.
- `VERIFIED_CURRENT` — diễn tập **16 chuyển trạng thái**, **8 tình huống bị từ chối**: gửi chưa rõ không reset; thiếu settlement; đổi manifest đã chấp nhận; thiếu delivery; revision còn mở; transaction ref trùng; net sai; phí chưa biết. Sau sửa asset, manifest mới quay lại review và bỏ receipt cũ. Record cuối giữ bất biến; việc đổi kỳ/điều chỉnh cần record mới, không tự ghi đè lịch sử.
- `VERIFIED_CURRENT` — `npm run verify` exit 0: **136 tests, 136 pass, 0 fail/cancelled/skipped/TODO**; typecheck/build đạt, Worker build chỉ dry-run. Log `.local/verify-commercial-2026-10-17.log`. Sau bổ sung so sánh record không phụ thuộc thứ tự JSON keys, chạy lại `check:operations` và suite commercial **20/20**, exit 0; log `.local/recheck-commercial-2026-10-17.log`.
- `VERIFIED_CURRENT` — `npm run rehearse:commercial` chỉ tạo receipt local mới; không nhận file khách và từ chối template nguồn đã điền. Đã đọc lại receipt, kiểm SHA-256 và kiểm lại cả 16 chuyển trạng thái. Artifact `.local/commercial-rehearsals/rehearsal-SlHPZh/receipt.json`; receipt tóm tắt `.local/commercial-rehearsal-receipt-2026-10-17.json`; SHA-256 **`cb22915ef56c7243689493c7046f80340958dd689ec2a1b90cb161e3aaf0e0fa`**. Header `COMMERCIAL_REHEARSAL_ONLY`, `fictional: true`, external actions 0; tiền mô phỏng chỉ nằm trong traces, mọi actuals `null`. Tệp ignored và ngoài artifact Pages.
- `VERIFIED_CURRENT` — Dashboard preview baseline **`7a0508b3-1bfd-4bd5-ab2c-6ce827db966c`**, success lúc 08:50 ngày 17/10, duration 12 giây, clone đúng full SHA `7c090f467cb6a479cfb0f92ae8e98378a95111af`; output `dist/site`, 43 tệp/42 assets + header, không Functions. URL `https://7a0508b3.ai-muonnoi-org.pages.dev`. Đây là receipt baseline trước code diễn tập.
- `BLOCKED` — Pages vẫn chỉ ra production branch `feat/flow-mvp-backend`, row `65d8737`, deployment URL `https://a6623203.ai-muonnoi-org.pages.dev`. Chưa nối được receipt đó với custom domain/Worker/D1 hiện hành. Không sửa mapping; không nâng staging/production gate từ build preview.

Lệnh và giới hạn đã bổ sung ngay trong `operations/README.md`, `operations/pilot-commercial-workbook.md`; `check:operations` kiểm cả năm template. Các kiểm tra mới là công cụ local, chưa gắn vào API production, không phát hành quyền thao tác hoặc xác minh giao dịch bên ngoài.

**Việc tự động tiếp theo:** nối kiểm tra nghiệm thu local với hash của bộ bàn giao thực sự được xuất và kiểm chéo ref/scope giữa các record, vẫn bằng fixture; giữ toàn bộ actuals riêng. Khi nhận tài khoản Free cụ thể, xác minh provider/quota/quyền và tiếp tục staging biệt lập theo gate. Lịch mỗi giờ hiện hữu đã kích hoạt vòng này; không tạo lịch trùng và không yêu cầu duyệt lại phần nội bộ đã được giao.

## Vòng đóng gói bàn giao Pilot — 17/10/2026, 08:49 (UTC+7)

Phạm vi: repo `tranhatam-collab/ai.muonnoi.org`, remote `git@github.com:tranhatam-collab/ai.muonnoi.org.git`, nhánh `codex/ai-muonnoi-autonomous-ops`, worktree `/private/tmp/ai-muonnoi-autonomous-ops`. Baseline đầu vòng `3a1dfd5d05708ccb90b3a56dd3bbed0771f53c26`, sạch. Code đóng gói được commit tại **`61181630b06bf0be134f63e7b1dbce2cd190a625`**; sinh artifact khi worktree sạch ở SHA này. Phần này cập nhật việc tiếp theo; không sửa receipt lịch sử hoặc checkout team.

**Blocker chưa đổi:** chờ account ID Cloudflare Free riêng mà Founder đã chọn, quyền CLI/Access/D1 staging và danh tính thử; chưa có tài khoản/kênh nhận khách và nguồn đối soát thanh toán. Không phát sinh chi tiêu được cấp. Tiền thu thực tế `null`; chưa có bằng chứng kiếm được tiền.

| Lớp | Trạng thái | Receipt đúng phạm vi |
|---|---|---|
| Đóng gói Pilot local | `VERIFIED_CURRENT` | `tools/pilot-delivery.mjs` tạo snapshot mới, 12 bản chữ + lịch 14 ngày + scope/review/acceptance/metrics/source/manifest, tổng 20 file. Chỉ đọc ba nguồn mẫu hư cấu cố định; không nhập khách thật hoặc gửi ra ngoài. |
| Toàn vẹn và hồi phục local | `VERIFIED_CURRENT` | SHA-256 manifest được giữ ngoài artifact; kiểm CLI `--verify` exit 0. Test từ chối sửa byte cùng kích thước, thiếu/thừa file, directory lạ, symlink/hardlink, đường dẫn vượt thư mục và manifest sai. Bản sao riêng kiểm được, sửa bản sao không đổi bản gốc. Đây không phải restore production hoặc chứng minh tác quyền. |
| Kiểm thử | `VERIFIED_CURRENT` | `npm run verify` exit 0, **116 tests / 116 pass / 0 fail, cancelled, skipped, TODO**. Tăng 16 ca đóng gói so với 100 ca trước; typecheck và static/Worker build đạt, Worker chỉ dry-run. Log `.local/verify-delivery-2026-10-17.log`. Lần đầu sandbox chặn cổng loopback của workerd; chạy lại với quyền local cần thiết mới có kết quả này. |
| Preview baseline | `VERIFIED_CURRENT` | Dashboard deployment `d3a32306-b4bb-4bff-b922-389dda74f304`: success, 08:41 ngày 17/10, 12 giây. Log clone đúng `3a1dfd5d05708ccb90b3a56dd3bbed0771f53c26`, chạy `node tools/build.mjs`, output `dist/site`, 43 file/42 assets + header, không Functions. Đây là preview trước commit đóng gói. |
| Production mapping | `BLOCKED` | Trang Pages vẫn ghi nhánh production `feat/flow-mvp-backend`, row lịch sử `65d8737`. Row này chưa chứng minh artifact đang phục vụ custom domain. Mismatch Worker/D1 và custom-domain receipt ở phần trước vẫn chưa giải quyết. |
| Khách/đăng/thu tiền | `BLOCKED` | Mọi phiếu trong gói giữ chưa duyệt, chưa giao; không gọi AI/provider, gửi email, đăng mạng xã hội hoặc tạo giao dịch. Forecast và giá đề xuất không cộng vào actuals. |

Artifact local: `.local/pilot-deliveries/pilot-k2nuLL/README.md`; receipt riêng `.local/pilot-delivery-receipt-2026-10-17.json`; manifest SHA-256 **`df491a87d5dde76434022b8d10deef7346f49ee47e44667b02ad6acc2c3bc322`**. Ba input hash và source HEAD/CLEAN nằm trong manifest. `git check-ignore` xác nhận gói bị loại khỏi Git; build allowlist loại `.local/`, operations và mã công cụ khỏi Pages. Gói là `LOCAL_DEMO_NOT_DELIVERED`, verifier trả `VERIFIED_LOCAL_INTEGRITY_ONLY`, không phải chữ ký số hay biên nhận khách hàng.

Lệnh tái tạo: `npm run prepare:pilot:delivery`; lệnh kiểm lại và giới hạn dùng ở `operations/README.md`. Mỗi lần tạo sinh thư mục mới; không ghi đè snapshot cũ. Hai nguồn text/JSON được giữ để truy xuất cùng phiên bản. Giá trị hiện hữu là bộ minh họa đầy đủ để đối chiếu phạm vi bán, chưa có khách hàng chấp nhận phạm vi đó.

**Việc tự động tiếp theo:** tiếp tục rehearsal từ scope → review → acceptance → đối soát bằng record hư cấu và kiểm điều kiện chuyển trạng thái; bổ sung kiểm tra record theo schema khi còn khả thi. Khi nhận account Free cụ thể, xác minh provider/quota và triển khai staging biệt lập theo gate. Lịch hourly hiện hữu đã gọi vòng này; không tạo lịch trùng. Không cần Founder duyệt lại phần code local đã được giao.

## Vòng chia sẻ và tiếp nhận Studio — 17/10/2026

Phạm vi: repo `tranhatam-collab/ai.muonnoi.org`, nhánh `codex/ai-muonnoi-autonomous-ops`, worktree `/private/tmp/ai-muonnoi-autonomous-ops`, baseline đầu vòng `1ea2690517796fe5802e2cdecaa23165e48047e5`. Phần này thay danh sách việc tiếp theo của vòng Pilot; receipt lịch sử giữ nguyên thời điểm. Không sửa hai checkout team khác.

### Blocker hiện hành và provider đọc lúc 08:30–08:35 (UTC+7)

| Claim/lớp | Trạng thái | Receipt và ý nghĩa |
|---|---|---|
| Chi thêm được cấp | `VERIFIED_CURRENT` | Chỉ đạo Founder: 0 VND. Không dùng số billable hiện tại để tự nâng ngân sách. |
| Workers plan | `VERIFIED_CURRENT` | Dashboard account `93112cc89181e75335cbd7ef7e392ba3`, Workers plans: **Paid — Current plan, $5/month + usage**. D1 hiển thị soft limit cho reads/writes/storage. Chưa có bằng chứng hard cap cho dự án, không hứa staging/AI miễn phí từ free-tier tài liệu. Không đổi subscription. |
| Worker cùng tên source | `VERIFIED_CURRENT` | `ai-muonnoi-api` Overview: version hiển thị `55a3c17d`, Wrangler/manual deployment lịch sử, **Bindings 0, Domains 0, workers.dev Disabled, custom domains/routes trống**. Đây không phải receipt backend vừa xây. Không dùng tên Worker để kết luận api.muonnoi.org chạy source này. |
| D1 identity | `CONTRADICTED` | Repo `workers/api/wrangler.toml` ghi `iai-flow-db` ID `3ceac8b1-1c0f-47c3-ad05-2b9da0983c32`; Dashboard toàn bộ 10 DB có tên `iai-flow-db` nhưng ID **`73993529-9b2e-42c2-8d40-5b05525ecf4b`**. Không có ID source trong danh sách. Chỉ bác bỏ phép coi cùng tên là cùng DB; chưa kết luận DB source bị xóa hay thuộc account khác. Không đọc row/data hoặc thay ID. |
| CLI deployment auth | `BLOCKED` | `wrangler whoami` báo chưa xác thực. Dashboard đang đăng nhập không đồng nghĩa CLI có quyền deploy. Không tạo token/OAuth. |
| Staging runtime | `BLOCKED` | Chưa có D1 riêng, cấu hình origin/Access và danh tính thử được chỉ định, receipt kiểm soát chi phí. Bundle local cố ý có placeholder và flags tắt. |
| Tiền đã đối soát | `BLOCKED` | Chưa kết nối nguồn đơn/giao dịch/settlement; actuals vẫn `null`. Workbook/giá/brief/receipt kỹ thuật không phải doanh thu. |

Founder đã chọn **sẽ chỉ định tài khoản Cloudflare Free riêng** trong phiên 17/10. Chưa có account ID mới; generator dùng `__CLOUDFLARE_FREE_ACCOUNT_ID_REQUIRED__` thay vì account Paid đang audit. Khi nhận ID, xác minh plan/quota/quyền và D1 riêng trước khi điền target, không suy đoán tài khoản từ tên đăng nhập.

### Implementation hiện tại

- Tác giả giữ brief riêng tư mặc định, kể cả brief cũ. `/offers/brief/` cho phép chia sẻ có chủ đích và thu hồi quyền xem; không mở đơn, thanh toán, email hay đăng bài. Thu hồi chặn lần đọc sau, không thể xóa thông tin người vận hành đã đọc.
- `/studio/intake/` chỉ đọc brief đang được chia sẻ; backend bắt buộc session active và ID trong `STUDIO_OPERATOR_IDS`, không kế thừa quyền admin. `STUDIO_INTAKE_ENABLED` và `STUDIO_TRIAGE_ENABLED` đều default-off.
- Trạng thái: `RECEIVED → IN_REVIEW → NEEDS_INFORMATION / PROPOSAL_READY / DECLINED`; bổ sung thông tin quay lại `IN_REVIEW`. Phản hồi hiển thị cho tác giả; không có ghi chú nội bộ trong field này. Hai trạng thái cuối kết thúc vòng xử lý, không chứng minh đã bán hay đã giao.
- Migration `0011_studio_triage.sql` tách consent/state khỏi brief bất biến và giữ event bất biến. Version, actor, request key và payload hash chống gửi lặp/ghi đè; event và state cùng transaction D1. Thu hồi chặn cả operator retry receipt cũ.
- Client chỉ lưu metadata chống trùng. Timeout giữ chưa xác nhận; cùng key chỉ retry đúng payload. Operator có thể tạm gác thao tác chưa đối soát theo brief để tiếp tục hàng chờ; khôi phục giữ key/version/hash cũ, không tạo key mới cho brief đang chờ. Nội dung phản hồi không tự lưu; bản tải về do người vận hành chủ động giữ.
- Đã xử lý response cũ quay về sau storage/account invalidation bằng epoch ở hai giao diện. Đã chuẩn hóa ID tài khoản thành chuỗi để fixture/legacy ID số hoạt động như ID text; không rewrite dữ liệu production.
- Workbook `operations/pilot-commercial-workbook.md` + JSON: bốn phạm vi khớp catalog, năm record mẫu, một đề xuất Pilot hư cấu chưa gửi, hai kịch bản công sức 8/12 giờ là giả định. Không đưa dữ liệu khách thật vào Git; operations không vào artifact web.

### Bundle staging biệt lập và lệnh local

`npm run prepare:intake:staging` chỉ sinh `.local/intake-staging/wrangler.toml` và `schema.sql`, không chạy Wrangler remote. Schema gồm base sạch + 0010 + 0011; không seed admin, người dùng hay mật khẩu; không chạy chuỗi migration legacy. Config khóa tên `ai-muonnoi-studio-staging`, placeholder D1 riêng, không custom route/cron/AI/mail/payment binding. Không dùng D1 trong source hay D1 cùng tên trên Dashboard làm staging.

Entrypoint `workers/api/src/staging.ts` chỉ có health, auth tối thiểu và intake. `STAGING_AUTH_ENABLED=false` khóa login/logout/me trước D1; chỉ mở sau receipt Access, danh tính thử và budget. Các route payment/email/AI/register/OAuth/feed/workflow cũ bị từ chối. Auth yêu cầu origin staging chính xác cho mutation, cookie host-only Secure/Lax, body tối đa 24 KB. Login rate-limit legacy vẫn có thể ghi D1 theo email khi auth được bật; không dùng kiểm soát này thay hard cap/Access. Trước rollout: xác minh tài khoản/budget, D1 riêng, origin/Access và test identities; áp schema chỉ vào DB staging đã chốt, kiểm hai phía, giữ kill switch; không chạm DNS hay secret production. Rollback bằng tắt flags/đổi artifact đã xác minh, giữ DB/event cho đối soát, không DROP dữ liệu.

Lệnh kiểm chứng: `npm run verify`; `npm run dev:intake` mở fixture 127.0.0.1:8790, SQLite trong RAM và danh tính giả lập. Endpoint `/__preview/identity` chỉ tồn tại trong server local và bị ràng buộc Host/Origin/loopback; không thuộc artifact public. Lịch mỗi giờ và hằng ngày đã đọc lại ngày 17/10: `ACTIVE`. Các lịch khác giữ receipt bảng bên dưới; không tạo bản trùng.

### Receipt local của vòng triage

`npm run verify` ngày 17/10/2026 exit 0: **100 tests, 100 pass, 0 fail/cancelled/skipped/TODO**. Các suite: publishing 13; payment/email security 5; payment D1/workerd 1; publishing D1/workerd 1; intake D1/workerd 9; intake client + numeric identity 9; action journal 12; triage D1/workerd 9; staging 3; static/login redirect 3; RevenueOps 34; Durable Object/workerd 1. Typecheck và build exit 0; Worker build là dry-run. Log `.local/verify-triage-2026-10-17-final.log` (ignored). Sau bổ sung kiểm tra manifest cho asset mới, suite static/login chạy lại 3/3.

Chromium local dưới CSP: tạo brief → riêng tư → cấp quyền → operator thấy đúng một brief → lưu phản hồi → tác giả thấy phản hồi → thu hồi → queue operator trống. Giao diện tác giả và operator đều có `scrollWidth=390` tại viewport 390. Ảnh fixture ở `output/playwright/triage-mobile.png`, `brief-revoked-mobile.png`; không phải dữ liệu khách thật. Lần smoke đầu phát hiện ID số được SQLite chuyển thành text khác dạng; đã sửa canonical actor và thêm regression, rồi tái tạo fixture và chạy lại thành công. Favicon local chưa có (404); không thấy lỗi CSP/JavaScript trong happy path sau sửa.

Failure path trong Chromium: chặn phản hồi sau khi backend local đã commit → giữ pending → đọc history đối chiếu đúng receipt; chặn trước khi gửi → tạm gác → chọn lại brief → nhập lại đúng nội dung → xác nhận thành công với **cùng request key**, phiên bản tăng đúng một. Queue cập nhật cùng trạng thái detail sau lưu/đối soát. Desktop 1440 có scrollWidth=1440; ảnh `output/playwright/triage-desktop.png`. Hai lỗi mạng trong console ở failure path là do route.abort chủ động của test, không diễn giải thành happy-path lỗi.

Các receipt này chỉ chứng minh local source/test; chưa chứng minh auth thật, remote D1, staging deployment, production, kênh bán hàng hay thu tiền. Artifact web hiện **43 file public chọn lọc**; workbook/schema/source Worker không thuộc artifact. Giá và hai phép tính công sức trong workbook đã kiểm khớp catalog và tổng; chỉ kiểm schema subset tại local, chưa chạy validator JSON Schema đầy đủ.

### Receipt GitHub và preview triage — 17/10, 08:40 (UTC+7)

- Source push thành công: `785c7da623e4bbaaa4a3426345dea289eb760c71` vào đúng nhánh `codex/ai-muonnoi-autonomous-ops`. Không merge production.
- Cloudflare Pages deployment **`a1dea1f2-e456-483f-b809-9d57009961b7`**, status **success**, duration 18 giây; log clone đúng full SHA, build `node tools/build.mjs`, output `dist/site`, 43 file chọn lọc/42 assets + rule headers, không có Functions.
- Preview đã mở bằng trình duyệt: https://a1dea1f2.ai-muonnoi-org.pages.dev/studio/intake/ — ghi rõ offline, không tải brief khách, nút đọc/ghi disabled; không có error/warning trong log tab tại lần kiểm. Đó là receipt trang tĩnh, không phải backend live.
- Sau receipt code này, Founder chọn tài khoản Free riêng: chỉ đổi placeholder account trong generator + assertion tương ứng và tài liệu, không đổi asset web; staging suite chạy lại **3/3**, exit 0. Chờ account ID mới và danh tính thử, không dùng account Paid vừa audit.

## Vòng triển khai Pilot — receipt lịch sử 17/10/2026

Phạm vi cập nhật: lane `codex/ai-muonnoi-autonomous-ops`, remote `tranhatam-collab/ai.muonnoi.org`, worktree `/private/tmp/ai-muonnoi-autonomous-ops`, parent `f1be6f22ab0fbdef5c8460350d0b352d7ca44104`. Thay thông tin lane và lịch nội bộ ngày 15/10; các receipt preview lịch sử bên dưới giữ nguyên thời điểm. Không sửa hai checkout team khác.

- `/offers/brief/`: soạn/tải JSON trên máy; gửi có chủ đích khi intake được bật và có session active. Trang Pages preview chỉ hoạt động offline, không gửi tới API production.
- `/offers/sample/`: 12 bản nháp đầy đủ (4 caption, 4 kịch bản video, 3 carousel, 1 bài dài), lịch minh họa 14 ngày. Tình huống Mộc Giấy hoàn toàn hư cấu; không phải campaign hay khách hàng thật. Bản đầy đủ và quy trình bàn giao: `operations/pilot-sample.md`.
- `/api/intake/*`: default-off bằng `STUDIO_INTAKE_ENABLED`; `expected_actor_id` phải khớp session, Origin đúng, dữ liệu giới hạn và quyền tư liệu bắt buộc. Chỉ tác giả xem được brief, kể cả admin khác cũng không được đọc. Tối đa 20 brief/tài khoản; đây là quota tổng, chưa có cơ chế reset được mở.
- Mã gửi gắn với tài khoản + nội dung bất biến; timeout giữ trạng thái chờ đối soát, retry không tạo bản thứ hai. Trình duyệt chỉ lưu account ID nội bộ, request key, fingerprint và receipt ID; không tự lưu nội dung riêng tư. Không log brief.
- `0010_studio_intake.sql` là migration additive. Chưa chạy từ xa, chưa bật flag. Hai migration `0009` hiện hữu phải được đối chiếu lịch sử `d1_migrations` trước kế hoạch remote; không chạy toàn bộ seed cũ.
- Đăng nhập chỉ chấp nhận return URL cùng origin; đã chặn protocol-relative/backslash chuyển sang site ngoài.

### Receipt kiểm thử local

Ngày 17/10/2026, `npm run verify` exit 0: **75 tests, 75 pass, 0 fail/cancelled/skipped/TODO**. Theo suite: publishing 13; payment/email security 5; payment D1/workerd 1; publishing D1/workerd 1; intake D1/workerd 9; intake client 8; static/login redirect 3; RevenueOps 34; Durable Object/workerd 1. Typecheck API/module và build static/module exit 0; Worker build là dry-run. Artifact static 39 file chọn lọc, chỉ xuất thêm JSON mẫu hư cấu được chỉ định; không xuất thư mục operations hoặc Worker.

Chromium cục bộ dưới CSP đã thử: tải draft JSON (không receipt), bấm gửi fixture → receipt, reload → đối chiếu đúng một bản đã lưu. Form và sample có scrollWidth bằng 390 tại viewport 390; sample cũng không tràn tại 1440. Sample render đủ 12 nội dung và 14 ngày, mở đọc được nội dung. Có một 404 favicon trên lần mở form đầu; không thấy lỗi JavaScript/CSP. Log và ảnh ở `.local/verify-2026-10-17.log`, `output/playwright/` (ignored, chỉ dữ liệu giả lập). `npm run dev:intake` tái tạo máy chủ 127.0.0.1:8790 với SQLite tạm trong bộ nhớ; không gọi API ngoài.

Kiểm thử này chưa chứng minh đăng nhập thật, production D1, email/thanh toán, tiếp nhận người mua, hoặc deploy Worker. Tiền đã đối soát: **chưa có nguồn kết nối/receipt**, giữ actuals `null`, không ghi thành doanh thu 0 hay doanh thu dự báo.

### Receipt preview Pilot — 17/10, 08:15 giờ Việt Nam

- Source đã push: `9dc2611104995a735d7c5b336a74bc1baec0d77c`, đúng repo/nhánh ở trên; worktree sạch sau commit.
- Cloudflare Pages deployment: `e87fac08-cd2c-4fe9-8526-21df1fbec21a`; Dashboard báo `success`, duration 20 giây; log clone đúng full SHA, chạy `node tools/build.mjs`, đọc `pages_build_output_dir: dist/site`, build 39 file (38 assets upload và một rule headers).
- Mẫu đã mở bằng trình duyệt: https://e87fac08.ai-muonnoi-org.pages.dev/offers/sample/ — DOM đủ 12 asset, 14 ngày; không có console error/warning được thu trên tab này.
- Brief đã mở: https://e87fac08.ai-muonnoi-org.pages.dev/offers/brief/ — ghi rõ bản xem trước, các nút gửi/đối chiếu online disabled; không thao tác gửi dữ liệu trên preview.
- Probe HTTP trực tiếp để so hash bị HTTP 403; vì vậy byte-for-byte hash live chưa được xác nhận. Receipt trình duyệt và provider không bị diễn giải thành bằng chứng cho việc so hash đó.
- Không deploy Worker, áp migration, đổi DNS/secrets hoặc mở intake production trong bước này. Latest production row trên Pages vẫn là snapshot lịch sử `65d8737`; chưa kết luận custom domain đang phục vụ artifact nào từ row này.

Lịch mỗi giờ đã cập nhật thành công qua Codex, giữ `ACTIVE`: mỗi vòng chọn việc nội bộ còn khả thi và làm tới receipt, ưu tiên provider/staging, operator triage có phân quyền/đồng ý chia sẻ và gói bàn giao; không tạo lịch trùng hoặc nâng ngân sách.

### Lịch nội bộ đã kiểm tra lại

Các cấu hình Codex heartbeat cùng chat đều `ACTIVE` tại lần đọc 17/10; giờ theo Asia/Ho_Chi_Minh:

| Nhịp | Giờ / mục tiêu |
|---|---|
| Mỗi giờ | Kiểm tra source/gates và hoàn thành việc nội bộ tiếp theo; thông báo khi thay đổi có ý nghĩa |
| Hằng ngày | 08:00 — vận hành, nội dung, kiểm thử, receipt |
| Hằng tuần | Thứ Hai 09:00 — funnel, delivery, chi phí và tiền đã đối soát |
| Hằng tháng | Ngày 1, 10:00 — báo cáo vận hành và kế hoạch tháng |
| Hằng năm | Ngày 2/1, 11:00 — chiến lược, khả năng khôi phục, quyền truy cập |

Đây là lịch gọi chat Codex; cần host/scheduler hoạt động. Chưa có receipt bảo đảm chạy liên tục 24/7 ở hạ tầng ngoài. Worker cron, social scheduler, AI calls và kế toán thanh toán vẫn chưa được kích hoạt.

### Việc tự động tiếp theo (cập nhật sau vòng triage)

1. Đối chiếu source/preview của thay đổi triage với receipt mới nhất; Pages preview giữ offline, không gọi production intake.
2. Giải quyết ánh xạ Worker/D1 và hạn mức 0 VND trước staging remote; không thay ID cùng tên, không dùng Paid như tài khoản Free. Chuẩn bị Access/test identities/CLI auth theo tài khoản được chỉ định.
3. Tiếp tục gói bàn giao và rehearsal từ brief → scope → review → acceptance → đối soát bằng dữ liệu hư cấu; dùng workbook có sẵn, không tự ghi lead hay tiền thật.
4. Sau khi có URL/ID tài khoản mạng xã hội do Founder quản lý và integration được cấu hình, thực hiện hành động được phép ở đúng điểm đến và lưu receipt; hiện chưa có danh sách đó.

## Môi trường và dữ liệu

Frontend build từ root bằng `npm run build`, artifact duy nhất là `dist/site`. API cũ trỏ D1 production trong `workers/api/wrangler.toml`; không chạy migration script vào target đó để thử nghiệm. Module RevenueOps có config dev/staging/production riêng, không route, không cron, không AI binding. Không reuse D1/DO production làm test.

Studio development server chỉ phục vụ allowlist ba asset và publishing API tại 127.0.0.1:8789. Hai danh tính fixture khác nhau mô phỏng tác giả và reviewer; không phải đăng nhập thật. Module RevenueOps ở 127.0.0.1:8787 inject actor local có quyền owner. Không expose hai server này ra LAN/tunnel.

## Staging trước release

1. Khóa repo/commit/artifact, đọc provider metadata và xác định branch production hiện hành; không giả định feature branch là live.
2. Tạo kế hoạch staging biệt lập sau khi xác nhận tài khoản, free quota và hạn mức; cần quyết định riêng nếu có thể phát sinh phí. Không copy production secrets/data vào code.
3. Kiểm schema hiện tại sau 0008; backup trước khi áp dụng migration thêm 0009. Không chạy seed admin lịch sử 0003/0006. Test migration trên bản sao được làm sạch rồi mới xin thực hiện remote.
4. Đăng nhập thật bằng hai danh tính được chỉ định; thử active/suspended/expired session, quyền tác giả, reviewer độc lập, stale version, nguồn, sửa sau duyệt, gửi lặp và audit. Kiểm CSP, CORS, cookie API/frontend, public feed/post route.
5. `STUDIO_PUBLISH_ENABLED=false` đến khi nghiệm thu và approval gắn đúng SHA/environment. Việc bật không tự bật social hoặc Workers AI.
6. RevenueOps cần Access issuer/audience, server role mapping, DO persistence, provider cost controls và AI eval độc lập. Giữ kill switch; không đưa session Studio sang DO như một actor tự khai.
7. RG0–RG13, monitoring, restore/rollback và Founder domain sign-off phải có receipt trước release. Local D1/workerd chỉ chứng minh môi trường local.

### Receipt preview Pages — 2026-10-16

Cloudflare Pages đã xuất bản preview cho nhánh `codex/ai-muonnoi-autonomous-ops` tại commit `46885ac`:

- deployment ID: `c2c99973-2bcd-4556-ba15-f5154a302797`;
- URL: `https://c2c99973.ai-muonnoi-org.pages.dev`;
- alias: `https://codex-ai-muonnoi-autonomous.ai-muonnoi-org.pages.dev`;
- status: success, 16 giây;
- build command: `node tools/build.mjs`;
- artifact: `dist/site`, 30 tệp public được chọn lọc, không gồm Worker source, plan, secret hoặc dữ liệu runtime.

`/login/` và `/assets/login.js` trên preview đều trả `200`; CSP đang là `script-src 'self'`, do đó script login cùng nguồn được phép tải. Đây chỉ là receipt artifact tĩnh; không xác nhận OAuth, session, Worker API, email, payment hay production.

Custom domain `ai.muonnoi.org` trong project Pages hiện `Inactive` và Dashboard yêu cầu CNAME `ai` trỏ tới `ai-muonnoi-org.pages.dev`. Không reactivate hoặc sửa DNS cho đến khi xác định lại binding live hiện hành, branch production, Worker API, D1 migration, secret và rollback receipt. Preview không chuyển traffic production.

## Dừng và khôi phục

Studio: tắt `STUDIO_PUBLISH_ENABLED`, giữ bản nháp và audit. Không xóa bài/lịch sử bằng SQL để che sự cố; xử lý bài đã public qua quy trình moderation có người chịu trách nhiệm. Rollback API về artifact đã xác minh; migration 0009 là additive và giữ dữ liệu, không drop bảng để rollback. Restore phải thử trên DB biệt lập và đối chiếu số bài, source_draft_id duy nhất, revision và audit trước khi phục hồi thật.

RevenueOps: owner gọi POST `/api/stop` từ đúng origin sau Access; lệnh dừng được lưu bền. Giữ quỹ/nghĩa vụ đã nhận. `npm --prefix workers/revenueops run backup:local` rồi `restore:drill` chỉ kiểm SQLite local. Backup/restore D1/DO production, retention, encryption, RPO/RTO và rollback deployment hiện chưa kiểm tra.

## Nhịp làm việc và kênh

Lịch Worker đề xuất 08:00/12:30/17:30/23:45 Asia/Ho_Chi_Minh ở registry đều disabled. `run-daily` hiện tạo 10 phiếu chuẩn bị không dùng AI, không gửi nội dung. Lịch chat Codex ở bảng cập nhật phía trên là lớp điều phối riêng; không kích hoạt social scheduler hoặc AI runtime.

Trước mỗi kết nối kênh: account/page ID và owner, OAuth scope tối thiểu, hạn mức, expiry/revocation, người duyệt, quyền nội dung và mục tiêu bài. Dùng API chính thức được nền tảng cho phép. Adapter phải chống trùng theo account+content hash+slot; timeout đánh dấu UNKNOWN, kiểm tra provider trước retry. Dừng kênh khi mất quyền, sai nội dung, phản ánh spam hoặc hết hạn mức. Chưa có adapter social executable.

## Theo dõi và hỗ trợ

Trước live phải chốt SLI save/review/publish, tỉ lệ lỗi, độ trễ hàng chờ, duplicate count, số lần denied, chi phí theo nguồn, backup và restore. SLO 99,5% pilot là đề xuất cần phê duyệt. Audit không lưu token/raw prompt; log ứng dụng cũ cần rà soát riêng. Chưa có alert route hay synthetic monitor thật; không hứa trực vận hành khi chưa có owner và receipt.
