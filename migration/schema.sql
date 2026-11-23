CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  student_id TEXT NOT NULL,
  branch TEXT NOT NULL,
  study_year INTEGER NOT NULL,
  salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  rank_points INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uq ON users (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_student_id_lower_uq ON users (LOWER(student_id));

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  author_id TEXT REFERENCES users(id),
  person TEXT NOT NULL,
  tag TEXT NOT NULL,
  icon TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  swap_details TEXT NOT NULL DEFAULT '',
  place TEXT NOT NULL,
  need TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at BIGINT NOT NULL,
  legacy_helped INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS help_events (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  helper_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  swap_offer TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL,
  completed_at BIGINT,
  base_points INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  help_id TEXT NOT NULL UNIQUE REFERENCES help_events(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  helper_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  points_awarded INTEGER NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS requests_created_idx ON requests(created_at DESC);
CREATE INDEX IF NOT EXISTS help_request_idx ON help_events(request_id);
CREATE INDEX IF NOT EXISTS feedback_helper_idx ON feedback(helper_id);
