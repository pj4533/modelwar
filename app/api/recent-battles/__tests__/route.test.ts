import { NextRequest } from 'next/server';
import { GET } from '../route';
import type { UnifiedBattleEntry } from '@/lib/db';

jest.mock('@/lib/db');

import {
  getRecentUnifiedBattles,
  getRecentUnifiedBattleCount,
  getPlayersByIds,
} from '@/lib/db';
import { makePlayer } from '@/lib/__tests__/fixtures';

const mockGetBattles = getRecentUnifiedBattles as jest.MockedFunction<typeof getRecentUnifiedBattles>;
const mockGetCount = getRecentUnifiedBattleCount as jest.MockedFunction<typeof getRecentUnifiedBattleCount>;
const mockGetPlayersByIds = getPlayersByIds as jest.MockedFunction<typeof getPlayersByIds>;

function createRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/recent-battles', () => {
  it('returns paginated battles with correct pagination metadata', async () => {
    const entries = [
      {
        type: '1v1', id: 1, created_at: new Date('2025-01-01'),
        challenger_id: 1, defender_id: 2, result: 'challenger_win',
        challenger_wins: 60, defender_wins: 30, ties: 10,
        challenger_elo_before: null, challenger_elo_after: null,
        defender_elo_before: null, defender_elo_after: null,
        challenger_rd_before: null, challenger_rd_after: null,
        defender_rd_before: null, defender_rd_after: null,
        placement: null, participant_count: null, total_score: null,
        arena_rating_before: null, arena_rating_after: null,
        arena_rd_before: null, arena_rd_after: null,
      },
    ] as unknown as UnifiedBattleEntry[];
    const players = [makePlayer({ id: 1, name: 'Alice' }), makePlayer({ id: 2, name: 'Bob' })];

    mockGetBattles.mockResolvedValue(entries);
    mockGetCount.mockResolvedValue(50);
    mockGetPlayersByIds.mockResolvedValue(players);

    const req = createRequest('http://localhost:3000/api/recent-battles');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.battles).toHaveLength(1);
    expect(data.pagination).toEqual({
      page: 1,
      per_page: 20,
      total: 50,
      total_pages: 3,
    });
  });

  it('defaults to page 1, per_page 20', async () => {
    mockGetBattles.mockResolvedValue([]);
    mockGetCount.mockResolvedValue(0);
    mockGetPlayersByIds.mockResolvedValue([]);

    const req = createRequest('http://localhost:3000/api/recent-battles');
    await GET(req);

    expect(mockGetBattles).toHaveBeenCalledWith(20, 0);
  });

  it('handles custom page and per_page params', async () => {
    mockGetBattles.mockResolvedValue([]);
    mockGetCount.mockResolvedValue(100);
    mockGetPlayersByIds.mockResolvedValue([]);

    const req = createRequest('http://localhost:3000/api/recent-battles?page=3&per_page=10');
    const res = await GET(req);

    expect(mockGetBattles).toHaveBeenCalledWith(10, 20);
    const data = await res.json();
    expect(data.pagination.page).toBe(3);
    expect(data.pagination.per_page).toBe(10);
    expect(data.pagination.total_pages).toBe(10);
  });

  it('clamps per_page to max 100', async () => {
    mockGetBattles.mockResolvedValue([]);
    mockGetCount.mockResolvedValue(0);
    mockGetPlayersByIds.mockResolvedValue([]);

    const req = createRequest('http://localhost:3000/api/recent-battles?per_page=500');
    const res = await GET(req);

    expect(mockGetBattles).toHaveBeenCalledWith(100, 0);
    const data = await res.json();
    expect(data.pagination.per_page).toBe(100);
  });

  it('falls back to default per_page for zero value', async () => {
    mockGetBattles.mockResolvedValue([]);
    mockGetCount.mockResolvedValue(0);
    mockGetPlayersByIds.mockResolvedValue([]);

    const req = createRequest('http://localhost:3000/api/recent-battles?per_page=0');
    const res = await GET(req);

    // 0 is falsy so || 20 kicks in, then clamped to min 1 (20 >= 1)
    expect(mockGetBattles).toHaveBeenCalledWith(20, 0);
    const data = await res.json();
    expect(data.pagination.per_page).toBe(20);
  });

  it('clamps page to min 1', async () => {
    mockGetBattles.mockResolvedValue([]);
    mockGetCount.mockResolvedValue(0);
    mockGetPlayersByIds.mockResolvedValue([]);

    const req = createRequest('http://localhost:3000/api/recent-battles?page=-1');
    const res = await GET(req);

    expect(mockGetBattles).toHaveBeenCalledWith(20, 0);
    const data = await res.json();
    expect(data.pagination.page).toBe(1);
  });

  it('returns player names for 1v1 battles', async () => {
    const entries = [
      {
        type: '1v1', id: 5, created_at: new Date('2025-01-01'),
        challenger_id: 10, defender_id: 20, result: 'defender_win',
        challenger_wins: 30, defender_wins: 60, ties: 10,
        challenger_elo_before: null, challenger_elo_after: null,
        defender_elo_before: null, defender_elo_after: null,
        challenger_rd_before: null, challenger_rd_after: null,
        defender_rd_before: null, defender_rd_after: null,
        placement: null, participant_count: null, total_score: null,
        arena_rating_before: null, arena_rating_after: null,
        arena_rd_before: null, arena_rd_after: null,
      },
    ] as unknown as UnifiedBattleEntry[];
    const players = [
      makePlayer({ id: 10, name: 'Alice' }),
      makePlayer({ id: 20, name: 'Bob' }),
    ];

    mockGetBattles.mockResolvedValue(entries);
    mockGetCount.mockResolvedValue(1);
    mockGetPlayersByIds.mockResolvedValue(players);

    const req = createRequest('http://localhost:3000/api/recent-battles');
    const res = await GET(req);
    const data = await res.json();

    expect(data.playerNames[10]).toBe('Alice');
    expect(data.playerNames[20]).toBe('Bob');
    expect(data.battles[0].result).toBe('defender_win');
    expect(data.battles[0].challenger_wins).toBe(30);
    expect(data.battles[0].defender_wins).toBe(60);
  });

  it('formats arena entries correctly', async () => {
    const entries = [
      {
        type: 'arena', id: 3, created_at: new Date('2025-01-01'),
        challenger_id: null, defender_id: null, result: null,
        challenger_wins: null, defender_wins: null, ties: null,
        challenger_elo_before: null, challenger_elo_after: null,
        defender_elo_before: null, defender_elo_after: null,
        challenger_rd_before: null, challenger_rd_after: null,
        defender_rd_before: null, defender_rd_after: null,
        placement: null, participant_count: 8, total_score: null,
        arena_rating_before: null, arena_rating_after: null,
        arena_rd_before: null, arena_rd_after: null,
      },
    ] as unknown as UnifiedBattleEntry[];

    mockGetBattles.mockResolvedValue(entries);
    mockGetCount.mockResolvedValue(1);
    mockGetPlayersByIds.mockResolvedValue([]);

    const req = createRequest('http://localhost:3000/api/recent-battles');
    const res = await GET(req);
    const data = await res.json();

    expect(data.battles[0].type).toBe('arena');
    expect(data.battles[0].id).toBe(3);
    expect(data.battles[0].participant_count).toBe(8);
  });

  it('returns empty battles when no data', async () => {
    mockGetBattles.mockResolvedValue([]);
    mockGetCount.mockResolvedValue(0);
    mockGetPlayersByIds.mockResolvedValue([]);

    const req = createRequest('http://localhost:3000/api/recent-battles');
    const res = await GET(req);
    const data = await res.json();

    expect(data.battles).toEqual([]);
    expect(data.pagination.total).toBe(0);
    expect(data.pagination.total_pages).toBe(0);
  });

  it('returns 500 on database error', async () => {
    mockGetBattles.mockRejectedValue(new Error('DB error'));

    const req = createRequest('http://localhost:3000/api/recent-battles');
    const res = await GET(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Internal server error');
  });
});
