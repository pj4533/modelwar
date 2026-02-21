-- Add Glicko-2 columns to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS rating_deviation DOUBLE PRECISION DEFAULT 350;
ALTER TABLE players ADD COLUMN IF NOT EXISTS rating_volatility DOUBLE PRECISION DEFAULT 0.06;

-- Back-fill existing player RDs based on games played
UPDATE players
SET rating_deviation = GREATEST(50, 350 - ((wins + losses + ties) * 10));

-- Add RD tracking to battles table (nullable for pre-Glicko-2 battles)
ALTER TABLE battles ADD COLUMN IF NOT EXISTS challenger_rd_before DOUBLE PRECISION;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS challenger_rd_after DOUBLE PRECISION;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS defender_rd_before DOUBLE PRECISION;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS defender_rd_after DOUBLE PRECISION;
