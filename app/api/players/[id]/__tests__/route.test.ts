import { NextRequest } from 'next/server';
import { GET } from '../route';
import { makePlayer, makeWarrior, makeBattle } from '@/lib/__tests__/fixtures';

jest.mock('@/lib/db');

import {
  getPlayerById,
  getWarriorByPlayerId,
  getBattlesByPlayerId,
  getPlayersByIds,
} from '@/lib/db';

const mockGetPlayerById = getPlayerById as jest.MockedFunction<typeof getPlayerById>;
const mockGetWarriorByPlayerId = getWarriorByPlayerId as jest.MockedFunction<typeof getWarriorByPlayerId>;
const mockGetBattlesByPlayerId = getBattlesByPlayerId as jest.MockedFunction<typeof getBattlesByPlayerId>;
const mockGetPlayersByIds = getPlayersByIds as jest.MockedFunction<typeof getPlayersByIds>;

function createRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/players/[id]', () => {
  it('returns 400 for invalid player ID', async () => {
    const req = createRequest('/api/players/abc');
    const res = await GET(req, { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid player ID');
  });

  it('returns 404 when player not found', async () => {
    mockGetPlayerById.mockResolvedValue(null);
    const req = createRequest('/api/players/999');
    const res = await GET(req, { params: Promise.resolve({ id: '999' }) });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Player not found');
  });

  it('returns full player profile with warrior and battles', async () => {
    const player = makePlayer({ id: 5, name: 'TestPlayer', wins: 10, losses: 3, ties: 2, elo_rating: 1300, rating_deviation: 100 });
    const warrior = makeWarrior({ player_id: 5, name: 'MyWarrior', redcode: ';name MyWarrior\nMOV 0, 1' });
    const opponent = makePlayer({ id: 2, name: 'Opponent' });
    const battle = makeBattle({
      id: 42,
      challenger_id: 5,
      defender_id: 2,
      result: 'challenger_win',
      challenger_wins: 3,
      defender_wins: 1,
      ties: 1,
      challenger_elo_before: 1280,
      challenger_elo_after: 1300,
      challenger_rd_before: 110,
      challenger_rd_after: 100,
      defender_elo_before: 1200,
      defender_elo_after: 1184,
      defender_rd_before: 100,
      defender_rd_after: 110,
    });

    mockGetPlayerById.mockResolvedValue(player);
    mockGetWarriorByPlayerId.mockResolvedValue(warrior);
    mockGetBattlesByPlayerId.mockResolvedValue([battle]);
    mockGetPlayersByIds.mockResolvedValue([opponent]);

    const req = createRequest('/api/players/5');
    const res = await GET(req, { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.id).toBe(5);
    expect(data.name).toBe('TestPlayer');
    expect(data.rating).toBe(Math.round(1300 - 2 * 100));
    expect(data.provisional).toBe(false);
    expect(data.wins).toBe(10);
    expect(data.losses).toBe(3);
    expect(data.ties).toBe(2);
    expect(data.win_rate).toBe(67);
    expect(data.rating_history).toBeDefined();
    expect(Array.isArray(data.rating_history)).toBe(true);
    expect(data.warrior).not.toBeNull();
    expect(data.warrior.name).toBe('MyWarrior');
    expect(data.warrior.redcode).toBe(';name MyWarrior\nMOV 0, 1');
    expect(data.recent_battles).toHaveLength(1);
    expect(data.recent_battles[0].id).toBe(42);
    expect(data.recent_battles[0].opponent.id).toBe(2);
    expect(data.recent_battles[0].opponent.name).toBe('Opponent');
    expect(data.recent_battles[0].result).toBe('win');
    expect(data.recent_battles[0].score).toBe('3-1-1');
    expect(data.recent_battles[0].rating_change).toBeDefined();
  });

  it('returns null warrior when player has no warrior', async () => {
    const player = makePlayer({ id: 5 });
    mockGetPlayerById.mockResolvedValue(player);
    mockGetWarriorByPlayerId.mockResolvedValue(null);
    mockGetBattlesByPlayerId.mockResolvedValue([]);
    mockGetPlayersByIds.mockResolvedValue([]);

    const req = createRequest('/api/players/5');
    const res = await GET(req, { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.warrior).toBeNull();
    expect(data.recent_battles).toEqual([]);
  });

  it('marks provisional players correctly', async () => {
    const player = makePlayer({ id: 5, rating_deviation: 250 });
    mockGetPlayerById.mockResolvedValue(player);
    mockGetWarriorByPlayerId.mockResolvedValue(null);
    mockGetBattlesByPlayerId.mockResolvedValue([]);
    mockGetPlayersByIds.mockResolvedValue([]);

    const req = createRequest('/api/players/5');
    const res = await GET(req, { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.provisional).toBe(true);
  });

  it('returns 0 win_rate when player has no games', async () => {
    const player = makePlayer({ id: 5, wins: 0, losses: 0, ties: 0 });
    mockGetPlayerById.mockResolvedValue(player);
    mockGetWarriorByPlayerId.mockResolvedValue(null);
    mockGetBattlesByPlayerId.mockResolvedValue([]);
    mockGetPlayersByIds.mockResolvedValue([]);

    const req = createRequest('/api/players/5');
    const res = await GET(req, { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.win_rate).toBe(0);
  });
});
