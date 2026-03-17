(function () {
  "use strict";

  var PAGE_SIZE = 3;

  var state = {
    raw: null,
    activeTab: "all",
    activeTopic: "all",
    search: "",
    visibleCount: PAGE_SIZE
  };

  var feedList = document.getElementById("feedList");
  var trendList = document.getElementById("trendList");
  var roomList = document.getElementById("roomList");
  var communityStats = document.getElementById("communityStats");

  var composer = document.getElementById("composerText");
  var publishMockBtn = document.getElementById("publishMockBtn");
  var scrollToComposerBtn = document.getElementById("scrollToComposerBtn");
  var attachLinkBtn = document.getElementById("attachLinkBtn");
  var addTopicBtn = document.getElementById("addTopicBtn");

  var feedTabs = document.getElementById("feedTabs");
  var topicFilter = document.getElementById("topicFilter");
  var feedSearchInput = document.getElementById("feedSearchInput");
  var clearSearchBtn = document.getElementById("clearSearchBtn");
  var resultsCount = document.getElementById("resultsCount");
  var activeSummary = document.getElementById("activeSummary");
  var loadMoreBtn = document.getElementById("loadMoreBtn");
  var resetFiltersBtn = document.getElementById("resetFiltersBtn");

  var postTemplate = document.getElementById("postTemplate");

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function timeLabel(value) {
    return value || "Vừa xong";
  }

  function avatarLabel(name) {
    if (!name) return "A";
    return String(name).trim().charAt(0).toUpperCase();
  }

  function avatarClass(variant) {
    var map = {
      ai: "avatar ai",
      mod: "avatar mod",
      tech: "avatar tech",
      user2: "avatar user2"
    };
    return map[variant] || "avatar";
  }

  function buildPollHtml(pollItems) {
    var items = safeArray(pollItems);
    if (!items.length) return "";

    return items
      .map(function (item) {
        var percent = Number(item.percent || 0);
        return (
          '<div class="poll-row">' +
            "<span>" + escapeHtml(item.label || "") + "</span>" +
            '<div class="poll-bar"><i style="width:' + percent + '%"></i></div>' +
            "<b>" + percent + "%</b>" +
          "</div>"
        );
      })
      .join("");
  }

  function toggleReplyBox(container, author) {
    var existing = container.querySelector(".reply-box");
    if (existing) {
      existing.remove();
      return;
    }

    var replyBox = document.createElement("div");
    replyBox.className = "reply-box";

    var input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Phản hồi " + author + "...";

    var button = document.createElement("button");
    button.type = "button";
    button.textContent = "Gửi";

    button.addEventListener("click", function () {
      var value = input.value.trim();
      if (!value) return;

      alert(
        "Bản alpha local JSON: phản hồi mới sẽ được nối backend ở bước sau.\n\n" +
        "Nội dung: " + value
      );
      input.value = "";
      input.focus();
    });

    replyBox.appendChild(input);
    replyBox.appendChild(button);
    container.appendChild(replyBox);
    input.focus();
  }

  function buildComment(comment, nested) {
    var item = document.createElement("div");
    item.className = "comment-item" + (nested ? " nested" : "");

    var avatar = document.createElement("div");
    avatar.className = "avatar small" + (comment.ai ? " ai" : "");
    avatar.textContent = avatarLabel(comment.author);

    var body = document.createElement("div");
    body.className = "comment-body";

    var head = document.createElement("div");
    head.className = "comment-head";

    var name = document.createElement("strong");
    name.textContent = comment.author || "Ẩn danh";

    head.appendChild(name);

    if (comment.ai) {
      var badge = document.createElement("span");
      badge.className = "verified";
      badge.textContent = "Bot hỗ trợ";
      head.appendChild(badge);
    }

    var meta = document.createElement("span");
    meta.textContent = timeLabel(comment.time);
    head.appendChild(meta);

    var text = document.createElement("p");
    text.textContent = comment.body || "";

    var actions = document.createElement("div");
    actions.className = "comment-actions";

    var usefulBtn = document.createElement("button");
    usefulBtn.type = "button";
    usefulBtn.textContent = "Hữu ích";

    usefulBtn.addEventListener("click", function () {
      usefulBtn.textContent = usefulBtn.textContent === "Đã thích" ? "Hữu ích" : "Đã thích";
    });

    var replyBtn = document.createElement("button");
    replyBtn.type = "button";
    replyBtn.textContent = "Phản hồi";

    replyBtn.addEventListener("click", function () {
      toggleReplyBox(body, comment.author || "người viết");
    });

    actions.appendChild(usefulBtn);
    actions.appendChild(replyBtn);

    body.appendChild(head);
    body.appendChild(text);
    body.appendChild(actions);

    safeArray(comment.replies).forEach(function (reply) {
      body.appendChild(buildComment(reply, true));
    });

    item.appendChild(avatar);
    item.appendChild(body);

    return item;
  }

  function renderPost(post) {
    var fragment = postTemplate.content.cloneNode(true);

    var article = fragment.querySelector(".post-card");
    var avatar = fragment.querySelector(".post-avatar");
    var author = fragment.querySelector(".post-author");
    var badge = fragment.querySelector(".post-badge");
    var time = fragment.querySelector(".post-time");
    var topic = fragment.querySelector(".post-topic");
    var title = fragment.querySelector(".post-title");
    var body = fragment.querySelector(".post-body");

    var labelsWrap = fragment.querySelector(".post-labels");
    var linkPreview = fragment.querySelector(".link-preview");
    var linkTitle = fragment.querySelector(".link-title");
    var linkDesc = fragment.querySelector(".link-desc");
    var pollWrap = fragment.querySelector(".mini-poll");

    var voteCount = fragment.querySelector(".vote-count");
    var commentCount = fragment.querySelector(".comment-count");
    var voteBtn = fragment.querySelector(".vote-btn");
    var commentToggleBtn = fragment.querySelector(".comment-toggle-btn");
    var shareBtn = fragment.querySelector(".share-btn");
    var saveBtn = fragment.querySelector(".save-btn");

    var commentThread = fragment.querySelector(".comment-thread");

    article.dataset.id = post.id || "";

    if (post.featured) article.classList.add("featured");
    if (post.hot) article.classList.add("hot");

    avatar.className = avatarClass(post.avatarVariant);
    avatar.textContent = avatarLabel(post.author);

    author.textContent = post.author || "Ẩn danh";
    time.textContent = timeLabel(post.time);
    topic.textContent = "Chủ đề: " + (post.topic || "Tổng hợp");
    title.textContent = post.title || "";
    body.textContent = post.body || "";

    voteCount.textContent = String(Number(post.votes || 0));
    commentCount.textContent = String(safeArray(post.comments).length);

    if (post.ai) {
      badge.classList.remove("hidden");
      badge.textContent = "Đã gắn nhãn AI";
    } else {
      badge.classList.add("hidden");
    }

    labelsWrap.innerHTML = "";
    safeArray(post.labels).forEach(function (label) {
      var span = document.createElement("span");
      span.className = "post-label";

      if (label.type === "hot") span.classList.add("hot");
      if (label.type === "verified") span.classList.add("verified");
      if (label.type === "ai") span.classList.add("ai");

      span.textContent = label.text || "";
      labelsWrap.appendChild(span);
    });

    if (post.linkPreview) {
      linkPreview.classList.remove("hidden");
      linkTitle.textContent = post.linkPreview.title || "Link";
      linkDesc.textContent = post.linkPreview.description || "";
    }

    if (post.poll && safeArray(post.poll.items).length) {
      pollWrap.classList.remove("hidden");
      pollWrap.innerHTML = buildPollHtml(post.poll.items);
    }

    var comments = safeArray(post.comments);
    if (comments.length) {
      comments.forEach(function (comment) {
        commentThread.appendChild(buildComment(comment, false));
      });
    } else {
      var empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Chưa có bình luận nào. Hãy bắt đầu cuộc trò chuyện.";
      commentThread.appendChild(empty);
    }

    voteBtn.addEventListener("click", function () {
      var current = Number(voteCount.textContent || "0");
      if (voteBtn.classList.contains("active")) {
        voteBtn.classList.remove("active");
        voteCount.textContent = String(Math.max(0, current - 1));
      } else {
        voteBtn.classList.add("active");
        voteCount.textContent = String(current + 1);
      }
    });

    commentToggleBtn.addEventListener("click", function () {
      commentThread.classList.toggle("hidden");
      commentToggleBtn.classList.toggle("active");
    });

    shareBtn.addEventListener("click", function () {
      shareBtn.classList.toggle("active");
      alert("Bản alpha local JSON: nút chia sẻ sẽ nối route share thật ở bước backend.");
    });

    saveBtn.addEventListener("click", function () {
      saveBtn.classList.toggle("active");
    });

    return fragment;
  }

  function getFilteredPosts() {
    if (!state.raw || !Array.isArray(state.raw.posts)) return [];

    var posts = state.raw.posts.slice();

    if (state.activeTab === "hot") {
      posts = posts.filter(function (post) {
        return !!post.hot;
      });
    } else if (state.activeTab === "latest") {
      posts = posts.slice().sort(function (a, b) {
        return Number(b.order || 0) - Number(a.order || 0);
      });
    } else if (state.activeTab === "verified") {
      posts = posts.filter(function (post) {
        return !!post.verified;
      });
    } else if (state.activeTab === "ai") {
      posts = posts.filter(function (post) {
        return !!post.ai;
      });
    }

    if (state.activeTopic !== "all") {
      var topicNeedle = normalizeText(state.activeTopic);
      posts = posts.filter(function (post) {
        return normalizeText(post.topic) === topicNeedle;
      });
    }

    if (state.search) {
      var keyword = normalizeText(state.search);
      posts = posts.filter(function (post) {
        var labelsText = safeArray(post.labels)
          .map(function (item) { return item.text || ""; })
          .join(" ");

        var commentsText = safeArray(post.comments)
          .map(function (comment) {
            var repliesText = safeArray(comment.replies)
              .map(function (reply) {
                return (reply.author || "") + " " + (reply.body || "");
              })
              .join(" ");

            return (comment.author || "") + " " + (comment.body || "") + " " + repliesText;
          })
          .join(" ");

        var haystack = normalizeText(
          [
            post.author,
            post.title,
            post.body,
            post.topic,
            labelsText,
            commentsText
          ].join(" ")
        );

        return haystack.indexOf(keyword) !== -1;
      });
    }

    return posts;
  }

  function updateFeedSummary(total) {
    if (!resultsCount || !activeSummary) return;

    resultsCount.textContent = total + " kết quả";

    var parts = [];

    if (state.activeTab === "all") parts.push("tất cả");
    if (state.activeTab === "hot") parts.push("đang nóng");
    if (state.activeTab === "latest") parts.push("mới nhất");
    if (state.activeTab === "verified") parts.push("đã kiểm nguồn");
    if (state.activeTab === "ai") parts.push("bài có AI");

    if (state.activeTopic !== "all") {
      parts.push("chủ đề: " + state.activeTopic);
    }

    if (state.search) {
      parts.push('tìm: "' + state.search + '"');
    }

    activeSummary.textContent = "Đang xem: " + parts.join(" • ");
  }

  function updateLoadMore(total) {
    if (!loadMoreBtn) return;

    if (total > state.visibleCount) {
      loadMoreBtn.classList.remove("hidden");
    } else {
      loadMoreBtn.classList.add("hidden");
    }
  }

  function renderFeed() {
    if (!feedList) return;

    var posts = getFilteredPosts();
    var visiblePosts = posts.slice(0, state.visibleCount);

    feedList.innerHTML = "";

    if (!visiblePosts.length) {
      var empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Không có bài viết phù hợp với bộ lọc hiện tại.";
      feedList.appendChild(empty);
      updateFeedSummary(posts.length);
      updateLoadMore(posts.length);
      return;
    }

    visiblePosts.forEach(function (post) {
      feedList.appendChild(renderPost(post));
    });

    updateFeedSummary(posts.length);
    updateLoadMore(posts.length);
  }

  function renderTrending(items) {
    if (!trendList) return;

    trendList.innerHTML = "";

    safeArray(items).forEach(function (item) {
      var li = document.createElement("li");
      li.innerHTML =
        '<a href="#">' + escapeHtml(item.tag || "") + '</a>' +
        "<span>" + escapeHtml(item.count || "") + "</span>";
      trendList.appendChild(li);
    });
  }

  function renderRooms(items) {
    if (!roomList) return;

    roomList.innerHTML = "";

    safeArray(items).forEach(function (item) {
      var div = document.createElement("div");
      div.className = "room-card";
      div.innerHTML =
        "<strong>" + escapeHtml(item.name || "") + "</strong>" +
        "<span>" + escapeHtml(item.members || "") + "</span>";
      roomList.appendChild(div);
    });
  }

  function renderStats(items) {
    if (!communityStats) return;

    communityStats.innerHTML = "";

    safeArray(items).forEach(function (item) {
      var div = document.createElement("div");
      div.className = "stat-box";
      div.innerHTML =
        "<b>" + escapeHtml(item.value || "") + "</b>" +
        "<span>" + escapeHtml(item.label || "") + "</span>";
      communityStats.appendChild(div);
    });
  }

  function populateTopics(posts) {
    if (!topicFilter) return;

    var seen = {};
    var topics = [];

    safeArray(posts).forEach(function (post) {
      var topic = String(post.topic || "").trim();
      if (!topic || seen[topic]) return;
      seen[topic] = true;
      topics.push(topic);
    });

    topics.sort(function (a, b) {
      return a.localeCompare(b, "vi");
    });

    topicFilter.innerHTML = '<option value="all">Tất cả chủ đề</option>';

    topics.forEach(function (topic) {
      var option = document.createElement("option");
      option.value = topic;
      option.textContent = topic;
      topicFilter.appendChild(option);
    });
  }

  function bindTabs() {
    if (!feedTabs) return;

    feedTabs.addEventListener("click", function (event) {
      var target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains("tab-btn")) return;

      state.activeTab = target.getAttribute("data-tab") || "all";
      state.visibleCount = PAGE_SIZE;

      Array.prototype.forEach.call(
        feedTabs.querySelectorAll(".tab-btn"),
        function (button) {
          button.classList.remove("active");
        }
      );

      target.classList.add("active");
      renderFeed();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function bindFilters() {
    if (topicFilter) {
      topicFilter.addEventListener("change", function () {
        state.activeTopic = topicFilter.value || "all";
        state.visibleCount = PAGE_SIZE;
        renderFeed();
      });
    }

    if (feedSearchInput) {
      feedSearchInput.addEventListener("input", function () {
        state.search = feedSearchInput.value.trim();
        state.visibleCount = PAGE_SIZE;

        if (clearSearchBtn) {
          if (state.search) clearSearchBtn.classList.remove("hidden");
          else clearSearchBtn.classList.add("hidden");
        }

        renderFeed();
      });
    }

    if (clearSearchBtn && feedSearchInput) {
      clearSearchBtn.addEventListener("click", function () {
        state.search = "";
        feedSearchInput.value = "";
        clearSearchBtn.classList.add("hidden");
        state.visibleCount = PAGE_SIZE;
        renderFeed();
        feedSearchInput.focus();
      });
    }

    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener("click", function () {
        state.activeTab = "all";
        state.activeTopic = "all";
        state.search = "";
        state.visibleCount = PAGE_SIZE;

        if (topicFilter) topicFilter.value = "all";
        if (feedSearchInput) feedSearchInput.value = "";
        if (clearSearchBtn) clearSearchBtn.classList.add("hidden");

        if (feedTabs) {
          Array.prototype.forEach.call(
            feedTabs.querySelectorAll(".tab-btn"),
            function (button) {
              button.classList.remove("active");
              if (button.getAttribute("data-tab") === "all") {
                button.classList.add("active");
              }
            }
          );
        }

        renderFeed();
      });
    }

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", function () {
        state.visibleCount += PAGE_SIZE;
        renderFeed();
      });
    }
  }

  function bindComposer() {
    if (scrollToComposerBtn) {
      scrollToComposerBtn.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (composer) composer.focus();
      });
    }

    if (publishMockBtn) {
      publishMockBtn.addEventListener("click", function () {
        var value = composer ? composer.value.trim() : "";
        if (!value) {
          alert("Hãy nhập nội dung để mô phỏng một bài viết.");
          return;
        }

        alert(
          "Bản alpha local JSON: bài viết mới sẽ được nối API thật ở bước backend.\n\n" +
          "Nội dung: " + value
        );

        composer.value = "";
      });
    }

    if (attachLinkBtn) {
      attachLinkBtn.addEventListener("click", function () {
        alert("Bản alpha local JSON: bước sau sẽ mở form gắn link và preview link thật.");
      });
    }

    if (addTopicBtn) {
      addTopicBtn.addEventListener("click", function () {
        alert("Bản alpha local JSON: bước sau sẽ mở chọn chủ đề và hashtag.");
      });
    }
  }

  async function loadFeed() {
    try {
      var response = await fetch("./data/feed.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Không tải được feed.json");
      }

      state.raw = await response.json();

      renderTrending(state.raw.trending || []);
      renderRooms(state.raw.rooms || []);
      renderStats(state.raw.communityStats || []);
      populateTopics(state.raw.posts || []);
      renderFeed();
    } catch (error) {
      if (feedList) {
        feedList.innerHTML =
          '<div class="empty-state">Không tải được dữ liệu feed local JSON. Kiểm tra lại file <b>data/feed.json</b>.</div>';
      }

      if (trendList) {
        trendList.innerHTML = "<li><span>Lỗi tải xu hướng</span></li>";
      }

      if (roomList) {
        roomList.innerHTML =
          '<div class="room-card"><strong>Lỗi tải dữ liệu</strong><span>Kiểm tra feed.json</span></div>';
      }

      if (communityStats) {
        communityStats.innerHTML =
          '<div class="stat-box"><b>--</b><span>Không tải được</span></div>';
      }

      console.error(error);
    }
  }

  bindTabs();
  bindFilters();
  bindComposer();
  loadFeed();
})();
