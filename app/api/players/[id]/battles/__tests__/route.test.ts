import { NextRequest } from 'next/server';
import { GET } from '../route';
import { makePlayer } from '@/lib/__tests__/fixtures';
import type { UnifiedBattle1v1 } from '@/lib/db';

jest.mock('@/lib/db');

import {
  getPlayerById,
  getUnifiedBattlesByPlayerId,
  getUnifiedBattleCountByPlayerId,
  getPlayersByIds,
} from '@/lib/db';

const mockGetPlayer = getPlayerById as jest.MockedFunction<typeof getPlayerById>;
const mockGetBattles = getUnifiedBattlesByPlayerId as jest.MockedFunction<typeof getUnifiedBattlesByPlayerId>;
const mockGetCount = getUnifiedBattleCountByPlayerId as jest.MockedFunction<typeof getUnifiedBattleCountByPlayerId>;
const mockGetPlayersByIds = getPlayersByIds as jest.MockedFunction<typeof getPlayersByIds>;

function makeUnified1v1(overrides: Partial<UnifiedBattle1v1> = {}): UnifiedBattle1v1 {
  return {
    type: '1v1',
    id: 1,
    created_at: new Date('2025-01-01'),
    challenger_id: 1,
    defender_id: 2,
    result: 'challenger_win',
    challenger_wins: 60,
    defender_wins: 30,
    ties: 10,
    challenger_elo_before: 1200,
    challenger_elo_after: 1216,
    defender_elo_before: 1200,
    defender_elo_after: 1184,
    challenger_rd_before: null,
    challenger_rd_after: null,
    defender_rd_before: null,
    defender_rd_after: null,
    placement: null,
    participant_count: null,
    total_score: null,
    arena_rating_before: null,
    arena_rating_after: null,
    arena_rd_before: null,
    arena_rd_after: null,
    ...overrides,
  };
}

function createRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

