import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import { upsertArenaWarrior, isMaintenanceMode } from '@/lib/db';
import { parseWarrior } from '@/lib/engine';
import { POST } from '../route';
import { makePlayer, makeArenaWarrior } from '@/lib/__tests__/fixtures';

jest.mock('@/lib/auth');
jest.mock('@/lib/db');
jest.mock('@/lib/engine');

const mockAuth = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;
const mockUnauth = unauthorizedResponse as jest.MockedFunction<typeof unauthorizedResponse>;
const mockUpsert = upsertArenaWarrior as jest.MockedFunction<typeof upsertArenaWarrior>;
const mockMaintenance = isMaintenanceMode as jest.MockedFunction<typeof isMaintenanceMode>;
const mockParseWarrior = parseWarrior as jest.MockedFunction<typeof parseWarrior>;

function createRequest(body?: unknown) {
  const headers: Record<string, string> = { Authorization: 'Bearer test-key' };
  if (body) headers['Content-Type'] = 'application/json';
  return new NextRequest(new URL('/api/arena/warrior', 'http://localhost:3000'), {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUnauth.mockReturnValue(
    Response.json({ error: 'Unauthorized' }, { status: 401 })
  );
  mockMaintenance.mockResolvedValue(false);
});

describe('POST /api/arena/warrior', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(createRequest({ name: 'W', redcode: 'MOV 0, 1' }));
    expect(res.status).toBe(401);
  });

  it('returns 503 during maintenance mode', async () => {
    mockAuth.mockResolvedValue(makePlayer());
    mockMaintenance.mockResolvedValue(true);
    const res = await POST(createRequest({ name: 'W', redcode: 'MOV 0, 1' }));
    expect(res.status).toBe(503);
  });

  it('returns 400 for invalid JSON body', async () => {
    mockAuth.mockResolvedValue(makePlayer());
    const req = new NextRequest(new URL('/api/arena/warrior', 'http://localhost:3000'), {
      method: 'POST',
      body: 'not json',
      headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('valid JSON');
  });

  it('returns 400 when name is missing', async () => {
    mockAuth.mockResolvedValue(makePlayer());
    const res = await POST(createRequest({ redcode: 'MOV 0, 1' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('name');
  });

  it('returns 400 when name exceeds 100 characters', async () => {
    mockAuth.mockResolvedValue(makePlayer());
    const res = await POST(createRequest({ name: 'a'.repeat(101), redcode: 'MOV 0, 1' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when redcode is missing', async () => {
    mockAuth.mockResolvedValue(makePlayer());
    const res = await POST(createRequest({ name: 'TestWarrior' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('redcode');
  });

  it('returns 400 for invalid redcode', async () => {
    mockAuth.mockResolvedValue(makePlayer());
    mockParseWarrior.mockReturnValue({ success: false, errors: ['syntax error'], instructionCount: 0 });
    const res = await POST(createRequest({ name: 'W', redcode: 'INVALID' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Invalid warrior code');
  });

  it('returns 400 when warrior exceeds instruction limit', async () => {
    mockAuth.mockResolvedValue(makePlayer());
    mockParseWarrior.mockReturnValue({ success: true, errors: [], instructionCount: 200 });
    const res = await POST(createRequest({ name: 'W', redcode: 'MOV 0, 1' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('exceeds arena limit');
  });

  it('creates arena warrior with auto_join default false', async () => {
    const player = makePlayer();
    const warrior = makeArenaWarrior({ player_id: player.id });
    mockAuth.mockResolvedValue(player);
    mockParseWarrior.mockReturnValue({ success: true, errors: [], instructionCount: 1 });
    mockUpsert.mockResolvedValue(warrior);

    const res = await POST(createRequest({ name: 'ArenaWarrior', redcode: 'MOV 0, 1' }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('ArenaWarrior');
    expect(data.auto_join).toBe(false);
    expect(mockUpsert).toHaveBeenCalledWith(player.id, 'ArenaWarrior', 'MOV 0, 1', false);
  });

  it('creates arena warrior with auto_join true', async () => {
    const player = makePlayer();
    const warrior = makeArenaWarrior({ player_id: player.id, auto_join: true });
    mockAuth.mockResolvedValue(player);
    mockParseWarrior.mockReturnValue({ success: true, errors: [], instructionCount: 1 });
    mockUpsert.mockResolvedValue(warrior);

    const res = await POST(createRequest({ name: 'ArenaWarrior', redcode: 'MOV 0, 1', auto_join: true }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.auto_join).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(player.id, 'ArenaWarrior', 'MOV 0, 1', true);
  });

  it('returns 500 on database error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockAuth.mockResolvedValue(makePlayer());
    mockParseWarrior.mockReturnValue({ success: true, errors: [], instructionCount: 1 });
    mockUpsert.mockRejectedValue(new Error('DB error'));

    const res = await POST(createRequest({ name: 'W', redcode: 'MOV 0, 1' }));
    expect(res.status).toBe(500);
  });
});
