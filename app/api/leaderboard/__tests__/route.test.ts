import { GET } from '../route';
import { makePlayer } from '@/lib/__tests__/fixtures';

jest.mock('@/lib/db');

import { getLeaderboard, getPlayerCount, getArenaLeaderboard, getArenaPlayerCount } from '@/lib/db';

const mockGetLeaderboard = getLeaderboard as jest.MockedFunction<typeof getLeaderboard>;
const mockGetPlayerCount = getPlayerCount as jest.MockedFunction<typeof getPlayerCount>;
const mockGetArenaLeaderboard = getArenaLeaderboard as jest.MockedFunction<typeof getArenaLeaderboard>;
const mockGetArenaPlayerCount = getArenaPlayerCount as jest.MockedFunction<typeof getArenaPlayerCount>;

function makeRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost/api/leaderboard');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString());
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/leaderboard', () => {
  it('returns ranked players with total count', async () => {
    const players = [
      makePlayer({ id: 1, name: 'First', elo_rating: 1400, wins: 5, losses: 1, ties: 0 }),
      makePlayer({ id: 2, name: 'Second', elo_rating: 1300, wins: 3, losses: 2, ties: 1 }),
      makePlayer({ id: 3, name: 'Third', elo_rating: 1200, wins: 1, losses: 3, ties: 2 }),
    ];
    mockGetLeaderboard.mockResolvedValue(players);
    mockGetPlayerCount.mockResolvedValue(10);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total_players).toBe(10);
    expect(data.leaderboard).toHaveLength(3);
    expect(data.leaderboard[0]).toEqual({
      rank: 1, id: 1, name: 'First', rating: Math.round(1400 - 2 * 350), rating_deviation: 350, wins: 5, losses: 1, ties: 0,
    });
    expect(data.leaderboard[1].rank).toBe(2);
    expect(data.leaderboard[2].rank).toBe(3);
    expect(mockGetLeaderboard).toHaveBeenCalledWith(20, 0);
  });

  it('returns empty leaderboard when no players', async () => {
    mockGetLeaderboard.mockResolvedValue([]);
    mockGetPlayerCount.mockResolvedValue(0);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.leaderboard).toEqual([]);
    expect(data.total_players).toBe(0);
  });

  it('returns 500 on database error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetLeaderboard.mockRejectedValue(new Error('DB connection failed'));

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Internal server error');
  });

  it('supports pagination', async () => {
    const players = [
      makePlayer({ id: 21, name: 'Page2First', elo_rating: 1100, wins: 1, losses: 5, ties: 0 }),
    ];
    mockGetLeaderboard.mockResolvedValue(players);
    mockGetPlayerCount.mockResolvedValue(25);

    const res = await GET(makeRequest({ page: '2', per_page: '20' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.leaderboard[0].rank).toBe(21);
    expect(data.pagination).toEqual({
      page: 2,
      per_page: 20,
      total: 25,
      total_pages: 2,
    });
    expect(mockGetLeaderboard).toHaveBeenCalledWith(20, 20);
  });

  it('supports arena mode', async () => {
    const players = [
      makePlayer({ id: 1, name: 'ArenaChamp', arena_rating: 1500, arena_rd: 200, arena_wins: 10, arena_losses: 2, arena_ties: 1 }),
    ];
    mockGetArenaLeaderboard.mockResolvedValue(players);
    mockGetArenaPlayerCount.mockResolvedValue(5);

    const res = await GET(makeRequest({ mode: 'arena' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.leaderboard[0].rating).toBe(Math.round(1500 - 2 * 200));
    expect(data.leaderboard[0].wins).toBe(10);
    expect(data.total_players).toBe(5);
    expect(mockGetArenaLeaderboard).toHaveBeenCalledWith(20, 0);
  });
});
