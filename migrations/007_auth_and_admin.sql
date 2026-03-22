PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0 CHECK(is_admin IN (0, 1));

CREATE INDEX IF NOT EXISTS idx_users_role_parent ON users(role, parent_user_id);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
