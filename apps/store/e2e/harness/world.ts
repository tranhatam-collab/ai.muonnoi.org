import { PayOS } from "@payos/node";
import type { PGlite } from "@electric-sql/pglite";
import { handlePostgrest } from "./postgrest";

// "Thế giới bên ngoài" cho kiểm thử e2e: kho file Supabase, PayPal, payOS và Resend được giả lập
// ở tầng fetch. Ứng dụng chạy nguyên mã thật, không biết mình đang nói chuyện với bản giả.
// Mọi lời gọi tới host không có trong danh sách đều bị ghi lại và ném lỗi, nên không thể vô tình chạm dịch vụ thật.

export type NetCfg = {
  supabaseUrl: string;
  anonKey: string;
  serviceKey: string;
  payos: { clientId: string; apiKey: string; checksumKey: string };
  paypal: { clientId: string; secret: string };
  resendKey: string;
};

export type SentEmail = { from: string; to: string[]; subject: string; html: string; text: string; links: string[] };

type Amount = { currency_code: string; value: string };
type PaypalOrder = {
  id: string;
  status: "CREATED" | "APPROVED" | "COMPLETED";
  unit: { reference_id: string; custom_id: string; description: string; amount: Amount };
  payerEmail: string | null;
  captureId: string | null;
  captureAmount: Amount | null;
};

type PayosCrypto = {
  createSignatureFromObj(data: unknown, key: string): Promise<string | null>;
  createSignatureOfPaymentRequest(data: unknown, key: string): Promise<string | null>;
};

const json = (status: number, payload: unknown): Response =>
  new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });

export class World {
  emails: SentEmail[] = [];
  files = new Map<string, Uint8Array>();
  paypalOrders = new Map<string, PaypalOrder>();
  payosRequests: Array<Record<string, unknown>> = [];
  payosConfirmed: string[] = [];
  paypalWebhookChecks: Array<Record<string, unknown>> = [];
  /** Đặt "FAILURE" để giả lập chữ ký webhook PayPal sai. */
  paypalWebhookVerdict: "SUCCESS" | "FAILURE" = "SUCCESS";
  /** Bật cờ để nhà cung cấp trả lỗi ở lần gọi tạo đơn hoặc gửi email. */
  faults = { payosCreate: false, paypalCreate: false, resend: false };
  calls: string[] = [];
  unexpected: string[] = [];
  private seq = 0;
  private readonly payosCrypto: PayosCrypto;

  constructor(private readonly cfg: NetCfg) {
    const sdk = new PayOS({ clientId: cfg.payos.clientId, apiKey: cfg.payos.apiKey, checksumKey: cfg.payos.checksumKey });
    this.payosCrypto = (sdk as unknown as { crypto: PayosCrypto }).crypto;
  }

  reset(): void {
    this.emails = [];
    this.paypalOrders.clear();
    this.payosRequests = [];
    this.payosConfirmed = [];
    this.paypalWebhookChecks = [];
    this.paypalWebhookVerdict = "SUCCESS";
    this.faults = { payosCreate: false, paypalCreate: false, resend: false };
    this.calls = [];
    this.unexpected = [];
  }

  // ---- Việc "khách" và "nhà cung cấp" làm ngoài ứng dụng ----

  /** Khách bấm đồng ý trên trang PayPal. */
  approvePaypal(id: string, payerEmail = "payer@example.com"): void {
    const o = this.paypalOrders.get(id);
    if (!o) throw new Error(`Không có đơn PayPal ${id}`);
    o.status = "APPROVED";
    o.payerEmail = payerEmail;
  }

  /** Giả lập PayPal thu một số tiền khác với số đặt hàng, để thử khâu đối chiếu của ứng dụng. */
  setPaypalCaptureAmount(id: string, amount: Amount): void {
    const o = this.paypalOrders.get(id);
    if (!o) throw new Error(`Không có đơn PayPal ${id}`);
    o.captureAmount = amount;
  }

  paypalOrderForCode(orderCode: number): PaypalOrder {
    const found = [...this.paypalOrders.values()].find((o) => o.unit.custom_id === String(orderCode));
    if (!found) throw new Error(`Không có đơn PayPal cho mã ${orderCode}`);
    return found;
  }

