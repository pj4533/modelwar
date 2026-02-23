// Cleanup script: delete warriors exceeding MAX_WARRIOR_LENGTH (3900 instructions)
// and reset their owner's ratings since battle results may be tainted.
//
// Run: node scripts/cleanup-oversized-warriors.mjs

import pg from 'pg';
import { config } from 'dotenv';
import { corewar } from 'corewar';

config({ path: '.env.local' });

const CORE_SIZE = 8000;
const MIN_SEPARATION = 100;
const MAX_WARRIOR_LENGTH = Math.floor(CORE_SIZE / 2 - MIN_SEPARATION);

const raw = process.env.POSTGRES_URL || '';
const url = new URL(raw);
url.searchParams.delete('sslmode');

const pool = new pg.Pool({
  connectionString: url.toString(),
  ssl: raw.includes('sslmode=') ? { rejectUnauthorized: false } : undefined,
});

const { rows: warriors } = await pool.query('SELECT id, player_id, name, redcode FROM warriors');

console.log(`Checking ${warriors.length} warriors (max length: ${MAX_WARRIOR_LENGTH})...\n`);

const oversized = [];

for (const w of warriors) {
  const result = corewar.parse(w.redcode);
  if (!result.success) {
    console.log(`  [SKIP] Warrior ${w.id} "${w.name}" - parse failed`);
    continue;
  }
  const count = result.tokens.filter(t => t.category === 'OPCODE').length;
  if (count > MAX_WARRIOR_LENGTH) {
    console.log(`  [OVERSIZED] Warrior ${w.id} "${w.name}" - ${count} instructions (player ${w.player_id})`);
    oversized.push(w);
  }
}

if (oversized.length === 0) {
  console.log('\nNo oversized warriors found. Nothing to do.');
  await pool.end();
  process.exit(0);
}

console.log(`\nDeleting ${oversized.length} oversized warrior(s) and resetting their owners' ratings...\n`);

const client = await pool.connect();
try {
  await client.query('BEGIN');

  for (const w of oversized) {
    // Delete battles involving this warrior
    await client.query(
      'DELETE FROM battles WHERE challenger_warrior_id = $1 OR defender_warrior_id = $1',
      [w.id]
    );
    // Delete the warrior
    await client.query('DELETE FROM warriors WHERE id = $1', [w.id]);
    // Reset the player's rating
    await client.query(
      `UPDATE players SET
        elo_rating = 1200,
        rating_deviation = 350,
        rating_volatility = 0.06,
        wins = 0, losses = 0, ties = 0,
        updated_at = NOW()
      WHERE id = $1`,
      [w.player_id]
    );
    console.log(`  Deleted warrior ${w.id} "${w.name}" and reset player ${w.player_id}`);
  }

  await client.query('COMMIT');
  console.log('\nCleanup complete!');
} catch (err) {
  await client.query('ROLLBACK');
  console.error('Error during cleanup, rolled back:', err);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
