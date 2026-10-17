-- Separate mutable consent/triage state; accepted source briefs remain immutable.
CREATE TABLE studio_intake_state (
  brief_id TEXT PRIMARY KEY REFERENCES studio_intake_briefs(id),
  version INTEGER NOT NULL DEFAULT 0 CHECK(version >= 0),
  share_with_studio INTEGER NOT NULL DEFAULT 0 CHECK(share_with_studio IN (0,1)),
  status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK(status IN ('RECEIVED','IN_REVIEW','NEEDS_INFORMATION','PROPOSAL_READY','DECLINED')),
  customer_message TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);
-- Existing customers did not grant sharing when they submitted their private briefs.
INSERT INTO studio_intake_state(brief_id,updated_at) SELECT id,created_at FROM studio_intake_briefs;
CREATE INDEX studio_intake_state_shared ON studio_intake_state(share_with_studio,brief_id);
CREATE TRIGGER studio_intake_initialize AFTER INSERT ON studio_intake_briefs
BEGIN INSERT INTO studio_intake_state(brief_id,updated_at) VALUES(NEW.id,NEW.created_at); END;
CREATE TABLE studio_intake_events (
  id TEXT PRIMARY KEY,
  brief_id TEXT NOT NULL REFERENCES studio_intake_briefs(id),
  actor_id TEXT NOT NULL REFERENCES users(id),
  request_key TEXT NOT NULL,
  mutation_json TEXT NOT NULL CHECK(json_valid(mutation_json)),
  payload_hash TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('SHARE','REVOKE','TRIAGE')),
  before_version INTEGER NOT NULL CHECK(before_version >= 0),
  version INTEGER NOT NULL CHECK(version = before_version + 1),
  share_with_studio INTEGER NOT NULL CHECK(share_with_studio IN (0,1)),
  status TEXT NOT NULL CHECK(status IN ('RECEIVED','IN_REVIEW','NEEDS_INFORMATION','PROPOSAL_READY','DECLINED')),
  customer_message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(actor_id,request_key), UNIQUE(brief_id,version)
);
CREATE INDEX studio_intake_events_brief ON studio_intake_events(brief_id,version DESC);
CREATE TRIGGER studio_intake_events_no_update BEFORE UPDATE ON studio_intake_events
BEGIN SELECT RAISE(ABORT,'INTAKE_EVENT_IMMUTABLE'); END;
CREATE TRIGGER studio_intake_events_no_delete BEFORE DELETE ON studio_intake_events
BEGIN SELECT RAISE(ABORT,'INTAKE_EVENT_IMMUTABLE'); END;
