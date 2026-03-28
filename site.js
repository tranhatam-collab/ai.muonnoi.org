(function () {
  "use strict";

  const API_BASE =
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
      ? "http://localhost:8787/api"
      : "https://api.nhachung.org/api";

  const LOGIN_PATH = "/login/";
  const PROFILE_PATH = "/profile/";
  const DOCS_PATH = "/docs/";

  const state = {
    posts: [],
    tab: "all",
    topic: "all",
    search: "",
    nextCursor: null,
    loading: false,
    currentUser: null
  };

  const dom = {
    feedList: document.getElementById("feedList"),
    loadMoreBtn: document.getElementById("loadMoreBtn"),
    searchInput: document.getElementById("feedSearchInput"),
    globalSearchInput: document.getElementById("globalSearchInput"),
    clearSearchBtn: document.getElementById("clearSearchBtn"),
    topicFilter: document.getElementById("topicFilter"),
    composerTopic: document.getElementById("composerTopicSelect"),
    resultsCount: document.getElementById("resultsCount"),
    activeSummary: document.getElementById("activeSummary"),
    publishBtn: document.getElementById("publishMockBtn"),
    composerTitle: document.getElementById("composerTitleInput"),
    composerText: document.getElementById("composerText"),
    composerLinkUrl: document.getElementById("composerLinkUrlInput"),
    composerLinkTitle: document.getElementById("composerLinkTitleInput"),
    notifBtn: document.getElementById("globalNotificationsBtn"),
    profileBtn: document.getElementById("globalProfileBtn"),
    createBtn: document.getElementById("globalCreatePostBtn"),
    aiGuideBtn: document.getElementById("globalAiAssistBtn"),
    scrollBtn: document.getElementById("scrollToComposerBtn"),
    resetBtn: document.getElementById("resetFiltersBtn"),
    refreshBtn: document.getElementById("refreshFeedBtn"),
    composerTitleText: document.getElementById("composer-title"),
    communityStats: document.getElementById("communityStatsGrid"),
    trendingList: document.getElementById("trendingList"),
    roomsList: document.getElementById("roomsList"),
    tabs: Array.from(document.querySelectorAll(".tab-btn"))
  };

  let feedSearchTimer = null;
  let globalSearchTimer = null;

  async function apiFetch(path, options = {}) {
    const response = await fetch(API_BASE + path, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });

    const text = await response.text();
    let payload = {};

    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = {
        ok: false,
        error: "Invalid JSON response"
      };
    }

    payload.ok = response.ok && payload.ok !== false;
    payload.status = response.status;
    if (!payload.error && !response.ok) {
      payload.error = `HTTP ${response.status}`;
    }

    return payload;
  }

  function escHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function redirectToLogin() {
    const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.href = `${LOGIN_PATH}?next=${encodeURIComponent(next)}`;
  }

  function focusComposer() {
    document.getElementById("composerCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => dom.composerTitle?.focus(), 120);
  }

  function timeAgo(timestamp) {
    const diff = Date.now() - Number(timestamp || 0);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  }

  function formatTopic(topic) {
    if (!topic) return "Không gắn chủ đề";
    return topic.startsWith("#") ? topic : `#${topic}`;
  }

  function labelClass(label) {
    if (label === "hot") return "post-label post-label--hot";
    if (label === "verified") return "post-label post-label--verified";
    if (label === "ai") return "post-label post-label--ai";
    return "post-label";
  }

  function labelText(label) {
    const labels = {
      hot: "Đang nóng",
      verified: "Đã kiểm nguồn",
      ai: "Có AI",
      needs_source: "Cần nguồn"
    };

    return labels[label] || label;
  }

  function avatarInitial(name) {
    return name ? name.charAt(0).toUpperCase() : "N";
  }

  function updateSummary() {
    if (!dom.activeSummary) return;

    const parts = [];
    if (state.tab !== "all") parts.push(state.tab);
    if (state.topic !== "all") parts.push(formatTopic(state.topic));
    if (state.search) parts.push(`"${state.search}"`);

    dom.activeSummary.textContent = parts.length
      ? `Đang xem: ${parts.join(" · ")}`
      : "Đang xem: tất cả";
  }

  function setResultsCount(count) {
    if (dom.resultsCount) {
      dom.resultsCount.textContent = `${count} bài viết`;
    }
  }

function setButtonActionsForGuest() {
    if (dom.profileBtn) {
      dom.profileBtn.textContent = "Đăng nhập";
      dom.profileBtn.onclick = redirectToLogin;
    }

    if (dom.notifBtn) {
      dom.notifBtn.textContent = "Thông báo";
      dom.notifBtn.onclick = redirectToLogin;
    }

  }

  function setButtonActionsForMember(user) {
    if (dom.profileBtn) {
      dom.profileBtn.textContent = user.name || "Hồ sơ";
      dom.profileBtn.onclick = () => {
        window.location.href = PROFILE_PATH;
      };
    }

    if (dom.notifBtn) {
      dom.notifBtn.onclick = () => {
        window.location.href = `${PROFILE_PATH}#notifications`;
      };
    }

    if (dom.composerTitleText) {
      dom.composerTitleText.textContent = user.name || "Thành viên Nhà Chung";
    }
  }

  async function initAuth() {
    try {
      const result = await apiFetch("/me");
      if (!result.ok || !result.data) {
        setButtonActionsForGuest();
        return;
      }

      state.currentUser = result.data;
      setButtonActionsForMember(result.data);
      await pollNotifications();
    } catch (_error) {
      setButtonActionsForGuest();
    }
  }

  async function pollNotifications() {
    if (!state.currentUser || !dom.notifBtn) return;

    try {
      const result = await apiFetch("/notifications/count");
      const count = result?.data?.count || 0;
      dom.notifBtn.textContent = count > 0 ? `Thông báo (${count})` : "Thông báo";
    } catch (_error) {
      dom.notifBtn.textContent = "Thông báo";
    }

    window.setTimeout(pollNotifications, 30000);
  }

  function addTopicOption(target, value, label) {
    if (!target || !value) return;
    if (target.querySelector(`option[value="${value}"]`)) return;

    const option = document.createElement("option");
    option.value = value;
    option.textContent = label || formatTopic(value);
    target.appendChild(option);
  }

  async function loadTopics() {
    try {
      const result = await apiFetch("/topics");
      if (!result.ok || !Array.isArray(result.data)) return;

      result.data.forEach((topic) => {
        addTopicOption(dom.topicFilter, topic.slug, topic.name || formatTopic(topic.slug));
        addTopicOption(dom.composerTopic, topic.slug, topic.name || formatTopic(topic.slug));
      });
    } catch (_error) {
      // ignore topic bootstrap errors, trending will backfill the visible options.
    }
  }

  async function loadTrending() {
    try {
      const result = await apiFetch("/trending");
      if (!result.ok || !result.data) return;

      const { communityStats, trending, rooms } = result.data;

      if (dom.communityStats && Array.isArray(communityStats)) {
        dom.communityStats.innerHTML = communityStats.map((item) => `
          <div class="stat-box">
            <b>${escHtml(item.value)}</b>
            <span>${escHtml(item.label)}</span>
          </div>
        `).join("");
      }

      if (dom.trendingList && Array.isArray(trending)) {
        dom.trendingList.innerHTML = trending.map((item) => `
          <button class="trending-item" type="button" data-topic="${escHtml(String(item.tag || "").replace(/^#/, ""))}">
            <strong>${escHtml(item.name || item.tag || "")}</strong>
            <span>${escHtml(item.count || "")}</span>
          </button>
        `).join("");

        dom.trendingList.querySelectorAll(".trending-item").forEach((button) => {
          button.addEventListener("click", () => {
            const topic = button.dataset.topic || "all";
            state.topic = topic;
            if (dom.topicFilter) dom.topicFilter.value = topic;
            updateSummary();
            loadFeed(true);
          });
        });

        trending.forEach((item) => {
          const value = String(item.tag || "").replace(/^#/, "");
          addTopicOption(dom.topicFilter, value, item.name || item.tag || formatTopic(value));
          addTopicOption(dom.composerTopic, value, item.name || item.tag || formatTopic(value));
        });
      }

      if (dom.roomsList && Array.isArray(rooms)) {
        dom.roomsList.innerHTML = rooms.map((room) => `
          <div class="room-row">
            <strong>${escHtml(room.name)}</strong>
            <span>${escHtml(String(room.member_count || 0))} thành viên</span>
          </div>
        `).join("");
      }
    } catch (_error) {
      // Keep the static placeholders on failure.
    }
  }

  async function loadFeed(reset = false) {
    if (!dom.feedList || state.loading) return;
    state.loading = true;

    if (reset) {
      state.posts = [];
      state.nextCursor = null;
      dom.feedList.innerHTML = renderSkeleton();
    }

    const params = new URLSearchParams();
    params.set("tab", state.tab);
    if (state.topic !== "all") params.set("topic", state.topic);
    if (state.search) params.set("q", state.search);
    if (state.nextCursor) params.set("cursor", state.nextCursor);

    try {
      const result = await apiFetch(`/posts?${params.toString()}`);

      if (!result.ok || !Array.isArray(result.data)) {
        await loadFeedJson(reset);
        return;
      }

      const nextPosts = result.data;
      state.nextCursor = result.next_cursor || null;
      state.posts = reset ? nextPosts : state.posts.concat(nextPosts);

      if (reset) {
        dom.feedList.innerHTML = "";
      }

      nextPosts.forEach((post) => {
        dom.feedList.appendChild(renderPost(post));
      });

      if (!state.posts.length) {
        dom.feedList.innerHTML = '<div class="empty-state"><p>Chưa có bài viết nào khớp bộ lọc hiện tại.</p></div>';
      }

      setResultsCount(state.posts.length);
      updateSummary();

      if (dom.loadMoreBtn) {
        dom.loadMoreBtn.classList.toggle("hidden", !state.nextCursor);
      }
    } catch (_error) {
      await loadFeedJson(reset);
    } finally {
      state.loading = false;
    }
  }

  function matchesFallbackPost(post) {
    const topic = String(post.topic || "").replace(/^#/, "").toLowerCase();
    const search = state.search.toLowerCase();
    const body = `${post.title || ""} ${post.body || ""} ${post.author || ""} ${post.topic || ""}`.toLowerCase();
    const labels = (post.labels || []).map((label) => label.type || label.text || "").join(" ").toLowerCase();

    if (state.topic !== "all" && topic !== state.topic) return false;
    if (search && !body.includes(search)) return false;
    if (state.tab === "hot" && !labels.includes("hot")) return false;
    if (state.tab === "verified" && !labels.includes("verified")) return false;
    if (state.tab === "ai" && !post.ai) return false;

    return true;
  }

  async function loadFeedJson(reset) {
    try {
      const response = await fetch("./data/feed.json");
      const json = await response.json();
      const items = (json.posts || []).filter(matchesFallbackPost);

      if (!dom.feedList) return;
      dom.feedList.innerHTML = "";
      state.posts = items;

      items.forEach((post) => {
        dom.feedList.appendChild(renderFeedJsonPost(post));
      });

      if (!items.length) {
        dom.feedList.innerHTML = '<div class="empty-state"><p>Chưa có bài viết nào khớp bộ lọc hiện tại.</p></div>';
      }

      setResultsCount(items.length);
      updateSummary();
      if (dom.loadMoreBtn) dom.loadMoreBtn.classList.add("hidden");
    } catch (_error) {
      dom.feedList.innerHTML = '<div class="empty-state"><p>Không thể tải bảng tin.</p></div>';
      setResultsCount(0);
      updateSummary();
    }
  }

  function renderLabels(labels) {
    return (labels || []).map((item) => {
      const label = item.label || item.type || item;
      const text = item.text || labelText(label);
      return `<span class="${labelClass(label)}">${escHtml(text)}</span>`;
    }).join("");
  }

  function renderPost(post) {
    const article = document.createElement("article");
    article.className = "post-card";
    article.dataset.id = post.id;

    article.innerHTML = `
      <div class="post-header">
        <div class="avatar" aria-hidden="true">${avatarInitial(post.author)}</div>
        <div class="post-meta">
          <div class="post-author">
            <a href="/profile/?id=${post.user_id}" class="post-author-link">${escHtml(post.author || "Ẩn danh")}</a>
            ${post.is_ai ? '<span class="ai-mark" title="AI tham gia">AI</span>' : ""}
            ${post.author_verified ? '<span class="verified-mark" title="Đã xác thực">✓</span>' : ""}
          </div>
          <div class="post-time">${escHtml(formatTopic(post.topic))} · ${timeAgo(post.created_at)}</div>
        </div>
      </div>
      <div class="post-labels">${renderLabels(post.labels)}</div>
      <h2 class="post-title">${escHtml(post.title)}</h2>
      <p class="post-body">${escHtml(post.body)}</p>
      ${post.link_url ? `
        <div class="link-preview">
          <div class="link-content">
            <strong>${escHtml(post.link_title || post.link_url)}</strong>
            <span>${escHtml(post.link_desc || post.link_url)}</span>
            <a class="post-link" href="${escHtml(post.link_url)}" target="_blank" rel="noopener">Mở liên kết</a>
          </div>
        </div>` : ""}
      <div class="post-actions">
        <button class="action-btn vote-btn" type="button">
          Hữu ích <span class="vote-count">${post.vote_count || 0}</span>
        </button>
        <button class="action-btn comment-toggle-btn" type="button">
          Bình luận <span class="comment-count">${post.comment_count || 0}</span>
        </button>
        <button class="action-btn summarize-btn" type="button">AI tóm tắt</button>
        <button class="action-btn save-btn" type="button">Lưu</button>
        <a class="action-btn post-detail-link" href="/post/?id=${post.id}">Xem thêm</a>
      </div>
      <div class="comment-thread hidden">
        <div class="comments-loading">Đang tải bình luận...</div>
      </div>
    `;

    const voteBtn = article.querySelector(".vote-btn");
    const saveBtn = article.querySelector(".save-btn");
    const summarizeBtn = article.querySelector(".summarize-btn");
    const commentToggleBtn = article.querySelector(".comment-toggle-btn");
    const commentThread = article.querySelector(".comment-thread");

    voteBtn.addEventListener("click", async () => {
      if (!state.currentUser) {
        redirectToLogin();
        return;
      }

      const result = await apiFetch(`/posts/${post.id}/vote`, {
        method: "POST",
        body: "{}"
      });

      if (result.ok) {
        voteBtn.querySelector(".vote-count").textContent = String(result.data.vote_count || 0);
        voteBtn.classList.toggle("voted", Boolean(result.data.voted));
      } else {
        window.alert(result.error || "Không thể vote bài viết");
      }
    });

    saveBtn.addEventListener("click", async () => {
      if (!state.currentUser) {
        redirectToLogin();
        return;
      }

      const result = await apiFetch(`/posts/${post.id}/save`, {
        method: "POST",
        body: "{}"
      });

      if (result.ok) {
        saveBtn.textContent = result.data.saved ? "Đã lưu" : "Lưu";
        saveBtn.classList.toggle("saved", Boolean(result.data.saved));
      } else {
        window.alert(result.error || "Không thể lưu bài viết");
      }
    });

    summarizeBtn.addEventListener("click", async () => {
      if (!state.currentUser) {
        redirectToLogin();
        return;
      }

      summarizeBtn.disabled = true;
      summarizeBtn.textContent = "Đang tóm tắt...";

      const result = await apiFetch("/ai/summarize", {
        method: "POST",
        body: JSON.stringify({ post_id: Number(post.id) })
      });

      summarizeBtn.disabled = false;
      summarizeBtn.textContent = "AI tóm tắt";

      const existingSummary = article.querySelector(".ai-summary");
      if (existingSummary) existingSummary.remove();

      if (result.ok) {
        const summary = document.createElement("div");
        summary.className = "ai-summary";
        summary.innerHTML = `<strong>AI summary</strong><p>${escHtml(result.data.summary || "AI chưa khả dụng.")}</p>`;
        article.appendChild(summary);
      } else {
        window.alert(result.error || "AI chưa khả dụng");
      }
    });

    commentToggleBtn.addEventListener("click", async () => {
      commentThread.classList.toggle("hidden");

      if (!commentThread.classList.contains("hidden") && commentThread.querySelector(".comments-loading")) {
        const result = await apiFetch(`/posts/${post.id}/comments`);
        renderComments(commentThread, result.ok ? result.data || [] : [], post.id, commentToggleBtn);
      }
    });

    return article;
  }

  function renderComments(container, comments, postId, commentToggleBtn) {
    const fragments = comments.map((comment) => `
      <div class="comment">
        <div class="avatar small" aria-hidden="true">${avatarInitial(comment.author)}</div>
        <div class="comment-body">
          <div class="comment-author">
            <a class="post-author-link" href="/profile/?id=${comment.user_id || ""}">${escHtml(comment.author || "Ẩn danh")}</a>
            <span class="comment-time">${timeAgo(comment.created_at)}</span>
          </div>
          <p class="comment-text">${escHtml(comment.body)}</p>
        </div>
      </div>
    `).join("");

    container.innerHTML = fragments || '<div class="empty-state"><p>Chưa có bình luận nào.</p></div>';

    if (!state.currentUser) return;

    const form = document.createElement("form");
    form.className = "comment-form";
    form.innerHTML = `
      <textarea class="comment-input" rows="3" maxlength="2000" placeholder="Viết bình luận của bạn..."></textarea>
      <div class="comment-form-actions">
        <button class="primary-btn comment-form-submit" type="submit">Gửi bình luận</button>
      </div>
    `;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const input = form.querySelector(".comment-input");
      const text = input.value.trim();
      if (!text) return;

      const result = await apiFetch(`/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: text })
      });

      if (!result.ok) {
        window.alert(result.error || "Không thể gửi bình luận");
        return;
      }

      input.value = "";
      const existingEmpty = container.querySelector(".empty-state");
      if (existingEmpty) existingEmpty.remove();

      const commentEl = document.createElement("div");
      commentEl.className = "comment";
      commentEl.innerHTML = `
        <div class="avatar small" aria-hidden="true">${avatarInitial(state.currentUser.name)}</div>
        <div class="comment-body">
          <div class="comment-author">
            <a class="post-author-link" href="/profile/">${escHtml(state.currentUser.name || "Bạn")}</a>
            <span class="comment-time">vừa xong</span>
          </div>
          <p class="comment-text">${escHtml(text)}</p>
        </div>
      `;

      container.insertBefore(commentEl, form);

      const countEl = commentToggleBtn.querySelector(".comment-count");
      const nextCount = Number(countEl.textContent || "0") + 1;
      countEl.textContent = String(nextCount);
    });

    container.appendChild(form);
  }

  function renderFeedJsonPost(post) {
    const article = document.createElement("article");
    article.className = "post-card";
    article.innerHTML = `
      <div class="post-header">
        <div class="avatar" aria-hidden="true">${avatarInitial(post.author)}</div>
        <div class="post-meta">
          <div class="post-author">${escHtml(post.author || "Ẩn danh")} ${post.ai ? '<span class="ai-mark">AI</span>' : ""}</div>
          <div class="post-time">${escHtml(post.topic || "Không gắn chủ đề")} · ${escHtml(post.time || "")}</div>
        </div>
      </div>
      <div class="post-labels">${renderLabels(post.labels)}</div>
      <h2 class="post-title">${escHtml(post.title)}</h2>
      <p class="post-body">${escHtml(post.body)}</p>
      <div class="post-actions">
        <button class="action-btn" type="button">Hữu ích <span>${post.votes || 0}</span></button>
        <button class="action-btn comment-toggle-btn" type="button">Bình luận <span>${(post.comments || []).length}</span></button>
      </div>
      <div class="comment-thread hidden">
        ${(post.comments || []).map((comment) => `
          <div class="comment">
            <div class="avatar small" aria-hidden="true">${avatarInitial(comment.author)}</div>
            <div class="comment-body">
              <div class="comment-author">${escHtml(comment.author)}</div>
              <p class="comment-text">${escHtml(comment.body)}</p>
            </div>
          </div>
        `).join("") || '<div class="empty-state"><p>Chưa có bình luận nào.</p></div>'}
      </div>
    `;

    article.querySelector(".comment-toggle-btn").addEventListener("click", () => {
      article.querySelector(".comment-thread").classList.toggle("hidden");
    });

    return article;
  }

  function renderSkeleton() {
    return Array.from({ length: 3 }).map(() => `
      <div class="loading-card">
        <div class="loading-line w-40"></div>
        <div class="loading-line w-90"></div>
        <div class="loading-line w-75"></div>
      </div>
    `).join("");
  }

  async function publishPost() {
    if (!state.currentUser) {
      redirectToLogin();
      return;
    }

    const title = dom.composerTitle?.value.trim() || "";
    const body = dom.composerText?.value.trim() || "";
    const topic = dom.composerTopic?.value || "";
    const linkUrl = dom.composerLinkUrl?.value.trim() || "";
    const linkTitle = dom.composerLinkTitle?.value.trim() || "";

    if (!title || !body) {
      window.alert("Vui lòng nhập cả tiêu đề và nội dung bài viết.");
      if (!title) dom.composerTitle?.focus();
      else dom.composerText?.focus();
      return;
    }

    dom.publishBtn.disabled = true;
    dom.publishBtn.textContent = "Đang đăng...";

    const result = await apiFetch("/posts", {
      method: "POST",
      body: JSON.stringify({
        title,
        body,
        topic,
        link_url: linkUrl || undefined,
        link_title: linkTitle || undefined
      })
    });

    dom.publishBtn.disabled = false;
    dom.publishBtn.textContent = "Đăng thảo luận";

    if (!result.ok) {
      window.alert(result.error || "Không thể đăng bài viết");
      return;
    }

    dom.composerTitle.value = "";
    dom.composerText.value = "";
    dom.composerTopic.value = "";
    dom.composerLinkUrl.value = "";
    dom.composerLinkTitle.value = "";

    await loadFeed(true);
    await loadTrending();
  }

  function bindEvents() {
    dom.searchInput?.addEventListener("input", () => {
      state.search = dom.searchInput.value.trim();
      dom.clearSearchBtn?.classList.toggle("hidden", !state.search);
      window.clearTimeout(feedSearchTimer);
      feedSearchTimer = window.setTimeout(() => loadFeed(true), 350);
    });

    dom.globalSearchInput?.addEventListener("input", () => {
      state.search = dom.globalSearchInput.value.trim();
      if (dom.searchInput) dom.searchInput.value = state.search;
      dom.clearSearchBtn?.classList.toggle("hidden", !state.search);
      window.clearTimeout(globalSearchTimer);
      globalSearchTimer = window.setTimeout(() => loadFeed(true), 350);
    });

    dom.clearSearchBtn?.addEventListener("click", () => {
      state.search = "";
      if (dom.searchInput) dom.searchInput.value = "";
      if (dom.globalSearchInput) dom.globalSearchInput.value = "";
      dom.clearSearchBtn.classList.add("hidden");
      updateSummary();
      loadFeed(true);
    });

    dom.topicFilter?.addEventListener("change", () => {
      state.topic = dom.topicFilter.value;
      updateSummary();
      loadFeed(true);
    });

    dom.tabs.forEach((button) => {
      button.addEventListener("click", () => {
        dom.tabs.forEach((tab) => tab.classList.remove("active"));
        button.classList.add("active");
        state.tab = button.dataset.tab || "all";
        updateSummary();
        loadFeed(true);
      });
    });

    dom.loadMoreBtn?.addEventListener("click", () => loadFeed(false));
    dom.scrollBtn?.addEventListener("click", focusComposer);
    dom.createBtn?.addEventListener("click", () => {
      if (!state.currentUser) {
        redirectToLogin();
        return;
      }
      focusComposer();
    });

    dom.refreshBtn?.addEventListener("click", async () => {
      await loadFeed(true);
      await loadTrending();
    });

    dom.resetBtn?.addEventListener("click", () => {
      state.tab = "all";
      state.topic = "all";
      state.search = "";

      dom.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === "all"));
      if (dom.searchInput) dom.searchInput.value = "";
      if (dom.globalSearchInput) dom.globalSearchInput.value = "";
      if (dom.topicFilter) dom.topicFilter.value = "all";
      dom.clearSearchBtn?.classList.add("hidden");

      updateSummary();
      loadFeed(true);
    });

    dom.publishBtn?.addEventListener("click", publishPost);
    dom.aiGuideBtn?.addEventListener("click", () => {
      window.location.href = `${DOCS_PATH}#ai-overview`;
    });
  }

  async function init() {
    updateSummary();
    bindEvents();
    await initAuth();
    await loadTopics();
    await loadFeed(true);
    await loadTrending();
  }

  init();
})();
