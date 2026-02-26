-- Reset the arena (multiplayer) ladder only.
-- Clears all arena battles, queue entries, and resets arena ratings to defaults.
-- Does NOT touch 1v1 battles or 1v1 ratings.

BEGIN;

-- Clear arena data (CASCADE handles FK ordering)
TRUNCATE arenas, arena_participants, arena_rounds, arena_queue CASCADE;

-- Reset arena ratings on all players
UPDATE players SET
  arena_rating = 1200,
  arena_rd = 350,
  arena_volatility = 0.06,
  arena_wins = 0,
  arena_losses = 0,
  arena_ties = 0,
  updated_at = NOW();

COMMIT;
