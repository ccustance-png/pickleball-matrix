-- Pickleball ELO — Supabase schema
-- Run this in the Supabase SQL editor to create all tables

-- Players / profiles
CREATE TABLE IF NOT EXISTS players (
  name         TEXT PRIMARY KEY,           -- uppercase, e.g. "CRAIG"
  photo_url    TEXT    NOT NULL DEFAULT '',
  bio          TEXT    NOT NULL DEFAULT '',
  google_email TEXT    UNIQUE,
  first_name   TEXT    NOT NULL DEFAULT '',
  last_name    TEXT    NOT NULL DEFAULT '',
  location     TEXT    NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Matches (replaces SCORESHEET)
CREATE TABLE IF NOT EXISTS matches (
  id          SERIAL PRIMARY KEY,
  date        TEXT    NOT NULL,            -- stored as M/D/YY to match existing format
  bracket     TEXT    NOT NULL DEFAULT '',
  type        TEXT    NOT NULL,            -- SINGLES | DOUBLES | CASUAL
  team1       TEXT    NOT NULL,
  team2       TEXT    NOT NULL,
  win         TEXT    NOT NULL,
  loss        TEXT    NOT NULL,
  team1_score INT     NOT NULL DEFAULT 0,
  team2_score INT     NOT NULL DEFAULT 0,
  players     TEXT    NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS matches_date_idx ON matches (date);
CREATE INDEX IF NOT EXISTS matches_type_idx ON matches (type);

-- ELO ratings — updated incrementally on each match submission
CREATE TABLE IF NOT EXISTS elo_ratings (
  player_name TEXT    NOT NULL,
  type        TEXT    NOT NULL CHECK (type IN ('singles', 'doubles')),
  elo         NUMERIC NOT NULL DEFAULT 1000,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_name, type)
);

CREATE INDEX IF NOT EXISTS elo_ratings_type_elo_idx ON elo_ratings (type, elo DESC);

-- Match notes (photo, location, description per match)
CREATE TABLE IF NOT EXISTS match_notes (
  match_id    INT  PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
  photo_url   TEXT NOT NULL DEFAULT '',
  location    TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT ''
);

-- Match comments
CREATE TABLE IF NOT EXISTS match_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id     INT  NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  author_email TEXT NOT NULL,
  author_name  TEXT NOT NULL,
  text         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS match_comments_match_idx ON match_comments (match_id);

-- Match dinks (reactions)
CREATE TABLE IF NOT EXISTS match_dinks (
  match_id   INT  NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (match_id, user_email)
);

-- Challenges
CREATE TABLE IF NOT EXISTS challenges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_player TEXT NOT NULL,
  from_email  TEXT NOT NULL,
  to_player   TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('SINGLES', 'DOUBLES')),
  message     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACCEPTED', 'DECLINED', 'COMPLETED')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS challenges_players_idx ON challenges (from_player, to_player);

-- Friend requests
CREATE TABLE IF NOT EXISTS friend_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_player TEXT NOT NULL,
  to_player   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (from_player, to_player)
);

CREATE INDEX IF NOT EXISTS friend_requests_from_idx ON friend_requests (from_player);
CREATE INDEX IF NOT EXISTS friend_requests_to_idx   ON friend_requests (to_player);

-- Direct messages
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_player TEXT    NOT NULL,
  to_player   TEXT    NOT NULL,
  text        TEXT    NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_thread_idx ON messages (from_player, to_player);
CREATE INDEX IF NOT EXISTS messages_created_idx ON messages (created_at DESC);

-- Enable Realtime on messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Clubs
CREATE TABLE IF NOT EXISTS clubs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location    TEXT NOT NULL DEFAULT '',
  photo_url   TEXT NOT NULL DEFAULT '',
  created_by  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Club members
CREATE TABLE IF NOT EXISTS club_members (
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (club_id, player_name)
);

CREATE INDEX IF NOT EXISTS club_members_club_idx   ON club_members (club_id);
CREATE INDEX IF NOT EXISTS club_members_player_idx ON club_members (player_name);

-- Push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          SERIAL PRIMARY KEY,
  player_name TEXT NOT NULL,
  subscription TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_name, subscription)
);

CREATE INDEX IF NOT EXISTS push_subs_player_idx ON push_subscriptions (player_name);
