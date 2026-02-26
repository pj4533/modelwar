-- Add multiplayer arena tables and arena rating columns to players.
-- Arenas are 10-player free-for-all sessions with round-robin battles.

BEGIN;

-- Core arena sessions
CREATE TABLE arenas (
  id SERIAL PRIMARY KEY,
  session_id UUID NOT NULL,
  seed INTEGER NOT NULL,
  total_rounds INTEGER NOT NULL DEFAULT 200,
  status VARCHAR(20) NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Participants in each arena (players + stock bots)
CREATE TABLE arena_participants (
  id SERIAL PRIMARY KEY,
  arena_id INTEGER NOT NULL REFERENCES arenas(id),
  player_id INTEGER REFERENCES players(id),  -- NULL for stock bots
  slot_index INTEGER NOT NULL,  -- 0-9
  is_stock_bot BOOLEAN NOT NULL DEFAULT false,
  stock_bot_name VARCHAR(50),
  redcode TEXT NOT NULL,
  placement INTEGER,  -- 1 = winner, 10 = last
  total_score INTEGER NOT NULL DEFAULT 0,
  arena_rating_before INTEGER,
  arena_rating_after INTEGER,
  arena_rd_before DOUBLE PRECISION,
  arena_rd_after DOUBLE PRECISION,
  UNIQUE(arena_id, slot_index)
);

-- Individual rounds within an arena
CREATE TABLE arena_rounds (
  id SERIAL PRIMARY KEY,
  arena_id INTEGER NOT NULL REFERENCES arenas(id),
  round_number INTEGER NOT NULL,
  seed INTEGER NOT NULL,
  survivor_count INTEGER NOT NULL,
  winner_slot INTEGER,
  scores JSONB NOT NULL,
  UNIQUE(arena_id, round_number)
);

-- Matchmaking queue for arena sessions
CREATE TABLE arena_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id INTEGER NOT NULL REFERENCES players(id),
  ticket_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  session_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'matched', 'completed', 'expired')),
  redcode TEXT NOT NULL,
  arena_id INTEGER REFERENCES arenas(id),
  results JSONB,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '60 seconds',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_arena_participants_player ON arena_participants(player_id) WHERE player_id IS NOT NULL;

CREATE INDEX idx_arena_queue_session ON arena_queue(session_id) WHERE status = 'waiting';
CREATE INDEX idx_arena_queue_ticket ON arena_queue(ticket_id);
CREATE INDEX idx_arena_queue_player_waiting ON arena_queue(player_id) WHERE status = 'waiting';

-- Add arena rating columns to players
ALTER TABLE players
  ADD COLUMN arena_rating INTEGER NOT NULL DEFAULT 1200,
  ADD COLUMN arena_rd DOUBLE PRECISION NOT NULL DEFAULT 350,
  ADD COLUMN arena_volatility DOUBLE PRECISION NOT NULL DEFAULT 0.06,
  ADD COLUMN arena_wins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN arena_losses INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN arena_ties INTEGER NOT NULL DEFAULT 0;

-- Enable Row Level Security on all new tables
ALTER TABLE arenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_queue ENABLE ROW LEVEL SECURITY;

COMMIT;
