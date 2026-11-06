import type { PGlite, Transaction } from "@electric-sql/pglite";

// Bộ giả lập PostgREST vừa đủ cho các truy vấn mà supabase-js của ứng dụng gửi lên.
// Mỗi yêu cầu chạy trong một giao dịch với role suy ra từ khóa API, giống cổng của Supabase,
// nên RLS và quyền thực thi hàm được kiểm tra thật trên Postgres.

export type ApiKeys = { anonKey: string; serviceKey: string };
type Row = Record<string, unknown>;

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: Record<string, unknown>,
  ) {
    super(String(body.message ?? status));
  }
}

const RESERVED = new Set(["select", "order", "limit", "offset", "columns", "on_conflict"]);
const OPS: Record<string, string> = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=", like: "like", ilike: "ilike" };

function bad(message: string): HttpError {
  return new HttpError(400, { code: "PGRST100", details: null, hint: null, message });
}

function ident(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw bad(`identifier không hợp lệ: ${name}`);
  return `"${name}"`;
}

function selectList(raw: string | null): string {
  const s = (raw ?? "*").replace(/\s+/g, "");
  if (s === "*") return "*";
  return s.split(",").map((c) => ident(c)).join(", ");
}

function whereClause(params: URLSearchParams, args: unknown[]): string {
  const parts: string[] = [];
  for (const [key, raw] of params) {
    if (RESERVED.has(key)) continue;
    const dot = raw.indexOf(".");
    if (dot < 0) throw bad(`bộ lọc không hợp lệ: ${key}=${raw}`);
    const op = raw.slice(0, dot);
    const val = raw.slice(dot + 1);
    const col = ident(key);
    if (op === "in") {
      const items = val.replace(/^\(|\)$/g, "").split(",").map((x) => x.replace(/^"|"$/g, ""));
      const placeholders = items.map((item) => {
        args.push(item);
        return `$${args.length}`;
      });
      parts.push(`${col} in (${placeholders.join(", ")})`);
    } else if (op === "is") {
      if (!["null", "true", "false"].includes(val)) throw bad(`is.${val} không được hỗ trợ`);
      parts.push(`${col} is ${val}`);
    } else if (op in OPS) {
      args.push(val);
      parts.push(`${col} ${OPS[op]} $${args.length}`);
    } else {
      throw bad(`toán tử chưa được giả lập: ${op}`);
    }
  }
  return parts.length ? ` where ${parts.join(" and ")}` : "";
}

function orderClause(raw: string | null): string {
  if (!raw) return "";
  const parts = raw.split(",").map((p) => {
    const [col, ...mods] = p.split(".");
    const dir = mods.includes("desc") ? "desc" : "asc";
    const nulls = mods.includes("nullsfirst") ? " nulls first" : mods.includes("nullslast") ? " nulls last" : "";
    return `${ident(col)} ${dir}${nulls}`;
  });
  return ` order by ${parts.join(", ")}`;
}

function intParam(raw: string | null, name: string): number | null {
  if (raw === null) return null;
  if (!/^\d+$/.test(raw)) throw bad(`${name} không hợp lệ`);
  return Number(raw);
}

const asParam = (v: unknown): unknown => (v !== null && typeof v === "object" ? JSON.stringify(v) : v);

type Outcome = { status: number; rows?: Row[]; scalar?: unknown; empty?: boolean };

async function runTable(tx: Transaction, table: string, method: string, params: URLSearchParams, body: unknown, wantRows: boolean): Promise<Outcome> {
  const t = `public.${ident(table)}`;
  const args: unknown[] = [];
  const cols = selectList(params.get("select"));
  if (method === "GET") {
    let sql = `select ${cols} from ${t}${whereClause(params, args)}${orderClause(params.get("order"))}`;
    const limit = intParam(params.get("limit"), "limit");
    const offset = intParam(params.get("offset"), "offset");
    if (limit !== null) sql += ` limit ${limit}`;
    if (offset !== null) sql += ` offset ${offset}`;
    return { status: 200, rows: (await tx.query<Row>(sql, args)).rows };
  }
  if (method === "POST") {
    const list = (Array.isArray(body) ? body : [body]) as Row[];
    if (list.length === 0 || list.some((r) => r === null || typeof r !== "object")) throw bad("thân yêu cầu insert không hợp lệ");
    const keys = Object.keys(list[0]);
    const tuples = list.map((row) => {
      const ph = keys.map((k) => {
        args.push(asParam(row[k] ?? null));
        return `$${args.length}`;
      });
      return `(${ph.join(", ")})`;
    });
    const sql = `insert into ${t} (${keys.map(ident).join(", ")}) values ${tuples.join(", ")}${wantRows ? ` returning ${cols}` : ""}`;
    const res = await tx.query<Row>(sql, args);
    return wantRows ? { status: 201, rows: res.rows } : { status: 201, empty: true };
  }
  if (method === "PATCH") {
    const patch = (body ?? {}) as Row;
    const keys = Object.keys(patch);
    if (keys.length === 0) throw bad("thân yêu cầu update trống");
    const sets = keys.map((k) => {
      args.push(asParam(patch[k]));
      return `${ident(k)} = $${args.length}`;
    });
    const sql = `update ${t} set ${sets.join(", ")}${whereClause(params, args)}${wantRows ? ` returning ${cols}` : ""}`;
    const res = await tx.query<Row>(sql, args);
    return wantRows ? { status: 200, rows: res.rows } : { status: 204, empty: true };
  }
  if (method === "DELETE") {
    const sql = `delete from ${t}${whereClause(params, args)}${wantRows ? ` returning ${cols}` : ""}`;
    const res = await tx.query<Row>(sql, args);
    return wantRows ? { status: 200, rows: res.rows } : { status: 204, empty: true };
  }
  throw new HttpError(405, { message: `method ${method} không được hỗ trợ` });
}

