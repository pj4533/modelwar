const mockQuery = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: mockQuery,
  })),
}));

// Must set env before importing db module
process.env.POSTGRES_URL = 'postgres://user:pass@localhost:5432/testdb';

import * as db from '../db';
import { makePlayer, makeWarrior, makeBattle } from './fixtures';

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

  it('updatePlayerRating: increments win column for win result', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await db.updatePlayerRating(1, 1232, 'win');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE players SET elo_rating'),
      [1232, 1, 0, 0, 1]
    );
  });

  it('updatePlayerRating: increments loss column for loss result', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await db.updatePlayerRating(2, 1168, 'loss');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE players SET elo_rating'),
      [1168, 0, 1, 0, 2]
    );
  });

  it('updatePlayerRating: increments tie column for tie result', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await db.updatePlayerRating(3, 1200, 'tie');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE players SET elo_rating'),
      [1200, 0, 0, 1, 3]
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

  it('getFeaturedBattles: returns close battles with redcode ordered by combined ELO', async () => {
    const battles = [makeBattle({ challenger_wins: 3, defender_wins: 2 })];
    mockQuery.mockResolvedValueOnce({ rows: battles });

    const result = await db.getFeaturedBattles();

    expect(result).toEqual(battles);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('challenger_wins = 3 AND defender_wins = 2'),
      [5]
    );
  });
});
