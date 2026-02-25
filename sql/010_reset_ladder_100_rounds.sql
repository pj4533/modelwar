-- Reset ladder after increasing rounds per battle from 5 to 100
--
-- Aligning with the ICWS '94 competitive standard of 100 rounds per battle.
-- All historical results used 5 rounds and are no longer comparable.
--
-- Run: npm run migrate -- sql/010_reset_ladder_100_rounds.sql

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
