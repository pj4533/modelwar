import { NextRequest } from 'next/server';
import { POST } from '../route';
import { makePlayer, makeWarrior, makeBattle, makePlayerHillStats } from '@/lib/__tests__/fixtures';

jest.mock('@/lib/auth');
jest.mock('@/lib/db');
jest.mock('@/lib/engine');
jest.mock('@/lib/elo');

import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import {
  getPlayerById,
  getWarriorByPlayerId,
  createBattle,
  withTransaction,
  getOrCreateHillStats,
  updateHillStats,
} from '@/lib/db';
import { runBattle, parseWarrior } from '@/lib/engine';
import { calculateNewRatings } from '@/lib/elo';

const mockAuth = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;
const mockUnauth = unauthorizedResponse as jest.MockedFunction<typeof unauthorizedResponse>;
const mockGetPlayerById = getPlayerById as jest.MockedFunction<typeof getPlayerById>;
const mockGetWarriorByPlayerId = getWarriorByPlayerId as jest.MockedFunction<typeof getWarriorByPlayerId>;
const mockCreateBattle = createBattle as jest.MockedFunction<typeof createBattle>;
const mockWithTransaction = withTransaction as jest.MockedFunction<typeof withTransaction>;
const mockRunBattle = runBattle as jest.MockedFunction<typeof runBattle>;
const mockCalcRatings = calculateNewRatings as jest.MockedFunction<typeof calculateNewRatings>;
const mockGetOrCreateHillStats = getOrCreateHillStats as jest.MockedFunction<typeof getOrCreateHillStats>;
const mockUpdateHillStats = updateHillStats as jest.MockedFunction<typeof updateHillStats>;
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

const challenger = makePlayer({ id: 1, name: 'Challenger', elo_rating: 1200 });
const defender = makePlayer({ id: 2, name: 'Defender', elo_rating: 1200 });
const challengerWarrior = makeWarrior({ id: 1, player_id: 1, redcode: 'MOV 0, 1' });
const defenderWarrior = makeWarrior({ id: 2, player_id: 2, redcode: 'DAT #0, #0' });


function setupFullBattleMocks(overrides?: { overallResult?: 'challenger_win' | 'defender_win' | 'tie' }) {
  const result = overrides?.overallResult ?? 'challenger_win';
  let cWins = 3, dWins = 1, tCount = 1;
  if (result === 'defender_win') { cWins = 1; dWins = 3; tCount = 1; }
  else if (result === 'tie') { cWins = 2; dWins = 2; tCount = 1; }

  mockAuth.mockResolvedValue(challenger);
  mockGetPlayerById.mockResolvedValue(defender);
  mockGetWarriorByPlayerId
    .mockResolvedValueOnce(challengerWarrior)
    .mockResolvedValueOnce(defenderWarrior);
  // parseWarrior succeeds for both warriors
  mockParseWarrior.mockReturnValue({ success: true, instructionCount: 5, errors: [] });
  mockRunBattle.mockReturnValue({
    rounds: [{ round: 1, winner: 'challenger', seed: 12345 }],
    challengerWins: cWins,
    defenderWins: dWins,
    ties: tCount,
    overallResult: result,
  });
  mockCalcRatings.mockReturnValue({ newRatingA: 1216, newRatingB: 1184 });
  mockGetOrCreateHillStats
    .mockResolvedValueOnce(makePlayerHillStats({ player_id: 1, hill: 'big', elo_rating: 1200 }))
    .mockResolvedValueOnce(makePlayerHillStats({ player_id: 2, hill: 'big', elo_rating: 1200 }));
  mockUpdateHillStats.mockResolvedValue(undefined);
  mockCreateBattle.mockResolvedValue(makeBattle({ id: 42, hill: 'big' }));
  mockWithTransaction.mockImplementation(async (fn) => fn({} as never));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUnauth.mockReturnValue(
    Response.json(
      { error: 'Unauthorized. Provide a valid API key via Authorization: Bearer <api_key>' },
      { status: 401 }
    )
  );
});

