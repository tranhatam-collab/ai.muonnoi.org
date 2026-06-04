/**
 * email.ts — Centralized email service for muonnoi.org
 *
 * All templates are bilingual (vi/en).
 * Each send function is fire-and-forget safe (never throws, always logs).
 *
 * Mail endpoint: https://mail.iai.one/_mail/v1/send
 * Auth: Bearer MAIL_API_KEY (= IAI_API_KEY on VPS)
 * Workspace: MAIL_API_WORKSPACE_ID (defaults to "muonnoi.org")
 */

import type { Env } from "../env"

// ── Helpers ──────────────────────────────────────────────────────────────────

function mailBase(env: Env): string {
  return (env.MAIL_API_BASE_URL ?? "https://mail.iai.one/_mail/v1").replace(/\/+$/, "")
}

function workspaceId(env: Env): string {
  return env.MAIL_API_WORKSPACE_ID ?? "muonnoi.org"
}

function fromNoreply(env: Env): string {
  return env.EMAIL_FROM_NOREPLY ?? "Muon Noi <noreply@muonnoi.org>"
}

function newIdempotencyKey(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

interface SendPayload {
  to: string
  from: string
  subject: string
  html: string
  text: string
  message_idempotency_key: string
}

async function sendEmail(env: Env, payload: SendPayload): Promise<{ ok: boolean; reason?: string }> {
  if (!env.MAIL_API_KEY) {
    console.warn("[email] MAIL_API_KEY not set — skipping send")
    return { ok: false, reason: "MAIL_API_KEY_NOT_SET" }
  }

  try {
    const res = await fetch(`${mailBase(env)}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.MAIL_API_KEY}`,
        "X-Workspace-Id": workspaceId(env),
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      console.error("[email] send failed:", res.status, text.slice(0, 300))
      return { ok: false, reason: `provider_${res.status}` }
    }

    return { ok: true }
  } catch (err) {
    console.error("[email] network error:", err instanceof Error ? err.message : String(err))
    return { ok: false, reason: "network_error" }
  }
}

// ── Wrapper: fire-and-forget (never throws) ───────────────────────────────────

export function fireEmail(
  env: Env,
  payload: SendPayload,
  ctx?: { waitUntil(p: Promise<unknown>): void }
): void {
  const send = sendEmail(env, payload).catch(() => {})
  if (ctx) ctx.waitUntil(send)
}

// ── HTML wrapper ──────────────────────────────────────────────────────────────

function htmlWrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  body { margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrap { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  .header { background: #1a1a1a; padding: 28px 32px; }
  .header h1 { margin: 0; color: #fff; font-size: 20px; font-weight: 700; letter-spacing: .3px; }
  .header span { color: #888; font-size: 13px; }
  .body { padding: 32px; color: #333; font-size: 15px; line-height: 1.6; }
  .body p { margin: 0 0 16px; }
  .cta { display: inline-block; margin: 8px 0 20px; padding: 12px 28px; background: #1a1a1a; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; }
  .info-box { background: #f8f8f8; border-left: 4px solid #ddd; padding: 16px 20px; border-radius: 4px; margin: 20px 0; font-size: 14px; }
  .info-box strong { display: block; margin-bottom: 6px; color: #555; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; }
  .footer { border-top: 1px solid #eee; padding: 20px 32px; font-size: 12px; color: #999; }
  .footer a { color: #666; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>Muon Noi</h1>
    <span>muonnoi.org</span>
  </div>
  <div class="body">
    ${body}
  </div>
  <div class="footer">
    Muon Noi &middot; <a href="https://muonnoi.org">muonnoi.org</a> &middot;
    <a href="mailto:support@muonnoi.org">support@muonnoi.org</a><br />
    Đây là email tự động. Vui lòng không reply trực tiếp.
  </div>
</div>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. WELCOME EMAIL — after password registration
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send welcome email after new account created via password registration.
 * Usage: fireEmail(env, buildWelcomeEmail(env, email, name, username), ctx)
 */
export function buildWelcomeEmail(
  env: Env,
  toEmail: string,
  name: string,
  username?: string | null
): SendPayload {
  const displayName = esc(name || username || toEmail.split("@")[0])
  const handle = esc(username ?? toEmail.split("@")[0])

  const html = htmlWrap(`
    <p>Chào <strong>${displayName}</strong>,</p>
    <p>Tài khoản <strong>${handle}</strong> của bạn đã được tạo thành công trên Muon Noi. Chúc mừng!</p>
    <p>Bạn có thể đăng nhập và bắt đầu khám phá ngay:</p>
    <a class="cta" href="https://ai.muonnoi.org/login">Vào workspace của tôi</a>
    <div class="info-box">
      <strong>Tài khoản của bạn</strong>
      Email đăng nhập: <strong>${esc(toEmail)}</strong><br />
      Handle: <strong>@${handle}</strong>
    </div>
    <p style="font-size:13px;color:#888;">Nếu bạn không tạo tài khoản này, hãy bỏ qua email này hoặc liên hệ <a href="mailto:support@muonnoi.org">support@muonnoi.org</a>.</p>
  `)

  const text = `Chào ${name || username || ""},

Tài khoản ${handle} của bạn đã được tạo thành công trên Muon Noi.

Đăng nhập tại: https://ai.muonnoi.org/login
Email: ${toEmail}

Nếu bạn không tạo tài khoản này, hãy liên hệ support@muonnoi.org.

— Muon Noi`

  return {
    to: toEmail,
    from: fromNoreply(env),
    subject: "Chào mừng bạn đến Muon Noi!",
    html,
    text,
    message_idempotency_key: newIdempotencyKey(`welcome_pw_${toEmail.slice(0, 8)}`),
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. WELCOME EMAIL — after Google OAuth (new user)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send welcome email after new account created via Google OAuth.
 * Different copy: emphasizes "đăng nhập bằng Google" flow.
 */
export function buildWelcomeGoogleEmail(
  env: Env,
  toEmail: string,
  name: string
): SendPayload {
  const displayName = esc(name || toEmail.split("@")[0])

  const html = htmlWrap(`
    <p>Chào <strong>${displayName}</strong>,</p>
    <p>Bạn vừa tạo tài khoản Muon Noi thành công bằng Google. Từ giờ bạn có thể đăng nhập bất cứ lúc nào bằng tài khoản Google <strong>${esc(toEmail)}</strong>.</p>
    <a class="cta" href="https://ai.muonnoi.org">Vào workspace của tôi</a>
    <div class="info-box">
      <strong>Phương thức đăng nhập</strong>
      Google OAuth &mdash; <strong>${esc(toEmail)}</strong><br />
      Không cần nhớ mật khẩu riêng. Bấm "Tiếp tục bằng Google" mỗi lần đăng nhập.
    </div>
    <p style="font-size:13px;color:#888;">Câu hỏi? Liên hệ <a href="mailto:support@muonnoi.org">support@muonnoi.org</a>.</p>
  `)

  const text = `Chào ${displayName},

Bạn vừa tạo tài khoản Muon Noi thành công bằng Google (${toEmail}).

Đăng nhập tại: https://ai.muonnoi.org
Phương thức: Tiếp tục bằng Google — không cần mật khẩu riêng.

Câu hỏi? Liên hệ support@muonnoi.org.

— Muon Noi`

  return {
    to: toEmail,
    from: fromNoreply(env),
    subject: "Chào mừng bạn đến Muon Noi!",
    html,
    text,
    message_idempotency_key: newIdempotencyKey(`welcome_gg_${toEmail.slice(0, 8)}`),
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. MAGIC LINK SIGN-IN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send magic link sign-in email.
 * Centralizes the template previously inline in magic-link-api.ts.
 */
export function buildMagicLinkEmail(
  env: Env,
  toEmail: string,
  magicLink: string
): SendPayload {
  const escapedLink = esc(magicLink)

  const html = htmlWrap(`
    <p>Bạn vừa yêu cầu đăng nhập vào Muon Noi.</p>
    <p>Bấm nút bên dưới để đăng nhập. Link có hiệu lực trong <strong>15 phút</strong>.</p>
    <a class="cta" href="${escapedLink}">Đăng nhập ngay</a>
    <p style="font-size:13px;color:#888;">Hoặc copy link này vào trình duyệt:<br /><code style="word-break:break-all;font-size:12px;">${escapedLink}</code></p>
    <div class="info-box">
      <strong>Lưu ý bảo mật</strong>
      Đây là link dùng một lần. Nếu bạn không yêu cầu đăng nhập, hãy bỏ qua email này — tài khoản của bạn vẫn an toàn.
    </div>
  `)

  const text = `Bạn vừa yêu cầu đăng nhập vào Muon Noi.

Dùng link này để đăng nhập (hiệu lực 15 phút):
${magicLink}

Nếu bạn không yêu cầu đăng nhập, hãy bỏ qua email này.

— Muon Noi`

  return {
    to: toEmail,
    from: fromNoreply(env),
    subject: "Link đăng nhập Muon Noi của bạn",
    html,
    text,
    message_idempotency_key: newIdempotencyKey(`ml_${toEmail.slice(0, 8)}`),
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. PAYMENT CONFIRMED
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send payment confirmation email after webhook payment.completed received.
 */
export function buildPaymentConfirmedEmail(
  env: Env,
  toEmail: string,
  opts: {
    name?: string
    amount: number
    currency: string
    intentId: string
    purpose?: string
    completedAt?: string
  }
): SendPayload {
  const name = esc(opts.name ?? toEmail.split("@")[0])
  const amount = opts.amount.toLocaleString("vi-VN")
  const currency = esc(opts.currency)
  const intentId = esc(opts.intentId)
  const purpose = esc(opts.purpose ?? "membership")
  const completedAt = opts.completedAt
    ? new Date(opts.completedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
    : new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })

  const html = htmlWrap(`
    <p>Chào <strong>${name}</strong>,</p>
    <p>Thanh toán của bạn đã được xác nhận thành công. Cảm ơn bạn!</p>
    <div class="info-box">
      <strong>Chi tiết thanh toán</strong>
      Mã giao dịch: <strong>${intentId}</strong><br />
      Số tiền: <strong>${amount} ${currency}</strong><br />
      Mục đích: ${purpose}<br />
      Thời gian: ${completedAt} (GMT+7)
    </div>
    <a class="cta" href="https://ai.muonnoi.org">Vào workspace của tôi</a>
    <p style="font-size:13px;color:#888;">Cần hỗ trợ? Liên hệ <a href="mailto:support@muonnoi.org">support@muonnoi.org</a> kèm mã giao dịch <strong>${intentId}</strong>.</p>
  `)

  const text = `Chào ${name},

Thanh toán của bạn đã được xác nhận thành công.

Mã giao dịch: ${opts.intentId}
Số tiền: ${amount} ${currency}
Mục đích: ${opts.purpose ?? "membership"}
Thời gian: ${completedAt} (GMT+7)

Vào workspace: https://ai.muonnoi.org

Cần hỗ trợ? Liên hệ support@muonnoi.org kèm mã giao dịch.

— Muon Noi`

  return {
    to: toEmail,
    from: fromNoreply(env),
    subject: `Xác nhận thanh toán ${amount} ${currency} — Muon Noi`,
    html,
    text,
    message_idempotency_key: newIdempotencyKey(`pay_ok_${opts.intentId.slice(-8)}`),
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. PAYMENT FAILED
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send payment failure notification.
 */
export function buildPaymentFailedEmail(
  env: Env,
  toEmail: string,
  opts: {
    name?: string
    amount: number
    currency: string
    intentId: string
    reason?: string
  }
): SendPayload {
  const name = esc(opts.name ?? toEmail.split("@")[0])
  const amount = opts.amount.toLocaleString("vi-VN")
  const currency = esc(opts.currency)
  const intentId = esc(opts.intentId)
  const reason = opts.reason ?? "Giao dịch không thành công."

  const html = htmlWrap(`
    <p>Chào <strong>${name}</strong>,</p>
    <p>Rất tiếc, thanh toán của bạn chưa hoàn thành được. Bạn có thể thử lại bất cứ lúc nào.</p>
    <div class="info-box">
      <strong>Chi tiết</strong>
      Mã giao dịch: <strong>${intentId}</strong><br />
      Số tiền: ${amount} ${currency}<br />
      Lý do: ${esc(reason)}
    </div>
    <a class="cta" href="https://ai.muonnoi.org">Thử thanh toán lại</a>
    <p style="font-size:13px;color:#888;">Nếu vấn đề tiếp tục xảy ra, liên hệ <a href="mailto:support@muonnoi.org">support@muonnoi.org</a> kèm mã <strong>${intentId}</strong>. Chúng tôi sẽ hỗ trợ trong vòng 24 giờ.</p>
  `)

  const text = `Chào ${name},

Rất tiếc, thanh toán ${amount} ${currency} chưa hoàn thành được.

Mã giao dịch: ${opts.intentId}
Lý do: ${reason}

Thử lại tại: https://ai.muonnoi.org

Cần hỗ trợ? Liên hệ support@muonnoi.org kèm mã giao dịch.

— Muon Noi`

  return {
    to: toEmail,
    from: fromNoreply(env),
    subject: `Thanh toán chưa thành công — Muon Noi`,
    html,
    text,
    message_idempotency_key: newIdempotencyKey(`pay_fail_${opts.intentId.slice(-8)}`),
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. SUPPORT / HELP CONTACT ACKNOWLEDGMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Acknowledge receipt of a support request.
 * Call this immediately after user submits a help/contact form.
 */
export function buildSupportAckEmail(
  env: Env,
  toEmail: string,
  opts: {
    name?: string
    ticketId: string
    subject: string
    message: string
  }
): SendPayload {
  const name = esc(opts.name ?? toEmail.split("@")[0])
  const ticketId = esc(opts.ticketId)
  const subject = esc(opts.subject)
  const message = esc(opts.message.slice(0, 500)) + (opts.message.length > 500 ? "…" : "")

  const html = htmlWrap(`
    <p>Chào <strong>${name}</strong>,</p>
    <p>Chúng tôi đã nhận được yêu cầu hỗ trợ của bạn và sẽ phản hồi trong vòng <strong>24 giờ</strong> (giờ làm việc).</p>
    <div class="info-box">
      <strong>Ticket của bạn</strong>
      Mã ticket: <strong>#${ticketId}</strong><br />
      Tiêu đề: ${subject}<br />
      Nội dung: <em>${message}</em>
    </div>
    <p>Vui lòng giữ mã ticket <strong>#${ticketId}</strong> để theo dõi. Chúng tôi sẽ reply thẳng về email này.</p>
    <p style="font-size:13px;color:#888;">Cần gấp hơn? Reply email này hoặc liên hệ trực tiếp <a href="mailto:support@muonnoi.org">support@muonnoi.org</a>.</p>
  `)

  const text = `Chào ${name},

Chúng tôi đã nhận được yêu cầu hỗ trợ của bạn.

Mã ticket: #${opts.ticketId}
Tiêu đề: ${opts.subject}
Nội dung: ${opts.message.slice(0, 300)}

Chúng tôi sẽ phản hồi trong vòng 24 giờ (giờ làm việc).
Cần gấp hơn? Reply email này hoặc liên hệ support@muonnoi.org.

— Muon Noi`

  return {
    to: toEmail,
    from: env.EMAIL_FROM ?? "Muon Noi <hello@muonnoi.org>",
    subject: `[#${opts.ticketId}] Đã nhận yêu cầu hỗ trợ — Muon Noi`,
    html,
    text,
    message_idempotency_key: newIdempotencyKey(`support_${ticketId}`),
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. ACCOUNT VERIFIED (email verification complete)
// ═══════════════════════════════════════════════════════════════════════════

export function buildEmailVerifiedEmail(
  env: Env,
  toEmail: string,
  name: string
): SendPayload {
  const displayName = esc(name || toEmail.split("@")[0])

  const html = htmlWrap(`
    <p>Chào <strong>${displayName}</strong>,</p>
    <p>Email <strong>${esc(toEmail)}</strong> đã được xác minh thành công. Tài khoản của bạn hiện đã đầy đủ quyền trên Muon Noi.</p>
    <a class="cta" href="https://ai.muonnoi.org">Vào workspace của tôi</a>
  `)

  const text = `Chào ${displayName},

Email ${toEmail} đã được xác minh thành công.
Tài khoản của bạn hiện đã đầy đủ quyền trên Muon Noi.

Vào workspace: https://ai.muonnoi.org

— Muon Noi`

  return {
    to: toEmail,
    from: fromNoreply(env),
    subject: "Email đã được xác minh — Muon Noi",
    html,
    text,
    message_idempotency_key: newIdempotencyKey(`verified_${toEmail.slice(0, 8)}`),
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. NOTIFICATION — flow execution alert (for automation workflows)
// ═══════════════════════════════════════════════════════════════════════════

export function buildFlowNotificationEmail(
  env: Env,
  toEmail: string,
  opts: {
    name?: string
    flowName: string
    flowId: string
    executionId: string
    status: "completed" | "failed"
    resultSummary?: string
  }
): SendPayload {
  const name = esc(opts.name ?? toEmail.split("@")[0])
  const flowName = esc(opts.flowName)
  const status = opts.status === "completed" ? "✅ Hoàn thành" : "❌ Thất bại"
  const summary = opts.resultSummary ? esc(opts.resultSummary.slice(0, 400)) : ""

  const html = htmlWrap(`
    <p>Chào <strong>${name}</strong>,</p>
    <p>Flow <strong>${flowName}</strong> đã chạy xong.</p>
    <div class="info-box">
      <strong>Kết quả</strong>
      Trạng thái: <strong>${status}</strong><br />
      Flow ID: ${esc(opts.flowId)}<br />
      Execution ID: ${esc(opts.executionId)}<br />
      ${summary ? `Tóm tắt: ${summary}` : ""}
    </div>
    <a class="cta" href="https://ai.muonnoi.org/flows/${esc(opts.flowId)}">Xem chi tiết</a>
  `)

  const text = `Chào ${name},

Flow "${opts.flowName}" đã chạy xong.

Trạng thái: ${opts.status === "completed" ? "Hoàn thành" : "Thất bại"}
Flow ID: ${opts.flowId}
Execution ID: ${opts.executionId}
${opts.resultSummary ? `Tóm tắt: ${opts.resultSummary.slice(0, 200)}` : ""}

Xem chi tiết: https://ai.muonnoi.org/flows/${opts.flowId}

— Muon Noi`

  return {
    to: toEmail,
    from: fromNoreply(env),
    subject: `[${opts.status === "completed" ? "✅" : "❌"}] Flow "${opts.flowName}" — Muon Noi`,
    html,
    text,
    message_idempotency_key: newIdempotencyKey(`flow_${opts.executionId.slice(-8)}`),
  }
}
