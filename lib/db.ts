import { sql } from '@vercel/postgres';

export interface Player {
  id: number;
  name: string;
  api_key: string;
  elo_rating: number;
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
  created_at: Date;
}

// Player queries

export async function createPlayer(name: string): Promise<Player> {
  const result = await sql<Player>`
    INSERT INTO players (name)
    VALUES (${name})
    RETURNING *
  `;
  return result.rows[0];
}

export async function getPlayerByApiKey(apiKey: string): Promise<Player | null> {
  const result = await sql<Player>`
    SELECT * FROM players WHERE api_key = ${apiKey}
  `;
  return result.rows[0] || null;
}

export async function getPlayerById(id: number): Promise<Player | null> {
  const result = await sql<Player>`
    SELECT * FROM players WHERE id = ${id}
  `;
  return result.rows[0] || null;
}

export async function getLeaderboard(): Promise<Player[]> {
  const result = await sql<Player>`
    SELECT id, name, elo_rating, wins, losses, ties, created_at
    FROM players
    ORDER BY elo_rating DESC, wins DESC
  `;
  return result.rows;
}

export async function updatePlayerRating(
  playerId: number,
  newRating: number,
  resultType: 'win' | 'loss' | 'tie'
): Promise<void> {
  const winInc = resultType === 'win' ? 1 : 0;
  const lossInc = resultType === 'loss' ? 1 : 0;
  const tieInc = resultType === 'tie' ? 1 : 0;

  await sql`
    UPDATE players
    SET elo_rating = ${newRating},
        wins = wins + ${winInc},
        losses = losses + ${lossInc},
        ties = ties + ${tieInc},
        updated_at = NOW()
    WHERE id = ${playerId}
  `;
}

// Warrior queries

export async function upsertWarrior(
  playerId: number,
  name: string,
  redcode: string
): Promise<Warrior> {
  const result = await sql<Warrior>`
    INSERT INTO warriors (player_id, name, redcode)
    VALUES (${playerId}, ${name}, ${redcode})
    ON CONFLICT (player_id) DO UPDATE
    SET name = ${name}, redcode = ${redcode}, updated_at = NOW()
    RETURNING *
  `;
  return result.rows[0];
}

export async function getWarriorByPlayerId(playerId: number): Promise<Warrior | null> {
  const result = await sql<Warrior>`
    SELECT * FROM warriors WHERE player_id = ${playerId}
  `;
  return result.rows[0] || null;
}

export async function getWarriorById(id: number): Promise<Warrior | null> {
  const result = await sql<Warrior>`
    SELECT * FROM warriors WHERE id = ${id}
  `;
  return result.rows[0] || null;
}

// Battle queries

export async function createBattle(battle: Omit<Battle, 'id' | 'created_at'>): Promise<Battle> {
  const result = await sql<Battle>`
    INSERT INTO battles (
      challenger_id, defender_id,
      challenger_warrior_id, defender_warrior_id,
      result, rounds,
      challenger_wins, defender_wins, ties,
      challenger_elo_before, defender_elo_before,
      challenger_elo_after, defender_elo_after
    ) VALUES (
      ${battle.challenger_id}, ${battle.defender_id},
      ${battle.challenger_warrior_id}, ${battle.defender_warrior_id},
      ${battle.result}, ${battle.rounds},
      ${battle.challenger_wins}, ${battle.defender_wins}, ${battle.ties},
      ${battle.challenger_elo_before}, ${battle.defender_elo_before},
      ${battle.challenger_elo_after}, ${battle.defender_elo_after}
    )
    RETURNING *
  `;
  return result.rows[0];
}

export async function getBattleById(id: number): Promise<Battle | null> {
  const result = await sql<Battle>`
    SELECT * FROM battles WHERE id = ${id}
  `;
  return result.rows[0] || null;
}

export async function getBattlesByPlayerId(playerId: number, limit = 20): Promise<Battle[]> {
  const result = await sql<Battle>`
    SELECT * FROM battles
    WHERE challenger_id = ${playerId} OR defender_id = ${playerId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return result.rows;
}

export async function getRecentBattles(limit = 10): Promise<Battle[]> {
  const result = await sql<Battle>`
    SELECT * FROM battles
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return result.rows;
}
