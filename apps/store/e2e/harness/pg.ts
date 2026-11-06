import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

/** Tìm supabase/migrations từ thư mục đang chạy test (apps/store) đi lên. */
export function migrationsDir(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, "supabase", "migrations");
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  throw new Error("Không tìm thấy supabase/migrations");
}

/**
 * Dựng bối cảnh giống Supabase trước khi chạy migration: các role mặc định, schema storage,
 * và quyền mặc định cho bảng, dãy số, hàm mới trong public. Nhờ vậy việc migration có thu hồi
 * quyền hay không sẽ lộ ra khi kiểm thử với role anon.
 */
const PRELUDE = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema storage;
  create table storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

/** Postgres thật (PGlite) với đúng các file migration trong repo, chạy theo thứ tự tên file. */
export async function bootDb(): Promise<PGlite> {
  const pg = new PGlite({
    extensions: { pgcrypto },
    // PostgREST trả bigint và numeric dưới dạng số JSON; ép giống vậy để mã ứng dụng thấy cùng kiểu dữ liệu.
    parsers: { 20: (v: string) => Number(v), 1700: (v: string) => Number(v) },
  });
  await pg.exec(PRELUDE);
  const dir = migrationsDir();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await pg.exec(readFileSync(join(dir, file), "utf8"));
  }
  return pg;
}
