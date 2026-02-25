#!/usr/bin/env bash
#
# Safely reset the ModelWar ladder.
#
# This script:
#   1. Enables maintenance mode (blocks new battles via 503)
#   2. Waits for in-flight battles to drain
#   3. Deletes all battles and resets all player ratings
#   4. Disables maintenance mode
#
# If any step fails, maintenance mode stays ON so no stale battles can land.
# You can manually disable it:  npm run migrate -- /dev/stdin <<< "UPDATE settings SET value = 'false' WHERE key = 'maintenance_mode';"
#
# Usage:
#   ./scripts/reset-ladder.sh
#
# Prerequisites:
#   - .env.local must contain POSTGRES_URL_NON_POOLING
#   - The settings table must exist (run sql/011_add_settings_table.sql first)
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

echo "=== ModelWar Ladder Reset ==="
echo ""

# Step 1: Enable maintenance mode
echo "[1/4] Enabling maintenance mode..."
run_sql "UPDATE settings SET value = 'true', updated_at = NOW() WHERE key = 'maintenance_mode';"
echo "       Maintenance mode ON. New battles will get 503."
echo ""

# Step 2: Wait for in-flight battles to drain
echo "[2/4] Waiting for in-flight battles to drain..."
sleep 5  # initial wait for any currently-executing request to finish

MAX_ATTEMPTS=10
for attempt in $(seq 1 $MAX_ATTEMPTS); do
  recent=$(run_sql "SELECT COUNT(*) FROM battles WHERE created_at > NOW() - INTERVAL '5 seconds';")
  if [ "$recent" -eq 0 ]; then
    echo "       No recent battles. Safe to proceed."
    break
  fi
  if [ "$attempt" -eq "$MAX_ATTEMPTS" ]; then
    echo ""
    echo "ERROR: Still seeing $recent battle(s) after $MAX_ATTEMPTS attempts."
    echo "       Maintenance mode is still ON (safe). Investigate before retrying."
    echo "       To disable maintenance mode manually:"
    echo "         npm run migrate -- /dev/stdin <<< \"UPDATE settings SET value = 'false' WHERE key = 'maintenance_mode';\""
    exit 1
  fi
  echo "       Found $recent recent battle(s). Waiting 3s... (attempt $attempt/$MAX_ATTEMPTS)"
  sleep 3
done
echo ""

# Step 3: Reset the ladder
echo "[3/4] Resetting ladder..."
RESULT=$(run_sql "
BEGIN;
DELETE FROM battles;
UPDATE players SET
  elo_rating = 1200, rating_deviation = 350, rating_volatility = 0.06,
  wins = 0, losses = 0, ties = 0, updated_at = NOW();
COMMIT;
")
echo "       $RESULT"
echo "       Ladder reset complete."
echo ""

# Step 4: Disable maintenance mode
echo "[4/4] Disabling maintenance mode..."
run_sql "UPDATE settings SET value = 'false', updated_at = NOW() WHERE key = 'maintenance_mode';"
echo "       Maintenance mode OFF. Arena is open."
echo ""

# Verify
echo "=== Verification ==="
BATTLE_COUNT=$(run_sql "SELECT COUNT(*) FROM battles;")
echo "Battles: $BATTLE_COUNT"

echo "Top 5 players:"
psql "$POSTGRES_URL_NON_POOLING" -c "SELECT id, name, elo_rating, rating_deviation FROM players ORDER BY id LIMIT 5;"

echo ""
echo "Done. Ladder has been reset."
