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
  arena_rating: number;
  arena_rd: number;
  arena_volatility: number;
  arena_wins: number;
  arena_losses: number;
  arena_ties: number;
  last_arena_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ArenaWarrior {
  id: number;
  player_id: number;
  name: string;
  redcode: string;
  auto_join: boolean;
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

// Settings queries

export interface Setting {
  key: string;
  value: string;
  updated_at: Date;
}

export async function isMaintenanceMode(): Promise<boolean> {
  const row = await queryOne<Setting>(
    "SELECT * FROM settings WHERE key = 'maintenance_mode'",
    []
  );
  return row?.value === 'true';
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

export async function getBattlesByPlayerId(playerId: number, limit = 20, offset = 0): Promise<Battle[]> {
  return query<Battle>(
    'SELECT * FROM battles WHERE challenger_id = $1 OR defender_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [playerId, limit, offset]
  );
}

export async function getBattleCountByPlayerId(playerId: number): Promise<number> {
  const rows = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM battles WHERE challenger_id = $1 OR defender_id = $1',
    [playerId]
  );
  return parseInt(rows[0].count, 10);
}

export async function getRecentBattles(limit = 10): Promise<Battle[]> {
  return query<Battle>(
    'SELECT * FROM battles ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
}

export async function getRecentPairBattleCount(
  playerIdA: number,
  playerIdB: number,
  windowMinutes: number,
  client?: PoolClient
): Promise<number> {
  const sql = `SELECT COUNT(*) as count FROM battles
    WHERE ((challenger_id = $1 AND defender_id = $2) OR (challenger_id = $2 AND defender_id = $1))
    AND created_at > NOW() - INTERVAL '1 minute' * $3`;
  const params = [playerIdA, playerIdB, windowMinutes];

  if (client) {
    const result = await client.query(sql, params);
    return parseInt(result.rows[0].count, 10);
  }
  const rows = await query<{ count: string }>(sql, params);
  return parseInt(rows[0].count, 10);
}

export async function getFeaturedBattles(limit = 5): Promise<Battle[]> {
  return query<Battle>(
    `SELECT * FROM battles
     WHERE result IN ('challenger_win', 'defender_win')
       AND challenger_redcode IS NOT NULL
       AND defender_redcode IS NOT NULL
       AND round_results IS NOT NULL
     ORDER BY ABS(challenger_wins - defender_wins) ASC, created_at DESC
     LIMIT $1`,
    [limit]
  );
}

// Arena types

export interface Arena {
  id: number;
  session_id: string;
  seed: number;
  total_rounds: number;
  status: string;
  started_at: Date;
  completed_at: Date | null;
  created_at: Date;
}

export interface ArenaParticipant {
  id: number;
  arena_id: number;
  player_id: number | null;
  slot_index: number;
  is_stock_bot: boolean;
  stock_bot_name: string | null;
  redcode: string;
  placement: number | null;
  total_score: number;
  arena_rating_before: number | null;
  arena_rating_after: number | null;
  arena_rd_before: number | null;
  arena_rd_after: number | null;
}

export interface ArenaRound {
  id: number;
  arena_id: number;
  round_number: number;
  seed: number;
  survivor_count: number;
  winner_slot: number | null;
  scores: number[];
}

// Arena CRUD functions

export async function createArena(
  sessionId: string,
  seed: number,
  totalRounds: number,
  client?: PoolClient
): Promise<Arena> {
  const sql = `INSERT INTO arenas (session_id, seed, total_rounds, status, completed_at)
    VALUES ($1, $2, $3, 'completed', NOW()) RETURNING *`;
  const params = [sessionId, seed, totalRounds];
  if (client) {
    const result = await client.query(sql, params);
    return result.rows[0] as Arena;
  }
  const rows = await query<Arena>(sql, params);
  return rows[0];
}

export interface ArenaParticipantInput {
  playerId: number | null;
  slotIndex: number;
  isStockBot: boolean;
  stockBotName: string | null;
  redcode: string;
  placement: number;
  totalScore: number;
  arenaRatingBefore: number | null;
  arenaRatingAfter: number | null;
  arenaRdBefore: number | null;
  arenaRdAfter: number | null;
}

export async function createArenaParticipant(
  arenaId: number,
  participant: ArenaParticipantInput,
  client?: PoolClient
): Promise<ArenaParticipant> {
  const sql = `INSERT INTO arena_participants
    (arena_id, player_id, slot_index, is_stock_bot, stock_bot_name, redcode,
     placement, total_score, arena_rating_before, arena_rating_after,
     arena_rd_before, arena_rd_after)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`;
  const params = [
    arenaId, participant.playerId, participant.slotIndex, participant.isStockBot,
    participant.stockBotName, participant.redcode, participant.placement,
    participant.totalScore, participant.arenaRatingBefore, participant.arenaRatingAfter,
    participant.arenaRdBefore, participant.arenaRdAfter,
  ];
  if (client) {
    const result = await client.query(sql, params);
    return result.rows[0] as ArenaParticipant;
  }
  const rows = await query<ArenaParticipant>(sql, params);
  return rows[0];
}

export async function createArenaParticipantsBatch(
  arenaId: number,
  participants: ArenaParticipantInput[],
  client: PoolClient
): Promise<void> {
  if (participants.length === 0) return;

  const values: unknown[] = [];
  const placeholders: string[] = [];
  let idx = 1;

  for (const p of participants) {
    placeholders.push(
      `($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8}, $${idx + 9}, $${idx + 10}, $${idx + 11})`
    );
    values.push(
      arenaId, p.playerId, p.slotIndex, p.isStockBot,
      p.stockBotName, p.redcode, p.placement,
      p.totalScore, p.arenaRatingBefore, p.arenaRatingAfter,
      p.arenaRdBefore, p.arenaRdAfter,
    );
    idx += 12;
  }

  const sql = `INSERT INTO arena_participants
    (arena_id, player_id, slot_index, is_stock_bot, stock_bot_name, redcode,
     placement, total_score, arena_rating_before, arena_rating_after,
     arena_rd_before, arena_rd_after)
    VALUES ${placeholders.join(', ')}`;
  await client.query(sql, values);
}

export async function createArenaRound(
  arenaId: number,
  roundNumber: number,
  seed: number,
  survivorCount: number,
  winnerSlot: number | null,
  scores: number[],
  client?: PoolClient
): Promise<ArenaRound> {
  const sql = `INSERT INTO arena_rounds
    (arena_id, round_number, seed, survivor_count, winner_slot, scores)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
  const params = [arenaId, roundNumber, seed, survivorCount, winnerSlot, JSON.stringify(scores)];
  if (client) {
    const result = await client.query(sql, params);
    return result.rows[0] as ArenaRound;
  }
  const rows = await query<ArenaRound>(sql, params);
  return rows[0];
}

export interface ArenaRoundInput {
  roundNumber: number;
  seed: number;
  survivorCount: number;
  winnerSlot: number | null;
  scores: number[];
}

export async function createArenaRoundsBatch(
  arenaId: number,
  rounds: ArenaRoundInput[],
  client: PoolClient
): Promise<void> {
  if (rounds.length === 0) return;

  // Batch in chunks of 50 to stay within parameter limits (50 * 6 = 300 params)
  const CHUNK_SIZE = 50;
  for (let c = 0; c < rounds.length; c += CHUNK_SIZE) {
    const chunk = rounds.slice(c, c + CHUNK_SIZE);
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let idx = 1;

    for (const r of chunk) {
      placeholders.push(
        `($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5})`
      );
      values.push(arenaId, r.roundNumber, r.seed, r.survivorCount, r.winnerSlot, JSON.stringify(r.scores));
      idx += 6;
    }

    const sql = `INSERT INTO arena_rounds
      (arena_id, round_number, seed, survivor_count, winner_slot, scores)
      VALUES ${placeholders.join(', ')}`;
    await client.query(sql, values);
  }
}

export async function getArenaById(id: number): Promise<(Arena & { participants: ArenaParticipant[] }) | null> {
  const arena = await queryOne<Arena>('SELECT * FROM arenas WHERE id = $1', [id]);
  if (!arena) return null;
  const participants = await query<ArenaParticipant>(
    'SELECT * FROM arena_participants WHERE arena_id = $1 ORDER BY placement ASC',
    [id]
  );
  return { ...arena, participants };
}

export async function getArenaRounds(arenaId: number): Promise<ArenaRound[]> {
  return query<ArenaRound>(
    'SELECT * FROM arena_rounds WHERE arena_id = $1 ORDER BY round_number',
    [arenaId]
  );
}

export async function getArenaLeaderboard(limit = 100): Promise<Player[]> {
  return query<Player>(
    `SELECT id, name, elo_rating, rating_deviation, rating_volatility,
            wins, losses, ties,
            arena_rating, arena_rd, arena_volatility,
            arena_wins, arena_losses, arena_ties,
            created_at
     FROM players
     WHERE (arena_wins + arena_losses + arena_ties) > 0
     ORDER BY (arena_rating - 2 * arena_rd) DESC, arena_wins DESC
     LIMIT $1`,
    [limit]
  );
}

export async function updatePlayerArenaRating(
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

  const sql = `UPDATE players SET
    arena_rating = $1, arena_rd = $2, arena_volatility = $3,
    arena_wins = arena_wins + $4, arena_losses = arena_losses + $5,
    arena_ties = arena_ties + $6, updated_at = NOW()
    WHERE id = $7`;
  const params = [newRating, newRd, newVolatility, winInc, lossInc, tieInc, playerId];

  if (client) {
    await client.query(sql, params);
  } else {
    await query(sql, params);
  }
}

// Arena warrior functions

export async function upsertArenaWarrior(
  playerId: number,
  name: string,
  redcode: string,
  autoJoin: boolean
): Promise<ArenaWarrior> {
  const rows = await query<ArenaWarrior>(
    `INSERT INTO arena_warriors (player_id, name, redcode, auto_join) VALUES ($1, $2, $3, $4)
     ON CONFLICT (player_id) DO UPDATE SET name = $2, redcode = $3, auto_join = $4, updated_at = NOW()
     RETURNING *`,
    [playerId, name, redcode, autoJoin]
  );
  return rows[0];
}

export async function getArenaWarriorByPlayerId(playerId: number): Promise<ArenaWarrior | null> {
  return queryOne<ArenaWarrior>(
    'SELECT * FROM arena_warriors WHERE player_id = $1',
    [playerId]
  );
}

export interface AutoJoinPlayer {
  player_id: number;
  name: string;
  redcode: string;
  arena_rating: number;
  arena_rd: number;
  arena_volatility: number;
}

export async function getAutoJoinPlayers(
  excludePlayerIds: number[],
  limit: number
): Promise<AutoJoinPlayer[]> {
  return query<AutoJoinPlayer>(
    `SELECT aw.player_id, aw.name, aw.redcode,
            p.arena_rating, p.arena_rd, p.arena_volatility
     FROM arena_warriors aw
     INNER JOIN players p ON p.id = aw.player_id
     WHERE aw.auto_join = true
       AND aw.player_id != ALL($1)
     ORDER BY p.last_arena_at ASC NULLS FIRST
     LIMIT $2`,
    [excludePlayerIds, limit]
  );
}

export async function updatePlayerLastArenaAt(
  playerIds: number[],
  client?: PoolClient
): Promise<void> {
  if (playerIds.length === 0) return;
  const sql = 'UPDATE players SET last_arena_at = NOW() WHERE id = ANY($1)';
  const params = [playerIds];
  if (client) {
    await client.query(sql, params);
  } else {
    await query(sql, params);
  }
}

// Unified battle types and queries

export interface UnifiedBattle1v1 {
  type: '1v1';
  id: number;
  created_at: Date;
  challenger_id: number;
  defender_id: number;
  result: string;
  challenger_wins: number;
  defender_wins: number;
  ties: number;
  challenger_elo_before: number;
  challenger_elo_after: number;
  defender_elo_before: number;
  defender_elo_after: number;
  challenger_rd_before: number | null;
  challenger_rd_after: number | null;
  defender_rd_before: number | null;
  defender_rd_after: number | null;
  // arena fields null
  placement: null;
  participant_count: null;
  total_score: null;
  arena_rating_before: null;
  arena_rating_after: null;
  arena_rd_before: null;
  arena_rd_after: null;
}

export interface UnifiedBattleArena {
  type: 'arena';
  id: number;
  created_at: Date;
  placement: number;
  participant_count: number;
  total_score: number;
  arena_rating_before: number | null;
  arena_rating_after: number | null;
  arena_rd_before: number | null;
  arena_rd_after: number | null;
  // 1v1 fields null
  challenger_id: null;
  defender_id: null;
  result: null;
  challenger_wins: null;
  defender_wins: null;
  ties: null;
  challenger_elo_before: null;
  challenger_elo_after: null;
  defender_elo_before: null;
  defender_elo_after: null;
  challenger_rd_before: null;
  challenger_rd_after: null;
  defender_rd_before: null;
  defender_rd_after: null;
}

export type UnifiedBattleEntry = UnifiedBattle1v1 | UnifiedBattleArena;

export async function getUnifiedBattlesByPlayerId(
  playerId: number,
  limit = 20,
  offset = 0
): Promise<UnifiedBattleEntry[]> {
  return query<UnifiedBattleEntry>(
    `SELECT * FROM (
      SELECT
        '1v1' AS type,
        b.id,
        b.created_at,
        b.challenger_id,
        b.defender_id,
        b.result,
        b.challenger_wins,
        b.defender_wins,
        b.ties,
        b.challenger_elo_before,
        b.challenger_elo_after,
        b.defender_elo_before,
        b.defender_elo_after,
        b.challenger_rd_before,
        b.challenger_rd_after,
        b.defender_rd_before,
        b.defender_rd_after,
        NULL::int AS placement,
        NULL::int AS participant_count,
        NULL::int AS total_score,
        NULL::float8 AS arena_rating_before,
        NULL::float8 AS arena_rating_after,
        NULL::float8 AS arena_rd_before,
        NULL::float8 AS arena_rd_after
      FROM battles b
      WHERE b.challenger_id = $1 OR b.defender_id = $1

      UNION ALL

      SELECT
        'arena' AS type,
        a.id,
        a.created_at,
        NULL AS challenger_id,
        NULL AS defender_id,
        NULL AS result,
        NULL AS challenger_wins,
        NULL AS defender_wins,
        NULL AS ties,
        NULL AS challenger_elo_before,
        NULL AS challenger_elo_after,
        NULL AS defender_elo_before,
        NULL AS defender_elo_after,
        NULL AS challenger_rd_before,
        NULL AS challenger_rd_after,
        NULL AS defender_rd_before,
        NULL AS defender_rd_after,
        ap.placement,
        (SELECT COUNT(*) FROM arena_participants ap2 WHERE ap2.arena_id = a.id)::int AS participant_count,
        ap.total_score,
        ap.arena_rating_before,
        ap.arena_rating_after,
        ap.arena_rd_before,
        ap.arena_rd_after
      FROM arena_participants ap
      INNER JOIN arenas a ON a.id = ap.arena_id
      WHERE ap.player_id = $1
    ) unified
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3`,
    [playerId, limit, offset]
  );
}

export async function getUnifiedBattleCountByPlayerId(playerId: number): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT (
      (SELECT COUNT(*) FROM battles WHERE challenger_id = $1 OR defender_id = $1) +
      (SELECT COUNT(*) FROM arena_participants WHERE player_id = $1)
    )::text AS count`,
    [playerId]
  );
  return parseInt(rows[0].count, 10);
}

