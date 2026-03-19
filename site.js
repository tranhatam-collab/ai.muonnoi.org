(function () {
  "use strict";

  /* ===== CONFIG ===== */
  const API_BASE =
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
      ? "http://localhost:8787/api"
      : "https://api.ai.muonnoi.org/api";

  /* ===== STATE ===== */
  const state = {
    posts: [],
    tab: "all",
    topic: "all",
    search: "",
    nextCursor: null,
    loading: false,
    currentUser: null
  };

  /* ===== DOM ===== */
  const feedList        = document.getElementById("feedList");
  const loadMoreBtn     = document.getElementById("loadMoreBtn");
  const searchInput     = document.getElementById("feedSearchInput");
  const clearSearchBtn  = document.getElementById("clearSearchBtn");
  const topicFilter     = document.getElementById("topicFilter");
  const resultsCount    = document.getElementById("resultsCount");
  const activeSummary   = document.getElementById("activeSummary");
  const publishBtn      = document.getElementById("publishMockBtn");
  const composerText    = document.getElementById("composerText");
  const notifBtn        = document.getElementById("globalNotificationsBtn");
  const profileBtn      = document.getElementById("globalProfileBtn");
  const createBtn       = document.getElementById("globalCreatePostBtn");
  const scrollBtn       = document.getElementById("scrollToComposerBtn");
  const resetBtn        = document.getElementById("resetFiltersBtn");
  const tabs            = document.querySelectorAll(".tab-btn");

  /* ===== API HELPER ===== */
  async function apiFetch(path, opts = {}) {
    const res = await fetch(API_BASE + path, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      ...opts
    });
    const data = await res.json().catch(() => ({}));
    return data;
  }

  /* ===== UTIL ===== */
  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return "vừa xong";
    if (m < 60) return m + " phút trước";
    const h = Math.floor(m / 60);
    if (h < 24) return h + " giờ trước";
    return Math.floor(h / 24) + " ngày trước";
  }

  function labelClass(label) {
    if (label === "hot") return "post-label post-label--hot";
    if (label === "verified") return "post-label post-label--verified";
    if (label === "ai") return "post-label post-label--ai";
    return "post-label";
  }

  function labelText(label) {
    const map = { hot: "Đang nóng", verified: "Đã kiểm nguồn", ai: "Có AI", needs_source: "Cần nguồn" };
    return map[label] || label;
  }

  function avatarInitial(name) {
    return name ? name.charAt(0).toUpperCase() : "?";
  }

  /* ===== AUTH BOOTSTRAP ===== */
  async function initAuth() {
    try {
      const data = await apiFetch("/me");
      if (data.ok && data.data) {
        state.currentUser = data.data;
        if (profileBtn) {
          profileBtn.textContent = data.data.name || "Hồ sơ";
          profileBtn.onclick = () => { window.location.href = "/app/"; };
        }
        if (notifBtn) {
          notifBtn.onclick = () => { window.location.href = "/app/"; };
        }
        if (createBtn) {
          createBtn.onclick = () => {
            document.getElementById("composerCard")?.scrollIntoView({ behavior: "smooth" });
          };
        }
        // Update composer name
        const composerName = document.getElementById("composer-title");
        if (composerName) composerName.textContent = data.data.name;
        // Start notification polling
        pollNotifications();
      } else {
        if (profileBtn) { profileBtn.textContent = "Đăng nhập"; profileBtn.onclick = () => { window.location.href = "/app/login/"; }; }
        if (notifBtn) notifBtn.onclick = () => { window.location.href = "/app/login/"; };
        if (createBtn) createBtn.onclick = () => { window.location.href = "/app/login/"; };
      }
    } catch (_) {
      if (profileBtn) { profileBtn.textContent = "Đăng nhập"; profileBtn.onclick = () => { window.location.href = "/app/login/"; }; }
    }
  }

  /* ===== NOTIFICATIONS BADGE ===== */
  async function pollNotifications() {
    if (!state.currentUser) return;
    try {
      const data = await apiFetch("/notifications/count");
      const count = data?.data?.count || 0;
      if (notifBtn) {
        notifBtn.textContent = count > 0 ? `Thông báo (${count})` : "Thông báo";
      }
    } catch (_) {}
    setTimeout(pollNotifications, 30000);
  }

  /* ===== TRENDING SIDEBAR ===== */
  async function loadTrending() {
    try {
      const data = await apiFetch("/trending");
      if (!data.ok) return;
      const { communityStats, trending, rooms } = data.data;

      // Community stats
      const statsEl = document.getElementById("communityStatsGrid");
      if (statsEl && communityStats) {
        statsEl.innerHTML = communityStats.map(s =>
          `<div class="stat-cell"><strong>${s.value}</strong><span>${s.label}</span></div>`
        ).join("");
      }

      // Trending topics
      const trendingEl = document.getElementById("trendingList");
      if (trendingEl && trending) {
        trendingEl.innerHTML = trending.map(t =>
          `<div class="trending-item" data-topic="${t.tag}">
            <span class="trending-tag">${t.tag}</span>
            <span class="trending-count">${t.count}</span>
          </div>`
        ).join("");
        trendingEl.querySelectorAll(".trending-item").forEach(el => {
          el.addEventListener("click", () => {
            state.topic = el.dataset.topic;
            if (topicFilter) topicFilter.value = state.topic;
            loadFeed(true);
          });
        });
      }

      // Rooms
      const roomsEl = document.getElementById("roomsList");
      if (roomsEl && rooms) {
        roomsEl.innerHTML = rooms.map(r =>
          `<div class="room-row"><span>${r.name}</span><span class="room-members">${r.member_count} thành viên</span></div>`
        ).join("");
      }

      // Topics for select
      if (topicFilter && trending) {
        trending.forEach(t => {
          const opt = document.createElement("option");
          opt.value = t.tag;
          opt.textContent = t.name || t.tag;
          topicFilter.appendChild(opt);
        });
      }
    } catch (_) {}
  }

  /* ===== FEED LOADING ===== */
  async function loadFeed(reset = false) {
    if (state.loading) return;
    state.loading = true;

    if (reset) {
      state.posts = [];
      state.nextCursor = null;
      feedList.innerHTML = renderSkeleton();
    }

    const params = new URLSearchParams();
    params.set("tab", state.tab);
    if (state.topic !== "all") params.set("topic", state.topic.replace("#", "").replace(/^#/, ""));
    if (state.search) params.set("q", state.search);
    if (state.nextCursor) params.set("cursor", state.nextCursor);

    try {
      const data = await apiFetch("/posts?" + params.toString());

      if (data.ok) {
        const newPosts = data.data || [];
        state.nextCursor = data.next_cursor || null;
        state.posts = reset ? newPosts : [...state.posts, ...newPosts];

        if (reset) feedList.innerHTML = "";
        newPosts.forEach(p => feedList.appendChild(renderPost(p)));

        if (!state.posts.length) {
          feedList.innerHTML = `<div class="empty-state"><p>Chưa có bài viết nào.</p></div>`;
        }

        if (resultsCount) resultsCount.textContent = `${state.posts.length} bài viết`;

        if (loadMoreBtn) {
          if (state.nextCursor) {
            loadMoreBtn.classList.remove("hidden");
          } else {
            loadMoreBtn.classList.add("hidden");
          }
        }
      } else {
        // Fallback to feed.json
        await loadFeedJson(reset);
      }
    } catch (_) {
      await loadFeedJson(reset);
    } finally {
      state.loading = false;
    }
  }

  async function loadFeedJson(reset) {
    try {
      const res = await fetch("./data/feed.json");
      const json = await res.json();
      const posts = json.posts || [];
      if (reset) feedList.innerHTML = "";
      state.posts = posts;
      posts.forEach(p => feedList.appendChild(renderFeedJsonPost(p)));
      if (resultsCount) resultsCount.textContent = `${posts.length} bài viết`;
    } catch (_) {
      feedList.innerHTML = `<div class="empty-state"><p>Không thể tải bảng tin.</p></div>`;
    }
  }

  /* ===== RENDER POST ===== */
  function renderPost(post) {
    const article = document.createElement("article");
    article.className = "post-card";
    article.dataset.id = post.id;

    const labels = (post.labels || []);
    const labelHtml = labels.map(l =>
      `<span class="${labelClass(l.label)}">${labelText(l.label)}</span>`
    ).join("");

    const initial = avatarInitial(post.author || "?");
    const aiMark = post.is_ai ? `<span class="ai-mark" title="AI">AI</span>` : "";
    const verMark = post.author_verified ? `<span class="verified-mark" title="Đã xác thực">✓</span>` : "";

    article.innerHTML = `
      <div class="post-header">
        <div class="avatar" aria-hidden="true">${initial}</div>
        <div class="post-meta">
          <div class="post-author">${escHtml(post.author || "Ẩn danh")} ${aiMark}${verMark}</div>
          <div class="post-time">${escHtml(post.topic || "")} · ${timeAgo(post.created_at)}</div>
        </div>
      </div>
      <div class="post-labels">${labelHtml}</div>
      <h2 class="post-title">${escHtml(post.title)}</h2>
      <p class="post-body">${escHtml(post.body)}</p>
      ${post.link_url ? `
        <div class="link-preview">
          <a href="${escHtml(post.link_url)}" target="_blank" rel="noopener">
            <strong>${escHtml(post.link_title || post.link_url)}</strong>
            ${post.link_desc ? `<p>${escHtml(post.link_desc)}</p>` : ""}
          </a>
        </div>` : ""}
      <div class="post-actions">
        <button class="vote-btn" data-id="${post.id}">
          <span class="vote-icon">▲</span>
          <span class="vote-count">${post.vote_count || 0}</span>
        </button>
        <button class="comment-toggle-btn ghost-btn small-btn" data-id="${post.id}">
          💬 <span class="comment-count">${post.comment_count || 0}</span>
        </button>
        <button class="ai-summarize-btn ghost-btn small-btn" data-id="${post.id}">AI tóm tắt</button>
        <button class="save-btn ghost-btn small-btn" data-id="${post.id}">Lưu</button>
        <a class="ghost-btn small-btn" href="/app/post/?id=${post.id}">Xem thêm</a>
      </div>
      <div class="comment-thread hidden" data-id="${post.id}">
        <div class="comments-loading">Đang tải...</div>
      </div>
    `;

    // Vote
    article.querySelector(".vote-btn").addEventListener("click", async (e) => {
      if (!state.currentUser) { window.location.href = "/app/login/"; return; }
      const btn = e.currentTarget;
      const result = await apiFetch(`/posts/${post.id}/vote`, { method: "POST", body: "{}" });
      if (result.ok) {
        btn.querySelector(".vote-count").textContent = result.data.vote_count;
        btn.classList.toggle("voted", result.data.voted);
      }
    });

    // Comments toggle
    article.querySelector(".comment-toggle-btn").addEventListener("click", async () => {
      const thread = article.querySelector(".comment-thread");
      thread.classList.toggle("hidden");
      if (!thread.classList.contains("hidden") && thread.querySelector(".comments-loading")) {
        const result = await apiFetch(`/posts/${post.id}/comments`);
        renderComments(thread, result.data || [], post.id);
      }
    });

    // AI Summarize
    article.querySelector(".ai-summarize-btn").addEventListener("click", async (e) => {
      if (!state.currentUser) { window.location.href = "/app/login/"; return; }
      const btn = e.currentTarget;
      btn.textContent = "Đang tóm tắt...";
      btn.disabled = true;
      const result = await apiFetch("/ai/summarize", { method: "POST", body: JSON.stringify({ post_id: post.id }) });
      btn.disabled = false;
      if (result.ok) {
        const sumEl = document.createElement("div");
        sumEl.className = "ai-summary";
        sumEl.innerHTML = `<span class="ai-mark">AI</span> ${escHtml(result.data.summary)}`;
        article.querySelector(".post-body").after(sumEl);
        btn.textContent = "Đã tóm tắt";
      } else {
        btn.textContent = "AI tóm tắt";
      }
    });

    // Save
    article.querySelector(".save-btn").addEventListener("click", async (e) => {
      if (!state.currentUser) { window.location.href = "/app/login/"; return; }
      const btn = e.currentTarget;
      const result = await apiFetch(`/posts/${post.id}/save`, { method: "POST", body: "{}" });
      if (result.ok) {
        btn.textContent = result.data.saved ? "Đã lưu ✓" : "Lưu";
        btn.classList.toggle("saved", result.data.saved);
      }
    });

    return article;
  }

  function renderComments(container, comments, postId) {
    if (!comments.length) {
      container.innerHTML = `<div class="empty-state"><p>Chưa có bình luận nào.</p></div>`;
    } else {
      container.innerHTML = comments.map(c => `
        <div class="comment">
          <div class="avatar small" aria-hidden="true">${avatarInitial(c.author)}</div>
          <div class="comment-body">
            <div class="comment-author">${escHtml(c.author || "Ẩn danh")} ${c.is_ai ? '<span class="ai-mark">AI</span>' : ""}</div>
            <p class="comment-text">${escHtml(c.body)}</p>
            <div class="comment-meta">${timeAgo(c.created_at)}</div>
          </div>
        </div>
      `).join("");
    }

    // Add comment form
    if (state.currentUser) {
      const form = document.createElement("form");
      form.className = "comment-form";
      form.innerHTML = `
        <textarea class="comment-input" placeholder="Thêm bình luận..." rows="2"></textarea>
        <button class="primary-btn small-btn" type="submit">Gửi</button>
      `;
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = form.querySelector(".comment-input");
        const text = input.value.trim();
        if (!text) return;
        const result = await apiFetch(`/posts/${postId}/comments`, {
          method: "POST",
          body: JSON.stringify({ body: text })
        });
        if (result.ok) {
          input.value = "";
          const newComment = document.createElement("div");
          newComment.className = "comment";
          newComment.innerHTML = `
            <div class="avatar small">${avatarInitial(state.currentUser.name)}</div>
            <div class="comment-body">
              <div class="comment-author">${escHtml(state.currentUser.name)}</div>
              <p class="comment-text">${escHtml(text)}</p>
              <div class="comment-meta">vừa xong</div>
            </div>
          `;
          container.insertBefore(newComment, form);
        }
      });
      container.appendChild(form);
    }
  }

  /* ===== RENDER FROM feed.json (FALLBACK) ===== */
  function renderFeedJsonPost(post) {
    const article = document.createElement("article");
    article.className = "post-card";
    const labelHtml = (post.labels || []).map(l =>
      `<span class="${labelClass(l.type)}">${l.text}</span>`
    ).join("");
    const initial = avatarInitial(post.author || "?");
    article.innerHTML = `
      <div class="post-header">
        <div class="avatar" aria-hidden="true">${initial}</div>
        <div class="post-meta">
          <div class="post-author">${escHtml(post.author || "Ẩn danh")} ${post.ai ? '<span class="ai-mark">AI</span>' : ""}</div>
          <div class="post-time">${escHtml(post.topic || "")} · ${post.time || ""}</div>
        </div>
      </div>
      <div class="post-labels">${labelHtml}</div>
      <h2 class="post-title">${escHtml(post.title)}</h2>
      <p class="post-body">${escHtml(post.body)}</p>
      <div class="post-actions">
        <button class="vote-btn"><span class="vote-icon">▲</span> <span class="vote-count">${post.votes || 0}</span></button>
        <button class="comment-toggle-btn ghost-btn small-btn">💬 ${(post.comments || []).length}</button>
      </div>
      <div class="comment-thread hidden">
        ${(post.comments || []).map(c => `<div class="comment"><b>${escHtml(c.author)}</b>: ${escHtml(c.body)}</div>`).join("")}
      </div>
    `;
    article.querySelector(".comment-toggle-btn").addEventListener("click", () => {
      article.querySelector(".comment-thread").classList.toggle("hidden");
    });
    return article;
  }

  function renderSkeleton() {
    return Array(3).fill(0).map(() =>
      `<div class="loading-card">
        <div class="loading-line w-40"></div>
        <div class="loading-line w-90"></div>
        <div class="loading-line w-75"></div>
      </div>`
    ).join("");
  }

  /* ===== COMPOSER ===== */
  function initComposer() {
    if (!publishBtn) return;
    publishBtn.addEventListener("click", async () => {
      if (!state.currentUser) { window.location.href = "/app/login/"; return; }
      const text = composerText?.value?.trim();
      if (!text) { composerText?.focus(); return; }

      publishBtn.disabled = true;
      publishBtn.textContent = "Đang đăng...";

      const result = await apiFetch("/posts", {
        method: "POST",
        body: JSON.stringify({
          title: text.split("\n")[0].slice(0, 200) || "Bài mới",
          body: text
        })
      });

      publishBtn.disabled = false;
      publishBtn.textContent = "Đăng thảo luận";

      if (result.ok) {
        if (composerText) composerText.value = "";
        loadFeed(true);
      }
    });

    // Expand composer on focus
    composerText?.addEventListener("focus", () => {
      document.getElementById("composerCard")?.classList.add("expanded");
    });
  }

  /* ===== EVENTS ===== */
  function bindEvents() {
    // Search
    let searchTimer;
    searchInput?.addEventListener("input", () => {
      state.search = searchInput.value;
      clearSearchBtn?.classList.toggle("hidden", !state.search);
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => loadFeed(true), 500);
    });

    clearSearchBtn?.addEventListener("click", () => {
      if (searchInput) { searchInput.value = ""; state.search = ""; }
      clearSearchBtn.classList.add("hidden");
      loadFeed(true);
    });

    // Topics
    topicFilter?.addEventListener("change", () => {
      state.topic = topicFilter.value;
      loadFeed(true);
    });

    // Tabs
    tabs.forEach(btn => {
      btn.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        btn.classList.add("active");
        state.tab = btn.dataset.tab;
        loadFeed(true);
      });
    });

    // Load more
    loadMoreBtn?.addEventListener("click", () => loadFeed(false));

    // Scroll to composer
    scrollBtn?.addEventListener("click", () => {
      document.getElementById("composerCard")?.scrollIntoView({ behavior: "smooth" });
    });

    // Reset filters
    resetBtn?.addEventListener("click", () => {
      state.tab = "all"; state.topic = "all"; state.search = "";
      if (searchInput) searchInput.value = "";
      if (topicFilter) topicFilter.value = "all";
      tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === "all"));
      loadFeed(true);
    });

    // Global search
    document.getElementById("globalSearchInput")?.addEventListener("input", (e) => {
      state.search = e.target.value;
      if (searchInput) searchInput.value = e.target.value;
      clearTimeout(undefined);
      setTimeout(() => loadFeed(true), 500);
    });

    // Update summary
    if (activeSummary) {
      const observer = new MutationObserver(() => {
        const parts = [];
        if (state.tab !== "all") parts.push(state.tab);
        if (state.topic !== "all") parts.push(state.topic);
        if (state.search) parts.push(`"${state.search}"`);
        activeSummary.textContent = parts.length ? "Đang xem: " + parts.join(" · ") : "Đang xem: tất cả";
      });
      observer.observe(feedList, { childList: true });
    }
  }

  /* ===== XSS PROTECTION ===== */
  function escHtml(str) {
    if (typeof str !== "string") return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ===== START ===== */
  async function init() {
    await initAuth();
    bindEvents();
    initComposer();
    loadFeed(true);
    loadTrending();
  }

  init();

})();
