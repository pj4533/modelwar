import { NextRequest } from 'next/server';
import { GET } from '../route';

jest.mock('@/lib/db');

import { getArenaById, getPlayersByIds } from '@/lib/db';

const mockGetArenaById = getArenaById as jest.MockedFunction<typeof getArenaById>;
const mockGetPlayersByIds = getPlayersByIds as jest.MockedFunction<typeof getPlayersByIds>;

beforeEach(() => {
  jest.clearAllMocks();
});

function makeArena(overrides = {}) {
  return {
    id: 1,
    session_id: 'session-uuid',
    seed: 42,
    total_rounds: 200,
    status: 'completed',
    started_at: new Date(),
    completed_at: new Date(),
    created_at: new Date(),
    participants: [
      {
        id: 1,
        arena_id: 1,
        player_id: 1,
        slot_index: 0,
        is_stock_bot: false,
        stock_bot_name: null,
        redcode: 'MOV 0, 1',
        placement: 1,
        total_score: 1800,
        arena_rating_before: 1200,
        arena_rating_after: 1250,
        arena_rd_before: 350,
        arena_rd_after: 300,
      },
      {
        id: 2,
        arena_id: 1,
        player_id: null,
        slot_index: 1,
        is_stock_bot: true,
        stock_bot_name: '[BOT] Imp',
        redcode: 'MOV 0, 1',
        placement: 2,
        total_score: 900,
        arena_rating_before: null,
        arena_rating_after: null,
        arena_rd_before: null,
        arena_rd_after: null,
      },
    ],
    ...overrides,
  };
}

describe('GET /api/arenas/[id]', () => {
  it('returns arena details with participants', async () => {
    mockGetArenaById.mockResolvedValue(makeArena());
    mockGetPlayersByIds.mockResolvedValue([
      { id: 1, name: 'TestPlayer', api_key: 'k', elo_rating: 1200, rating_deviation: 350, rating_volatility: 0.06, wins: 0, losses: 0, ties: 0, arena_rating: 1250, arena_rd: 300, arena_volatility: 0.06, arena_wins: 1, arena_losses: 0, arena_ties: 0, last_arena_at: null, created_at: new Date(), updated_at: new Date() },
    ]);

    const req = new NextRequest('http://localhost/api/arenas/1');
    const params = Promise.resolve({ id: '1' });
    const res = await GET(req, { params });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(1);
    expect(data.participants).toHaveLength(2);
    expect(data.participants[0].name).toBe('TestPlayer');
    expect(data.participants[1].name).toBe('[BOT] Imp');
  });

  it('returns 404 for nonexistent arena', async () => {
    mockGetArenaById.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/arenas/999');
    const params = Promise.resolve({ id: '999' });
    const res = await GET(req, { params });

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid arena ID', async () => {
    const req = new NextRequest('http://localhost/api/arenas/abc');
    const params = Promise.resolve({ id: 'abc' });
    const res = await GET(req, { params });

    expect(res.status).toBe(400);
  });
});