export async function getRecentUnifiedBattles(limit = 10, offset = 0): Promise<UnifiedBattleEntry[]> {
  return query<UnifiedBattleEntry>(
    `SELECT * FROM (
      SELECT
        '1v1' AS type,
        b.id,
        b.created_at,
        b.challenger_id,
        b.defender_id,
        b.result,
        b.challenger_wins,
        b.defender_wins,
        b.ties,
        NULL::float8 AS challenger_elo_before,
        NULL::float8 AS challenger_elo_after,
        NULL::float8 AS defender_elo_before,
        NULL::float8 AS defender_elo_after,
        NULL::float8 AS challenger_rd_before,
        NULL::float8 AS challenger_rd_after,
        NULL::float8 AS defender_rd_before,
        NULL::float8 AS defender_rd_after,
        NULL::int AS placement,
        NULL::int AS participant_count,
        NULL::int AS total_score,
        NULL::float8 AS arena_rating_before,
        NULL::float8 AS arena_rating_after,
        NULL::float8 AS arena_rd_before,
        NULL::float8 AS arena_rd_after
      FROM battles b

      UNION ALL

      SELECT
        'arena' AS type,
        a.id,
        a.created_at,
        NULL AS challenger_id,
        NULL AS defender_id,
        NULL AS result,
        NULL AS challenger_wins,
        NULL AS defender_wins,
        NULL AS ties,
        NULL AS challenger_elo_before,
        NULL AS challenger_elo_after,
        NULL AS defender_elo_before,
        NULL AS defender_elo_after,
        NULL AS challenger_rd_before,
        NULL AS challenger_rd_after,
        NULL AS defender_rd_before,
        NULL AS defender_rd_after,
        NULL AS placement,
        (SELECT COUNT(*) FROM arena_participants ap2 WHERE ap2.arena_id = a.id)::int AS participant_count,
        NULL AS total_score,
        NULL AS arena_rating_before,
        NULL AS arena_rating_after,
        NULL AS arena_rd_before,
        NULL AS arena_rd_after
      FROM arenas a
      WHERE a.status = 'completed'
    ) unified
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
}

export async function getRecentUnifiedBattleCount(): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT (
      (SELECT COUNT(*) FROM battles) +
      (SELECT COUNT(*) FROM arenas WHERE status = 'completed')
    )::text AS count`
  );
  return parseInt(rows[0].count, 10);
}

export async function getArenasByPlayerId(playerId: number, limit = 20, offset = 0): Promise<Arena[]> {
  return query<Arena>(
    `SELECT a.* FROM arenas a
     INNER JOIN arena_participants ap ON ap.arena_id = a.id
     WHERE ap.player_id = $1
     ORDER BY a.created_at DESC
     LIMIT $2 OFFSET $3`,
    [playerId, limit, offset]
  );
}

export async function getArenaCountByPlayerId(playerId: number): Promise<number> {
  const rows = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM arena_participants WHERE player_id = $1',
    [playerId]
  );
  return parseInt(rows[0].count, 10);
}

