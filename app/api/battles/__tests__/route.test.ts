import { NextRequest } from 'next/server';
import { GET } from '../route';
import { makePlayer, makeBattle } from '@/lib/__tests__/fixtures';

jest.mock('@/lib/auth');
jest.mock('@/lib/db');

import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import { getBattlesByPlayerId, getBattleCountByPlayerId } from '@/lib/db';

const mockAuth = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;
const mockUnauth = unauthorizedResponse as jest.MockedFunction<typeof unauthorizedResponse>;
const mockGetBattles = getBattlesByPlayerId as jest.MockedFunction<typeof getBattlesByPlayerId>;
const mockGetCount = getBattleCountByPlayerId as jest.MockedFunction<typeof getBattleCountByPlayerId>;

function createRequest(url: string, options?: { method?: string; headers?: Record<string, string> }) {
  const init = { method: options?.method || 'GET', headers: options?.headers };
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

const player = makePlayer({ id: 1 });

beforeEach(() => {
  jest.clearAllMocks();
  mockUnauth.mockReturnValue(
    Response.json(
      { error: 'Unauthorized. Provide a valid API key via Authorization: Bearer <api_key>' },
      { status: 401 }
    )
  );
});

describe('GET /api/battles', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createRequest('http://localhost:3000/api/battles');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns battles array for authenticated player', async () => {
    const battles = [
      makeBattle({ id: 1, challenger_id: 1, defender_id: 2 }),
      makeBattle({ id: 2, challenger_id: 3, defender_id: 1 }),
    ];
    mockAuth.mockResolvedValue(player);
    mockGetBattles.mockResolvedValue(battles);
    const req = createRequest('http://localhost:3000/api/battles');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.battles).toHaveLength(2);
    expect(data.battles[0].id).toBe(1);
    expect(data.battles[1].id).toBe(2);
  });

  it('returns empty array when player has no battles', async () => {
    mockAuth.mockResolvedValue(player);
    mockGetBattles.mockResolvedValue([]);
    const req = createRequest('http://localhost:3000/api/battles');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.battles).toEqual([]);
  });

  it('returns paginated response when page param is provided', async () => {
    const battles = [makeBattle({ id: 1 })];
    mockAuth.mockResolvedValue(player);
    mockGetBattles.mockResolvedValue(battles);
    mockGetCount.mockResolvedValue(50);

    const req = createRequest('http://localhost:3000/api/battles?page=2&per_page=10');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.pagination).toEqual({
      page: 2,
      per_page: 10,
      total: 50,
      total_pages: 5,
    });
    expect(mockGetBattles).toHaveBeenCalledWith(1, 10, 10);
  });

  it('returns non-paginated response when no page params provided', async () => {
    mockAuth.mockResolvedValue(player);
    mockGetBattles.mockResolvedValue([]);

    const req = createRequest('http://localhost:3000/api/battles');
    const res = await GET(req);
    const data = await res.json();

    expect(data.pagination).toBeUndefined();
    expect(data.battles).toEqual([]);
  });
});
