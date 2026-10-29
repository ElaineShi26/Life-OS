-- Life OS 云端存储
-- 一个用户一行 state，整库同步（个人工具，冲突用版本号 + 时间戳处理）

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  github_id   TEXT UNIQUE,
  login       TEXT,
  name        TEXT,
  avatar      TEXT,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS states (
  user_id     TEXT PRIMARY KEY,
  payload     TEXT NOT NULL,
  rev         INTEGER NOT NULL DEFAULT 1,
  updated_at  INTEGER NOT NULL
);