  /** Gói webhook payOS đã ký đúng thuật toán của SDK. */
  async payosWebhook(data: Record<string, unknown>, opts: { tamper?: boolean } = {}): Promise<Record<string, unknown>> {
    const signature = await this.payosCrypto.createSignatureFromObj(data, this.cfg.payos.checksumKey);
    const body = { code: "00", desc: "success", success: true, data, signature };
    if (opts.tamper) return { ...body, data: { ...data, amount: Number(data.amount) + 1 } };
    return body;
  }

  // ---- Bộ định tuyến fetch ----

  install(db: PGlite): () => void {
    const original = globalThis.fetch;
    const supabaseHost = new URL(this.cfg.supabaseUrl).host;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const req = new Request(input, init);
      const url = new URL(req.url);
      this.calls.push(`${req.method} ${url.host}${url.pathname}`);
      if (url.host === supabaseHost && url.pathname.startsWith("/rest/v1/")) return handlePostgrest(db, req, this.cfg);
      if (url.host === supabaseHost && url.pathname.startsWith("/storage/v1/")) return this.storageApi(req, url);
      if (url.host === "api-m.sandbox.paypal.com") return this.paypalApi(req, url);
      if (url.host === "api-merchant.payos.vn") return this.payosApi(req, url);
      if (url.host === "api.resend.com") return this.resendApi(req);
      this.unexpected.push(`${req.method} ${req.url}`);
      throw new Error(`E2E: gọi mạng ngoài dự kiến ${req.method} ${req.url}`);
    }) as typeof fetch;
    return () => {
      globalThis.fetch = original;
    };
  }

  // ---- Supabase Storage ----

  private storageApi(req: Request, url: URL): Response {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${this.cfg.serviceKey}`) return json(400, { statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy" });
    const list = url.pathname.match(/^\/storage\/v1\/object\/list\/([^/]+)$/);
    if (list && req.method === "POST") {
      if (list[1] !== "ebooks") return json(404, { statusCode: "404", error: "Bucket not found", message: "Bucket not found" });
      const now = new Date().toISOString();
      const items = [...this.files.entries()].map(([name, bytes]) => ({
        name,
        id: `obj-${name}`,
        updated_at: now,
        created_at: now,
        last_accessed_at: now,
        metadata: { size: bytes.byteLength, mimetype: "application/epub+zip" },
      }));
      return json(200, items);
    }
    const obj = url.pathname.match(/^\/storage\/v1\/object\/([^/]+)\/(.+)$/);
    if (obj && req.method === "GET") {
      const bytes = obj[1] === "ebooks" ? this.files.get(decodeURIComponent(obj[2])) : undefined;
      if (!bytes) return json(400, { statusCode: "404", error: "not_found", message: "Object not found" });
      return new Response(Buffer.from(bytes), { status: 200, headers: { "content-type": "application/epub+zip" } });
    }
    return json(404, { message: `storage: chưa giả lập ${req.method} ${url.pathname}` });
  }

  // ---- Resend ----

  private async resendApi(req: Request): Promise<Response> {
    if (req.headers.get("authorization") !== `Bearer ${this.cfg.resendKey}`) return json(401, { name: "missing_api_key", message: "API key is invalid" });
    if (this.faults.resend) return json(500, { name: "application_error", message: "Resend đang lỗi" });
    const b =(await req.json()) as { from: string; to: string[]; subject: string; html: string; text: string };
    const links = [...b.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
    this.emails.push({ from: b.from, to: b.to, subject: b.subject, html: b.html, text: b.text, links });
    return json(200, { id: `email_${++this.seq}` });
  }

  // ---- payOS ----

  private async payosApi(req: Request, url: URL): Promise<Response> {
    if (req.headers.get("x-client-id") !== this.cfg.payos.clientId || req.headers.get("x-api-key") !== this.cfg.payos.apiKey) {
      return json(401, { code: "401", desc: "Unauthorized", data: null });
    }
    if (url.pathname === "/v2/payment-requests" && req.method === "POST") {
      const body = (await req.json()) as Record<string, unknown>;
      if (this.faults.payosCreate) return json(200, { code: "231", desc: "Hệ thống payOS đang bận", data: null });
      const expected = await this.payosCrypto.createSignatureOfPaymentRequest(body, this.cfg.payos.checksumKey);
      if (body.signature !== expected) return json(200, { code: "201", desc: "Chữ ký không hợp lệ", data: null });
      if (!Number.isInteger(body.amount) || Number(body.amount) < 1000) return json(200, { code: "20", desc: "Số tiền không hợp lệ", data: null });
      this.payosRequests.push(body);
      const data = {
        bin: "970436",
        accountNumber: "0000000000",
        accountName: "E2E",
        amount: body.amount,
        description: body.description,
        orderCode: body.orderCode,
        currency: "VND",
        paymentLinkId: `pl_${body.orderCode}`,
        status: "PENDING",
        checkoutUrl: `https://pay.payos.test/web/pl_${body.orderCode}`,
        qrCode: "000201e2e",
      };
      const signature = await this.payosCrypto.createSignatureFromObj(data, this.cfg.payos.checksumKey);
      return json(200, { code: "00", desc: "success", data, signature });
    }
    if (url.pathname === "/confirm-webhook" && req.method === "POST") {
      const { webhookUrl } = (await req.json()) as { webhookUrl: string };
      this.payosConfirmed.push(webhookUrl);
      return json(200, { code: "00", desc: "success", data: { webhookUrl, accountNumber: "0000000000", accountName: "E2E", name: "E2E", shortName: "E2E" } });
    }
    return json(404, { code: "404", desc: `payOS: chưa giả lập ${req.method} ${url.pathname}`, data: null });
  }

  // ---- PayPal (chỉ máy chủ sandbox; máy chủ live bị coi là lời gọi ngoài dự kiến) ----

  private async paypalApi(req: Request, url: URL): Promise<Response> {
    if (url.pathname === "/v1/oauth2/token") {
      const expected = `Basic ${Buffer.from(`${this.cfg.paypal.clientId}:${this.cfg.paypal.secret}`).toString("base64")}`;
      if (req.headers.get("authorization") !== expected) return json(401, { error: "invalid_client" });
      return json(200, { access_token: "pp-token", token_type: "Bearer", expires_in: 3000 });
    }
    if (req.headers.get("authorization") !== "Bearer pp-token") return json(401, { name: "AUTHENTICATION_FAILURE" });

    if (url.pathname === "/v1/notifications/verify-webhook-signature" && req.method === "POST") {
      this.paypalWebhookChecks.push((await req.json()) as Record<string, unknown>);
      return json(200, { verification_status: this.paypalWebhookVerdict });
    }
    if (url.pathname === "/v2/checkout/orders" && req.method === "POST") {
      if (this.faults.paypalCreate) return json(500, { name: "INTERNAL_SERVER_ERROR" });
      const b = (await req.json()) as { purchase_units?: Array<{ reference_id: string; custom_id: string; description: string; amount: Amount }> };
      const unit = b.purchase_units?.[0];
      if (!unit || b.purchase_units?.length !== 1) return json(422, { name: "INVALID_REQUEST" });
      const id = `PPORDER${++this.seq}`;
      this.paypalOrders.set(id, { id, status: "CREATED", unit, payerEmail: null, captureId: null, captureAmount: null });
      return json(201, {
        id,
        status: "PAYER_ACTION_REQUIRED",
        links: [{ rel: "payer-action", href: `https://paypal.e2e.test/checkoutnow?token=${id}` }],
      });
    }
    const m = url.pathname.match(/^\/v2\/checkout\/orders\/([^/]+)(\/capture)?$/);
    if (m) {
      const o = this.paypalOrders.get(decodeURIComponent(m[1]));
      if (!o) return json(404, { name: "RESOURCE_NOT_FOUND" });
      if (m[2] && req.method === "POST") {
        if (o.status === "COMPLETED") return json(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_ALREADY_CAPTURED" }] });
        if (o.status !== "APPROVED") return json(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_NOT_APPROVED" }] });
        o.status = "COMPLETED";
        o.captureId = `CAP${++this.seq}`;
      }
      return json(200, this.paypalView(o));
    }
    return json(404, { name: "RESOURCE_NOT_FOUND", message: `PayPal: chưa giả lập ${req.method} ${url.pathname}` });
  }

  private paypalView(o: PaypalOrder): Record<string, unknown> {
    const unit: Record<string, unknown> = { reference_id: o.unit.reference_id, amount: o.unit.amount };
    if (o.status === "COMPLETED") {
      unit.payments = { captures: [{ id: o.captureId, status: "COMPLETED", amount: o.captureAmount ?? o.unit.amount, custom_id: o.unit.custom_id }] };
    } else {
      unit.custom_id = o.unit.custom_id;
    }
    return { id: o.id, status: o.status, purchase_units: [unit], payer: o.payerEmail ? { email_address: o.payerEmail } : {} };
  }
}
