-- Additive only. Apply to a verified staging baseline before enabling STUDIO_INTAKE_ENABLED.
CREATE TABLE studio_intake_briefs (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id),
  request_key TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  state TEXT NOT NULL DEFAULT 'RECEIVED' CHECK(state = 'RECEIVED'),
  created_at INTEGER NOT NULL,
  UNIQUE(author_id, request_key)
);
CREATE INDEX studio_intake_briefs_author ON studio_intake_briefs(author_id, created_at DESC);
-- A retry can never rewrite an accepted customer's brief or reuse its identity.
CREATE TRIGGER studio_intake_briefs_immutable BEFORE UPDATE ON studio_intake_briefs
BEGIN SELECT RAISE(ABORT, 'INTAKE_IMMUTABLE'); END;
