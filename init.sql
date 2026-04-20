CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(30) UNIQUE NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password      TEXT,
  google_id     VARCHAR(100) UNIQUE,
  avatar        TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(50) UNIQUE NOT NULL,
  description   TEXT,
  created_by    INTEGER REFERENCES users(id),
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id            SERIAL PRIMARY KEY,
  room_id       INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  user_id       INTEGER REFERENCES users(id),
  content       TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reactions (
  id            SERIAL PRIMARY KEY,
  message_id    INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  user_id       INTEGER REFERENCES users(id),
  emoji         VARCHAR(10) NOT NULL,
  UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  sess   JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);