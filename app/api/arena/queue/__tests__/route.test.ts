import { NextRequest } from 'next/server';
import { POST } from '../route';
import { makePlayer } from '@/lib/__tests__/fixtures';

jest.mock('@/lib/db');
jest.mock('@/lib/engine');
jest.mock('@/lib/arena-trigger');
jest.mock('@/lib/auth', () => ({
  authenticateRequest: jest.fn(),
  unauthorizedResponse: jest.fn(() => Response.json({ error: 'Unauthorized' }, { status: 401 })),
}));

import { authenticateRequest } from '@/lib/auth';
import {
  getWaitingEntryForPlayer,
  findOpenSession,
  createArenaQueueEntry,
  getSessionEntryCount,
  isMaintenanceMode,
} from '@/lib/db';
import { parseWarrior } from '@/lib/engine';
import { triggerArenaBattle } from '@/lib/arena-trigger';

const mockAuth = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;
const mockIsMaintenanceMode = isMaintenanceMode as jest.MockedFunction<typeof isMaintenanceMode>;
const mockGetWaiting = getWaitingEntryForPlayer as jest.MockedFunction<typeof getWaitingEntryForPlayer>;
const mockFindSession = findOpenSession as jest.MockedFunction<typeof findOpenSession>;
const mockCreateEntry = createArenaQueueEntry as jest.MockedFunction<typeof createArenaQueueEntry>;
const mockGetSessionCount = getSessionEntryCount as jest.MockedFunction<typeof getSessionEntryCount>;
const mockParseWarrior = parseWarrior as jest.MockedFunction<typeof parseWarrior>;
const mockTriggerBattle = triggerArenaBattle as jest.MockedFunction<typeof triggerArenaBattle>;

const player = makePlayer({ id: 1 });

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue(player);
  mockIsMaintenanceMode.mockResolvedValue(false);
  mockParseWarrior.mockReturnValue({ success: true, errors: [], instructionCount: 5 });
});

function makeRequest(body: Record<string, unknown> = { warrior_code: 'MOV 0, 1' }) {
  return new NextRequest('http://localhost/api/arena/queue', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/arena/queue', () => {
  it('returns 401 without auth', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 503 in maintenance mode', async () => {
    mockIsMaintenanceMode.mockResolvedValue(true);
    const res = await POST(makeRequest());
    expect(res.status).toBe(503);
  });

  it('returns 400 for missing warrior_code', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid warrior code', async () => {
    mockParseWarrior.mockReturnValue({ success: false, errors: ['bad code'], instructionCount: 0 });
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });

  it('returns existing ticket for idempotent request', async () => {
    mockGetWaiting.mockResolvedValue({
      id: 'uuid', player_id: 1, ticket_id: 'existing-ticket',
      session_id: 'session-1', status: 'waiting', redcode: 'MOV 0, 1',
      arena_id: null, results: null,
      joined_at: new Date(), expires_at: new Date(Date.now() + 60000),
      created_at: new Date(),
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ticket_id).toBe('existing-ticket');
    expect(data.status).toBe('waiting');
  });

  it('creates new entry and returns ticket', async () => {
    mockGetWaiting.mockResolvedValue(null);
    mockFindSession.mockResolvedValue('session-1');
    mockCreateEntry.mockResolvedValue({
      id: 'uuid', player_id: 1, ticket_id: 'new-ticket',
      session_id: 'session-1', status: 'waiting', redcode: 'MOV 0, 1',
      arena_id: null, results: null,
      joined_at: new Date(), expires_at: new Date(Date.now() + 60000),
      created_at: new Date(),
    });
    mockGetSessionCount.mockResolvedValue(3);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ticket_id).toBe('new-ticket');
    expect(data.status).toBe('waiting');
    expect(data.poll_interval_ms).toBe(2000);
  });

  it('creates new session if none open', async () => {
    mockGetWaiting.mockResolvedValue(null);
    mockFindSession.mockResolvedValue(null);
    mockCreateEntry.mockResolvedValue({
      id: 'uuid', player_id: 1, ticket_id: 'new-ticket',
      session_id: 'new-session', status: 'waiting', redcode: 'MOV 0, 1',
      arena_id: null, results: null,
      joined_at: new Date(), expires_at: new Date(Date.now() + 60000),
      created_at: new Date(),
    });
    mockGetSessionCount.mockResolvedValue(1);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
  });

  it('triggers battle when 10th player joins', async () => {
    mockGetWaiting.mockResolvedValue(null);
    mockFindSession.mockResolvedValue('session-1');
    mockCreateEntry.mockResolvedValue({
      id: 'uuid', player_id: 1, ticket_id: 'new-ticket',
      session_id: 'session-1', status: 'waiting', redcode: 'MOV 0, 1',
      arena_id: null, results: null,
      joined_at: new Date(), expires_at: new Date(Date.now() + 60000),
      created_at: new Date(),
    });
    mockGetSessionCount.mockResolvedValue(10);
    mockTriggerBattle.mockResolvedValue(1);

    // Mock the dynamic import for getQueueEntryByTicket
    const { getQueueEntryByTicket } = jest.requireMock('@/lib/db');
    (getQueueEntryByTicket as jest.Mock).mockResolvedValue({
      ticket_id: 'new-ticket', status: 'completed', arena_id: 1,
      results: { your_rank: 1, your_score: 1800 },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(mockTriggerBattle).toHaveBeenCalledWith('session-1');
  });

  it('returns waiting when trigger returns null', async () => {
    mockGetWaiting.mockResolvedValue(null);
    mockFindSession.mockResolvedValue('session-1');
    mockCreateEntry.mockResolvedValue({
      id: 'uuid', player_id: 1, ticket_id: 'new-ticket',
      session_id: 'session-1', status: 'waiting', redcode: 'MOV 0, 1',
      arena_id: null, results: null,
      joined_at: new Date(), expires_at: new Date(Date.now() + 60000),
      created_at: new Date(),
    });
    mockGetSessionCount.mockResolvedValue(10);
    mockTriggerBattle.mockResolvedValue(null);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('waiting');
  });

  it('returns 400 for non-string warrior_code', async () => {
    const res = await POST(makeRequest({ warrior_code: 123 }));
    expect(res.status).toBe(400);
  });

  it('returns 500 on unexpected error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetWaiting.mockRejectedValue(new Error('DB error'));

    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
  });
});
