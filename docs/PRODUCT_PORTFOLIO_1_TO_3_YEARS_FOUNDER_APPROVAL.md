# Thuyết minh danh mục sản phẩm giá trị — vận hành liên tục 1–3 năm

**Loại tài liệu:** bản AI sáng tạo để Founder duyệt · không phải bằng chứng doanh thu · không tự mở bán  
**Ngày:** 2026-10-19 · `Asia/Ho_Chi_Minh`  
**Source:** nhánh `codex/ai-muonnoi-autonomous-ops` · HEAD `f0a337b` (cập nhật 2026-10-19 15:56 +0700)  
**Trạng thái:** `DRAFT_AWAITING_FOUNDER_APPROVAL`  
**Ngân sách hiện hành:** 0 VND · HOLD live/thương mại cho đến khi từng sản phẩm qua cổng riêng  

---

## 0. Quyết định cần Founder duyệt

Bản này đề xuất **một danh mục sản phẩm độc lập, tự chủ**, mỗi dòng chạy được **1–3 năm** dưới vận hành AI liên tục, với Founder chỉ:

1. phê duyệt phạm vi / giá / bên bán / mở cổng thanh toán;
2. cung cấp thông tin AI không tự lấy được (account Cloudflare Free, Access, merchant, kênh sở hữu, danh tính reviewer/finance).

**Không** yêu cầu Founder ngồi điều khiển từng giờ. AI tự làm việc nội bộ theo `docs/CONTINUOUS_AUTONOMOUS_OPS.md`.

### Hộp duyệt nhanh

| ID duyệt | Nội dung | Chọn |
|---|---|---|
| AP-PORTFOLIO | Giữ 14 dòng sản phẩm dưới đây (4 Studio + 10 Agent A01–A10) làm danh mục canonical 1–3 năm | ☐ Duyệt / ☐ Sửa / ☐ Bác |
| AP-WAVE | Duyệt thứ tự mở: Pilot → A01 → A02/A03 → recurring Studio → A04–A08 theo nhu cầu → A06/A09/A10 | ☐ Duyệt / ☐ Sửa |
| AP-PRICE | Giá trong bản này là **đề xuất chưa thương mại**; không tự đổi khi chưa có chữ ký Founder | ☐ Duyệt |
| AP-AUTONOMY | Mỗi sản phẩm phải đủ cổng độc lập (nội dung, thanh toán, giao hàng, đối soát, kill switch) trước khi nhận đơn thật | ☐ Duyệt |
| AP-NO-GUARANTEE | Target VND/ngày là KPI tham vọng, **không** phải cam kết doanh thu | ☐ Duyệt |

---

## 1. Nguyên tắc thiết kế (bắt buộc)

1. **Độc lập:** lỗi hoặc dừng một sản phẩm không làm sập toàn danh mục; quỹ, ledger, SKU, entitlement tách theo `offer_id` / `agent_id`.
2. **Tự chủ:** AI tạo → người duyệt (khi có) → thanh toán đã đối soát → giao hàng → hỗ trợ trong phạm vi; không cần Founder click từng bước vận hành nội bộ.
3. **Liên tục 1–3 năm:** mỗi sản phẩm có (a) phiên bản nội dung có thể tái xuất bản, (b) chu kỳ cải tiến định kỳ, (c) điều kiện dừng rõ, (d) biên giả định có thể thay bằng actuals khi có nguồn.
4. **Không bịa tiền:** thiếu bank/fees/refunds/reserves → net/score = `null`.
5. **Không tự đăng / tự chi:** publishing, ads, hiring, AI trả phí giữ tắt đến khi có consent + hạn mức + adapter đã nghiệm thu.

---

## 2. Bản đồ danh mục

Hai lớp bổ sung nhau, không thay thế nhau:

| Lớp | Vai trò 1–3 năm | Đơn vị bán |
|---|---|---|
| **Studio commercial** | Quan hệ khách dài hạn, Pilot → subscription / B2B setup | 4 offer trong `operations/data/offer-catalog.json` |
| **Agent catalog A01–A10** | SKU số / dịch vụ có phạm vi nghiệm thu, target riêng | 10 cấu hình trong `workers/revenueops/config/agents.json` |

