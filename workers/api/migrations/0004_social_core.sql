-- Extend users table
ALTER TABLE users ADD COLUMN username    TEXT;
ALTER TABLE users ADD COLUMN avatar_url  TEXT;
ALTER TABLE users ADD COLUMN bio         TEXT;
ALTER TABLE users ADD COLUMN role        TEXT DEFAULT 'member';
ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0;

-- Posts
CREATE TABLE IF NOT EXISTS posts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  topic         TEXT DEFAULT '',
  post_type     TEXT DEFAULT 'discussion',
  link_url      TEXT,
  link_title    TEXT,
  link_desc     TEXT,
  visibility    TEXT DEFAULT 'public',
  is_hot        INTEGER DEFAULT 0,
  is_verified   INTEGER DEFAULT 0,
  is_ai         INTEGER DEFAULT 0,
  vote_count    INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_topic   ON posts(topic);
CREATE INDEX IF NOT EXISTS idx_posts_user    ON posts(user_id);

-- Post labels
CREATE TABLE IF NOT EXISTS post_labels (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id  INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  label    TEXT NOT NULL,
  added_by TEXT DEFAULT 'system'
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_id  INTEGER REFERENCES comments(id),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  body       TEXT NOT NULL,
  is_ai      INTEGER DEFAULT 0,
  vote_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at);

-- Votes
CREATE TABLE IF NOT EXISTS votes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL,
  target_id   INTEGER NOT NULL,
  value       INTEGER DEFAULT 1,
  created_at  INTEGER NOT NULL,
  UNIQUE(user_id, target_type, target_id)
);

-- Polls
CREATE TABLE IF NOT EXISTS polls (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS poll_options (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label   TEXT NOT NULL,
  votes   INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id    INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id  INTEGER NOT NULL REFERENCES poll_options(id),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  UNIQUE(poll_id, user_id)
);

-- Saved posts
CREATE TABLE IF NOT EXISTS saved_posts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, post_id)
);

-- Follow graph
CREATE TABLE IF NOT EXISTS follows (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  follower_id  INTEGER NOT NULL REFERENCES users(id),
  following_id INTEGER NOT NULL REFERENCES users(id),
  created_at   INTEGER NOT NULL,
  UNIQUE(follower_id, following_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  type       TEXT NOT NULL,
  ref_type   TEXT,
  ref_id     INTEGER,
  actor_id   INTEGER REFERENCES users(id),
  message    TEXT,
  is_read    INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- Topics & Rooms
CREATE TABLE IF NOT EXISTS topics (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  post_count  INTEGER DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  description  TEXT,
  topic_id     INTEGER REFERENCES topics(id),
  member_count INTEGER DEFAULT 0,
  is_active    INTEGER DEFAULT 1,
  created_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS room_members (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id   INTEGER NOT NULL REFERENCES rooms(id),
  user_id   INTEGER NOT NULL REFERENCES users(id),
  joined_at INTEGER NOT NULL,
  UNIQUE(room_id, user_id)
);

-- Seed topics & rooms
INSERT OR IGNORE INTO topics (slug, name, description, created_at)
VALUES
  ('ai-xa-hoi', 'AI và Xã hội', 'AI và tác động xã hội', unixepoch()*1000),
  ('kiem-chung', 'Kiểm chứng', 'Kiểm chứng thông tin và dữ kiện', unixepoch()*1000),
  ('cong-nghe', 'Công nghệ', 'Công nghệ và cộng đồng', unixepoch()*1000),
  ('kien-truc', 'Kiến trúc', 'Kiến trúc nền tảng và hệ thống', unixepoch()*1000);

INSERT OR IGNORE INTO rooms (name, description, member_count, created_at)
VALUES
  ('Phòng AI & Xã hội', 'Thảo luận về AI và tác động xã hội', 128, unixepoch()*1000),
  ('Kiểm chứng dữ kiện', 'Kiểm tra và xác minh thông tin', 64, unixepoch()*1000),
  ('Kiến trúc social platform', 'Thiết kế nền tảng mạng xã hội', 38, unixepoch()*1000);
