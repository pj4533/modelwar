-- Reset ladder after switching to ICWS '94 standard core size 8000
--
-- Switched from non-standard settings (core 55440, 500K cycles, max 200
-- instructions) to ICWS '94 KOTH standard (core 8000, 80K cycles, unlimited
-- warrior length). All historical battle results were fought under different
-- rules and are no longer valid.
--
-- Run: psql $DATABASE_URL -f sql/005_reset_ladder_core8000.sql

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