Tổng target Agent (giả định KPI): 55 triệu VND/ngày ròng có chứng cứ — **chưa được xác nhận bằng giao dịch**.

```text
Năm 1: khóa nền tảng + Pilot + A01–A03 + Creator/Team recurring
Năm 2: scale A04–A08 theo tín hiệu nhu cầu; giữ biên và QA
Năm 3: A06 entitlement + A09 blueprint + A10 seat license; tối ưu retention
```

---

## 3. Lớp Studio — sản phẩm quan hệ dài hạn

### S01 — Studio Pilot 14 ngày

| Trường | Nội dung đề xuất |
|---|---|
| Giá đề xuất | 1.500.000 VND · one-time |
| Khách | Creator / SME cần hệ nội dung có kiểm duyệt |
| Giá trị 1–3 năm | Cổng vào danh mục; chứng minh quy trình brief→review→bàn giao; nguồn học giá/chuyển đổi |
| Độc lập | SKU riêng; không phụ thuộc social graph; không tự đăng |
| Tự chủ AI | Tạo 12 nháp + lịch 14 ngày + checklist quyền; người duyệt độc lập; không tự chấp nhận đơn |
| Continuity | Mỗi Pilot là phiên bản có digest; có thể lặp với khách mới mà không phá gói cũ |

**Chuẩn bị hoàn hảo trước mở bán**

1. Bản mẫu công khai khớp fixture đã kiểm (không lộ dữ liệu khách).  
2. Intake + triage mặc định tắt cho đến Access/test identity.  
3. Workbook qualification→proposal→acceptance→reconciliation đã có guard (đã có local).  
4. Gói bàn giao có SHA-256 độc lập + handoff `REVIEW_REQUIRED`.  
5. Merchant + hóa đơn + chính sách hoàn (Founder).  
6. Một kênh sở hữu + consent (Founder).  
7. QA capacity ≥ giờ ước lượng mỗi Pilot.  
8. Kill switch: tắt intake/checkout; giữ nghĩa vụ đã nhận.

**Founder cung cấp:** bên bán, merchant, kênh, người duyệt giá.  
**AI tự làm:** nội dung mẫu, tooling, test, receipt, cải tiến gói.

---

### S02 — Creator Studio (tháng)

| Trường | Nội dung đề xuất |
|---|---|
| Giá đề xuất | 1.990.000 VND/tháng |
| Khách | Creator đã hoàn thành Pilot |
| Giá trị 1–3 năm | Doanh thu định kỳ; vòng lặp nội dung có revision allowance |
| Độc lập | Entitlement theo tháng; hủy không xóa nghĩa vụ tháng đã trả |
| Tự chủ AI | Lịch 20 asset/tháng; verifier + brand editor; báo cáo funnel không tự bịa reach |
| Continuity | Catalog phiên bản theo tháng; retention đo bằng tháng gia hạn đã đối soát |

**Chuẩn bị hoàn hảo:** Pilot đã có ≥3–5 đơn đã giao có chi phí đầy đủ (học); template lịch 30 ngày; chính sách revision; billing định kỳ; pause/cancel; không media buying.

---

### S03 — Team Growth Studio (tháng)

| Trường | Nội dung đề xuất |
|---|---|
| Giá đề xuất | 4.990.000 VND/tháng |
| Khách | Nhóm có người duyệt nội dung |
| Giá trị 1–3 năm | Workflow brief→approval cho team; 40 asset/tháng; báo cáo funnel |
| Độc lập | Tenant/team seat tách khỏi Creator |
| Tự chủ AI | Workflow có audit; không gửi/đăng nếu thiếu quyền tài khoản |
| Continuity | Seat + approval matrix ổn định; mở rộng kênh từng cái một |

**Chuẩn bị hoàn hảo:** role author/reviewer; Access; quota seat; adapter kênh từng account; SLA hỗ trợ dự thảo; không hứa doanh thu.

---

