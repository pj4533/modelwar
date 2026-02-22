-- Reset ladder after SPL/maxTasks bug fix
--
-- The corewar library's runMatch() never initialized Executive.maxTasks,
-- making every SPL instruction a no-op across all battles. All historical
-- battle results and ratings are invalid. This migration deletes all
-- battles and resets all player ratings to defaults.
--
-- Run: psql $DATABASE_URL -f sql/004_reset_ladder_spl_fix.sql

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
