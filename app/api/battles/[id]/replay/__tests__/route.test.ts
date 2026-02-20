import { NextRequest } from 'next/server';
import { GET } from '../route';
import { makePlayer, makeBattle } from '@/lib/__tests__/fixtures';

jest.mock('@/lib/db');

import { getBattleById, getPlayerById } from '@/lib/db';

const mockGetBattleById = getBattleById as jest.MockedFunction<typeof getBattleById>;
const mockGetPlayerById = getPlayerById as jest.MockedFunction<typeof getPlayerById>;

function createRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/battles/[id]/replay', () => {
  it('returns 400 for invalid battle ID', async () => {
    const req = createRequest('http://localhost:3000/api/battles/abc/replay');
    const res = await GET(req, { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid battle ID');
  });

  it('returns 404 when battle not found', async () => {
    mockGetBattleById.mockResolvedValue(null);
    const req = createRequest('http://localhost:3000/api/battles/999/replay');
    const res = await GET(req, { params: Promise.resolve({ id: '999' }) });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Battle not found');
  });

  it('returns 404 when battle has no stored redcode', async () => {
    mockGetBattleById.mockResolvedValue(
      makeBattle({ challenger_redcode: null, defender_redcode: null })
    );
    const req = createRequest('http://localhost:3000/api/battles/1/replay');
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Replay not available for this battle');
  });

  it('returns 404 when only challenger redcode is missing', async () => {
    mockGetBattleById.mockResolvedValue(
      makeBattle({ challenger_redcode: null, defender_redcode: 'DAT #0, #0' })
    );
    const req = createRequest('http://localhost:3000/api/battles/1/replay');
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 200 with replay data and big hill settings', async () => {
    const roundResults = [
      { round: 1, winner: 'challenger' as const, seed: 12345 },
      { round: 2, winner: 'defender' as const, seed: 67890 },
      { round: 3, winner: 'tie' as const, seed: 11111 },
      { round: 4, winner: 'challenger' as const, seed: 22222 },
      { round: 5, winner: 'defender' as const, seed: 33333 },
    ];

    mockGetBattleById.mockResolvedValue(
      makeBattle({
        id: 42,
        hill: 'big',
        challenger_redcode: 'MOV 0, 1',
        defender_redcode: 'DAT #0, #0',
        round_results: roundResults,
      })
    );
    mockGetPlayerById
      .mockResolvedValueOnce(makePlayer({ id: 1, name: 'Alice' }))
      .mockResolvedValueOnce(makePlayer({ id: 2, name: 'Bob' }));

    const req = createRequest('http://localhost:3000/api/battles/42/replay');
    const res = await GET(req, { params: Promise.resolve({ id: '42' }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.battle_id).toBe(42);
    expect(data.hill).toBe('big');
    expect(data.challenger.name).toBe('Alice');
    expect(data.challenger.redcode).toBe('MOV 0, 1');
    expect(data.defender.name).toBe('Bob');
    expect(data.defender.redcode).toBe('DAT #0, #0');
    expect(data.round_results).toEqual(roundResults);
    expect(data.settings).toEqual({
      coreSize: 55440,
      maxCycles: 500000,
      maxLength: 200,
      maxTasks: 10000,
      minSeparation: 200,
    });
  });

  it('returns 94nop hill settings for 94nop battle', async () => {
    mockGetBattleById.mockResolvedValue(
      makeBattle({
        id: 99,
        hill: '94nop',
        challenger_redcode: 'MOV 0, 1',
        defender_redcode: 'DAT #0, #0',
        round_results: [{ round: 1, winner: 'tie' as const, seed: 1 }],
      })
    );
    mockGetPlayerById
      .mockResolvedValueOnce(makePlayer({ id: 1, name: 'Alice' }))
      .mockResolvedValueOnce(makePlayer({ id: 2, name: 'Bob' }));

    const req = createRequest('http://localhost:3000/api/battles/99/replay');
    const res = await GET(req, { params: Promise.resolve({ id: '99' }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.hill).toBe('94nop');
    expect(data.settings).toEqual({
      coreSize: 8000,
      maxCycles: 80000,
      maxLength: 100,
      maxTasks: 8000,
      minSeparation: 100,
    });
  });

  it('includes hill field in response', async () => {
    mockGetBattleById.mockResolvedValue(
      makeBattle({
        id: 1,
        hill: 'big',
        challenger_redcode: 'MOV 0, 1',
        defender_redcode: 'DAT #0, #0',
        round_results: [{ round: 1, winner: 'tie' as const, seed: 1 }],
      })
    );
    mockGetPlayerById.mockResolvedValue(makePlayer());

    const req = createRequest('http://localhost:3000/api/battles/1/replay');
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('hill');
    expect(data.hill).toBe('big');
  });

  it('uses fallback name when player not found', async () => {
    mockGetBattleById.mockResolvedValue(
      makeBattle({
        id: 1,
        challenger_id: 10,
        defender_id: 20,
        challenger_redcode: 'MOV 0, 1',
        defender_redcode: 'DAT #0, #0',
        round_results: [{ round: 1, winner: 'tie' as const, seed: 1 }],
      })
    );
    mockGetPlayerById.mockResolvedValue(null);

    const req = createRequest('http://localhost:3000/api/battles/1/replay');
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.challenger.name).toBe('Player #10');
    expect(data.defender.name).toBe('Player #20');
  });
});
