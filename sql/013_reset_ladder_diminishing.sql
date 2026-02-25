-- Step 1: Enable maintenance mode (autocommit — visible immediately)
UPDATE settings SET value = 'true', updated_at = NOW() WHERE key = 'maintenance_mode';

-- Step 2: Wait for in-flight battles to drain, then VERIFY none are still landing
DO $$
DECLARE
  recent_count INTEGER;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  -- Initial wait for any currently-executing battles
  PERFORM pg_sleep(5);

  LOOP
    attempt := attempt + 1;

    SELECT COUNT(*) INTO recent_count FROM battles
    WHERE created_at > NOW() - INTERVAL '5 seconds';

    IF recent_count = 0 THEN
      RAISE NOTICE 'No recent battles detected. Safe to proceed with reset.';
      EXIT;
    END IF;

    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Still seeing battles after % attempts — aborting. Is maintenance mode working?', max_attempts;
    END IF;

    RAISE NOTICE 'Found % recent battle(s). Waiting 3s... (attempt %/%)', recent_count, attempt, max_attempts;
    PERFORM pg_sleep(3);
  END LOOP;
END $$;

-- Step 3: Reset the ladder (no battles are landing, safe to proceed)
BEGIN;
DELETE FROM battles;
UPDATE players SET
  elo_rating = 1200, rating_deviation = 350, rating_volatility = 0.06,
  wins = 0, losses = 0, ties = 0, updated_at = NOW();
COMMIT;

-- Step 4: Disable maintenance mode
UPDATE settings SET value = 'false', updated_at = NOW() WHERE key = 'maintenance_mode';
