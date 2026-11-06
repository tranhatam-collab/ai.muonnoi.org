import type { PGlite } from "@electric-sql/pglite";
import products from "@/data/products.json";
import { bootDb } from "./pg";
import { World, type NetCfg } from "./world";

export const CFG = {
  supabaseUrl: "https://e2e-project.supabase.test",
  anonKey: "anon-e2e-key",
  serviceKey: "service-e2e-key",
  site: "https://store.e2e.test",
  adminSecret: "admin-e2e-secret-0123456789",
  downloadSecret: "download-e2e-secret-0123456789abcdef",
  payos: { clientId: "e2e-payos-client", apiKey: "e2e-payos-api-key", checksumKey: "e2e-payos-checksum-key-0123456789" },
  paypal: { clientId: "e2e-paypal-client", secret: "e2e-paypal-secret" },
  resendKey: "re_e2e_key",
} satisfies NetCfg & Record<string, unknown>;

/** Phải gọi trước khi chạm vào bất kỳ mã ứng dụng nào: cấu hình được đọc lười từ biến môi trường. */
export function applyEnv(): void {
  Object.assign(process.env, {
    NEXT_PUBLIC_SUPABASE_URL: CFG.supabaseUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: CFG.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: CFG.serviceKey,
    PAYOS_CLIENT_ID: CFG.payos.clientId,
    PAYOS_API_KEY: CFG.payos.apiKey,
    PAYOS_CHECKSUM_KEY: CFG.payos.checksumKey,
    PAYPAL_CLIENT_ID: CFG.paypal.clientId,
    PAYPAL_CLIENT_SECRET: CFG.paypal.secret,
    DOWNLOAD_SECRET: CFG.downloadSecret,
    ADMIN_SECRET: CFG.adminSecret,
    NEXT_PUBLIC_SITE_URL: CFG.site,
    RESEND_API_KEY: CFG.resendKey,
  });
  // Ranh giới thử nghiệm và thật: không đặt PAYPAL_ENV thì phải rơi về sandbox.
  delete process.env.PAYPAL_ENV;
  delete process.env.GMAIL_USER;
  delete process.env.GMAIL_APP_PASSWORD;
}

type Handler = (req: Request, ctx?: unknown) => Promise<Response>;
type CallOpts = { method?: string; json?: unknown; raw?: string; headers?: Record<string, string>; params?: Record<string, string> };

/** Nội dung file giả của một cuốn sách: đủ để so khớp byte sau khi tải về. */
export const fakeEpub = (fileName: string): Uint8Array => Buffer.from(`PK-fake-epub:${fileName}`);

export async function boot() {
  applyEnv();
  const pg: PGlite = await bootDb();
  const world = new World(CFG);
  const uninstall = world.install(pg);
  const { invalidateFileCache } = await import("@/lib/storage");

  const seedFiles = () => {
    world.files.clear();
    for (const p of products) if (p.file_path) world.files.set(p.file_path, fakeEpub(p.file_path));
  };
  seedFiles();

  const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> => (await pg.query<T>(sql, params)).rows;

  /** Xóa dữ liệu giao dịch giữa các ca thử; danh mục sản phẩm từ migration được giữ nguyên. */
  async function reset(): Promise<void> {
    const tables = await q<{ tablename: string }>(
      `select tablename from pg_tables where schemaname = 'public' and tablename in ('store_orders', 'engine_rate_limits')`,
    );
    await pg.exec(`truncate ${tables.map((t) => `public.${t.tablename}`).join(", ")} restart identity cascade`);
    world.reset();
    seedFiles();
    invalidateFileCache();
  }

  async function call(load: () => Promise<Handler>, path: string, opts: CallOpts = {}): Promise<Response> {
    const handler = await load();
    const headers = new Headers(opts.headers);
    let body: string | undefined;
    if (opts.json !== undefined) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(opts.json);
    } else if (opts.raw !== undefined) {
      headers.set("content-type", "application/json");
      body = opts.raw;
    }
    const req = new Request(`${CFG.site}${path}`, { method: opts.method ?? (body === undefined ? "GET" : "POST"), headers, body });
    return handler(req, opts.params ? { params: Promise.resolve(opts.params) } : undefined);
  }

  const h = (p: Promise<unknown>, name: string): Promise<Handler> => p.then((m) => (m as Record<string, unknown>)[name] as Handler);

  const api = {
    checkoutPayos: (json: unknown, headers?: Record<string, string>) =>
      call(() => h(import("@/app/api/checkout/payos/route"), "POST"), "/api/checkout/payos", { method: "POST", json, headers }),
    /** Gửi thân yêu cầu thô (có thể không phải JSON hợp lệ). */
    checkoutPayosRaw: (raw: string) => call(() => h(import("@/app/api/checkout/payos/route"), "POST"), "/api/checkout/payos", { method: "POST", raw }),
    checkoutPaypal: (json: unknown, headers?: Record<string, string>) =>
      call(() => h(import("@/app/api/checkout/paypal/route"), "POST"), "/api/checkout/paypal", { method: "POST", json, headers }),
    paypalCapture: (query: string) => call(() => h(import("@/app/api/checkout/paypal/capture/route"), "GET"), `/api/checkout/paypal/capture?${query}`),
    payosWebhook: (json: unknown) => call(() => h(import("@/app/api/webhooks/payos/route"), "POST"), "/api/webhooks/payos", { method: "POST", json }),
    order: (code: string | number, token: string | null) =>
      call(() => h(import("@/app/api/orders/[code]/route"), "GET"), `/api/orders/${code}${token ? `?t=${encodeURIComponent(token)}` : ""}`, { params: { code: String(code) } }),
    download: (token: string, headers?: Record<string, string>) =>
      call(() => h(import("@/app/api/download/[token]/route"), "GET"), `/api/download/${token}`, { params: { token }, headers }),
    adminStats: (secret?: string) =>
      call(() => h(import("@/app/api/admin/stats/route"), "GET"), "/api/admin/stats", { headers: secret ? { "x-admin-secret": secret } : {} }),
    adminRefund: (code: string | number, secret?: string, json?: unknown) =>
      call(() => h(import("@/app/api/admin/orders/[code]/refund/route"), "POST"), `/api/admin/orders/${code}/refund`, {
        method: "POST",
        json,
        headers: secret ? { "x-admin-secret": secret } : {},
        params: { code: String(code) },
      }),
    resend: (json: unknown, headers?: Record<string, string>) =>
      call(() => h(import("@/app/api/orders/resend/route"), "POST"), "/api/orders/resend", { method: "POST", json, headers }),
    resendRaw: (raw: string) => call(() => h(import("@/app/api/orders/resend/route"), "POST"), "/api/orders/resend", { method: "POST", raw }),
    health: () => call(() => h(import("@/app/api/health/route"), "GET"), "/api/health"),
  };

  return {
    pg,
    world,
    q,
    reset,
    api,
    call,
    h,
    close: async () => {
      uninstall();
      await pg.close();
    },
  };
}

export type E2E = Awaited<ReturnType<typeof boot>>;
