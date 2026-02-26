const mockQuery = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: mockQuery,
  })),
}));

// Must set env before importing db module
process.env.POSTGRES_URL = 'postgres://user:pass@localhost:5432/testdb';

import * as db from '../db';
import { makePlayer, makeWarrior, makeBattle, makeArenaWarrior } from './fixtures';

beforeEach(() => {
  mockQuery.mockReset();
});

describe('Player queries', () => {
  it('createPlayer: inserts and returns first row', async () => {
    const player = makePlayer({ name: 'Alice' });
    mockQuery.mockResolvedValueOnce({ rows: [player] });

    const result = await db.createPlayer('Alice');

    expect(result).toEqual(player);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO players'),
      ['Alice']
    );
  });

  it('getPlayerByApiKey: returns player when found', async () => {
    const player = makePlayer();
    mockQuery.mockResolvedValueOnce({ rows: [player] });

    const result = await db.getPlayerByApiKey('test-api-key-123');

    expect(result).toEqual(player);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE api_key = $1'),
      ['test-api-key-123']
    );
  });

  it('getPlayerByApiKey: returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await db.getPlayerByApiKey('nonexistent');

    expect(result).toBeNull();
  });

  it('getPlayerById: returns player when found', async () => {
    const player = makePlayer({ id: 42 });
    mockQuery.mockResolvedValueOnce({ rows: [player] });

    const result = await db.getPlayerById(42);

    expect(result).toEqual(player);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1'),
      [42]
    );
  });

  it('getPlayerById: returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await db.getPlayerById(999);

    expect(result).toBeNull();
  });

  it('getLeaderboard: returns rows ordered by conservative rating with default limit', async () => {
    const players = [makePlayer({ elo_rating: 1400 }), makePlayer({ id: 2, elo_rating: 1200 })];
    mockQuery.mockResolvedValueOnce({ rows: players });

    const result = await db.getLeaderboard();

    expect(result).toEqual(players);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY (elo_rating - 2 * rating_deviation) DESC'),
      [100]
    );
  });

  it('getPlayerCount: parses count string to number', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '42' }] });

    const result = await db.getPlayerCount();

    expect(result).toBe(42);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT COUNT(*)'),
      undefined
    );
  });

  it('updatePlayerRating: increments win column for win result', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await db.updatePlayerRating(1, 1232, 320, 0.06, 'win');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE players SET elo_rating'),
      [1232, 320, 0.06, 1, 0, 0, 1]
    );
  });

  it('updatePlayerRating: increments loss column for loss result', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await db.updatePlayerRating(2, 1168, 320, 0.06, 'loss');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE players SET elo_rating'),
      [1168, 320, 0.06, 0, 1, 0, 2]
    );
  });

  it('updatePlayerRating: increments tie column for tie result', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await db.updatePlayerRating(3, 1200, 350, 0.06, 'tie');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE players SET elo_rating'),
      [1200, 350, 0.06, 0, 0, 1, 3]
    );
  });
});

describe('Settings queries', () => {
  it('isMaintenanceMode: returns true when value is true', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ key: 'maintenance_mode', value: 'true', updated_at: new Date() }] });

    const result = await db.isMaintenanceMode();

    expect(result).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("WHERE key = 'maintenance_mode'"),
      []
    );
  });

  it('isMaintenanceMode: returns false when value is false', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ key: 'maintenance_mode', value: 'false', updated_at: new Date() }] });

    const result = await db.isMaintenanceMode();

    expect(result).toBe(false);
  });

  it('isMaintenanceMode: returns false when no row exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await db.isMaintenanceMode();

    expect(result).toBe(false);
  });
});

describe('Warrior queries', () => {
  it('upsertWarrior: inserts or updates and returns warrior', async () => {
    const warrior = makeWarrior();
    mockQuery.mockResolvedValueOnce({ rows: [warrior] });

    const result = await db.upsertWarrior(1, 'TestWarrior', 'MOV 0, 1');

    expect(result).toEqual(warrior);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO warriors'),
      [1, 'TestWarrior', 'MOV 0, 1']
    );
  });

  it('getWarriorByPlayerId: returns warrior when found', async () => {
    const warrior = makeWarrior();
    mockQuery.mockResolvedValueOnce({ rows: [warrior] });

    const result = await db.getWarriorByPlayerId(1);

    expect(result).toEqual(warrior);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE player_id = $1'),
      [1]
    );
  });

  it('getWarriorById: returns warrior when found', async () => {
    const warrior = makeWarrior({ id: 5 });
    mockQuery.mockResolvedValueOnce({ rows: [warrior] });

    const result = await db.getWarriorById(5);

    expect(result).toEqual(warrior);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1'),
      [5]
    );
  });
});

