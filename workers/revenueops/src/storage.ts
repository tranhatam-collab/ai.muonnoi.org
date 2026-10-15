export type Scalar = string | number | null;
export interface Store {
  rows<T = Record<string, unknown>>(query: string, ...params: Scalar[]): T[];
  exec(query: string, ...params: Scalar[]): void;
  transaction<T>(fn: () => T): T;
}
export const schema = `
CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);
INSERT OR IGNORE INTO schema_version VALUES(1);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reservations (
 id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, day TEXT NOT NULL, category TEXT NOT NULL,
 amount_vnd INTEGER NOT NULL CHECK(amount_vnd>0), status TEXT NOT NULL CHECK(status IN ('HELD','SPENT','UNKNOWN','RELEASED')),
 approval_ref TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS reservation_scope ON reservations(agent_id, day, status);
CREATE TABLE IF NOT EXISTS jobs (
 id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, day TEXT NOT NULL, state TEXT NOT NULL,
 draft TEXT NOT NULL, reason TEXT NOT NULL, reservation_id TEXT, created_at TEXT NOT NULL,
 UNIQUE(agent_id,day)
);
CREATE TABLE IF NOT EXISTS work_orders (
 id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, creator_id TEXT NOT NULL, worker_id TEXT NOT NULL,
 reviewer_id TEXT, finance_id TEXT, amount_vnd INTEGER NOT NULL CHECK(amount_vnd>0),
 state TEXT NOT NULL, agreement_ref TEXT NOT NULL, brief TEXT NOT NULL,
 deadline TEXT NOT NULL, artifact_sha256 TEXT, reservation_id TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS audit (
 sequence INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, actor_id TEXT NOT NULL,
 entity_id TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'APPEND_ONLY'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'APPEND_ONLY'); END;
`;
