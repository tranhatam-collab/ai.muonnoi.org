import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { runPreflight } from "@/lib/preflight";

export const dynamic = "force-dynamic";

/** Kiểm tra sẵn sàng mở bán: cấu hình, migration, RLS, kho file. Cần header x-admin-secret. */
export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(await runPreflight(), { headers: { "Cache-Control": "no-store" } });
}
