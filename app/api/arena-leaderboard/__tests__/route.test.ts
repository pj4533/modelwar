import { GET } from '../route';
import { makePlayer } from '@/lib/__tests__/fixtures';

jest.mock('@/lib/db');

import { getArenaLeaderboard } from '@/lib/db';

const mockGetArenaLeaderboard = getArenaLeaderboard as jest.MockedFunction<typeof getArenaLeaderboard>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/arena-leaderboard', () => {
  it('returns ranked players by arena rating', async () => {
    const players = [
      makePlayer({ id: 1, name: 'ArenaKing', arena_rating: 1500, arena_rd: 100, arena_wins: 5, arena_losses: 1, arena_ties: 2 }),
      makePlayer({ id: 2, name: 'Challenger', arena_rating: 1400, arena_rd: 150, arena_wins: 3, arena_losses: 2, arena_ties: 1 }),
    ];
    mockGetArenaLeaderboard.mockResolvedValue(players);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.leaderboard).toHaveLength(2);
    expect(data.leaderboard[0].rank).toBe(1);
    expect(data.leaderboard[0].name).toBe('ArenaKing');
    expect(data.leaderboard[0].arena_wins).toBe(5);
    expect(data.leaderboard[1].rank).toBe(2);
  });

  it('returns empty leaderboard when no arena players', async () => {
    mockGetArenaLeaderboard.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.leaderboard).toEqual([]);
  });

  it('returns 500 on database error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetArenaLeaderboard.mockRejectedValue(new Error('DB error'));

    const res = await GET();
    expect(res.status).toBe(500);
  });
});
