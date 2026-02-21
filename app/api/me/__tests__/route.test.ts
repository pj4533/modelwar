import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import { getWarriorByPlayerId } from '@/lib/db';
import { GET } from '../route';
import { makePlayer, makeWarrior } from '@/lib/__tests__/fixtures';

jest.mock('@/lib/auth');
jest.mock('@/lib/db');

const mockAuthenticateRequest = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;
const mockUnauthorizedResponse = unauthorizedResponse as jest.MockedFunction<typeof unauthorizedResponse>;
const mockGetWarriorByPlayerId = getWarriorByPlayerId as jest.MockedFunction<typeof getWarriorByPlayerId>;

function createRequest(url: string, options?: { method?: string; body?: unknown; headers?: Record<string, string> }) {
  const headers = options?.body
    ? { 'Content-Type': 'application/json', ...options?.headers }
    : options?.headers;
  const init = {
    method: options?.method || 'GET',
    body: options?.body ? JSON.stringify(options.body) : undefined,
    headers,
  };
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

describe('GET /api/me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnauthorizedResponse.mockReturnValue(
      Response.json({ error: 'Unauthorized. Provide a valid API key via Authorization: Bearer <api_key>' }, { status: 401 })
    );
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthenticateRequest.mockResolvedValue(null);

    const req = createRequest('/api/me');
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(mockUnauthorizedResponse).toHaveBeenCalled();
  });

  it('returns player data with warrior when authenticated', async () => {
    const player = makePlayer();
    const warrior = makeWarrior({ player_id: player.id });
    mockAuthenticateRequest.mockResolvedValue(player);
    mockGetWarriorByPlayerId.mockResolvedValue(warrior);

    const req = createRequest('/api/me', { headers: { Authorization: 'Bearer test-key' } });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(player.id);
    expect(data.name).toBe(player.name);
    expect(data.elo_rating).toBe(player.elo_rating);
    expect(data.rating_deviation).toBe(player.rating_deviation);
    expect(data.rating_volatility).toBe(player.rating_volatility);
    expect(data.wins).toBe(player.wins);
    expect(data.losses).toBe(player.losses);
    expect(data.ties).toBe(player.ties);
    expect(data.warrior).not.toBeNull();
    expect(data.warrior.id).toBe(warrior.id);
    expect(data.warrior.name).toBe(warrior.name);
    expect(data.warrior.redcode).toBe(warrior.redcode);
  });

  it('returns player data with warrior null when no warrior exists', async () => {
    const player = makePlayer();
    mockAuthenticateRequest.mockResolvedValue(player);
    mockGetWarriorByPlayerId.mockResolvedValue(null);

    const req = createRequest('/api/me', { headers: { Authorization: 'Bearer test-key' } });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(player.id);
    expect(data.warrior).toBeNull();
  });

  it('returns 500 on database error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const player = makePlayer();
    mockAuthenticateRequest.mockResolvedValue(player);
    mockGetWarriorByPlayerId.mockRejectedValue(new Error('DB error'));

    const req = createRequest('/api/me', { headers: { Authorization: 'Bearer test-key' } });
    const res = await GET(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Internal server error');
  });
});
