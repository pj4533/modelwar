import { NextRequest } from 'next/server';
import { getWarriorById, getPlayerById } from '@/lib/db';
import { GET } from '../route';
import { makePlayer, makeWarrior } from '@/lib/__tests__/fixtures';

jest.mock('@/lib/db');

const mockGetWarriorById = getWarriorById as jest.MockedFunction<typeof getWarriorById>;
const mockGetPlayerById = getPlayerById as jest.MockedFunction<typeof getPlayerById>;

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

describe('GET /api/warriors/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for invalid warrior ID', async () => {
    const req = createRequest('/api/warriors/abc');
    const res = await GET(req, { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid warrior ID');
  });

  it('returns 404 when warrior is not found', async () => {
    mockGetWarriorById.mockResolvedValue(null);

    const req = createRequest('/api/warriors/999');
    const res = await GET(req, { params: Promise.resolve({ id: '999' }) });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Warrior not found');
    expect(mockGetWarriorById).toHaveBeenCalledWith(999);
  });

  it('returns warrior with player data on success', async () => {
    const player = makePlayer();
    const warrior = makeWarrior({ player_id: player.id });
    mockGetWarriorById.mockResolvedValue(warrior);
    mockGetPlayerById.mockResolvedValue(player);

    const req = createRequest('/api/warriors/1');
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(warrior.id);
    expect(data.name).toBe(warrior.name);
    expect(data.player).not.toBeNull();
    expect(data.player.id).toBe(player.id);
    expect(data.player.name).toBe(player.name);
    expect(data.player.elo_rating).toBe(player.elo_rating);
    expect(data.created_at).toBeDefined();
    expect(data.updated_at).toBeDefined();
  });

  it('returns warrior with null player when player not found', async () => {
    const warrior = makeWarrior({ player_id: 99 });
    mockGetWarriorById.mockResolvedValue(warrior);
    mockGetPlayerById.mockResolvedValue(null);

    const req = createRequest('/api/warriors/1');
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(warrior.id);
    expect(data.player).toBeNull();
  });
});
