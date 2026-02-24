-- Reset ladder after switching from pmars-ts compat layer to direct Simulator API
--
-- The direct API uses a single seed per battle (instead of per-round seeds),
-- rotates the starting warrior internally (instead of swapping warrior order),
-- and preserves P-Space across rounds. All of these change battle outcomes,
-- so historical results are no longer reproducible.
--
-- Run: npm run migrate -- sql/009_reset_ladder_direct_api.sql

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