describe('Battle queries', () => {
  it('createBattle: inserts all fields and returns battle', async () => {
    const battle = makeBattle();
    mockQuery.mockResolvedValueOnce({ rows: [battle] });

    const { id: _id, created_at: _created_at, ...input } = battle;
    const result = await db.createBattle(input);

    expect(result).toEqual(battle);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO battles'),
      [
        input.challenger_id, input.defender_id,
        input.challenger_warrior_id, input.defender_warrior_id,
        input.result, input.rounds,
        input.challenger_wins, input.defender_wins, input.ties,
        input.challenger_elo_before, input.defender_elo_before,
        input.challenger_elo_after, input.defender_elo_after,
        input.challenger_rd_before, input.challenger_rd_after,
        input.defender_rd_before, input.defender_rd_after,
        input.challenger_redcode, input.defender_redcode,
        null,
      ]
    );
  });

  it('createBattle: serializes round_results as JSON', async () => {
    const roundResults = [
      { round: 1, winner: 'challenger' as const, seed: 12345 },
      { round: 2, winner: 'defender' as const, seed: 67890 },
    ];
    const battle = makeBattle({
      challenger_redcode: 'MOV 0, 1',
      defender_redcode: 'DAT #0, #0',
      round_results: roundResults,
    });
    mockQuery.mockResolvedValueOnce({ rows: [battle] });

    const { id: _id, created_at: _created_at, ...input } = battle;
    await db.createBattle(input);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO battles'),
      expect.arrayContaining([
        'MOV 0, 1',
        'DAT #0, #0',
        JSON.stringify(roundResults),
      ])
    );
  });

  it('getBattleById: returns battle when found', async () => {
    const battle = makeBattle();
    mockQuery.mockResolvedValueOnce({ rows: [battle] });

    const result = await db.getBattleById(1);

    expect(result).toEqual(battle);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1'),
      [1]
    );
  });

  it('getBattlesByPlayerId: returns battles for player with default offset', async () => {
    const battles = [makeBattle(), makeBattle({ id: 2 })];
    mockQuery.mockResolvedValueOnce({ rows: battles });

    const result = await db.getBattlesByPlayerId(1);

    expect(result).toEqual(battles);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE challenger_id = $1 OR defender_id = $1'),
      [1, 20, 0]
    );
  });

  it('getBattlesByPlayerId: passes custom offset', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await db.getBattlesByPlayerId(1, 10, 20);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('OFFSET $3'),
      [1, 10, 20]
    );
  });

  it('getBattleCountByPlayerId: returns count for player', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '42' }] });

    const result = await db.getBattleCountByPlayerId(1);

    expect(result).toBe(42);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT COUNT(*)'),
      [1]
    );
  });

  it('getRecentBattles: returns battles ordered by date with default limit', async () => {
    const battles = [makeBattle()];
    mockQuery.mockResolvedValueOnce({ rows: battles });

    const result = await db.getRecentBattles();

    expect(result).toEqual(battles);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY created_at DESC'),
      [10]
    );
  });

  it('getRecentPairBattleCount: returns count for a player pair', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }] });

    const result = await db.getRecentPairBattleCount(1, 2, 2);

    expect(result).toBe(3);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('challenger_id = $1 AND defender_id = $2'),
      [1, 2, 2]
    );
  });

  it('getRecentPairBattleCount: queries both directions', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

    await db.getRecentPairBattleCount(5, 10, 2);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('challenger_id = $2 AND defender_id = $1'),
      [5, 10, 2]
    );
  });

  it('getRecentPairBattleCount: returns 0 when no recent battles', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const result = await db.getRecentPairBattleCount(1, 2, 2);

    expect(result).toBe(0);
  });

  it('getFeaturedBattles: returns decisive battles ordered by closeness', async () => {
    const battles = [makeBattle({ challenger_wins: 51, defender_wins: 49 })];
    mockQuery.mockResolvedValueOnce({ rows: battles });

    const result = await db.getFeaturedBattles();

    expect(result).toEqual(battles);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('ABS(challenger_wins - defender_wins) ASC'),
      [5]
    );
  });
});

