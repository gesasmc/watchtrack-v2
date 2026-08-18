CREATE TABLE IF NOT EXISTS shared_lists (
  family_key TEXT PRIMARY KEY,
  payload TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL DEFAULT 0
);