describe('POST /api/challenge', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 2 },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when defender_id is missing', async () => {
    mockAuth.mockResolvedValue(challenger);
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: {},
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/defender_id is required/);
  });

  it('returns 400 when defender_id is not a number', async () => {
    mockAuth.mockResolvedValue(challenger);
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 'abc' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/defender_id is required and must be a number/);
  });

  it('returns 400 for invalid hill slug', async () => {
    mockAuth.mockResolvedValue(challenger);
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 2, hill: 'nonexistent' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid hill/);
  });

  it('returns 400 when challenging yourself', async () => {
    mockAuth.mockResolvedValue(challenger);
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: challenger.id },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('You cannot challenge yourself');
  });

  it('returns 404 when defender not found', async () => {
    mockAuth.mockResolvedValue(challenger);
    mockGetPlayerById.mockResolvedValue(undefined as unknown as null);
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 999 },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Defender not found');
  });

  it('returns 400 when challenger has no warrior', async () => {
    mockAuth.mockResolvedValue(challenger);
    mockGetPlayerById.mockResolvedValue(defender);
    mockGetWarriorByPlayerId.mockResolvedValueOnce(null);
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 2 },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('You must upload a warrior before challenging');
  });

  it('returns 400 when defender has no warrior', async () => {
    mockAuth.mockResolvedValue(challenger);
    mockGetPlayerById.mockResolvedValue(defender);
    mockGetWarriorByPlayerId
      .mockResolvedValueOnce(challengerWarrior)
      .mockResolvedValueOnce(null);
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 2 },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Defender has no warrior uploaded');
  });

  it('returns 400 when challenger warrior is too long for hill', async () => {
    mockAuth.mockResolvedValue(challenger);
    mockGetPlayerById.mockResolvedValue(defender);
    mockGetWarriorByPlayerId
      .mockResolvedValueOnce(challengerWarrior)
      .mockResolvedValueOnce(defenderWarrior);
    // Challenger warrior fails parse (too long)
    mockParseWarrior.mockReturnValueOnce({ success: false, instructionCount: 250, errors: ['too long'] });
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 2 },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Your warrior is too long/);
  });

  it('returns 400 when defender warrior is too long for hill', async () => {
    mockAuth.mockResolvedValue(challenger);
    mockGetPlayerById.mockResolvedValue(defender);
    mockGetWarriorByPlayerId
      .mockResolvedValueOnce(challengerWarrior)
      .mockResolvedValueOnce(defenderWarrior);
    // Challenger passes, defender fails
    mockParseWarrior
      .mockReturnValueOnce({ success: true, instructionCount: 5, errors: [] })
      .mockReturnValueOnce({ success: false, instructionCount: 250, errors: ['too long'] });
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 2 },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Defender's warrior is too long/);
  });

  it('returns correct battle data on challenger win', async () => {
    setupFullBattleMocks({ overallResult: 'challenger_win' });
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 2 },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.battle_id).toBe(42);
    expect(data.result).toBe('challenger_win');
    expect(data.hill).toBe('big');
    expect(data.score.challenger_wins).toBe(3);
    expect(data.score.defender_wins).toBe(1);
    expect(data.elo_changes.challenger.before).toBe(1200);
    expect(data.elo_changes.challenger.after).toBe(1216);
    expect(data.elo_changes.defender.after).toBe(1184);
    expect(mockUpdateHillStats).toHaveBeenCalledWith(challenger.id, 'big', 1216, 'win', expect.anything());
    expect(mockUpdateHillStats).toHaveBeenCalledWith(defender.id, 'big', 1184, 'loss', expect.anything());
    expect(mockCalcRatings).toHaveBeenCalledWith(1200, 1200, 'a_win');
  });

  it('returns correct result mapping on defender win', async () => {
    setupFullBattleMocks({ overallResult: 'defender_win' });
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 2 },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.result).toBe('defender_win');
    expect(mockCalcRatings).toHaveBeenCalledWith(1200, 1200, 'b_win');
    expect(mockUpdateHillStats).toHaveBeenCalledWith(challenger.id, 'big', 1216, 'loss', expect.anything());
    expect(mockUpdateHillStats).toHaveBeenCalledWith(defender.id, 'big', 1184, 'win', expect.anything());
  });

  it('returns correct result mapping on tie', async () => {
    setupFullBattleMocks({ overallResult: 'tie' });
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 2 },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.result).toBe('tie');
    expect(mockCalcRatings).toHaveBeenCalledWith(1200, 1200, 'tie');
    expect(mockUpdateHillStats).toHaveBeenCalledWith(challenger.id, 'big', 1216, 'tie', expect.anything());
    expect(mockUpdateHillStats).toHaveBeenCalledWith(defender.id, 'big', 1184, 'tie', expect.anything());
  });

  it('defaults to big hill when hill is not specified', async () => {
    setupFullBattleMocks();
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 2 },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hill).toBe('big');
  });

  it('includes hill in response', async () => {
    setupFullBattleMocks();
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 2, hill: 'big' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hill).toBe('big');
  });
});
