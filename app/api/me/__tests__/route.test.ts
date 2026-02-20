import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import { getWarriorByPlayerId, getPlayerHillStats } from '@/lib/db';
import { GET } from '../route';
import { makePlayer, makeWarrior, makePlayerHillStats } from '@/lib/__tests__/fixtures';

jest.mock('@/lib/auth');
jest.mock('@/lib/db');

const mockAuthenticateRequest = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;
const mockUnauthorizedResponse = unauthorizedResponse as jest.MockedFunction<typeof unauthorizedResponse>;
const mockGetWarriorByPlayerId = getWarriorByPlayerId as jest.MockedFunction<typeof getWarriorByPlayerId>;
const mockGetPlayerHillStats = getPlayerHillStats as jest.MockedFunction<typeof getPlayerHillStats>;

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

  it('returns player data with warrior and hill_stats when authenticated', async () => {
    const player = makePlayer();
    const warrior = makeWarrior({ player_id: player.id });
    const hillStats = [
      makePlayerHillStats({ player_id: player.id, hill: 'big', elo_rating: 1300, wins: 5, losses: 2, ties: 1 }),
      makePlayerHillStats({ player_id: player.id, hill: '94nop', elo_rating: 1150, wins: 2, losses: 3, ties: 0 }),
    ];
    mockAuthenticateRequest.mockResolvedValue(player);
    mockGetWarriorByPlayerId.mockResolvedValue(warrior);
    mockGetPlayerHillStats.mockResolvedValue(hillStats);

    const req = createRequest('/api/me', { headers: { Authorization: 'Bearer test-key' } });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(player.id);
    expect(data.name).toBe(player.name);
    expect(data.elo_rating).toBeUndefined();
    expect(data.wins).toBeUndefined();
    expect(data.losses).toBeUndefined();
    expect(data.ties).toBeUndefined();
    expect(data.warrior).not.toBeNull();
    expect(data.warrior.id).toBe(warrior.id);
    expect(data.warrior.name).toBe(warrior.name);
    expect(data.warrior.redcode).toBe(warrior.redcode);
    // Verify hill_stats
    expect(data.hill_stats).toBeDefined();
    expect(data.hill_stats.big).toEqual({
      elo_rating: 1300,
      wins: 5,
      losses: 2,
      ties: 1,
    });
    expect(data.hill_stats['94nop']).toEqual({
      elo_rating: 1150,
      wins: 2,
      losses: 3,
      ties: 0,
    });
  });

  it('returns player data with warrior null when no warrior exists', async () => {
    const player = makePlayer();
    mockAuthenticateRequest.mockResolvedValue(player);
    mockGetWarriorByPlayerId.mockResolvedValue(null);
    mockGetPlayerHillStats.mockResolvedValue([]);

    const req = createRequest('/api/me', { headers: { Authorization: 'Bearer test-key' } });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(player.id);
    expect(data.warrior).toBeNull();
  });

  it('returns empty hill_stats when player has no hill stats', async () => {
    const player = makePlayer();
    mockAuthenticateRequest.mockResolvedValue(player);
    mockGetWarriorByPlayerId.mockResolvedValue(null);
    mockGetPlayerHillStats.mockResolvedValue([]);

    const req = createRequest('/api/me', { headers: { Authorization: 'Bearer test-key' } });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hill_stats).toEqual({});
  });

  it('returns hill_stats populated correctly for single hill', async () => {
    const player = makePlayer();
    mockAuthenticateRequest.mockResolvedValue(player);
    mockGetWarriorByPlayerId.mockResolvedValue(null);
    mockGetPlayerHillStats.mockResolvedValue([
      makePlayerHillStats({ player_id: player.id, hill: 'big', elo_rating: 1400, wins: 10, losses: 3, ties: 2 }),
    ]);

    const req = createRequest('/api/me', { headers: { Authorization: 'Bearer test-key' } });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hill_stats).toEqual({
      big: { elo_rating: 1400, wins: 10, losses: 3, ties: 2 },
    });
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
