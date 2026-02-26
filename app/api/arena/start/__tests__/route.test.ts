import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import { getArenaWarriorByPlayerId, isMaintenanceMode } from '@/lib/db';
import { startArena } from '@/lib/arena-start';
import { POST } from '../route';
import { makePlayer, makeArenaWarrior } from '@/lib/__tests__/fixtures';

jest.mock('@/lib/auth');
jest.mock('@/lib/db');
jest.mock('@/lib/arena-start');

const mockAuth = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;
const mockUnauth = unauthorizedResponse as jest.MockedFunction<typeof unauthorizedResponse>;
const mockGetArenaWarrior = getArenaWarriorByPlayerId as jest.MockedFunction<typeof getArenaWarriorByPlayerId>;
const mockMaintenance = isMaintenanceMode as jest.MockedFunction<typeof isMaintenanceMode>;
const mockStartArena = startArena as jest.MockedFunction<typeof startArena>;

function createRequest() {
  return new NextRequest(new URL('/api/arena/start', 'http://localhost:3000'), {
    method: 'POST',
    headers: { Authorization: 'Bearer test-key' },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUnauth.mockReturnValue(
    Response.json({ error: 'Unauthorized' }, { status: 401 })
  );
  mockMaintenance.mockResolvedValue(false);
});

describe('POST /api/arena/start', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(createRequest());
    expect(res.status).toBe(401);
  });

  it('returns 503 during maintenance mode', async () => {
    mockAuth.mockResolvedValue(makePlayer());
    mockMaintenance.mockResolvedValue(true);
    const res = await POST(createRequest());
    expect(res.status).toBe(503);
  });

  it('returns 400 when no arena warrior exists', async () => {
    mockAuth.mockResolvedValue(makePlayer());
    mockGetArenaWarrior.mockResolvedValue(null);
    const res = await POST(createRequest());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('No arena warrior');
  });

  it('starts arena successfully and returns results', async () => {
    const player = makePlayer();
    const warrior = makeArenaWarrior({ player_id: player.id, redcode: 'MOV 0, 1' });
    mockAuth.mockResolvedValue(player);
    mockGetArenaWarrior.mockResolvedValue(warrior);
    mockStartArena.mockResolvedValue({
      arena_id: 42,
      placements: [
        {
          slot_index: 0, player_id: 1, name: 'TestPlayer', is_stock_bot: false,
          placement: 1, total_score: 1000, rating_before: 500, rating_after: 550, rating_change: 50,
        },
      ],
    });

    const res = await POST(createRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.arena_id).toBe(42);
    expect(data.placements).toHaveLength(1);
    expect(data.placements[0].placement).toBe(1);
    expect(mockStartArena).toHaveBeenCalledWith(player.id, 'MOV 0, 1');
  });

  it('returns 500 on error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const player = makePlayer();
    const warrior = makeArenaWarrior({ player_id: player.id });
    mockAuth.mockResolvedValue(player);
    mockGetArenaWarrior.mockResolvedValue(warrior);
    mockStartArena.mockRejectedValue(new Error('Engine failure'));

    const res = await POST(createRequest());
    expect(res.status).toBe(500);
  });
});
