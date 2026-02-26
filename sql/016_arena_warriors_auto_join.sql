-- 016: Arena warriors table with auto-join support
-- Allows players to persist an arena warrior and opt into auto-join

-- Arena warriors table (mirrors warriors pattern, one per player)
CREATE TABLE IF NOT EXISTS arena_warriors (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id) UNIQUE,
  name VARCHAR(100) NOT NULL,
  redcode TEXT NOT NULL,
  auto_join BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add last_arena_at to players for round-robin scheduling
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_arena_at TIMESTAMPTZ;

-- Partial index for fast auto-join lookups
CREATE INDEX IF NOT EXISTS idx_arena_warriors_auto_join
  ON arena_warriors(player_id) WHERE auto_join = true;

-- Enable RLS on arena_warriors
ALTER TABLE arena_warriors ENABLE ROW LEVEL SECURITY;
