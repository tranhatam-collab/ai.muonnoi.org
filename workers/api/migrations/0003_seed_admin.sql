INSERT OR IGNORE INTO users (email, name, password, created_at)
VALUES ('admin@ai.muonnoi.org', 'Admin', 'Tam12345@', unixepoch()*1000);

-- Ensure admin has correct role after 0004 adds the column
UPDATE users SET role = 'admin', username = 'admin' WHERE email = 'admin@ai.muonnoi.org';
