import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "./env";

let anon: SupabaseClient | null = null;
let service: SupabaseClient | null = null;

/** Client công khai: chỉ đọc sản phẩm đang bán (RLS). */
export function anonClient(): SupabaseClient | null {
  const url = config.supabaseUrl;
  const key = config.supabasePublishableKey;
  if (!url || !key) return null;
  if (!anon) anon = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return anon;
}

/** Client server: đọc/ghi đơn hàng, kho file. Không bao giờ đưa xuống trình duyệt. */
export function serviceClient(): SupabaseClient | null {
  const url = config.supabaseUrl;
  const key = config.supabaseServiceKey;
  if (!url || !key) return null;
  if (!service) service = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return service;
}
