import { PayOS, type Webhook, type WebhookData, type PaymentLink } from "@payos/node";
import { config } from "./env";

let client: PayOS | null = null;

export function payosClient(): PayOS {
  const { clientId, apiKey, checksumKey } = config.payos;
  if (!clientId || !apiKey || !checksumKey) throw new Error("payOS chưa cấu hình (PAYOS_CLIENT_ID / PAYOS_API_KEY / PAYOS_CHECKSUM_KEY)");
  if (!client) client = new PayOS({ clientId, apiKey, checksumKey });
  return client;
}

export type PayosCreateInput = {
  orderCode: number;
  amountVnd: number;
  description: string;
  itemName: string;
  returnUrl: string;
  cancelUrl: string;
  buyerEmail?: string;
  buyerName?: string;
  expiresInMinutes?: number;
};

/** Tạo link thanh toán VietQR. Nội dung chuyển khoản (description) tối đa 25 ký tự theo quy định payOS. */
export async function createPayosLink(input: PayosCreateInput) {
  const amount = Math.round(input.amountVnd);
  const res = await payosClient().paymentRequests.create({
    orderCode: input.orderCode,
    amount,
    description: input.description.slice(0, 25),
    returnUrl: input.returnUrl,
    cancelUrl: input.cancelUrl,
    buyerEmail: input.buyerEmail,
    buyerName: input.buyerName,
    items: [{ name: input.itemName.slice(0, 100), quantity: 1, price: amount }],
    expiredAt: Math.floor(Date.now() / 1000) + (input.expiresInMinutes ?? 60) * 60,
  });
  return { checkoutUrl: res.checkoutUrl, paymentLinkId: res.paymentLinkId, qrCode: res.qrCode, status: res.status };
}

/** Xác minh chữ ký webhook; ném lỗi nếu chữ ký sai. */
export async function verifyPayosWebhook(body: unknown): Promise<WebhookData> {
  return payosClient().webhooks.verify(body as Webhook);
}

export async function confirmPayosWebhook(url: string) {
  return payosClient().webhooks.confirm(url);
}

export async function getPayosLink(orderCode: number): Promise<PaymentLink> {
  return payosClient().paymentRequests.get(orderCode);
}
