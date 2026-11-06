import { NextResponse } from "next/server";
import { config, features } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Kiểm tra cấu hình, không lộ khóa. Tác vụ hằng ngày gọi để biết cửa hàng đã sẵn sàng chưa. */
export function GET() {
  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
    features: { db: features.db, payos: features.payos, paypal: features.paypal, downloads: features.downloads, checkout: features.checkout },
    modes: { paypal: config.paypal.env },
  });
}