### S04 — B2B Workflow Setup (một lần)

| Trường | Nội dung đề xuất |
|---|---|
| Giá đề xuất | 9.900.000 VND · one-time |
| Khách | DN cần workflow AI có audit trail |
| Giá trị 1–3 năm | Setup có bàn giao; upsell sang Team hoặc A09/A10 |
| Độc lập | Phạm vi setup ≠ vận hành thay khách |
| Tự chủ AI | Bản đồ quy trình + Studio + dashboard + đào tạo nghiệm thu |
| Continuity | Runbook khách tự vận hành; tích hợp thứ ba báo giá riêng |

**Chuẩn bị hoàn hảo:** SOW mẫu; môi trường staging biệt lập; training checklist; không production secret của khách trong repo.

---

## 4. Lớp Agent A01–A10 — SKU độc lập 1–3 năm

Mỗi Agent: **một dòng sản phẩm · một target · một giá đề xuất · một cổng nghiệm thu**. Agent vượt không bù Agent thiếu.

### A01 — Bộ vận hành AI nền tảng

| | |
|---|---|
| Giá / target đề xuất | 149.000 · target 1.000.000/ngày |
| Phạm vi | 12 quy trình, 30 prompt, kế hoạch 30 ngày, HTML/bảng mẫu |
| Vì sao sống 1–3 năm | Evergreen onboarding AI cho SME; phiên bản nội dung theo quý |
| Độc lập | Digital download; không phụ thuộc crawler hay tenant |
| Tự chủ | Catalog server-side khóa giá; giao tệp checksum; FAQ thư viện |
| Chuẩn bị hoàn hảo | Đủ 12/30/30; license; mẫu miễn phí; user thử; merchant; R2 private; email recovery; E2E test loại khỏi KPI; không hứa thu nhập |

### A02 — Bộ quy trình AI theo ngành

| | |
|---|---|
| Giá / target | 399.000 · 2.000.000/ngày |
| Phạm vi | Một ngành (đề xuất đầu: bán lẻ); 20 quy trình, 40 prompt, 10 tình huống |
| Continuity 1–3 năm | Mỗi ngành là SKU riêng; không mở 3 ngành cùng lúc |
| Chuẩn bị hoàn hảo | Chọn ngành; chuyên gia rà 10 case; không bịa case; phiên bản ngành có changelog |

### A03 — Báo cáo kiểm tra website

| | |
|---|---|
| Giá / target | 799.000 · 3.000.000/ngày |
| Phạm vi | ≤10 trang công khai; 20 phát hiện ưu tiên + evidence + backlog |
| Continuity | Lặp theo website/khách; crawler có chặn SSRF |
| Chuẩn bị hoàn hảo | Website được cấp quyền; SSRF tests (IP nội bộ/redirect/rebinding/token URL); không pentest/SEO guarantee |

### A04 — Gói nội dung 20 sản phẩm

| | |
|---|---|
| Giá / target | 1.290.000 · 4.000.000/ngày |
| Phạm vi | 20 mô tả + tiêu đề + FAQ theo dữ liệu thật; CSV; một vòng sửa |
| Continuity | Pipeline CSV tái dùng; không tự đăng sàn |
| Chuẩn bị hoàn hảo | Schema CSV; rubric dữ kiện; reviewer đủ giờ; từ chối thiếu nguồn |

### A05 — Tái sử dụng nội dung có bản quyền

| | |
|---|---|
| Giá / target | 1.990.000 · 5.000.000/ngày |
| Phạm vi | ≤60 phút / 10k từ được cấp quyền → 12 ngắn + 4 dài + 6 kịch bản + lịch |
| Continuity | Thư viện transform theo nguồn có quyền |
| Chuẩn bị hoàn hảo | 10 nguồn mẫu có quyền; fidelity rubric; không clone giọng / không bịa quyền |

### A06 — Chương trình AI tự học 30 ngày

