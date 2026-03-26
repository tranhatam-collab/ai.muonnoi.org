# nhachung.org

Social feed public beta cho thảo luận, phản biện và kiểm chứng với sự hỗ trợ của AI.

## Kiến trúc

- Frontend public: static HTML/CSS/JS
- Frontend admin-lite: static app shell trong `/app/*`
- Backend: Cloudflare Workers
- Database: Cloudflare D1
- Automation: flow.muonnoi.org + AI APIs

## Cấu trúc repo
- `/`: homepage public, route `login`, `profile`, `post`, `docs`
- `/app`: dashboard và builder nội bộ sau đăng nhập app access
- `/workers/api`: Cloudflare Worker API cho auth, social, AI, Flow API triggers và flows nội bộ
