-- QR access key per student (already applied to production).
ALTER TABLE users ADD COLUMN login_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_login_key ON users(login_key);