| | |
|---|---|
| Giá / target | 2.490.000 · 6.000.000/ngày |
| Phạm vi | 12 bài + 30 thực hành; entitlement 90 ngày; không chứng chỉ nghề |
| Continuity 1–3 năm | Cohort lặp; cập nhật bài theo quý; support trong phạm vi |
| Chuẩn bị hoàn hảo | Đủ bài/thực hành đã duyệt; entitlement/revoke; dự phòng nghĩa vụ support |

### A07 — Lịch nội dung doanh nghiệp 30 ngày

| | |
|---|---|
| Giá / target | 2.990.000 · 7.000.000/ngày |
| Phạm vi | 30 bài + 8 kịch bản + 4 email list đã opt-in; một vòng sửa |
| Continuity | Lịch tháng lặp; brand kit versioned |
| Chuẩn bị hoàn hảo | Brief thương hiệu; người duyệt từng bản; không ads/inbox |

### A08 — Landing page một trang theo mẫu

| | |
|---|---|
| Giá / target | 4.990.000 · 8.000.000/ngày |
| Phạm vi | 1 trang ≤7 khối; 1 form; source; không hosting/domain/payment |
| Continuity | Template library; mỗi khách một sandbox build |
| Chuẩn bị hoàn hảo | Sandbox không secret; visual/a11y/function checks; deploy khách duyệt riêng |

### A09 — Thiết kế ba luồng tự động hóa

| | |
|---|---|
| Giá / target | 7.990.000 · 9.000.000/ngày |
| Phạm vi | 3 blueprint + contract + test mô phỏng + runbook; không nối production |
| Continuity | Thư viện blueprint mở rộng theo ngành |
| Chuẩn bị hoàn hảo | 3 module có test; runbook; không quảng cáo “đã live production” |

### A10 — Giấy phép thư viện AI nhóm 10 người / 90 ngày

| | |
|---|---|
| Giá / target | 9.990.000 · 10.000.000/ngày |
| Phạm vi | 10 seats; 60 SOP + 100 mẫu; onboarding; báo cáo sử dụng |
| Continuity 1–3 năm | Gia hạn 90 ngày; tenant IDOR/export/revoke |
| Chuẩn bị hoàn hảo | Đủ thư viện; IDOR/export/revoke tests; license; dự phòng phục vụ |

---

## 5. Ma trận độc lập & tự chủ (tóm tắt)

| ID | Chạy không cần social? | Chạy không cần AI trả phí lúc đầu? | Ledger riêng? | Kill switch riêng? |
|---|---|---|---|---|
| S01–S04 | Có (nội dung trước) | Có (fixture/local) | Theo offer_id | Intake/checkout/publish flags |
| A01–A02, A06, A10 | Có | Có (nội dung tĩnh) | Theo agent_id | Catalog + delivery revoke |
| A03 | Cần URL được phép | Cần sandbox crawler | Có | Stop crawler job |
| A04–A05, A07 | Cần nguồn/quyền khách | Có sau khi có brief | Có | Hold delivery |
| A08–A09 | Cần scope khách | Sandbox local | Có | Không deploy khách thay |

---

## 6. Lộ trình chuẩn bị “hoàn hảo” theo sóng

### Sóng 0 — Nền tảng chung (song song mọi sản phẩm)

- [x] Repo/nhánh/identity đúng (lane `codex/ai-muonnoi-autonomous-ops`).  
- [x] Zero-budget policy + emergency stop (đã có local).  
- [x] Studio review path khóa auto-post (đã có local).  
- [x] **Staging kit local + checklist đọc-only** — `docs/STAGING_KIT_CHECKLIST.md`; generator `npm run prepare:intake:staging`; placeholder `__CLOUDFLARE_FREE_ACCOUNT_ID_REQUIRED__` / `__SEPARATE_STAGING_D1_ID_REQUIRED__`; receipt `.local/continuous/staging-checklist-20261019T145626/`. Bước A local xong; **áp remote vẫn chờ Free account ID**.  
- [ ] Staging biệt lập trên Cloudflare Free khi có account ID (**chờ Founder** — xem checklist mục B).  
- [ ] Merchant + bank importer chỉ đọc (**chờ Founder**).  
- [ ] Một kênh sở hữu + consent (**chờ Founder**).  
- [ ] Người: seller / QA / finance / on-call (**chờ Founder chỉ định**).

