import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import { upsertWarrior } from '@/lib/db';
import { parseWarrior } from '@/lib/engine';
import { POST } from '../route';
import { makePlayer, makeWarrior } from '@/lib/__tests__/fixtures';

jest.mock('@/lib/auth');
jest.mock('@/lib/db');
jest.mock('@/lib/engine');

const mockAuthenticateRequest = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;
const mockUnauthorizedResponse = unauthorizedResponse as jest.MockedFunction<typeof unauthorizedResponse>;
const mockUpsertWarrior = upsertWarrior as jest.MockedFunction<typeof upsertWarrior>;
const mockParseWarrior = parseWarrior as jest.MockedFunction<typeof parseWarrior>;

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

describe('POST /api/warriors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnauthorizedResponse.mockReturnValue(
      Response.json({ error: 'Unauthorized. Provide a valid API key via Authorization: Bearer <api_key>' }, { status: 401 })
    );
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthenticateRequest.mockResolvedValue(null);

    const req = createRequest('/api/warriors', { method: 'POST', body: { name: 'W', redcode: 'MOV 0, 1' } });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(mockUnauthorizedResponse).toHaveBeenCalled();
  });

  it('returns 400 when name is missing', async () => {
    mockAuthenticateRequest.mockResolvedValue(makePlayer());

    const req = createRequest('/api/warriors', { method: 'POST', body: { redcode: 'MOV 0, 1' } });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Warrior name is required');
  });

  it('returns 400 when redcode is missing', async () => {
    mockAuthenticateRequest.mockResolvedValue(makePlayer());

    const req = createRequest('/api/warriors', { method: 'POST', body: { name: 'MyWarrior' } });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Redcode source is required');
  });

  it('returns 400 when name is too long', async () => {
    mockAuthenticateRequest.mockResolvedValue(makePlayer());

    const req = createRequest('/api/warriors', { method: 'POST', body: { name: 'A'.repeat(101), redcode: 'MOV 0, 1' } });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Warrior name must be between 1 and 100 characters');
  });

  it('returns 400 when redcode is invalid', async () => {
    mockAuthenticateRequest.mockResolvedValue(makePlayer());
    mockParseWarrior.mockReturnValue({
      success: false,
      instructionCount: 0,
      errors: ['Line 1: Invalid opcode'],
    });

    const req = createRequest('/api/warriors', { method: 'POST', body: { name: 'MyWarrior', redcode: 'INVALID' } });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid Redcode');
    expect(data.details).toEqual(['Line 1: Invalid opcode']);
  });

  it('returns 201 on success with compatible_hills', async () => {
    const player = makePlayer();
    const warrior = makeWarrior({ player_id: player.id, name: 'MyWarrior' });
    mockAuthenticateRequest.mockResolvedValue(player);
    // 5 instructions fits both big (200) and 94nop (100)
    mockParseWarrior.mockReturnValue({ success: true, instructionCount: 5, errors: [] });
    mockUpsertWarrior.mockResolvedValue(warrior);

    const req = createRequest('/api/warriors', { method: 'POST', body: { name: 'MyWarrior', redcode: 'MOV 0, 1' } });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe(warrior.id);
    expect(data.name).toBe(warrior.name);
    expect(data.instruction_count).toBe(5);
    expect(data.compatible_hills).toBeDefined();
    expect(data.compatible_hills).toContain('big');
    expect(data.compatible_hills).toContain('94nop');
    expect(data.message).toBe('Warrior uploaded successfully');
    expect(mockUpsertWarrior).toHaveBeenCalledWith(player.id, 'MyWarrior', 'MOV 0, 1');
  });

  it('returns only big hill when warrior has 150 instructions (exceeds 94nop limit)', async () => {
    const player = makePlayer();
    const warrior = makeWarrior({ player_id: player.id, name: 'BigWarrior' });
    mockAuthenticateRequest.mockResolvedValue(player);
    // 150 instructions fits big (200) but NOT 94nop (100)
    mockParseWarrior.mockReturnValue({ success: true, instructionCount: 150, errors: [] });
    mockUpsertWarrior.mockResolvedValue(warrior);

    const req = createRequest('/api/warriors', { method: 'POST', body: { name: 'BigWarrior', redcode: 'MOV 0, 1' } });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.compatible_hills).toContain('big');
    expect(data.compatible_hills).not.toContain('94nop');
  });

  it('returns all hills when warrior has 50 instructions (fits all)', async () => {
    const player = makePlayer();
    const warrior = makeWarrior({ player_id: player.id, name: 'SmallWarrior' });
    mockAuthenticateRequest.mockResolvedValue(player);
    // 50 instructions fits both big (200) and 94nop (100)
    mockParseWarrior.mockReturnValue({ success: true, instructionCount: 50, errors: [] });
    mockUpsertWarrior.mockResolvedValue(warrior);

    const req = createRequest('/api/warriors', { method: 'POST', body: { name: 'SmallWarrior', redcode: 'MOV 0, 1' } });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.compatible_hills).toContain('big');
    expect(data.compatible_hills).toContain('94nop');
    expect(data.compatible_hills).toHaveLength(2);
  });

  it('returns 500 on database error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockAuthenticateRequest.mockResolvedValue(makePlayer());
    mockParseWarrior.mockReturnValue({ success: true, instructionCount: 1, errors: [] });
    mockUpsertWarrior.mockRejectedValue(new Error('DB error'));

    const req = createRequest('/api/warriors', { method: 'POST', body: { name: 'MyWarrior', redcode: 'MOV 0, 1' } });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Internal server error');
  });
});
