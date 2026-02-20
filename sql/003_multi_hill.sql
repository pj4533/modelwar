-- 1. Per-hill player statistics
CREATE TABLE IF NOT EXISTS player_hill_stats (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id) NOT NULL,
  hill VARCHAR(20) NOT NULL,
  elo_rating INTEGER DEFAULT 1200,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, hill)
);

-- 2. Tag battles with their hill
ALTER TABLE battles ADD COLUMN IF NOT EXISTS hill VARCHAR(20) DEFAULT 'big' NOT NULL;

-- 3. Seed existing player stats into player_hill_stats for 'big' hill
INSERT INTO player_hill_stats (player_id, hill, elo_rating, wins, losses, ties, created_at, updated_at)
SELECT id, 'big', elo_rating, wins, losses, ties, created_at, updated_at
FROM players
ON CONFLICT (player_id, hill) DO NOTHING;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_player_hill_stats_leaderboard
  ON player_hill_stats (hill, elo_rating DESC, wins DESC);
CREATE INDEX IF NOT EXISTS idx_battles_hill
  ON battles (hill, created_at DESC);
