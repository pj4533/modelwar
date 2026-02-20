import { NextRequest } from 'next/server';
import { GET } from '../route';
import { makePlayerHillStats } from '@/lib/__tests__/fixtures';

jest.mock('@/lib/db');

import { getHillLeaderboard, getHillPlayerCount } from '@/lib/db';

const mockGetHillLeaderboard = getHillLeaderboard as jest.MockedFunction<typeof getHillLeaderboard>;
const mockGetHillPlayerCount = getHillPlayerCount as jest.MockedFunction<typeof getHillPlayerCount>;

function createRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

/** Build a leaderboard entry (PlayerHillStats with name) for mock returns. */
function makeLeaderboardEntry(overrides: { player_id: number; name: string; elo_rating: number; wins: number; losses: number; ties: number; hill?: string }) {
  const stats = makePlayerHillStats({
    player_id: overrides.player_id,
    elo_rating: overrides.elo_rating,
    wins: overrides.wins,
    losses: overrides.losses,
    ties: overrides.ties,
    hill: overrides.hill ?? 'big',
  });
  return { ...stats, name: overrides.name };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/leaderboard', () => {
  it('returns ranked players with total count using default hill', async () => {
    const entries = [
      makeLeaderboardEntry({ player_id: 1, name: 'First', elo_rating: 1400, wins: 5, losses: 1, ties: 0 }),
      makeLeaderboardEntry({ player_id: 2, name: 'Second', elo_rating: 1300, wins: 3, losses: 2, ties: 1 }),
      makeLeaderboardEntry({ player_id: 3, name: 'Third', elo_rating: 1200, wins: 1, losses: 3, ties: 2 }),
    ];
    mockGetHillLeaderboard.mockResolvedValue(entries);
    mockGetHillPlayerCount.mockResolvedValue(10);

    const req = createRequest('http://localhost:3000/api/leaderboard');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hill).toBe('big');
    expect(data.total_players).toBe(10);
    expect(data.leaderboard).toHaveLength(3);
    expect(data.leaderboard[0]).toEqual({
      rank: 1, id: 1, name: 'First', elo_rating: 1400, wins: 5, losses: 1, ties: 0,
    });
    expect(data.leaderboard[1].rank).toBe(2);
    expect(data.leaderboard[2].rank).toBe(3);
    expect(mockGetHillLeaderboard).toHaveBeenCalledWith('big', 100);
  });

  it('uses hill query param when provided', async () => {
    mockGetHillLeaderboard.mockResolvedValue([]);
    mockGetHillPlayerCount.mockResolvedValue(0);

    const req = createRequest('http://localhost:3000/api/leaderboard?hill=94nop');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hill).toBe('94nop');
    expect(mockGetHillLeaderboard).toHaveBeenCalledWith('94nop', 100);
    expect(mockGetHillPlayerCount).toHaveBeenCalledWith('94nop');
  });

  it('returns 400 for invalid hill query param', async () => {
    const req = createRequest('http://localhost:3000/api/leaderboard?hill=nonexistent');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid hill/);
  });

  it('returns empty leaderboard when no players', async () => {
    mockGetHillLeaderboard.mockResolvedValue([]);
    mockGetHillPlayerCount.mockResolvedValue(0);

    const req = createRequest('http://localhost:3000/api/leaderboard');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.leaderboard).toEqual([]);
    expect(data.total_players).toBe(0);
  });

  it('returns 500 on database error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetHillLeaderboard.mockRejectedValue(new Error('DB connection failed'));

    const req = createRequest('http://localhost:3000/api/leaderboard');
    const res = await GET(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Internal server error');
  });
});
