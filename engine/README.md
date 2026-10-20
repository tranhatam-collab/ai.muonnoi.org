# engine

Phần "bộ não" của Money Engine: nội dung lời nhắc cho tác vụ hằng ngày, mẫu dữ liệu cho hai động cơ còn lại (nội dung và B2B). Mã cửa hàng nằm ở `apps/store`, schema ở `supabase/migrations`.

| File | Dùng để |
|---|---|
| `DAILY_PROMPT.md` | Lời nhắc đầy đủ cho tác vụ chạy mỗi sáng |
| `content/TOPICS.md` | Danh sách đề tài bài viết gắn với từng cuốn sách |
| `outreach/ICP_TEMPLATE.md` | Mẫu mô tả khách hàng mục tiêu cho VCS-EL và AI Accounting Loop, chờ anh điền |

Sổ cái, hàng chờ duyệt và báo cáo nằm trong Supabase (bảng `engine_*`), không nằm trong repo, để tác vụ và anh cùng đọc một nguồn.
