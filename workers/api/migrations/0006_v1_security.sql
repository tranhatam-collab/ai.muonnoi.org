PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS users_v1_security_tmp;

CREATE TABLE users_v1_security_tmp (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  password      TEXT NOT NULL DEFAULT '',
  password_hash TEXT,
  username      TEXT,
  avatar_url    TEXT,
  bio           TEXT,
  role          TEXT NOT NULL DEFAULT 'member',
  is_verified   INTEGER DEFAULT 0,
  password_salt TEXT,
  password_algo  TEXT,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

INSERT INTO users_v1_security_tmp (
  id,
  email,
  name,
  password,
  password_hash,
  username,
  avatar_url,
  bio,
  role,
  is_verified,
  password_salt,
  password_algo,
  status,
  created_at,
  updated_at
)
SELECT
  id,
  email,
  COALESCE(name, ''),
  '',
  password_hash,
  NULL,
  NULL,
  NULL,
  COALESCE(role, 'member'),
  0,
  NULL,
  NULL,
  COALESCE(status, 'active'),
  COALESCE(created_at, datetime('now')),
  COALESCE(updated_at, datetime('now'))
FROM users;

DROP TABLE users;
ALTER TABLE users_v1_security_tmp RENAME TO users;
PRAGMA foreign_keys = ON;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
ON users(username)
WHERE username IS NOT NULL AND username <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email
ON users(email);

CREATE TABLE IF NOT EXISTS rate_limits (
  key        TEXT PRIMARY KEY,
  hits       INTEGER NOT NULL DEFAULT 0,
  reset_at   INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at
ON rate_limits(reset_at);

UPDATE users
SET email = 'admin@ai.muonnoi.org'
WHERE email LIKE 'admin@%'
  AND email <> 'admin@ai.muonnoi.org'
  AND NOT EXISTS (
    SELECT 1
    FROM users next_admin
    WHERE next_admin.email = 'admin@ai.muonnoi.org'
  );

UPDATE users
SET
  name = CASE
    WHEN email = 'admin@ai.muonnoi.org' THEN 'AI Admin'
    ELSE name
  END,
  role = CASE
    WHEN email = 'admin@ai.muonnoi.org' THEN 'admin'
    ELSE COALESCE(role, 'member')
  END,
  status = CASE
    WHEN email = 'admin@ai.muonnoi.org' THEN 'active'
    ELSE COALESCE(status, 'active')
  END,
  is_verified = CASE
    WHEN email = 'admin@ai.muonnoi.org' THEN 1
    ELSE COALESCE(is_verified, 0)
  END;

UPDATE users
SET
  password_hash = '971a97012d24c3126ff9c60c1b1a26e683786a615f6198ebb343ee761177cc18',
  password_salt = 'd97c9dd3c57a6f3e0d5bce29d3674b2f',
  password_algo = 'pbkdf2_sha256:210000'
WHERE email = 'admin@ai.muonnoi.org'
  AND (password_hash IS NULL OR password_hash = '');
