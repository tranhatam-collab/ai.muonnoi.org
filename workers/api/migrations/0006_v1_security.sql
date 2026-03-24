ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN password_salt TEXT;
ALTER TABLE users ADD COLUMN password_algo TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
ON users(username)
WHERE username IS NOT NULL AND username <> '';

CREATE TABLE IF NOT EXISTS rate_limits (
  key        TEXT PRIMARY KEY,
  hits       INTEGER NOT NULL DEFAULT 0,
  reset_at   INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at
ON rate_limits(reset_at);

DELETE FROM users
WHERE email = 'admin@nhachung.org'
  AND password = 'seeded-admin-pending-hash'
  AND EXISTS (
    SELECT 1
    FROM users legacy_admin
    WHERE legacy_admin.email = 'admin@ai.muonnoi.org'
  );

UPDATE users
SET email = 'admin@nhachung.org'
WHERE email = 'admin@ai.muonnoi.org'
  AND NOT EXISTS (
    SELECT 1
    FROM users next_admin
    WHERE next_admin.email = 'admin@nhachung.org'
  );

UPDATE users
SET
  name = CASE
    WHEN email = 'admin@nhachung.org' THEN 'Nhà Chung Admin'
    ELSE name
  END,
  role = CASE
    WHEN email = 'admin@nhachung.org' THEN 'admin'
    ELSE COALESCE(role, 'member')
  END,
  is_verified = CASE
    WHEN email = 'admin@nhachung.org' THEN 1
    ELSE COALESCE(is_verified, 0)
  END;

UPDATE users
SET
  password = '',
  password_hash = '971a97012d24c3126ff9c60c1b1a26e683786a615f6198ebb343ee761177cc18',
  password_salt = 'd97c9dd3c57a6f3e0d5bce29d3674b2f',
  password_algo = 'pbkdf2_sha256:210000'
WHERE email = 'admin@nhachung.org'
  AND (password_hash IS NULL OR password_hash = '');

UPDATE topics
SET post_count = COALESCE((
  SELECT COUNT(*)
  FROM posts
  WHERE topic = topics.slug OR topic = '#' || topics.slug
), 0);
