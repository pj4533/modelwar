const mockQuery = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: mockQuery,
  })),
}));

// Must set env before importing db module
process.env.POSTGRES_URL = 'postgres://user:pass@localhost:5432/testdb';

import * as db from '../db';
import { makePlayer, makeWarrior, makeBattle, makePlayerHillStats } from './fixtures';

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

  it('getLeaderboard: returns rows ordered by elo with default limit', async () => {
    const players = [makePlayer({ elo_rating: 1400 }), makePlayer({ id: 2, elo_rating: 1200 })];
    mockQuery.mockResolvedValueOnce({ rows: players });

    const result = await db.getLeaderboard();

    expect(result).toEqual(players);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY elo_rating DESC'),
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

    const { id, created_at, ...input } = battle;
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
        input.challenger_redcode, input.defender_redcode,
        null,
        input.hill,
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

    const { id, created_at, ...input } = battle;
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

  it('getBattlesByPlayerId: returns battles for player', async () => {
    const battles = [makeBattle(), makeBattle({ id: 2 })];
    mockQuery.mockResolvedValueOnce({ rows: battles });

    const result = await db.getBattlesByPlayerId(1);

    expect(result).toEqual(battles);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE challenger_id = $1 OR defender_id = $1'),
      [1, 20]
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
});

describe('Hill stats queries', () => {
  it('getOrCreateHillStats: upserts and returns hill stats', async () => {
    const stats = makePlayerHillStats();
    mockQuery.mockResolvedValueOnce({ rows: [stats] });

    const result = await db.getOrCreateHillStats(1, 'big');

    expect(result).toEqual(stats);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO player_hill_stats'),
      [1, 'big']
    );
  });

  it('getOrCreateHillStats: SQL contains ON CONFLICT clause', async () => {
    const stats = makePlayerHillStats();
    mockQuery.mockResolvedValueOnce({ rows: [stats] });

    await db.getOrCreateHillStats(1, 'big');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT'),
      expect.any(Array)
    );
  });

  it('updateHillStats: increments win column for win result', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await db.updateHillStats(1, 'big', 1232, 'win');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE player_hill_stats'),
      [1232, 1, 0, 0, 1, 'big']
    );
  });

  it('updateHillStats: increments loss column for loss result', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await db.updateHillStats(2, 'big', 1168, 'loss');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE player_hill_stats'),
      [1168, 0, 1, 0, 2, 'big']
    );
  });

  it('updateHillStats: increments tie column for tie result', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await db.updateHillStats(3, 'big', 1200, 'tie');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE player_hill_stats'),
      [1200, 0, 0, 1, 3, 'big']
    );
  });

  it('updateHillStats: SQL targets player_id AND hill', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await db.updateHillStats(1, 'tiny', 1250, 'win');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE player_id = $5 AND hill = $6'),
      expect.any(Array)
    );
  });

  it('getHillLeaderboard: returns rows with player name joined', async () => {
    const rows = [
      { ...makePlayerHillStats({ elo_rating: 1400 }), name: 'Alice' },
      { ...makePlayerHillStats({ id: 2, player_id: 2, elo_rating: 1200 }), name: 'Bob' },
    ];
    mockQuery.mockResolvedValueOnce({ rows });

    const result = await db.getHillLeaderboard('big');

    expect(result).toEqual(rows);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('JOIN players'),
      ['big', 100]
    );
  });

  it('getHillLeaderboard: passes custom limit', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await db.getHillLeaderboard('big', 20);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT $2'),
      ['big', 20]
    );
  });

  it('getHillLeaderboard: orders by elo_rating DESC', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await db.getHillLeaderboard('big');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY phs.elo_rating DESC'),
      expect.any(Array)
    );
  });

  it('getHillPlayerCount: parses count string to number', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '7' }] });

    const result = await db.getHillPlayerCount('big');

    expect(result).toBe(7);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT COUNT(*)'),
      ['big']
    );
  });

  it('getHillPlayerCount: filters by hill', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

    await db.getHillPlayerCount('tiny');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE hill = $1'),
      ['tiny']
    );
  });

  it('getRecentBattlesByHill: returns battles filtered by hill', async () => {
    const battles = [makeBattle(), makeBattle({ id: 2 })];
    mockQuery.mockResolvedValueOnce({ rows: battles });

    const result = await db.getRecentBattlesByHill('big');

    expect(result).toEqual(battles);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE hill = $1'),
      ['big', 10]
    );
  });

  it('getRecentBattlesByHill: passes custom limit', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await db.getRecentBattlesByHill('big', 5);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT $2'),
      ['big', 5]
    );
  });

  it('getRecentBattlesByHill: orders by created_at DESC', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await db.getRecentBattlesByHill('big');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY created_at DESC'),
      expect.any(Array)
    );
  });

  it('getPlayerHillStats: returns all hill stats for a player', async () => {
    const stats = [
      makePlayerHillStats({ hill: 'big' }),
      makePlayerHillStats({ id: 2, hill: 'tiny', elo_rating: 1100 }),
    ];
    mockQuery.mockResolvedValueOnce({ rows: stats });

    const result = await db.getPlayerHillStats(1);

    expect(result).toEqual(stats);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE player_id = $1'),
      [1]
    );
  });

  it('getPlayerHillStats: returns empty array when no stats exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await db.getPlayerHillStats(999);

    expect(result).toEqual([]);
  });

  it('getPlayerHillStats: queries player_hill_stats table', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await db.getPlayerHillStats(1);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('player_hill_stats'),
      [1]
    );
  });
});
