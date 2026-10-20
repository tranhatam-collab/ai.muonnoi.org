import { config } from "./env";

type TokenCache = { token: string; exp: number };
let tokenCache: TokenCache | null = null;

async function accessToken(): Promise<string> {
  const { clientId, secret, baseUrl } = config.paypal;
  if (!clientId || !secret) throw new Error("PayPal chưa cấu hình");
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.token;
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal token ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: json.access_token, exp: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

export type PaypalCreateInput = {
  orderCode: number;
  amountUsd: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  buyerEmail?: string;
};

export async function createPaypalOrder(input: PaypalCreateInput): Promise<{ id: string; approveUrl: string }> {
  const token = await accessToken();
  const body = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: String(input.orderCode),
        custom_id: String(input.orderCode),
        description: input.description.slice(0, 127),
        amount: { currency_code: "USD", value: input.amountUsd.toFixed(2) },
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: config.brand.name,
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
          return_url: input.returnUrl,
          cancel_url: input.cancelUrl,
        },
        ...(input.buyerEmail ? { email_address: input.buyerEmail } : {}),
      },
    },
  };
  const res = await fetch(`${config.paypal.baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `order-${input.orderCode}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal create ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { id: string; links?: Array<{ rel: string; href: string }> };
  const link = json.links?.find((l) => l.rel === "payer-action") ?? json.links?.find((l) => l.rel === "approve");
  if (!link) throw new Error("PayPal không trả về link phê duyệt");
  return { id: json.id, approveUrl: link.href };
}

export type PaypalCapture = {
  id: string;
  status: string;
  captureId: string | null;
  payerEmail: string | null;
  raw: unknown;
};

export async function capturePaypalOrder(paypalOrderId: string): Promise<PaypalCapture> {
  const token = await accessToken();
  const res = await fetch(`${config.paypal.baseUrl}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `capture-${paypalOrderId}`,
    },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    // ORDER_ALREADY_CAPTURED: coi như đã thu, lấy lại trạng thái.
    const issue = JSON.stringify(json);
    if (issue.includes("ORDER_ALREADY_CAPTURED")) return getPaypalOrder(paypalOrderId);
    throw new Error(`PayPal capture ${res.status}: ${issue}`);
  }
  return summarize(json);
}

export async function getPaypalOrder(paypalOrderId: string): Promise<PaypalCapture> {
  const token = await accessToken();
  const res = await fetch(`${config.paypal.baseUrl}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal get ${res.status}: ${await res.text()}`);
  return summarize((await res.json()) as Record<string, unknown>);
}

function summarize(json: Record<string, unknown>): PaypalCapture {
  const units = (json.purchase_units as Array<Record<string, unknown>> | undefined) ?? [];
  const payments = (units[0]?.payments as Record<string, unknown> | undefined) ?? {};
  const captures = (payments.captures as Array<Record<string, unknown>> | undefined) ?? [];
  const payer = (json.payer as Record<string, unknown> | undefined) ?? {};
  return {
    id: String(json.id ?? ""),
    status: String(json.status ?? ""),
    captureId: captures[0]?.id ? String(captures[0].id) : null,
    payerEmail: payer.email_address ? String(payer.email_address) : null,
    raw: json,
  };
}
