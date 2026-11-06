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

export function deliveryEmail(opts: { lang: "vi" | "en"; productTitle: string; orderCode: number; links: DeliveryLink[]; ttlHours: number; thankYouUrl: string; pageDays: number; resendUrl: string }) {
  const { lang, productTitle, orderCode, links, ttlHours, thankYouUrl, pageDays, resendUrl } = opts;
  const list = links.map((l) => `<li><a href="${escapeHtml(l.url)}">${escapeHtml(l.title)}</a></li>`).join("");
  const plain = links.map((l) => `- ${l.title}: ${l.url}`).join("\n");
  if (lang === "en") {
    return {
      subject: `Your ebook: ${productTitle}`,
      html: `<p>Thank you for your purchase (order ${orderCode}).</p><p>Download links (valid for ${ttlHours} hours):</p><ul>${list}</ul><p>Your <a href="${escapeHtml(thankYouUrl)}">order page</a> stays available for ${pageDays} days and gives you fresh links. After that, or if you lose this email, request new links at <a href="${escapeHtml(resendUrl)}">${escapeHtml(resendUrl)}</a>.</p><p>${escapeHtml(config.brand.author)}</p>`,
      text: `Thank you for your purchase (order ${orderCode}).\n\nDownload links (valid for ${ttlHours} hours):\n${plain}\n\nOrder page (valid ${pageDays} days): ${thankYouUrl}\nLost the links? ${resendUrl}\n\n${config.brand.author}`,
    };
  }
  return {
    subject: `Sách của bạn: ${productTitle}`,
    html: `<p>Cảm ơn bạn đã mua sách (đơn ${orderCode}).</p><p>Link tải (có hiệu lực ${ttlHours} giờ):</p><ul>${list}</ul><p>Trang <a href="${escapeHtml(thankYouUrl)}">đơn hàng</a> dùng được trong ${pageDays} ngày và cấp link mới cho bạn. Sau đó, hoặc nếu mất email này, hãy xin lại link tại <a href="${escapeHtml(resendUrl)}">${escapeHtml(resendUrl)}</a>.</p><p>${escapeHtml(config.brand.author)}</p>`,
    text: `Cảm ơn bạn đã mua sách (đơn ${orderCode}).\n\nLink tải (có hiệu lực ${ttlHours} giờ):\n${plain}\n\nTrang đơn hàng (dùng được ${pageDays} ngày): ${thankYouUrl}\nMất link? ${resendUrl}\n\n${config.brand.author}`,
  };
}

export type ResendItem = { title: string; orderCode: number; url: string };

/** Email gửi lại link: mỗi đơn đã trả một đường dẫn tới trang đơn hàng, nơi cấp link tải mới. */
export function resendEmail(opts: { lang: "vi" | "en"; items: ResendItem[]; pageDays: number }) {
  const { lang, items, pageDays } = opts;
  const list = items.map((i) => `<li><a href="${escapeHtml(i.url)}">${escapeHtml(i.title)} (${i.orderCode})</a></li>`).join("");
  const plain = items.map((i) => `- ${i.title} (${i.orderCode}): ${i.url}`).join("\n");
  if (lang === "en") {
    return {
      subject: "Your ebook download links",
      html: `<p>You asked for your download links again. Open an order below to get fresh links (valid ${pageDays} days):</p><ul>${list}</ul><p>If you did not ask for this, ignore this email.</p><p>${escapeHtml(config.brand.author)}</p>`,
      text: `You asked for your download links again. Open an order below to get fresh links (valid ${pageDays} days):\n${plain}\n\nIf you did not ask for this, ignore this email.\n\n${config.brand.author}`,
    };
  }
  return {
    subject: "Link tải sách của bạn",
    html: `<p>Bạn vừa xin lại link tải sách. Mở một đơn bên dưới để nhận link mới (dùng được ${pageDays} ngày):</p><ul>${list}</ul><p>Nếu không phải bạn yêu cầu, hãy bỏ qua email này.</p><p>${escapeHtml(config.brand.author)}</p>`,
    text: `Bạn vừa xin lại link tải sách. Mở một đơn bên dưới để nhận link mới (dùng được ${pageDays} ngày):\n${plain}\n\nNếu không phải bạn yêu cầu, hãy bỏ qua email này.\n\n${config.brand.author}`,
  };
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}
