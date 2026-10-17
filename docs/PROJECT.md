# Project identity — 2026-10-17

Ngày và phạm vi: tiếp tục xây theo chỉ đạo Founder; mở rộng publishing và RevenueOps trong repo hiện có. D06 thay đề xuất repo/domain revenue.tranhatam.com; không thay authority FPOS hoặc cấp phép release.

Cập nhật 17/10/2026: bảng identity này thay bảng ngày 15/10 cho lane tự động riêng. Định vị theo gói `AI_MUONNOI_CANONICAL_MASTER_2026`: AI Assistance, Reviewed Publishing Studio và workflow có kiểm soát; `app.muonnoi.org` sở hữu Social Core. Không dùng bản sao dirty của team làm baseline cho lane này.

| Trường | Giá trị |
|---|---|
| Tên | AI Muôn Nơi — AI Assistance & Reviewed Publishing Studio |
| Canonical repo | https://github.com/tranhatam-collab/ai.muonnoi.org |
| Nhánh build | codex/ai-muonnoi-autonomous-ops |
| Baseline bước triage | 1ea2690517796fe5802e2cdecaa23165e48047e5; commit trước thay đổi chia sẻ/triage/staging ngày 17/10; receipt bước Pilot giữ trong docs/OPERATIONS.md |
| Chủ dự án, final approver | Founder Trần Hà Tâm; chưa chỉ định người thay thế |
| Người dùng | Người viết/người đọc, biên tập viên; bộ phận vận hành 10 Agent |
| Vấn đề | Biến kiến thức thành nội dung hữu ích và sản phẩm được kiểm tra, ghi nhận giá trị kinh doanh bằng chứng từ |
| Bề mặt sản phẩm | /studio/, /studio/intake/, /offers/, /offers/brief/, /offers/sample/, API D1 và module RevenueOps nội bộ; feed là phần legacy cần phối hợp với Social Core |
| Domain hiện hành trong source | ai.muonnoi.org, api.muonnoi.org; preview Pages riêng đã có receipt, ánh xạ production vẫn chưa đủ |
| Domain đề xuất nội bộ | ops.ai.muonnoi.org sau Access; chưa tạo DNS |
| Dữ liệu | Public code; bản nháp/session/finance/customer/workforce là private. Tài liệu gốc và bản bán không push |
| Ngân sách | 0 VND; không ads, gọi AI, thuê, thanh toán hoặc gửi mạng xã hội |
| AI được chọn | Cloudflare Workers AI; executable adapter có sẵn nhưng default disabled, không binding |
| Giai đoạn | Development; chưa chốt maturity Level vì thiếu receipt các gate đầu và nghiệm thu độc lập |
| Release | HOLD cho production/thương mại; receipt static preview không nghiệm thu Worker, khách hàng hay doanh thu |
| Source of truth | Canonical master package và chỉ đạo Founder; file này, operations/README.md, docs/OPERATIONS.md, registry/policy; PROJECT_PLAN.md giữ các giả định lịch sử, không thay canonical boundary |

## Quyết định hiện hành

- D03: Cloudflare Workers AI thay nhà cung cấp chưa chốt.
- D04: không duyệt chi phí, tiếp tục xây với 0 VND.
- D05: repo revenue.tranhatam.com ban đầu được cung cấp; chỉ còn bản thử local, chưa push.
- D06: Founder chọn repo ai.muonnoi.org, thêm nhánh và mở chủ đề rộng hơn AI.

## Ranh giới nghiệm thu

Thành công kỹ thuật bước hiện tại: lưu nháp riêng, phân quyền, duyệt đúng phiên bản, không xuất bản khi khóa; 10 Agent tạo phiếu việc không trùng; kiểm soát quỹ và đối soát không bịa tiền. Thành công thương mại phải có nhu cầu thật, giao hàng, chi phí, hoàn tiền và đối soát; mục tiêu 1–10 triệu/Agent/ngày chưa được xác nhận.

Founder đã yêu cầu tiếp tục implementation, nhánh riêng và tự động nội bộ. Lịch Codex đang ACTIVE được ghi trong docs/OPERATIONS.md; không đồng nghĩa Worker có cron hoặc AI/social chạy thật. Không mở production intake/publishing, migrate/DNS/secret, thu tiền hoặc ký/chi trả hợp đồng từ kết quả local. Trước bước đó cần đúng môi trường, quyền kênh cụ thể và receipt các gate liên quan.
