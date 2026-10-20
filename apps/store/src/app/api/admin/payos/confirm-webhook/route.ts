import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { features, siteUrl } from "@/lib/env";
import { confirmPayosWebhook } from "@/lib/payos";

export const dynamic = "force-dynamic";

/** Đăng ký URL webhook với payOS (làm một lần, hoặc sau khi đổi tên miền). */
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!features.payos) return NextResponse.json({ error: "payOS chưa cấu hình" }, { status: 503 });
  const webhookUrl = `${siteUrl()}/api/webhooks/payos`;
  try {
    const result = await confirmPayosWebhook(webhookUrl);
    return NextResponse.json({ ok: true, webhookUrl, result });
  } catch (e) {
    return NextResponse.json({ ok: false, webhookUrl, error: String(e) }, { status: 502 });
  }
}
