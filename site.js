(function () {
  "use strict";

  var composer = document.querySelector(".composer-card textarea");
  var postButtons = document.querySelectorAll(".primary-btn, .primary-action");
  var actionButtons = document.querySelectorAll(".action-btn");
  var commentButtons = document.querySelectorAll(".comment-actions button");

  if (composer) {
    composer.addEventListener("focus", function () {
      document.body.classList.add("composer-focus");
    });

    composer.addEventListener("blur", function () {
      document.body.classList.remove("composer-focus");
    });
  }

  Array.prototype.forEach.call(postButtons, function (button) {
    button.addEventListener("click", function () {
      if (button.classList.contains("primary-btn")) {
        alert("Đây là giao diện social feed alpha. Bước tiếp theo là nối API tạo bài viết thật.")
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (composer) composer.focus();
      }
    });
  });

  Array.prototype.forEach.call(actionButtons, function (button) {
    button.addEventListener("click", function () {
      button.classList.toggle("active");
      if (button.classList.contains("active")) {
        button.style.color = "#7dd3fc";
        button.style.borderColor = "rgba(125,211,252,.22)";
        button.style.background = "rgba(125,211,252,.08)";
      } else {
        button.style.color = "";
        button.style.borderColor = "";
        button.style.background = "";
      }
    });
  });

  Array.prototype.forEach.call(commentButtons, function (button) {
    button.addEventListener("click", function () {
      alert("Bản alpha hiện mới là giao diện. Khi nối backend, nút này sẽ mở reply composer hoặc action thật.");
    });
  });
})();
