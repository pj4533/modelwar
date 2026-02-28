import { NextRequest } from 'next/server';
import { POST } from '../route';
import { makePlayer, makeWarrior, makeBattle } from '@/lib/__tests__/fixtures';

jest.mock('@/lib/auth');
jest.mock('@/lib/db');
jest.mock('@/lib/engine');
jest.mock('@/lib/glicko');
jest.mock('@/lib/diminishing');

import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import {
  getPlayerById,
  getWarriorByPlayerId,
  createBattle,
  updatePlayerRating,
  withTransaction,
  isMaintenanceMode,
  getRecentPairBattleCount,
} from '@/lib/db';
import { runBattle, parseWarrior, isSuicideWarrior } from '@/lib/engine';
import { calculateNewRatings } from '@/lib/glicko';
import { calculateDiminishingFactor, applyDiminishingFactor } from '@/lib/diminishing';

const mockAuth = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;
const mockUnauth = unauthorizedResponse as jest.MockedFunction<typeof unauthorizedResponse>;
const mockGetPlayerById = getPlayerById as jest.MockedFunction<typeof getPlayerById>;
const mockGetWarriorByPlayerId = getWarriorByPlayerId as jest.MockedFunction<typeof getWarriorByPlayerId>;
const mockCreateBattle = createBattle as jest.MockedFunction<typeof createBattle>;
const mockUpdatePlayerRating = updatePlayerRating as jest.MockedFunction<typeof updatePlayerRating>;
const mockWithTransaction = withTransaction as jest.MockedFunction<typeof withTransaction>;
const mockIsMaintenanceMode = isMaintenanceMode as jest.MockedFunction<typeof isMaintenanceMode>;
const mockGetRecentPairBattleCount = getRecentPairBattleCount as jest.MockedFunction<typeof getRecentPairBattleCount>;
const mockRunBattle = runBattle as jest.MockedFunction<typeof runBattle>;
const mockParseWarrior = parseWarrior as jest.MockedFunction<typeof parseWarrior>;
const mockIsSuicideWarrior = isSuicideWarrior as jest.MockedFunction<typeof isSuicideWarrior>;
const mockCalcRatings = calculateNewRatings as jest.MockedFunction<typeof calculateNewRatings>;
const mockCalcDiminishing = calculateDiminishingFactor as jest.MockedFunction<typeof calculateDiminishingFactor>;
const mockApplyDiminishing = applyDiminishingFactor as jest.MockedFunction<typeof applyDiminishingFactor>;

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


function setupFullBattleMocks(overrides?: { overallResult?: 'challenger_win' | 'defender_win' | 'tie'; pairCount?: number; suicideLoser?: boolean }) {
  const result = overrides?.overallResult ?? 'challenger_win';
  const pairCount = overrides?.pairCount ?? 0;
  let cWins = 60, dWins = 30, tCount = 10;
  if (result === 'defender_win') { cWins = 30; dWins = 60; tCount = 10; }
  else if (result === 'tie') { cWins = 45; dWins = 45; tCount = 10; }

  mockAuth.mockResolvedValue(challenger);
  mockGetPlayerById.mockResolvedValue(defender);
  mockGetWarriorByPlayerId
    .mockResolvedValueOnce(challengerWarrior)
    .mockResolvedValueOnce(defenderWarrior);
  mockParseWarrior.mockReturnValue({ success: true, errors: [], instructionCount: 5 });
  mockIsSuicideWarrior.mockReturnValue(overrides?.suicideLoser ?? false);
  mockRunBattle.mockReturnValue({
    rounds: [{ round: 1, winner: 'challenger', seed: 12345 }],
    challengerWins: cWins,
    defenderWins: dWins,
    ties: tCount,
    overallResult: result,
  });
  mockCalcRatings.mockReturnValue({
    newRatingA: 1216, newRdA: 320, newVolatilityA: 0.06,
    newRatingB: 1184, newRdB: 320, newVolatilityB: 0.06,
  });
  mockGetRecentPairBattleCount.mockResolvedValue(pairCount);
  // Default: factor=1.0 for pairCount=0, pass-through values
  mockCalcDiminishing.mockReturnValue(pairCount === 0 ? 1.0 : 1 / (pairCount + 1));
  mockApplyDiminishing.mockImplementation((factor, oA, oB, nA, nB) => ({
    ratingA: factor === 1.0 ? nA.rating : Math.round(oA.rating + (nA.rating - oA.rating) * factor),
    rdA: factor === 1.0 ? nA.rd : Math.round((oA.rd + (nA.rd - oA.rd) * factor) * 100) / 100,
    volatilityA: factor === 1.0 ? nA.volatility : Math.round((oA.volatility + (nA.volatility - oA.volatility) * factor) * 1000000) / 1000000,
    ratingB: factor === 1.0 ? nB.rating : Math.round(oB.rating + (nB.rating - oB.rating) * factor),
    rdB: factor === 1.0 ? nB.rd : Math.round((oB.rd + (nB.rd - oB.rd) * factor) * 100) / 100,
    volatilityB: factor === 1.0 ? nB.volatility : Math.round((oB.volatility + (nB.volatility - oB.volatility) * factor) * 1000000) / 1000000,
  }));
  mockUpdatePlayerRating.mockResolvedValue(undefined);
  mockCreateBattle.mockResolvedValue(makeBattle({ id: 42 }));
  mockWithTransaction.mockImplementation(async (fn) => fn({} as never));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsMaintenanceMode.mockResolvedValue(false);
  mockUnauth.mockReturnValue(
    Response.json(
      { error: 'Unauthorized. Provide a valid API key via Authorization: Bearer <api_key>' },
      { status: 401 }
    )
  );
});

