const next = new URLSearchParams(window.location.search).get("next");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const loginMessage = document.getElementById("loginMessage");

const registerForm = document.getElementById("registerForm");
const registerName = document.getElementById("registerName");
const registerEmail = document.getElementById("registerEmail");
const registerUsername = document.getElementById("registerUsername");
const registerPassword = document.getElementById("registerPassword");
const registerBtn = document.getElementById("registerBtn");
const registerMessage = document.getElementById("registerMessage");

const magicLinkForm = document.getElementById("magicLinkForm");
const magicLinkEmail = document.getElementById("magicLinkEmail");
const magicLinkBtn = document.getElementById("magicLinkBtn");
const magicLinkMessage = document.getElementById("magicLinkMessage");

function resolveNext(user) {
  if (next && next.startsWith("/")) {
    if (next.startsWith("/app/") && !(user && window.Auth.canAccessApp(user))) return "/profile/";
    return next;
  }
  return user && window.Auth.canAccessApp(user) ? "/app/dashboard/" : "/profile/";
}

async function bootstrap() {
  try {
    const me = await window.Auth.getCurrentUser();
    if (me) window.location.href = resolveNext(me);
  } catch (_error) {
    // An anonymous visitor remains on the login page.
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginBtn.disabled = true;
  loginMessage.textContent = "Đang đăng nhập...";
  try {
    const result = await window.Auth.login(loginEmail.value.trim(), loginPassword.value);
    if (result?.ok && result?.data) {
      window.location.href = resolveNext(result.data);
      return;
    }
    loginMessage.textContent = result?.error || "Đăng nhập thất bại";
  } catch (error) {
    loginMessage.textContent = error.message || "Đăng nhập thất bại";
  } finally {
    loginBtn.disabled = false;
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  registerBtn.disabled = true;
  registerMessage.textContent = "Đang tạo tài khoản...";
  try {
    const result = await window.API.post("/register", {
      name: registerName.value.trim(),
      email: registerEmail.value.trim(),
      username: registerUsername.value.trim(),
      password: registerPassword.value
    });
    if (result?.ok && result?.data) {
      window.location.href = resolveNext(result.data);
      return;
    }
    registerMessage.textContent = result?.error || "Tạo tài khoản thất bại";
  } catch (error) {
    registerMessage.textContent = error.message || "Tạo tài khoản thất bại";
  } finally {
    registerBtn.disabled = false;
  }
});

magicLinkForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  magicLinkBtn.disabled = true;
  magicLinkMessage.textContent = "Đang gửi liên kết...";
  try {
    const result = await window.API.post("/auth/magic-link/request", { email: magicLinkEmail.value.trim() });
    if (result?.ok) {
      magicLinkMessage.textContent = "Đã gửi! Kiểm tra email của bạn để lấy liên kết đăng nhập.";
      magicLinkEmail.value = "";
    } else {
      magicLinkMessage.textContent = result?.error || "Gửi thất bại. Vui lòng thử lại.";
    }
  } catch (error) {
    magicLinkMessage.textContent = error.message || "Lỗi. Vui lòng thử lại.";
  } finally {
    magicLinkBtn.disabled = false;
  }
});

const oauthError = new URLSearchParams(window.location.search).get("error");
if (oauthError) magicLinkMessage.textContent = `Đăng nhập Google thất bại (${oauthError}). Vui lòng thử lại.`;

bootstrap();
