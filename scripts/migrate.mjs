import { readFileSync } from 'fs';
import pg from 'pg';
import { config } from 'dotenv';

config({ path: '.env.local' });

const raw = process.env.POSTGRES_URL || '';
const url = new URL(raw);
url.searchParams.delete('sslmode');

const pool = new pg.Pool({
  connectionString: url.toString(),
  ssl: raw.includes('sslmode=') ? { rejectUnauthorized: false } : undefined,
});

const sql = readFileSync('sql/migrations.sql', 'utf-8');

const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

for (const statement of statements) {
  console.log('Running:', statement.slice(0, 60) + '...');
  await pool.query(statement);
  console.log('  OK');
}

console.log('\nMigrations complete!');
await pool.end();
