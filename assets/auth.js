async function getCurrentUser() {
  const result = await window.API.get("/me");
  if (!result?.ok || !result?.data) {
    throw new Error("Chưa đăng nhập");
  }
  return result.data;
}

function canAccessApp(user) {
  return Boolean(user?.can_access_app);
}

async function requireAuth(redirectTo = "/app/login/") {
  try {
    const user = await getCurrentUser();
    return user;
  } catch (_error) {
    window.location.href = redirectTo;
    return null;
  }
}

async function requireAppAccess(redirectTo = "/app/login/") {
  try {
    const user = await getCurrentUser();
    if (canAccessApp(user)) {
      return user;
    }
    window.location.href = "/profile/";
    return null;
  } catch (_error) {
    window.location.href = redirectTo;
    return null;
  }
}

async function login(email, password) {
  return window.API.post("/login", { email, password });
}

async function logoutAndRedirect(redirectTo = "/app/login/") {
  try {
    await window.API.post("/logout", {});
  } catch (_error) {
    // ignore
  }
  window.location.href = redirectTo;
}

window.Auth = {
  canAccessApp,
  getCurrentUser,
  requireAuth,
  requireAppAccess,
  login,
  logoutAndRedirect
};
