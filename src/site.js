(function () {
  "use strict";

  var state = {
    raw: null,
    activeTab: "all"
  };

  var feedList = document.getElementById("feedList");
  var trendList = document.getElementById("trendList");
  var roomList = document.getElementById("roomList");
  var communityStats = document.getElementById("communityStats");
  var composer = document.getElementById("composerText");
  var publishMockBtn = document.getElementById("publishMockBtn");
  var scrollToComposerBtn = document.getElementById("scrollToComposerBtn");
  var feedTabs = document.getElementById("feedTabs");
  var postTemplate = document.getElementById("postTemplate");

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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
    if (!Array.isArray(pollItems) || !pollItems.length) return "";
    return pollItems.map(function (item) {
      return (
        '<div class="poll-row">' +
          "<span>" + escapeHtml(item.label) + "</span>" +
          '<div class="poll-bar"><i style="width:' + Number(item.percent || 0) + '%"></i></div>' +
          "<b>" + Number(item.percent || 0) + "%</b>" +
        "</div>"
      );
    }).join("");
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
    name.textContent = comment.author;

    var meta = document.createElement("span");
    meta.textContent = timeLabel(comment.time);

    head.appendChild(name);

    if (comment.ai) {
      var badge = document.createElement("span");
      badge.className = "verified";
      badge.textContent = "Bot hỗ trợ";
      head.appendChild(badge);
    }

    head.appendChild(meta);

    var text = document.createElement("p");
    text.textContent = comment.body;

    var actions = document.createElement("div");
    actions.className = "comment-actions";

    var likeBtn = document.createElement("button");
    likeBtn.textContent = "Hữu ích";
    likeBtn.addEventListener("click", function () {
      likeBtn.textContent = likeBtn.textContent === "Đã thích" ? "Hữu ích" : "Đã thích";
    });

    var replyBtn = document.createElement("button");
    replyBtn.textContent = "Phản hồi";
    replyBtn.addEventListener("click", function () {
      toggleReplyBox(body, comment.author);
    });

    actions.appendChild(likeBtn);
    actions.appendChild(replyBtn);

    body.appendChild(head);
    body.appendChild(text);
    body.appendChild(actions);

    if (Array.isArray(comment.replies) && comment.replies.length) {
      comment.replies.forEach(function (reply) {
        body.appendChild(buildComment(reply, true));
      });
    }

    item.appendChild(avatar);
    item.appendChild(body);

    return item;
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

    var btn = document.createElement("button");
    btn.textContent = "Gửi";
    btn.addEventListener("click", function () {
      var value = input.value.trim();
      if (!value) return;
      alert("Bản alpha local JSON: phản hồi mới sẽ được nối backend sau.\n\nNội dung: " + value);
      input.value = "";
    });

    replyBox.appendChild(input);
    replyBox.appendChild(btn);
    container.appendChild(replyBox);
    input.focus();
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

    article.dataset.id = post.id;

    if (post.featured) article.classList.add("featured");
    if (post.hot) article.classList.add("hot");

    avatar.className = avatarClass(post.avatarVariant);
    avatar.textContent = avatarLabel(post.author);

    author.textContent = post.author;
    time.textContent = timeLabel(post.time);
    topic.textContent = "Chủ đề: " + (post.topic || "Tổng hợp");
    title.textContent = post.title;
    body.textContent = post.body;
    voteCount.textContent = String(post.votes || 0);
    commentCount.textContent = String((post.comments || []).length);

    if (post.ai) {
      badge.classList.remove("hidden");
      badge.textContent = "Đã gắn nhãn AI";
    } else {
      badge.classList.add("hidden");
    }

    labelsWrap.innerHTML = "";
    (post.labels || []).forEach(function (label) {
      var span = document.createElement("span");
      span.className = "post-label";
      if (label.type === "hot") span.classList.add("hot");
      if (label.type === "verified") span.classList.add("verified");
      if (label.type === "ai") span.classList.add("ai");
      span.textContent = label.text;
      labelsWrap.appendChild(span);
    });

    if (post.linkPreview) {
      linkPreview.classList.remove("hidden");
      linkTitle.textContent = post.linkPreview.title || "Link";
      linkDesc.textContent = post.linkPreview.description || "";
    }

    if (post.poll && Array.isArray(post.poll.items) && post.poll.items.length) {
      pollWrap.classList.remove("hidden");
      pollWrap.innerHTML = buildPollHtml(post.poll.items);
    }

    if (Array.isArray(post.comments) && post.comments.length) {
      post.comments.forEach(function (comment) {
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
        voteCount.textContent = String(current - 1);
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

  function filterPosts(posts, tab) {
    if (tab === "hot") {
      return posts.filter(function (post) { return !!post.hot; });
    }
    if (tab === "latest") {
      return posts.slice().sort(function (a, b) {
        return Number(b.order || 0) - Number(a.order || 0);
      });
    }
    if (tab === "verified") {
      return posts.filter(function (post) { return !!post.verified; });
    }
    if (tab === "ai") {
      return posts.filter(function (post) { return !!post.ai; });
    }
    return posts;
  }

  function renderFeed() {
    if (!state.raw || !Array.isArray(state.raw.posts)) return;

    var posts = filterPosts(state.raw.posts, state.activeTab);
    feedList.innerHTML = "";

    if (!posts.length) {
      var empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Chưa có bài viết phù hợp với tab này.";
      feedList.appendChild(empty);
      return;
    }

    posts.forEach(function (post) {
      feedList.appendChild(renderPost(post));
    });
  }

  function renderTrending(items) {
    trendList.innerHTML = "";
    (items || []).forEach(function (item) {
      var li = document.createElement("li");
      li.innerHTML =
        '<a href="#">' + escapeHtml(item.tag) + '</a>' +
        "<span>" + escapeHtml(item.count) + "</span>";
      trendList.appendChild(li);
    });
  }

  function renderRooms(items) {
    roomList.innerHTML = "";
    (items || []).forEach(function (item) {
      var div = document.createElement("div");
      div.className = "room-card";
      div.innerHTML =
        "<strong>" + escapeHtml(item.name) + "</strong>" +
        "<span>" + escapeHtml(item.members) + "</span>";
      roomList.appendChild(div);
    });
  }

  function renderStats(items) {
    communityStats.innerHTML = "";
    (items || []).forEach(function (item) {
      var div = document.createElement("div");
      div.className = "stat-box";
      div.innerHTML =
        "<b>" + escapeHtml(item.value) + "</b>" +
        "<span>" + escapeHtml(item.label) + "</span>";
      communityStats.appendChild(div);
    });
  }

  function bindTabs() {
    if (!feedTabs) return;
    feedTabs.addEventListener("click", function (event) {
      var target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains("tab-btn")) return;

      state.activeTab = target.getAttribute("data-tab") || "all";

      Array.prototype.forEach.call(feedTabs.querySelectorAll(".tab-btn"), function (btn) {
        btn.classList.remove("active");
      });

      target.classList.add("active");
      renderFeed();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
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
        alert("Bản alpha local JSON: bài viết mới sẽ được nối API thật ở bước backend.\n\nNội dung: " + value);
        composer.value = "";
      });
    }

    var attachLinkBtn = document.getElementById("attachLinkBtn");
    var addTopicBtn = document.getElementById("addTopicBtn");

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
      if (!response.ok) throw new Error("Không tải được feed.json");
      state.raw = await response.json();

      renderTrending(state.raw.trending || []);
      renderRooms(state.raw.rooms || []);
      renderStats(state.raw.communityStats || []);
      renderFeed();
    } catch (error) {
      feedList.innerHTML =
        '<div class="empty-state">Không tải được dữ liệu feed local JSON. Kiểm tra lại file <b>data/feed.json</b>.</div>';
      trendList.innerHTML = '<li><span>Lỗi tải xu hướng</span></li>';
      roomList.innerHTML = '<div class="room-card"><strong>Lỗi tải dữ liệu</strong><span>Kiểm tra feed.json</span></div>';
      communityStats.innerHTML =
        '<div class="stat-box"><b>--</b><span>Không tải được</span></div>';
      console.error(error);
    }
  }

  bindTabs();
  bindComposer();
  loadFeed();
})();
