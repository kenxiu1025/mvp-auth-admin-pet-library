PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN parent_user_id INTEGER REFERENCES users(id);

ALTER TABLE pets ADD COLUMN style TEXT NOT NULL DEFAULT 'classic';
ALTER TABLE pets ADD COLUMN initialized_at TEXT;

CREATE TABLE IF NOT EXISTS parent_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  parent_user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  used_by_user_id INTEGER,
  FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_parent_user_id ON users(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_invites_parent ON parent_invites(parent_user_id, created_at DESC);