Truy vết: mọi sản phẩm S01–S04 và A01–A10 **phụ thuộc cùng Sóng 0**; không nhận đơn thật trước khi staging kit remote + merchant/kênh đạt cho SKU đó.

### Sóng 1 — Mở học hỏi (không scale)

Thứ tự đề xuất: **S01 Pilot → A01 → A02 (một ngành) → A03**.  
Tiêu chí học: 3–5 đơn đã giao có chi phí/QA/hoàn đủ; không kết luận thống kê từ mẫu nhỏ.

### Sóng 2 — Recurring + dịch vụ theo brief

**S02/S03** sau khi Pilot ổn; **A04/A05/A07/A08** chỉ khi có tín hiệu nhu cầu và công suất QA.

### Sóng 3 — Entitlement & B2B sâu (năm 2–3)

**A06, A09, A10, S04** khi thư viện/tenant/security đủ nghiệm thu.

---

## 7. Vận hành AI liên tục trên mỗi sản phẩm (chu kỳ năm)

| Nhịp | Việc AI tự làm | Việc Founder |
|---|---|---|
| Mỗi giờ | Source gate + một việc nội bộ an toàn (theo CONTINUOUS_AUTONOMOUS_OPS) | Không |
| Mỗi ngày | Close hoặc giữ unknown; backlog QA; bản nháp nội dung | Chỉ khi blocked |
| Mỗi tuần | Funnel + chi phí giả định vs actuals null; ưu tiên SKU | Duyệt thay đổi giá/phạm vi lớn |
| Mỗi tháng | Retention, biên, security, roadmap tháng | Duyệt ngân sách nếu >0 |
| Mỗi quý | Phiên bản nội dung major; ngưng SKU yếu bằng evidence | Duyệt ngừng/mở SKU |
| Mỗi năm | Chiến lược 12 tháng tiếp; DR/access review | Duyệt kế hoạch năm |

---

## 8. Điều kiện dừng (áp dụng mọi sản phẩm)

Dừng hành động bị ảnh hưởng khi: mất consent; sai dữ kiện; rò dữ liệu; lỗi tiền; hết quỹ/QA; identity/repo mơ hồ; backup/rollback bắt buộc nhưng thiếu evidence. **Giữ nghĩa vụ đã nhận** — không hủy công để bảo vệ KPI.

---

## 9. Những gì AI không tự bịa trong bản này

- Không khẳng định đã có doanh thu, đã mở bán, đã đạt target.  
- Không khẳng định domain `ai.muonnoi.org` đang phục vụ đúng artifact nhánh ops (receipt DNS/HTTP ngày 19/10 cho thấy body domain **khác** Pages preview/production row).  
- Không tự đặt giá cuối; mọi số tiền là đề xuất.  
- Không thay authority FPOS / release gate workspace.

---

## 10. Hành động sau khi Founder duyệt

1. AI đánh dấu `AP-*` đã duyệt vào `docs/PROJECT.md` (decision log).  
2. AI tiếp tục chuẩn bị Sóng 0–1 dưới 0 VND không chờ thêm.  
3. Founder chỉ gửi: Cloudflare Free account ID, merchant, một kênh, danh tính người duyệt — khi sẵn sàng.  
4. Không mở checkout cho đến khi cổng tương ứng của **từng** SKU đạt.

---

## 11. Chữ ký duyệt

| Vai trò | Tên | Ngày | Kết quả |
|---|---|---|---|
| Founder / final approver | Trần Hà Tâm | ____-__-__ | ☐ Duyệt toàn bộ ☐ Duyệt có sửa ☐ Không duyệt |
| Ghi chú sửa (nếu có) | | | |

**Hết bản thuyết minh.** File này đủ để duyệt danh mục; chi tiết từng Agent gốc còn nằm ở `revenue.tranhatam.com/docs/plans/A01.md`–`A10.md` (bản kế hoạch lịch sử) và registry đang chạy trong repo `ai.muonnoi.org`.
