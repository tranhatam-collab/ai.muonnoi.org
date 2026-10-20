// Tải file EPUB/PDF lên kho `ebooks` của Supabase. Tên file phải trùng cột file_path (ví dụ troi-sinh.epub).
// Dùng: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/upload-ebooks.mjs ./sach/*.epub
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const files = process.argv.slice(2);
if (!url || !key || files.length === 0) {
  console.error("Cần NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY và ít nhất một đường dẫn file.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });
for (const file of files) {
  const name = path.basename(file);
  const body = await readFile(file);
  const contentType = name.endsWith(".pdf") ? "application/pdf" : "application/epub+zip";
  const { error } = await supabase.storage.from("ebooks").upload(name, body, { contentType, upsert: true });
  console.log(error ? `LỖI ${name}: ${error.message}` : `OK ${name} (${body.length} bytes)`);
}