async function runRpc(tx: Transaction, fn: string, body: unknown): Promise<Outcome> {
  const args: unknown[] = [];
  const named = Object.entries((body ?? {}) as Row).map(([k, v]) => {
    args.push(asParam(v));
    return `${ident(k)} => $${args.length}`;
  });
  const meta = await tx.query<{ proretset: boolean; typtype: string }>(
    `select p.proretset, t.typtype from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_type t on t.oid = p.prorettype where n.nspname = 'public' and p.proname = $1 limit 1`,
    [fn],
  );
  if (meta.rows.length === 0) throw new HttpError(404, { code: "PGRST202", details: null, hint: null, message: `Could not find the function public.${fn}` });
  const res = await tx.query<Row>(`select * from public.${ident(fn)}(${named.join(", ")})`, args);
  const scalar = !meta.rows[0].proretset && meta.rows[0].typtype === "b";
  return scalar ? { status: 200, scalar: res.rows[0]?.[fn] ?? null } : { status: 200, rows: res.rows };
}

function pgStatus(code: string): number {
  if (code === "23505" || code === "23503") return 409;
  if (code === "42501") return 403;
  if (code === "42P01") return 404;
  return 400;
}

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

function errorResponse(e: unknown): Response {
  if (e instanceof HttpError) return jsonResponse(e.status, e.body);
  const err = e as { code?: string; message?: string; detail?: string; hint?: string };
  if (typeof err?.code === "string" && typeof err.message === "string") {
    return jsonResponse(pgStatus(err.code), { code: err.code, details: err.detail ?? null, hint: err.hint ?? null, message: err.message });
  }
  return jsonResponse(500, { message: String(e) });
}

export async function handlePostgrest(pg: PGlite, req: Request, keys: ApiKeys): Promise<Response> {
  try {
    const url = new URL(req.url);
    const key = req.headers.get("apikey") ?? (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const role = key === keys.serviceKey ? "service_role" : key === keys.anonKey ? "anon" : null;
    if (!role) throw new HttpError(401, { message: "Invalid API key", hint: "Double check your Supabase `anon` or `service_role` API key." });

    const rest = decodeURIComponent(url.pathname.replace(/^\/rest\/v1\//, ""));
    const wantRows = /return=representation/.test(req.headers.get("prefer") ?? "");
    const single = (req.headers.get("accept") ?? "").includes("application/vnd.pgrst.object+json");
    const text = await req.text();
    const body: unknown = text ? JSON.parse(text) : undefined;

    const out = await pg.transaction(async (tx) => {
      await tx.exec(`set local role ${role}`);
      return rest.startsWith("rpc/") ? runRpc(tx, rest.slice(4), body) : runTable(tx, rest, req.method, url.searchParams, body, wantRows);
    });

    if (out.scalar !== undefined) return jsonResponse(out.status, out.scalar);
    if (out.empty || !out.rows) return new Response(null, { status: out.status });
    if (single) {
      if (out.rows.length !== 1) {
        return jsonResponse(406, {
          code: "PGRST116",
          details: `The result contains ${out.rows.length} rows`,
          hint: null,
          message: "JSON object requested, multiple (or no) rows returned",
        });
      }
      return jsonResponse(out.status, out.rows[0]);
    }
    return jsonResponse(out.status, out.rows);
  } catch (e) {
    return errorResponse(e);
  }
}
