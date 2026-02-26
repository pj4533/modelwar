#!/usr/bin/env bash
#
# Safely reset the ModelWar Arena ladder (multiplayer only).
#
# This script:
#   1. Enables maintenance mode (blocks new arenas via 503)
#   2. Waits for in-flight arenas to drain
#   3. Deletes all arena data and resets arena ratings
#   4. Disables maintenance mode
#
# 1v1 battles and ratings are NOT affected.
#
# If any step fails, maintenance mode stays ON so no stale arenas can land.
# You can manually disable it:  npm run migrate -- /dev/stdin <<< "UPDATE settings SET value = 'false' WHERE key = 'maintenance_mode';"
#
# Usage:
#   ./scripts/reset-arena-ladder.sh
#
# Prerequisites:
#   - .env.local must contain POSTGRES_URL_NON_POOLING
#   - The settings table must exist
#   - The deployment with the maintenance mode guard must be live

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load env
# shellcheck source=/dev/null
source "$PROJECT_DIR/.env.local"

PSQL="psql $POSTGRES_URL_NON_POOLING -tAq"

run_sql() {
  echo "$1" | $PSQL
}

echo "=== ModelWar Arena Ladder Reset ==="
echo ""

# Step 1: Enable maintenance mode
echo "[1/4] Enabling maintenance mode..."
run_sql "UPDATE settings SET value = 'true', updated_at = NOW() WHERE key = 'maintenance_mode';"
echo "       Maintenance mode ON. New arenas will get 503."
echo ""

# Step 2: Wait for in-flight arenas to drain
echo "[2/4] Waiting for in-flight arenas to drain..."
sleep 5  # initial wait for any currently-executing request to finish

MAX_ATTEMPTS=10
for attempt in $(seq 1 $MAX_ATTEMPTS); do
  recent=$(run_sql "SELECT COUNT(*) FROM arenas WHERE created_at > NOW() - INTERVAL '5 seconds';")
  if [ "$recent" -eq 0 ]; then
    echo "       No recent arenas. Safe to proceed."
    break
  fi
  if [ "$attempt" -eq "$MAX_ATTEMPTS" ]; then
    echo ""
    echo "ERROR: Still seeing $recent arena(s) after $MAX_ATTEMPTS attempts."
    echo "       Maintenance mode is still ON (safe). Investigate before retrying."
    echo "       To disable maintenance mode manually:"
    echo "         npm run migrate -- /dev/stdin <<< \"UPDATE settings SET value = 'false' WHERE key = 'maintenance_mode';\""
    exit 1
  fi
  echo "       Found $recent recent arena(s). Waiting 3s... (attempt $attempt/$MAX_ATTEMPTS)"
  sleep 3
done
echo ""

# Step 3: Reset the arena ladder
echo "[3/4] Resetting arena ladder..."
RESULT=$(run_sql "
BEGIN;
DELETE FROM arena_rounds;
DELETE FROM arena_participants;
DELETE FROM arenas;
UPDATE players SET
  arena_rating = 1200, arena_rd = 350, arena_volatility = 0.06,
  arena_wins = 0, arena_losses = 0, arena_ties = 0,
  last_arena_at = NULL, updated_at = NOW();
COMMIT;
")
echo "       $RESULT"
echo "       Arena ladder reset complete."
echo ""

# Step 4: Disable maintenance mode
echo "[4/4] Disabling maintenance mode..."
run_sql "UPDATE settings SET value = 'false', updated_at = NOW() WHERE key = 'maintenance_mode';"
echo "       Maintenance mode OFF. Arena is open."
echo ""

# Verify
echo "=== Verification ==="
ARENA_COUNT=$(run_sql "SELECT COUNT(*) FROM arenas;")
echo "Arenas: $ARENA_COUNT"

echo "Top 5 players (arena ratings):"
psql "$POSTGRES_URL_NON_POOLING" -c "SELECT id, name, arena_rating, arena_rd, arena_wins, arena_losses, arena_ties FROM players ORDER BY id LIMIT 5;"

echo ""
echo "Done. Arena ladder has been reset. 1v1 data is untouched."
