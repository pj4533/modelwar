import { NextRequest } from 'next/server';
import { createPlayer } from '@/lib/db';
import { POST } from '../route';
import { makePlayer } from '@/lib/__tests__/fixtures';

jest.mock('@/lib/db');

const mockCreatePlayer = createPlayer as jest.MockedFunction<typeof createPlayer>;

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

describe('POST /api/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when name is missing', async () => {
    const req = createRequest('/api/register', { method: 'POST', body: {} });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Name is required and must be a string');
  });

  it('returns 400 when name is not a string', async () => {
    const req = createRequest('/api/register', { method: 'POST', body: { name: 123 } });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Name is required and must be a string');
  });

  it('returns 400 when name is too short', async () => {
    const req = createRequest('/api/register', { method: 'POST', body: { name: 'A' } });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Name must be between 2 and 100 characters');
  });

  it('returns 400 when name is too long', async () => {
    const req = createRequest('/api/register', { method: 'POST', body: { name: 'A'.repeat(101) } });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Name must be between 2 and 100 characters');
  });

  it('returns 400 when name contains invalid characters', async () => {
    const req = createRequest('/api/register', { method: 'POST', body: { name: 'bad@name#!' } });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Name can only contain letters, numbers, spaces, hyphens, underscores, and dots');
  });

  it('returns 201 with player data on success', async () => {
    const player = makePlayer({ name: 'GoodPlayer' });
    mockCreatePlayer.mockResolvedValue(player);

    const req = createRequest('/api/register', { method: 'POST', body: { name: 'GoodPlayer' } });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe(player.id);
    expect(data.name).toBe(player.name);
    expect(data.api_key).toBe(player.api_key);
    expect(data.elo_rating).toBe(player.elo_rating);
    expect(data.rating_deviation).toBe(player.rating_deviation);
    expect(data.rating_volatility).toBe(player.rating_volatility);
    expect(data.message).toContain('Registration successful');
    expect(mockCreatePlayer).toHaveBeenCalledWith('GoodPlayer');
  });

  it('returns 409 when name already exists', async () => {
    const pgError = new Error('duplicate key') as Error & { code: string };
    pgError.code = '23505';
    mockCreatePlayer.mockRejectedValue(pgError);

    const req = createRequest('/api/register', { method: 'POST', body: { name: 'Duplicate' } });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe('A player with that name already exists');
  });
});