describe('POST /api/challenge', () => {
  it('returns 503 when maintenance mode is enabled', async () => {
    mockAuth.mockResolvedValue(challenger);
    mockIsMaintenanceMode.mockResolvedValue(true);
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 2 },
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toMatch(/maintenance mode/);
    expect(mockRunBattle).not.toHaveBeenCalled();
  });

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
    expect(data.score.challenger_wins).toBe(60);
    expect(data.score.defender_wins).toBe(30);
    // conservative = rating - 2*rd; before: 1200-700=500, challenger after: 1216-640=576, defender after: 1184-640=544
    expect(data.rating_changes.challenger.before).toBe(500);
    expect(data.rating_changes.challenger.after).toBe(576);
    expect(data.rating_changes.challenger.change).toBe(76);
    expect(data.rating_changes.defender.before).toBe(500);
    expect(data.rating_changes.defender.after).toBe(544);
    expect(data.rating_changes.defender.change).toBe(44);
    expect(mockUpdatePlayerRating).toHaveBeenCalledWith(challenger.id, 1216, 320, 0.06, 'win', expect.anything());
    expect(mockUpdatePlayerRating).toHaveBeenCalledWith(defender.id, 1184, 320, 0.06, 'loss', expect.anything());
    expect(mockCalcRatings).toHaveBeenCalledWith(
      { rating: 1200, rd: 350, volatility: 0.06 },
      { rating: 1200, rd: 350, volatility: 0.06 },
      'a_win'
    );
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
    expect(mockCalcRatings).toHaveBeenCalledWith(
      { rating: 1200, rd: 350, volatility: 0.06 },
      { rating: 1200, rd: 350, volatility: 0.06 },
      'b_win'
    );
    expect(mockUpdatePlayerRating).toHaveBeenCalledWith(challenger.id, 1216, 320, 0.06, 'loss', expect.anything());
    expect(mockUpdatePlayerRating).toHaveBeenCalledWith(defender.id, 1184, 320, 0.06, 'win', expect.anything());
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
    expect(mockCalcRatings).toHaveBeenCalledWith(
      { rating: 1200, rd: 350, volatility: 0.06 },
      { rating: 1200, rd: 350, volatility: 0.06 },
      'tie'
    );
    expect(mockUpdatePlayerRating).toHaveBeenCalledWith(challenger.id, 1216, 320, 0.06, 'tie', expect.anything());
    expect(mockUpdatePlayerRating).toHaveBeenCalledWith(defender.id, 1184, 320, 0.06, 'tie', expect.anything());
  });

  it('returns 400 when challenger warrior fails validation', async () => {
    mockAuth.mockResolvedValue(challenger);
    mockGetPlayerById.mockResolvedValue(defender);
    mockGetWarriorByPlayerId
      .mockResolvedValueOnce(challengerWarrior)
      .mockResolvedValueOnce(defenderWarrior);
    mockParseWarrior.mockReturnValueOnce({ success: false, errors: ['Too long'], instructionCount: 4000 });
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 2 },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Your warrior is invalid or exceeds the maximum length/);
    expect(mockRunBattle).not.toHaveBeenCalled();
  });

  it('returns 400 when defender warrior fails validation', async () => {
    mockAuth.mockResolvedValue(challenger);
    mockGetPlayerById.mockResolvedValue(defender);
    mockGetWarriorByPlayerId
      .mockResolvedValueOnce(challengerWarrior)
      .mockResolvedValueOnce(defenderWarrior);
    mockParseWarrior
      .mockReturnValueOnce({ success: true, errors: [], instructionCount: 5 })
      .mockReturnValueOnce({ success: false, errors: ['Too long'], instructionCount: 4000 });
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 2 },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Defender warrior is invalid or exceeds the maximum length/);
    expect(mockRunBattle).not.toHaveBeenCalled();
  });

  it('includes diminishing_factor=1.0 in response for first battle', async () => {
    setupFullBattleMocks({ pairCount: 0 });
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 2 },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.diminishing_factor).toBe(1.0);
  });

  it('applies diminishing returns on repeated matchup', async () => {
    setupFullBattleMocks({ pairCount: 1 });
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 2 },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.diminishing_factor).toBe(0.5);
    expect(mockCalcDiminishing).toHaveBeenCalledWith(1);
    expect(mockApplyDiminishing).toHaveBeenCalled();
    // With factor 0.5: challenger rating = 1200 + (1216-1200)*0.5 = 1208
    expect(mockUpdatePlayerRating).toHaveBeenCalledWith(
      challenger.id, 1208, 335, 0.06, 'win', expect.anything()
    );
    // With factor 0.5: defender rating = 1200 + (1184-1200)*0.5 = 1192
    expect(mockUpdatePlayerRating).toHaveBeenCalledWith(
      defender.id, 1192, 335, 0.06, 'loss', expect.anything()
    );
  });

  it('uses diminished values in createBattle after fields', async () => {
    setupFullBattleMocks({ pairCount: 1 });
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 2 },
    });
    await POST(req);
    expect(mockCreateBattle).toHaveBeenCalledWith(
      expect.objectContaining({
        challenger_elo_after: 1208,
        defender_elo_after: 1192,
        challenger_rd_after: 335,
        defender_rd_after: 335,
      }),
      expect.anything()
    );
  });

  it('nullifies rating changes when losing defender is a suicide warrior', async () => {
    setupFullBattleMocks({ overallResult: 'challenger_win', suicideLoser: true });
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 2 },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.suicide_nullified).toBe(true);
    expect(data.diminishing_factor).toBe(0);
    expect(mockCalcRatings).not.toHaveBeenCalled();
    // Ratings unchanged — old values passed through with factor 0
    expect(mockApplyDiminishing).toHaveBeenCalledWith(
      0,
      expect.objectContaining({ rating: 1200 }),
      expect.objectContaining({ rating: 1200 }),
      expect.objectContaining({ rating: 1200 }),
      expect.objectContaining({ rating: 1200 }),
    );
  });

  it('nullifies rating changes when losing challenger is a suicide warrior', async () => {
    setupFullBattleMocks({ overallResult: 'defender_win', suicideLoser: true });
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 2 },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.suicide_nullified).toBe(true);
    expect(mockCalcRatings).not.toHaveBeenCalled();
  });

  it('does not nullify ratings on a tie even if warrior is suicide', async () => {
    setupFullBattleMocks({ overallResult: 'tie', suicideLoser: true });
    const req = createRequest('http://localhost:3000/api/challenge', {
      method: 'POST',
      body: { defender_id: 2 },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.suicide_nullified).toBe(false);
    expect(mockCalcRatings).toHaveBeenCalled();
  });
});
