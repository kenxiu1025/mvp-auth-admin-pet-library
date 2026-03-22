PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'child' CHECK(role IN ('parent', 'child'));

ALTER TABLE tasks ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'submitted', 'approved', 'rejected'));
ALTER TABLE tasks ADD COLUMN submitted_at TEXT;
ALTER TABLE tasks ADD COLUMN approved_at TEXT;
ALTER TABLE tasks ADD COLUMN approved_by INTEGER REFERENCES users(id);
ALTER TABLE tasks ADD COLUMN review_note TEXT;

UPDATE tasks
SET
  status = CASE
    WHEN completed = 1 THEN 'approved'
    ELSE 'pending'
  END,
  submitted_at = CASE
    WHEN completed = 1 THEN completed_at
    ELSE NULL
  END,
  approved_at = CASE
    WHEN completed = 1 THEN completed_at
    ELSE NULL
  END,
  review_note = NULL
WHERE status = 'pending';
