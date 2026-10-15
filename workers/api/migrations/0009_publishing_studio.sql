-- Additive migration. Review against a staging clone of 0008 before remote execution.
ALTER TABLE posts ADD COLUMN source_draft_id TEXT;
CREATE UNIQUE INDEX posts_source_draft_unique ON posts(source_draft_id) WHERE source_draft_id IS NOT NULL;
CREATE TABLE publishing_drafts (
 id TEXT PRIMARY KEY, author_id INTEGER NOT NULL REFERENCES users(id), request_key TEXT NOT NULL,
 title TEXT NOT NULL, body TEXT NOT NULL, topic TEXT NOT NULL, format TEXT NOT NULL,
 sources TEXT NOT NULL DEFAULT '[]', rights_confirmed INTEGER NOT NULL DEFAULT 0,
 ai_assisted INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 1,
 state TEXT NOT NULL DEFAULT 'DRAFT' CHECK(state IN ('DRAFT','REVIEW','APPROVED','PUBLISHED')),
 approved_version INTEGER, reviewer_id INTEGER REFERENCES users(id), review_note TEXT,
 post_id INTEGER REFERENCES posts(id), last_actor INTEGER NOT NULL, last_action TEXT NOT NULL,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 UNIQUE(author_id,request_key), CHECK(reviewer_id IS NULL OR reviewer_id <> author_id)
);
CREATE INDEX publishing_drafts_author ON publishing_drafts(author_id,updated_at DESC);
CREATE TABLE publishing_audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT, draft_id TEXT NOT NULL, version INTEGER NOT NULL,
 actor_id INTEGER NOT NULL, action TEXT NOT NULL, state TEXT NOT NULL, happened_at INTEGER NOT NULL
);
CREATE TRIGGER publishing_created AFTER INSERT ON publishing_drafts BEGIN
 INSERT INTO publishing_audit(draft_id,version,actor_id,action,state,happened_at)
 VALUES(NEW.id,NEW.version,NEW.last_actor,NEW.last_action,NEW.state,NEW.updated_at);
END;
CREATE TRIGGER publishing_updated AFTER UPDATE ON publishing_drafts BEGIN
 INSERT INTO publishing_audit(draft_id,version,actor_id,action,state,happened_at)
 VALUES(NEW.id,NEW.version,NEW.last_actor,NEW.last_action,NEW.state,NEW.updated_at);
END;
CREATE TRIGGER publishing_audit_no_update BEFORE UPDATE ON publishing_audit BEGIN SELECT RAISE(ABORT,'APPEND_ONLY'); END;
CREATE TRIGGER publishing_audit_no_delete BEFORE DELETE ON publishing_audit BEGIN SELECT RAISE(ABORT,'APPEND_ONLY'); END;