const player = makePlayer({ id: 1, name: 'Alice' });
const opponent = makePlayer({ id: 2, name: 'Bob' });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/players/[id]/battles', () => {
  it('returns paginated battles with correct pagination metadata', async () => {
    const battles = [
      makeUnified1v1({ id: 10, challenger_id: 1, defender_id: 2 }),
      makeUnified1v1({ id: 11, challenger_id: 2, defender_id: 1 }),
    ];
    mockGetPlayer.mockResolvedValue(player);
    mockGetBattles.mockResolvedValue(battles);
    mockGetCount.mockResolvedValue(50);
    mockGetPlayersByIds.mockResolvedValue([opponent]);

    const req = createRequest('http://localhost:3000/api/players/1/battles');
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.battles).toHaveLength(2);
    expect(data.pagination).toEqual({
      page: 1,
      per_page: 20,
      total: 50,
      total_pages: 3,
    });
  });

  it('defaults to page 1, per_page 20', async () => {
    mockGetPlayer.mockResolvedValue(player);
    mockGetBattles.mockResolvedValue([]);
    mockGetCount.mockResolvedValue(0);
    mockGetPlayersByIds.mockResolvedValue([]);

    const req = createRequest('http://localhost:3000/api/players/1/battles');
    await GET(req, { params: Promise.resolve({ id: '1' }) });

    expect(mockGetBattles).toHaveBeenCalledWith(1, 20, 0);
  });

  it('handles custom page and per_page params', async () => {
    mockGetPlayer.mockResolvedValue(player);
    mockGetBattles.mockResolvedValue([]);
    mockGetCount.mockResolvedValue(100);
    mockGetPlayersByIds.mockResolvedValue([]);

    const req = createRequest('http://localhost:3000/api/players/1/battles?page=3&per_page=10');
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) });

    expect(mockGetBattles).toHaveBeenCalledWith(1, 10, 20);
    const data = await res.json();
    expect(data.pagination.page).toBe(3);
    expect(data.pagination.per_page).toBe(10);
    expect(data.pagination.total_pages).toBe(10);
  });

  it('returns 400 for invalid player ID', async () => {
    const req = createRequest('http://localhost:3000/api/players/abc/battles');
    const res = await GET(req, { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain('Invalid');
  });

  it('returns 404 for unknown player', async () => {
    mockGetPlayer.mockResolvedValue(null);

    const req = createRequest('http://localhost:3000/api/players/999/battles');
    const res = await GET(req, { params: Promise.resolve({ id: '999' }) });
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error).toBe('Player not found');
  });

  it('returns empty battles array for player with no battles', async () => {
    mockGetPlayer.mockResolvedValue(player);
    mockGetBattles.mockResolvedValue([]);
    mockGetCount.mockResolvedValue(0);
    mockGetPlayersByIds.mockResolvedValue([]);

    const req = createRequest('http://localhost:3000/api/players/1/battles');
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) });
    const data = await res.json();

    expect(data.battles).toEqual([]);
    expect(data.pagination.total).toBe(0);
    expect(data.pagination.total_pages).toBe(0);
  });

  it('clamps per_page to max 100', async () => {
    mockGetPlayer.mockResolvedValue(player);
    mockGetBattles.mockResolvedValue([]);
    mockGetCount.mockResolvedValue(0);
    mockGetPlayersByIds.mockResolvedValue([]);

    const req = createRequest('http://localhost:3000/api/players/1/battles?per_page=500');
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) });
    const data = await res.json();

    expect(mockGetBattles).toHaveBeenCalledWith(1, 100, 0);
    expect(data.pagination.per_page).toBe(100);
  });

  it('formats battle data correctly', async () => {
    const battle = makeUnified1v1({
      id: 5,
      challenger_id: 1,
      defender_id: 2,
      result: 'challenger_win',
      challenger_wins: 60,
      defender_wins: 30,
      ties: 10,
      challenger_elo_before: 1200,
      challenger_elo_after: 1216,
    });
    mockGetPlayer.mockResolvedValue(player);
    mockGetBattles.mockResolvedValue([battle]);
    mockGetCount.mockResolvedValue(1);
    mockGetPlayersByIds.mockResolvedValue([opponent]);

    const req = createRequest('http://localhost:3000/api/players/1/battles');
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) });
    const data = await res.json();

    const b = data.battles[0];
    expect(b.id).toBe(5);
    expect(b.type).toBe('1v1');
    expect(b.opponent).toEqual({ id: 2, name: 'Bob' });
    expect(b.result).toBe('win');
    expect(b.score).toBe('60-30-10');
    expect(b.rating_change).toBe(16);
  });

  it('formats arena battle data correctly', async () => {
    const arenaEntry = {
      type: 'arena' as const,
      id: 7,
      created_at: new Date('2025-01-01'),
      placement: 2,
      participant_count: 10,
      total_score: 180,
      arena_rating_before: 1200,
      arena_rating_after: 1230,
      arena_rd_before: 300,
      arena_rd_after: 280,
      challenger_id: null, defender_id: null, result: null,
      challenger_wins: null, defender_wins: null, ties: null,
      challenger_elo_before: null, challenger_elo_after: null,
      defender_elo_before: null, defender_elo_after: null,
      challenger_rd_before: null, challenger_rd_after: null,
      defender_rd_before: null, defender_rd_after: null,
    };
    mockGetPlayer.mockResolvedValue(player);
    mockGetBattles.mockResolvedValue([arenaEntry]);
    mockGetCount.mockResolvedValue(1);
    mockGetPlayersByIds.mockResolvedValue([]);

    const req = createRequest('http://localhost:3000/api/players/1/battles');
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) });
    const data = await res.json();

    const b = data.battles[0];
    expect(b.id).toBe(7);
    expect(b.type).toBe('arena');
    expect(b.href).toBe('/arenas/7');
    expect(b.placement).toBe(2);
    expect(b.participant_count).toBe(10);
    expect(b.matchup).toBe('2nd / 10');
    expect(b.result).toBe('tie');
    expect(b.score).toBe('180');
  });

  it('maps arena placement 1 to win and last to loss', async () => {
    const winEntry = {
      type: 'arena' as const,
      id: 8,
      created_at: new Date('2025-01-01'),
      placement: 1,
      participant_count: 5,
      total_score: 250,
      arena_rating_before: 1200,
      arena_rating_after: 1260,
      arena_rd_before: 300,
      arena_rd_after: 280,
      challenger_id: null, defender_id: null, result: null,
      challenger_wins: null, defender_wins: null, ties: null,
      challenger_elo_before: null, challenger_elo_after: null,
      defender_elo_before: null, defender_elo_after: null,
      challenger_rd_before: null, challenger_rd_after: null,
      defender_rd_before: null, defender_rd_after: null,
    };
    const lossEntry = { ...winEntry, id: 9, placement: 5 };

    mockGetPlayer.mockResolvedValue(player);
    mockGetBattles.mockResolvedValue([winEntry, lossEntry]);
    mockGetCount.mockResolvedValue(2);
    mockGetPlayersByIds.mockResolvedValue([]);

    const req = createRequest('http://localhost:3000/api/players/1/battles');
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) });
    const data = await res.json();

    expect(data.battles[0].result).toBe('win');
    expect(data.battles[1].result).toBe('loss');
  });
});
