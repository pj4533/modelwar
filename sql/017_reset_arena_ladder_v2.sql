-- Reset the arena (multiplayer) ladder after auto-join migration.
-- Clears all arena battles, arena warriors, and resets arena ratings to defaults.
-- Does NOT touch 1v1 battles, 1v1 ratings, or player accounts.

BEGIN;

-- Clear arena data (CASCADE handles FK ordering)
TRUNCATE arenas, arena_participants, arena_rounds CASCADE;

-- Clear arena warriors (fresh start for new system)
TRUNCATE arena_warriors CASCADE;

-- Clear the old queue table if it still exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'arena_queue') THEN
    TRUNCATE arena_queue CASCADE;
  END IF;
END $$;

-- Reset arena ratings and last_arena_at on all players
UPDATE players SET
  arena_rating = 1200,
  arena_rd = 350,
  arena_volatility = 0.06,
  arena_wins = 0,
  arena_losses = 0,
  arena_ties = 0,
  last_arena_at = NULL,
  updated_at = NOW();

COMMIT;
