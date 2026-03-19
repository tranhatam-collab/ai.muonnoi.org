const API_BASE =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8787/api"
    : "https://api.ai.muonnoi.org/api";
window.API_BASE = API_BASE;
const API_TIMEOUT_MS = 15000;

function buildUrl(path) {
  if (!path.startsWith("/")) {
    return API_BASE + "/" + path;
  }
  return API_BASE + path;
}

async function apiFetch(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(path), {
      credentials: "include",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = {
        ok: false,
        error: "Invalid JSON response",
        raw: text
      };
    }

    if (!response.ok) {
      const message =
        data?.error ||
        data?.message ||
        `HTTP ${response.status}`;
      throw new Error(message);
    }

    return data;
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error("Request timeout");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

window.API = {
  base: API_BASE,

  get(path) {
    return apiFetch(path, { method: "GET" });
  },

  post(path, body) {
    return apiFetch(path, {
      method: "POST",
      body: JSON.stringify(body ?? {})
    });
  },

  put(path, body) {
    return apiFetch(path, {
      method: "PUT",
      body: JSON.stringify(body ?? {})
    });
  },

  del(path) {
    return apiFetch(path, { method: "DELETE" });
  }
};
