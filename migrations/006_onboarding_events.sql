PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS onboarding_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  invite_token TEXT,
  step INTEGER,
  session_id TEXT,
  child_username TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_onboarding_events_created_at ON onboarding_events(created_at);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_event_name ON onboarding_events(event_name);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_invite_token ON onboarding_events(invite_token);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_session_id ON onboarding_events(session_id);
