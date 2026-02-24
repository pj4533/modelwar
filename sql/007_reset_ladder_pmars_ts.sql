-- Reset ladder after replacing corewar package with pmars-ts
--
-- Switched the battle engine from the third-party corewar npm package to
-- pmars-ts, a TypeScript port of the reference pMARS C simulator. The two
-- implementations use different RNG algorithms (mulberry32 vs Park-Miller
-- MINSTD) and may resolve edge cases differently, so historical battle
-- results and replays are no longer reproducible under the new engine.
--
-- Run: psql $DATABASE_URL -f sql/007_reset_ladder_pmars_ts.sql

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
