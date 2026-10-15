# Project identity — 2026-10-15

Ngày và phạm vi: tiếp tục xây theo chỉ đạo Founder; mở rộng publishing và RevenueOps trong repo hiện có. D06 thay đề xuất repo/domain revenue.tranhatam.com; không thay authority FPOS hoặc cấp phép release.

| Trường | Giá trị |
|---|---|
| Tên | Nhà Chung / Muôn Nơi Publishing & RevenueOps |
| Canonical repo | https://github.com/tranhatam-collab/ai.muonnoi.org |
| Nhánh build | codex/revenueops-publishing |
| Baseline | 6c58845a716ba0ca28b42191fabb93efe9fc33db, remote feat/flow-mvp-backend |
| Chủ dự án, final approver | Founder Trần Hà Tâm; chưa chỉ định người thay thế |
| Người dùng | Người viết/người đọc, biên tập viên; bộ phận vận hành 10 Agent |
| Vấn đề | Biến kiến thức thành nội dung hữu ích và sản phẩm được kiểm tra, ghi nhận giá trị kinh doanh bằng chứng từ |
| Bề mặt sản phẩm | Feed hiện có, /studio/, API D1 hiện có, module RevenueOps riêng |
| Domain hiện hành trong source | ai.muonnoi.org, api.muonnoi.org; ownership/provider chưa kiểm tra |
| Domain đề xuất nội bộ | ops.ai.muonnoi.org sau Access; chưa tạo DNS |
| Dữ liệu | Public code; bản nháp/session/finance/customer/workforce là private. Tài liệu gốc và bản bán không push |
| Ngân sách | 0 VND; không ads, gọi AI, thuê, thanh toán hoặc gửi mạng xã hội |
| AI được chọn | Cloudflare Workers AI; executable adapter có sẵn nhưng default disabled, không binding |
| Giai đoạn | Development; chưa chốt maturity Level vì thiếu receipt các gate đầu và nghiệm thu độc lập |
| Release | HOLD; chưa gắn artifact với provider, staging/live và Founder sign-off |
| Source of truth | File này, PROJECT_PLAN.md, registry/policy/backlog module, receipt kiểm thử |

## Quyết định hiện hành

- D03: Cloudflare Workers AI thay nhà cung cấp chưa chốt.
- D04: không duyệt chi phí, tiếp tục xây với 0 VND.
- D05: repo revenue.tranhatam.com ban đầu được cung cấp; chỉ còn bản thử local, chưa push.
- D06: Founder chọn repo ai.muonnoi.org, thêm nhánh và mở chủ đề rộng hơn AI.

## Ranh giới nghiệm thu

Thành công kỹ thuật bước hiện tại: lưu nháp riêng, phân quyền, duyệt đúng phiên bản, không xuất bản khi khóa; 10 Agent tạo phiếu việc không trùng; kiểm soát quỹ và đối soát không bịa tiền. Thành công thương mại phải có nhu cầu thật, giao hàng, chi phí, hoàn tiền và đối soát; mục tiêu 1–10 triệu/Agent/ngày chưa được xác nhận.

Không tự merge, deploy, migrate/DNS/secret, mở AI/scheduler/social, thu tiền hoặc ký/chi trả hợp đồng từ kết quả local. Trước bước tiếp theo cần provider account/zone, môi trường staging biệt lập, quyền kênh cụ thể và người duyệt được chỉ định.