describe('Unified battle queries', () => {
  it('getUnifiedBattlesByPlayerId: returns unified entries with UNION ALL', async () => {
    const entries = [
      { type: '1v1', id: 1, created_at: new Date(), challenger_id: 1, defender_id: 2, result: 'challenger_win' },
      { type: 'arena', id: 3, created_at: new Date(), placement: 2, participant_count: 10, total_score: 120 },
    ];
    mockQuery.mockResolvedValueOnce({ rows: entries });

    const result = await db.getUnifiedBattlesByPlayerId(1, 20, 0);

    expect(result).toEqual(entries);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UNION ALL'),
      [1, 20, 0]
    );
  });

  it('getUnifiedBattlesByPlayerId: uses default limit and offset', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await db.getUnifiedBattlesByPlayerId(5);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UNION ALL'),
      [5, 20, 0]
    );
  });

  it('getUnifiedBattleCountByPlayerId: sums counts from both tables', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '15' }] });

    const result = await db.getUnifiedBattleCountByPlayerId(1);

    expect(result).toBe(15);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('battles'),
      [1]
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('arena_participants'),
      [1]
    );
  });

  it('getRecentUnifiedBattles: returns recent entries from both tables', async () => {
    const entries = [
      { type: '1v1', id: 1, created_at: new Date() },
      { type: 'arena', id: 2, created_at: new Date() },
    ];
    mockQuery.mockResolvedValueOnce({ rows: entries });

    const result = await db.getRecentUnifiedBattles(10);

    expect(result).toEqual(entries);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UNION ALL'),
      [10, 0]
    );
  });

  it('getRecentUnifiedBattles: uses default limit', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await db.getRecentUnifiedBattles();

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UNION ALL'),
      [10, 0]
    );
  });

  it('getRecentUnifiedBattles: passes custom offset', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await db.getRecentUnifiedBattles(20, 40);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('OFFSET $2'),
      [20, 40]
    );
  });

  it('getRecentUnifiedBattleCount: sums counts from battles and arenas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '25' }] });

    const result = await db.getRecentUnifiedBattleCount();

    expect(result).toBe(25);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('battles'),
      undefined
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('arenas'),
      undefined
    );
  });
});

describe('Arena warrior queries', () => {
  it('upsertArenaWarrior: inserts or updates and returns arena warrior', async () => {
    const warrior = makeArenaWarrior({ auto_join: true });
    mockQuery.mockResolvedValueOnce({ rows: [warrior] });

    const result = await db.upsertArenaWarrior(1, 'ArenaWarrior', 'MOV 0, 1', true);

    expect(result).toEqual(warrior);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO arena_warriors'),
      [1, 'ArenaWarrior', 'MOV 0, 1', true]
    );
  });

  it('getArenaWarriorByPlayerId: returns arena warrior when found', async () => {
    const warrior = makeArenaWarrior();
    mockQuery.mockResolvedValueOnce({ rows: [warrior] });

    const result = await db.getArenaWarriorByPlayerId(1);

    expect(result).toEqual(warrior);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE player_id = $1'),
      [1]
    );
  });

  it('getArenaWarriorByPlayerId: returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await db.getArenaWarriorByPlayerId(999);

    expect(result).toBeNull();
  });

  it('getAutoJoinPlayers: returns auto-join players ordered by last_arena_at', async () => {
    const players = [
      { player_id: 2, name: 'AW1', redcode: 'MOV 0, 1', arena_rating: 1200, arena_rd: 350, arena_volatility: 0.06 },
      { player_id: 3, name: 'AW2', redcode: 'ADD 1, 2', arena_rating: 1300, arena_rd: 300, arena_volatility: 0.06 },
    ];
    mockQuery.mockResolvedValueOnce({ rows: players });

    const result = await db.getAutoJoinPlayers([1], 9);

    expect(result).toEqual(players);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('auto_join = true'),
      [[1], 9]
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY p.last_arena_at ASC NULLS FIRST'),
      [[1], 9]
    );
  });

  it('updatePlayerLastArenaAt: updates last_arena_at for given player IDs', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await db.updatePlayerLastArenaAt([1, 2, 3]);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE players SET last_arena_at'),
      [[1, 2, 3]]
    );
  });

  it('updatePlayerLastArenaAt: does nothing for empty array', async () => {
    await db.updatePlayerLastArenaAt([]);

    expect(mockQuery).not.toHaveBeenCalled();
  });
});
