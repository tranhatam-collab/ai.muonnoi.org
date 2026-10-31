import { config } from "./env";

export type MailInput = { to: string; subject: string; html: string; text: string };

/** Gửi email qua Resend (nếu có khóa) hoặc Gmail SMTP (nếu có App Password). Không có cả hai thì bỏ qua. */
export async function sendMail(input: MailInput): Promise<{ sent: boolean; via: "resend" | "gmail" | "none"; error?: string }> {
  const m = config.mail;
  if (m.resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${m.resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: m.from, to: [input.to], subject: input.subject, html: input.html, text: input.text }),
      });
      if (!res.ok) return { sent: false, via: "resend", error: `${res.status} ${await res.text()}` };
      return { sent: true, via: "resend" };
    } catch (e) {
      return { sent: false, via: "resend", error: String(e) };
    }
  }
  if (m.gmailUser && m.gmailAppPassword) {
    try {
      const nodemailer = await import("nodemailer");
      const transport = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: m.gmailUser, pass: m.gmailAppPassword },
      });
      await transport.sendMail({ from: m.from, to: input.to, subject: input.subject, html: input.html, text: input.text });
      return { sent: true, via: "gmail" };
    } catch (e) {
      return { sent: false, via: "gmail", error: String(e) };
    }
  }
  return { sent: false, via: "none" };
}

export type DeliveryLink = { title: string; url: string };

export function deliveryEmail(opts: { lang: "vi" | "en"; productTitle: string; orderCode: number; links: DeliveryLink[]; ttlHours: number; thankYouUrl: string }) {
  const { lang, productTitle, orderCode, links, ttlHours, thankYouUrl } = opts;
  const list = links.map((l) => `<li><a href="${l.url}">${escapeHtml(l.title)}</a></li>`).join("");
  const plain = links.map((l) => `- ${l.title}: ${l.url}`).join("\n");
  if (lang === "en") {
    return {
      subject: `Your ebook: ${productTitle}`,
      html: `<p>Thank you for your purchase (order ${orderCode}).</p><p>Download links (valid for ${ttlHours} hours):</p><ul>${list}</ul><p>You can also open <a href="${thankYouUrl}">your order page</a> any time to get fresh links.</p><p>${escapeHtml(config.brand.author)}</p>`,
      text: `Thank you for your purchase (order ${orderCode}).\n\nDownload links (valid for ${ttlHours} hours):\n${plain}\n\nOrder page: ${thankYouUrl}\n\n${config.brand.author}`,
    };
  }
  return {
    subject: `Sách của bạn: ${productTitle}`,
    html: `<p>Cảm ơn bạn đã mua sách (đơn ${orderCode}).</p><p>Link tải (có hiệu lực ${ttlHours} giờ):</p><ul>${list}</ul><p>Bạn có thể mở lại <a href="${thankYouUrl}">trang đơn hàng</a> bất cứ lúc nào để lấy link mới.</p><p>${escapeHtml(config.brand.author)}</p>`,
    text: `Cảm ơn bạn đã mua sách (đơn ${orderCode}).\n\nLink tải (có hiệu lực ${ttlHours} giờ):\n${plain}\n\nTrang đơn hàng: ${thankYouUrl}\n\n${config.brand.author}`,
  };
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}
