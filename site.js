(function () {
  "use strict";

  /* ===============================
     STATE
  =============================== */

  const state = {
    posts: [],
    filtered: [],
    visible: 0,
    limit: 5,
    tab: "all",
    topic: "all",
    search: ""
  };

  /* ===============================
     DOM
  =============================== */

  const feedList = document.getElementById("feedList");
  const template = document.getElementById("postTemplate");

  const searchInput = document.getElementById("feedSearchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");

  const topicFilter = document.getElementById("topicFilter");
  const loadMoreBtn = document.getElementById("loadMoreBtn");

  const tabs = document.querySelectorAll(".tab-btn");

  const resultsCount = document.getElementById("resultsCount");
  const activeSummary = document.getElementById("activeSummary");

  /* ===============================
     MOCK DATA (LOCAL JSON)
  =============================== */

  const MOCK_POSTS = [
    {
      id: 1,
      author: "AI Editorial",
      role: "ai",
      topic: "AI và niềm tin công khai",
      title: "AI có nên được xem là nguồn thông tin đáng tin?",
      body: "Câu hỏi này không còn là lý thuyết. AI đang tham gia trực tiếp vào việc tạo ra thông tin, định hướng nhận thức và ảnh hưởng đến quyết định của con người...",
      tags: ["AI", "Debate"],
      votes: 12,
      comments: [
        { user: "Minh", text: "Cần phân biệt rõ AI tổng hợp và AI suy luận." },
        { user: "Lan", text: "Quan trọng là nguồn dữ liệu huấn luyện." }
      ],
      created: Date.now() - 1000000,
      hot: true,
      verified: true
    },
    {
      id: 2,
      author: "Trần Hà Tâm",
      role: "user",
      topic: "Công nghệ và cộng đồng",
      title: "Một mạng xã hội không tối ưu dopamine có tồn tại được không?",
      body: "Nếu bỏ hoàn toàn cơ chế gây nghiện, liệu một nền tảng có thể giữ chân người dùng bằng giá trị thật?",
      tags: ["Debate"],
      votes: 8,
      comments: [
        { user: "Hoàng", text: "Khó nhưng không phải không thể." }
      ],
      created: Date.now() - 2000000,
      hot: false,
      verified: false
    }
  ];

  /* ===============================
     INIT
  =============================== */

  function init() {
    state.posts = MOCK_POSTS;
    buildTopics();
    applyFilters();
    bindEvents();
  }

  /* ===============================
     BUILD TOPICS
  =============================== */

  function buildTopics() {
    const topics = [...new Set(state.posts.map(p => p.topic))];

    topics.forEach(topic => {
      const option = document.createElement("option");
      option.value = topic;
      option.textContent = topic;
      topicFilter.appendChild(option);
    });
  }

  /* ===============================
     FILTER LOGIC
  =============================== */

  function applyFilters() {
    let data = [...state.posts];

    // tab filter
    if (state.tab === "hot") data = data.filter(p => p.hot);
    if (state.tab === "latest") data = data.sort((a, b) => b.created - a.created);
    if (state.tab === "verified") data = data.filter(p => p.verified);
    if (state.tab === "ai") data = data.filter(p => p.role === "ai");

    // topic
    if (state.topic !== "all") {
      data = data.filter(p => p.topic === state.topic);
    }

    // search
    if (state.search) {
      const s = state.search.toLowerCase();
      data = data.filter(p =>
        p.title.toLowerCase().includes(s) ||
        p.body.toLowerCase().includes(s)
      );
    }

    state.filtered = data;
    state.visible = state.limit;

    render();
    updateSummary();
  }

  /* ===============================
     RENDER
  =============================== */

  function render() {
    feedList.innerHTML = "";

    const slice = state.filtered.slice(0, state.visible);

    if (!slice.length) {
      feedList.innerHTML = `<div class="empty-state">Không có bài phù hợp</div>`;
      return;
    }

    slice.forEach(post => {
      const node = template.content.cloneNode(true);

      node.querySelector(".post-author").textContent = post.author;
      node.querySelector(".post-time").textContent = timeAgo(post.created);
      node.querySelector(".post-title").textContent = post.title;
      node.querySelector(".post-body").textContent = post.body;
      node.querySelector(".post-topic").textContent = "Chủ đề: " + post.topic;

      const vote = node.querySelector(".vote-count");
      vote.textContent = post.votes;

      const commentCount = node.querySelector(".comment-count");
      commentCount.textContent = post.comments.length;

      // labels
      const labels = node.querySelector(".post-labels");
      post.tags.forEach(tag => {
        const span = document.createElement("span");
        span.className = "post-label";
        span.textContent = tag;
        labels.appendChild(span);
      });

      // comments preview
      const thread = node.querySelector(".comment-thread");
      post.comments.forEach(c => {
        const div = document.createElement("div");
        div.className = "comment";
        div.innerHTML = `<b>${c.user}</b>: ${c.text}`;
        thread.appendChild(div);
      });

      // toggle comments
      node.querySelector(".comment-toggle-btn").onclick = () => {
        thread.classList.toggle("hidden");
      };

      feedList.appendChild(node);
    });

    // load more
    if (state.visible < state.filtered.length) {
      loadMoreBtn.classList.remove("hidden");
    } else {
      loadMoreBtn.classList.add("hidden");
    }
  }

  /* ===============================
     SUMMARY
  =============================== */

  function updateSummary() {
    resultsCount.textContent = `${state.filtered.length} kết quả`;

    let summary = [];

    if (state.tab !== "all") summary.push(state.tab);
    if (state.topic !== "all") summary.push(state.topic);
    if (state.search) summary.push(`"${state.search}"`);

    activeSummary.textContent = summary.length
      ? "Đang xem: " + summary.join(" • ")
      : "Đang xem: tất cả";
  }

  /* ===============================
     EVENTS
  =============================== */

  function bindEvents() {
    // search
    searchInput.addEventListener("input", () => {
      state.search = searchInput.value;
      toggleClear();
      applyFilters();
    });

    clearSearchBtn.onclick = () => {
      searchInput.value = "";
      state.search = "";
      toggleClear();
      applyFilters();
    };

    function toggleClear() {
      clearSearchBtn.classList.toggle("hidden", !searchInput.value);
    }

    // topic
    topicFilter.onchange = () => {
      state.topic = topicFilter.value;
      applyFilters();
    };

    // tabs
    tabs.forEach(btn => {
      btn.onclick = () => {
        tabs.forEach(t => t.classList.remove("active"));
        btn.classList.add("active");

        state.tab = btn.dataset.tab;
        applyFilters();
      };
    });

    // load more
    loadMoreBtn.onclick = () => {
      state.visible += state.limit;
      render();
    };

    // scroll to composer
    const scrollBtn = document.getElementById("scrollToComposerBtn");
    if (scrollBtn) {
      scrollBtn.onclick = () => {
        document.getElementById("composerCard").scrollIntoView({
          behavior: "smooth"
        });
      };
    }
  }

  /* ===============================
     UTIL
  =============================== */

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return "vừa xong";
    if (m < 60) return m + " phút trước";
    const h = Math.floor(m / 60);
    if (h < 24) return h + " giờ trước";
    const d = Math.floor(h / 24);
    return d + " ngày trước";
  }

  /* ===============================
     START
  =============================== */

  init();

})();
