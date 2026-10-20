// Đọc cấu hình từ biến môi trường. Không ném lỗi lúc import để `next build` chạy được khi thiếu khóa.

function first(...values: Array<string | undefined>): string | undefined {
  for (const v of values) {
    if (v && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

export function siteUrl(): string {
  const explicit = first(process.env.NEXT_PUBLIC_SITE_URL);
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = first(process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL);
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const config = {
  get supabaseUrl() {
    return first(process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabasePublishableKey() {
    return first(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  get supabaseServiceKey() {
    return first(process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  get payos() {
    return {
      clientId: first(process.env.PAYOS_CLIENT_ID),
      apiKey: first(process.env.PAYOS_API_KEY),
      checksumKey: first(process.env.PAYOS_CHECKSUM_KEY),
    };
  },
  get paypal() {
    const envName = first(process.env.PAYPAL_ENV) === "sandbox" ? "sandbox" : "live";
    return {
      clientId: first(process.env.PAYPAL_CLIENT_ID),
      secret: first(process.env.PAYPAL_CLIENT_SECRET),
      env: envName as "live" | "sandbox",
      baseUrl: envName === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com",
    };
  },
  get downloadSecret() {
    return first(process.env.DOWNLOAD_SECRET);
  },
  get downloadTtlHours() {
    const n = Number(first(process.env.DOWNLOAD_TTL_HOURS) ?? "72");
    return Number.isFinite(n) && n > 0 ? n : 72;
  },
  get adminSecret() {
    return first(process.env.ADMIN_SECRET);
  },
  get mail() {
    return {
      resendApiKey: first(process.env.RESEND_API_KEY),
      gmailUser: first(process.env.GMAIL_USER),
      gmailAppPassword: first(process.env.GMAIL_APP_PASSWORD),
      from: first(process.env.MAIL_FROM) ?? "Sách Trần Hà Tâm <tranhatam@gmail.com>",
    };
  },
  storageBucket: "ebooks",
  brand: {
    name: "Sách Trần Hà Tâm",
    author: "Trần Hà Tâm",
    tagline: "Sách để đọc chậm. Thanh toán VietQR hoặc PayPal, nhận EPUB ngay.",
  },
};

export const features = {
  get db() {
    return Boolean(config.supabaseUrl && config.supabaseServiceKey);
  },
  get payos() {
    const p = config.payos;
    return Boolean(p.clientId && p.apiKey && p.checksumKey);
  },
  get paypal() {
    const p = config.paypal;
    return Boolean(p.clientId && p.secret);
  },
  get downloads() {
    return Boolean(config.downloadSecret);
  },
  /** Cửa hàng chỉ nhận đơn khi có sổ cái, khóa ký link tải và ít nhất một cổng thanh toán. */
  get checkout() {
    return features.db && features.downloads && (features.payos || features.paypal);
  },
};
