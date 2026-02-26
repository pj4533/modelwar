import { NextRequest } from 'next/server';
import { GET } from '../route';
import { makePlayer } from '@/lib/__tests__/fixtures';

jest.mock('@/lib/db');
jest.mock('@/lib/arena-trigger');
jest.mock('@/lib/auth', () => ({
  authenticateRequest: jest.fn(),
  unauthorizedResponse: jest.fn(() => Response.json({ error: 'Unauthorized' }, { status: 401 })),
}));

import { authenticateRequest } from '@/lib/auth';
import { getQueueEntryByTicket, getOldestSessionExpiry } from '@/lib/db';
import { triggerArenaBattle } from '@/lib/arena-trigger';

const mockAuth = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;
const mockGetEntry = getQueueEntryByTicket as jest.MockedFunction<typeof getQueueEntryByTicket>;
const mockGetOldestExpiry = getOldestSessionExpiry as jest.MockedFunction<typeof getOldestSessionExpiry>;
const mockTriggerBattle = triggerArenaBattle as jest.MockedFunction<typeof triggerArenaBattle>;

const player = makePlayer({ id: 1 });

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue(player);
});

function makeRequest(ticketId: string) {
  return {
    request: new NextRequest(`http://localhost/api/arena/queue/${ticketId}`, {
      method: 'GET',
    }),
    context: { params: Promise.resolve({ ticketId }) },
  };
}

function makeEntry(overrides = {}) {
  return {
    id: 'uuid-1',
    player_id: 1,
    ticket_id: 'ticket-abc',
    session_id: 'session-1',
    status: 'waiting',
    redcode: 'MOV 0, 1',
    arena_id: null,
    results: null,
    joined_at: new Date(),
    expires_at: new Date(Date.now() + 60000),
    created_at: new Date(),
    ...overrides,
  };
}

describe('GET /api/arena/queue/[ticketId]', () => {
  it('returns 401 without auth', async () => {
    mockAuth.mockResolvedValue(null);
    const { request, context } = makeRequest('ticket-abc');
    const res = await GET(request, context);
    expect(res.status).toBe(401);
  });

  it('returns 404 for nonexistent ticket', async () => {
    mockGetEntry.mockResolvedValue(null);
    const { request, context } = makeRequest('nonexistent');
    const res = await GET(request, context);
    expect(res.status).toBe(404);
  });

  it('returns 403 when ticket belongs to another player', async () => {
    mockGetEntry.mockResolvedValue(makeEntry({ player_id: 999 }) as never);
    const { request, context } = makeRequest('ticket-abc');
    const res = await GET(request, context);
    expect(res.status).toBe(403);
  });

  it('returns completed status with results', async () => {
    mockGetEntry.mockResolvedValue(makeEntry({
      status: 'completed',
      arena_id: 1,
      results: { your_rank: 1, your_score: 1800 },
    }) as never);

    const { request, context } = makeRequest('ticket-abc');
    const res = await GET(request, context);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('completed');
    expect(data.arena_id).toBe(1);
    expect(data.results.your_rank).toBe(1);
  });

  it('returns expired status', async () => {
    mockGetEntry.mockResolvedValue(makeEntry({ status: 'expired' }) as never);

    const { request, context } = makeRequest('ticket-abc');
    const res = await GET(request, context);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('expired');
  });

  it('returns waiting status when session not expired', async () => {
    mockGetEntry.mockResolvedValue(makeEntry() as never);
    mockGetOldestExpiry.mockResolvedValue(new Date(Date.now() + 60000)); // future

    const { request, context } = makeRequest('ticket-abc');
    const res = await GET(request, context);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('waiting');
    expect(data.poll_interval_ms).toBe(2000);
  });

  it('triggers battle when session expired', async () => {
    mockGetEntry.mockResolvedValueOnce(makeEntry() as never);
    mockGetOldestExpiry.mockResolvedValue(new Date(Date.now() - 5000)); // past
    mockTriggerBattle.mockResolvedValue(1);
    mockGetEntry.mockResolvedValueOnce(makeEntry({
      status: 'completed',
      arena_id: 1,
      results: { your_rank: 3, your_score: 400 },
    }) as never);

    const { request, context } = makeRequest('ticket-abc');
    const res = await GET(request, context);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('completed');
    expect(data.arena_id).toBe(1);
    expect(mockTriggerBattle).toHaveBeenCalledWith('session-1');
  });

  it('returns waiting when trigger returns null', async () => {
    mockGetEntry.mockResolvedValue(makeEntry() as never);
    mockGetOldestExpiry.mockResolvedValue(new Date(Date.now() - 5000)); // past
    mockTriggerBattle.mockResolvedValue(null);

    const { request, context } = makeRequest('ticket-abc');
    const res = await GET(request, context);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('waiting');
  });

  it('returns waiting when oldest expiry is null', async () => {
    mockGetEntry.mockResolvedValue(makeEntry() as never);
    mockGetOldestExpiry.mockResolvedValue(null);

    const { request, context } = makeRequest('ticket-abc');
    const res = await GET(request, context);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('waiting');
  });

  it('handles unknown status gracefully', async () => {
    mockGetEntry.mockResolvedValue(makeEntry({ status: 'processing' }) as never);

    const { request, context } = makeRequest('ticket-abc');
    const res = await GET(request, context);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('processing');
  });

  it('returns 500 on unexpected error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetEntry.mockRejectedValue(new Error('DB error'));

    const { request, context } = makeRequest('ticket-abc');
    const res = await GET(request, context);
    expect(res.status).toBe(500);
  });
});
