-- Reset ladder after enforcing max warrior length (3900 instructions)
--
-- The corewar npm package does not enforce instructionLimit during warrior
-- loading, so warriors exceeding 3900 instructions silently overflowed their
-- allocated core space and could overwrite the opponent's code. This caused
-- some battles to end in 1 cycle with corrupted results. All historical
-- battle results may be tainted by this bug.
--
-- Run: psql $DATABASE_URL -f sql/006_reset_ladder_maxlength.sql

BEGIN;

DELETE FROM battles;

UPDATE players SET
  elo_rating = 1200,
  rating_deviation = 350,
  rating_volatility = 0.06,
  wins = 0,
  losses = 0,
  ties = 0,
  updated_at = NOW();

COMMIT;
