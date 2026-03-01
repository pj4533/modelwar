-- Reset 1v1 ladder after switching to 25200 core / 5040 maxLength
--
-- Switched from ICWS '94 standard (core 8000, 80K cycles, maxLength 3900)
-- to custom settings (core 25200, 252K cycles, maxLength 5040). The larger
-- highly-composite core (2^4 × 3^2 × 5 × 7) breaks blind porting of 8k
-- warriors and forces genuine strategy innovation. All historical 1v1 battle
-- results were fought under different rules and are no longer valid.
--
-- This only resets 1v1 data. Arena data is left untouched.
--
-- Run: npm run migrate -- sql/018_reset_ladder_core25200.sql

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
