import { Pool, PoolClient } from 'pg';

// pg v9 treats sslmode=require as verify-full, which fails with Supabase's
// pooler cert. Strip sslmode from URL and configure SSL explicitly.
function buildPool() {
  const raw = process.env.POSTGRES_URL || '';
  const url = new URL(raw);
  const needsSsl = url.searchParams.get('sslmode') !== null;
  url.searchParams.delete('sslmode');

  return new Pool({
    connectionString: url.toString(),
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
}

const pool = buildPool();

async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

async function queryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

export interface Player {
  id: number;
  name: string;
  api_key: string;
  elo_rating: number;
  rating_deviation: number;
  rating_volatility: number;
  wins: number;
  losses: number;
  ties: number;
  created_at: Date;
  updated_at: Date;
}

export interface Warrior {
  id: number;
  player_id: number;
  name: string;
  redcode: string;
  created_at: Date;
  updated_at: Date;
}

export interface RoundResultRecord {
  round: number;
  winner: 'challenger' | 'defender' | 'tie';
  seed: number;
}

export interface Battle {
  id: number;
  challenger_id: number;
  defender_id: number;
  challenger_warrior_id: number;
  defender_warrior_id: number;
  result: string;
  rounds: number;
  challenger_wins: number;
  defender_wins: number;
  ties: number;
  challenger_elo_before: number;
  defender_elo_before: number;
  challenger_elo_after: number;
  defender_elo_after: number;
  challenger_rd_before: number | null;
  challenger_rd_after: number | null;
  defender_rd_before: number | null;
  defender_rd_after: number | null;
  challenger_redcode: string | null;
  defender_redcode: string | null;
  round_results: RoundResultRecord[] | null;
  created_at: Date;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Player queries

export async function createPlayer(name: string): Promise<Player> {
  const rows = await query<Player>(
    'INSERT INTO players (name) VALUES ($1) RETURNING *',
    [name]
  );
  return rows[0];
}

export async function getPlayerByApiKey(apiKey: string): Promise<Player | null> {
  return queryOne<Player>(
    'SELECT * FROM players WHERE api_key = $1',
    [apiKey]
  );
}

export async function getPlayerById(id: number): Promise<Player | null> {
  return queryOne<Player>(
    'SELECT * FROM players WHERE id = $1',
    [id]
  );
}

export async function getLeaderboard(limit = 100): Promise<Player[]> {
  return query<Player>(
    'SELECT id, name, elo_rating, rating_deviation, rating_volatility, wins, losses, ties, created_at FROM players ORDER BY (elo_rating - 2 * rating_deviation) DESC, wins DESC LIMIT $1',
    [limit]
  );
}

export async function getPlayerCount(): Promise<number> {
  const rows = await query<{ count: string }>('SELECT COUNT(*) as count FROM players');
  return parseInt(rows[0].count, 10);
}

export async function updatePlayerRating(
  playerId: number,
  newRating: number,
  newRd: number,
  newVolatility: number,
  resultType: 'win' | 'loss' | 'tie',
  client?: PoolClient
): Promise<void> {
  const winInc = resultType === 'win' ? 1 : 0;
  const lossInc = resultType === 'loss' ? 1 : 0;
  const tieInc = resultType === 'tie' ? 1 : 0;

  const sql = 'UPDATE players SET elo_rating = $1, rating_deviation = $2, rating_volatility = $3, wins = wins + $4, losses = losses + $5, ties = ties + $6, updated_at = NOW() WHERE id = $7';
  const params = [newRating, newRd, newVolatility, winInc, lossInc, tieInc, playerId];

  if (client) {
    await client.query(sql, params);
  } else {
    await query(sql, params);
  }
}

export async function getPlayersByIds(ids: number[]): Promise<Player[]> {
  if (ids.length === 0) return [];
  return query<Player>(
    'SELECT id, name, elo_rating, rating_deviation, rating_volatility, wins, losses, ties, created_at FROM players WHERE id = ANY($1)',
    [ids]
  );
}

// Warrior queries

export async function upsertWarrior(
  playerId: number,
  name: string,
  redcode: string
): Promise<Warrior> {
  const rows = await query<Warrior>(
    `INSERT INTO warriors (player_id, name, redcode) VALUES ($1, $2, $3)
     ON CONFLICT (player_id) DO UPDATE SET name = $2, redcode = $3, updated_at = NOW()
     RETURNING *`,
    [playerId, name, redcode]
  );
  return rows[0];
}

export async function getWarriorByPlayerId(playerId: number): Promise<Warrior | null> {
  return queryOne<Warrior>(
    'SELECT * FROM warriors WHERE player_id = $1',
    [playerId]
  );
}

export async function getWarriorById(id: number): Promise<Warrior | null> {
  return queryOne<Warrior>(
    'SELECT * FROM warriors WHERE id = $1',
    [id]
  );
}

// Battle queries

export async function createBattle(battle: Omit<Battle, 'id' | 'created_at'>, client?: PoolClient): Promise<Battle> {
  const sql = `INSERT INTO battles (
      challenger_id, defender_id,
      challenger_warrior_id, defender_warrior_id,
      result, rounds,
      challenger_wins, defender_wins, ties,
      challenger_elo_before, defender_elo_before,
      challenger_elo_after, defender_elo_after,
      challenger_rd_before, challenger_rd_after,
      defender_rd_before, defender_rd_after,
      challenger_redcode, defender_redcode, round_results
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    RETURNING *`;
  const params = [
    battle.challenger_id, battle.defender_id,
    battle.challenger_warrior_id, battle.defender_warrior_id,
    battle.result, battle.rounds,
    battle.challenger_wins, battle.defender_wins, battle.ties,
    battle.challenger_elo_before, battle.defender_elo_before,
    battle.challenger_elo_after, battle.defender_elo_after,
    battle.challenger_rd_before, battle.challenger_rd_after,
    battle.defender_rd_before, battle.defender_rd_after,
    battle.challenger_redcode, battle.defender_redcode,
    battle.round_results ? JSON.stringify(battle.round_results) : null,
  ];

  if (client) {
    const result = await client.query(sql, params);
    return result.rows[0] as Battle;
  }
  const rows = await query<Battle>(sql, params);
  return rows[0];
}

export async function getBattleById(id: number): Promise<Battle | null> {
  return queryOne<Battle>(
    'SELECT * FROM battles WHERE id = $1',
    [id]
  );
}

export async function getBattlesByPlayerId(playerId: number, limit = 20): Promise<Battle[]> {
  return query<Battle>(
    'SELECT * FROM battles WHERE challenger_id = $1 OR defender_id = $1 ORDER BY created_at DESC LIMIT $2',
    [playerId, limit]
  );
}

export async function getRecentBattles(limit = 10): Promise<Battle[]> {
  return query<Battle>(
    'SELECT * FROM battles ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
}

export async function getFeaturedBattles(limit = 5): Promise<Battle[]> {
  return query<Battle>(
    `SELECT * FROM battles
     WHERE ((challenger_wins = 3 AND defender_wins = 2)
        OR (challenger_wins = 2 AND defender_wins = 3))
       AND challenger_redcode IS NOT NULL
       AND defender_redcode IS NOT NULL
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
}
