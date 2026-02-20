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

const battle = makeBattle({
  id: 1,
  challenger_id: 1,
  defender_id: 2,
  result: 'challenger_win',
  rounds: 5,
  challenger_wins: 3,
  defender_wins: 1,
  ties: 1,
  challenger_elo_before: 1200,
  defender_elo_before: 1200,
  challenger_elo_after: 1216,
  defender_elo_after: 1184,
});
const challengerPlayer = makePlayer({ id: 1, name: 'Challenger' });
const defenderPlayer = makePlayer({ id: 2, name: 'Defender' });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/battles/[id]', () => {
  it('returns 400 for invalid battle ID', async () => {
    const req = createRequest('http://localhost:3000/api/battles/abc');
    const res = await GET(req, { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid battle ID');
  });

  it('returns 404 when battle not found', async () => {
    mockGetBattleById.mockResolvedValue(undefined as unknown as null);
    const req = createRequest('http://localhost:3000/api/battles/999');
    const res = await GET(req, { params: Promise.resolve({ id: '999' }) });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Battle not found');
  });

  it('returns full battle details with player names', async () => {
    mockGetBattleById.mockResolvedValue(battle);
    mockGetPlayerById
      .mockResolvedValueOnce(challengerPlayer)
      .mockResolvedValueOnce(defenderPlayer);
    const req = createRequest('http://localhost:3000/api/battles/1');
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(1);
    expect(data.result).toBe('challenger_win');
    expect(data.rounds).toBe(5);
    expect(data.score).toEqual({ challenger_wins: 3, defender_wins: 1, ties: 1 });
    expect(data.challenger.id).toBe(1);
    expect(data.challenger.name).toBe('Challenger');
    expect(data.challenger.elo_before).toBe(1200);
    expect(data.challenger.elo_after).toBe(1216);
    expect(data.defender.id).toBe(2);
    expect(data.defender.name).toBe('Defender');
    expect(data.defender.elo_before).toBe(1200);
    expect(data.defender.elo_after).toBe(1184);
  });

  it('returns undefined name when player lookup returns null', async () => {
    mockGetBattleById.mockResolvedValue(battle);
    mockGetPlayerById
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    const req = createRequest('http://localhost:3000/api/battles/1');
    const res = await GET(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.challenger.name).toBeUndefined();
    expect(data.defender.name).toBeUndefined();
  });
});
