PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN is_disabled INTEGER NOT NULL DEFAULT 0 CHECK(is_disabled IN (0, 1));
ALTER TABLE users ADD COLUMN disabled_at TEXT;

CREATE INDEX IF NOT EXISTS idx_users_disabled ON users(is_disabled);
