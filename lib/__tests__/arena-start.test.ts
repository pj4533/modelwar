jest.mock('../db');
jest.mock('../arena-engine');
jest.mock('../stock-bots');
jest.mock('../arena-glicko');
jest.mock('crypto', () => ({
  randomUUID: () => 'test-session-uuid',
}));

import { startArena } from '../arena-start';
import * as db from '../db';
import { runArenaBattle } from '../arena-engine';
import { ARENA_NUM_ROUNDS } from '../arena-engine';
import { getStockBots } from '../stock-bots';
import { calculateArenaRatings } from '../arena-glicko';
import { makePlayer } from './fixtures';

const mockGetAutoJoinPlayers = db.getAutoJoinPlayers as jest.MockedFunction<typeof db.getAutoJoinPlayers>;
const mockGetPlayersByIds = db.getPlayersByIds as jest.MockedFunction<typeof db.getPlayersByIds>;
const mockRunArenaBattle = runArenaBattle as jest.MockedFunction<typeof runArenaBattle>;
const mockGetStockBots = getStockBots as jest.MockedFunction<typeof getStockBots>;
const mockCalculateArenaRatings = calculateArenaRatings as jest.MockedFunction<typeof calculateArenaRatings>;
const mockWithTransaction = db.withTransaction as jest.MockedFunction<typeof db.withTransaction>;
const mockCreateArena = db.createArena as jest.MockedFunction<typeof db.createArena>;
const mockCreateArenaParticipantsBatch = db.createArenaParticipantsBatch as jest.MockedFunction<typeof db.createArenaParticipantsBatch>;
const mockCreateArenaRoundsBatch = db.createArenaRoundsBatch as jest.MockedFunction<typeof db.createArenaRoundsBatch>;
const mockUpdatePlayerArenaRating = db.updatePlayerArenaRating as jest.MockedFunction<typeof db.updatePlayerArenaRating>;
const mockUpdatePlayerLastArenaAt = db.updatePlayerLastArenaAt as jest.MockedFunction<typeof db.updatePlayerLastArenaAt>;

function makePlacement(slotIndex: number, totalScore: number, placement: number) {
  return { slotIndex, totalScore, placement };
}

function makeArenaResult(numWarriors: number) {
  const placements = Array.from({ length: numWarriors }, (_, i) =>
    makePlacement(i, (numWarriors - i) * 100, i + 1)
  );
  return {
    roundResults: [{ round: 1, seed: 42, survivorCount: 1, winnerSlot: 0, scores: new Array(numWarriors).fill(0) }],
    placements,
    seed: 42,
  };
}

beforeEach(() => {
  jest.clearAllMocks();

  // Make withTransaction execute the callback immediately with a mock client
  mockWithTransaction.mockImplementation(async (fn) => {
    const mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    } as unknown as import('pg').PoolClient;
    return fn(mockClient);
  });

  mockCreateArena.mockResolvedValue({
    id: 1, session_id: 'test-session-uuid', seed: 42, total_rounds: 200,
    status: 'completed', started_at: new Date(), completed_at: new Date(), created_at: new Date(),
  });
  mockCreateArenaParticipantsBatch.mockResolvedValue(undefined);
  mockCreateArenaRoundsBatch.mockResolvedValue(undefined);
  mockUpdatePlayerArenaRating.mockResolvedValue(undefined);
  mockUpdatePlayerLastArenaAt.mockResolvedValue(undefined);
});

describe('startArena', () => {
  it('starts arena with starter + stock bots when no auto-join players', async () => {
    const starter = makePlayer({ id: 1, name: 'Starter' });
    mockGetAutoJoinPlayers.mockResolvedValue([]);
    mockGetStockBots.mockReturnValue(
      Array.from({ length: 9 }, (_, i) => ({
        name: `[BOT] Bot${i}`,
        author: 'Test',
        redcode: 'MOV 0, 1',
      }))
    );
    mockRunArenaBattle.mockReturnValue(makeArenaResult(10));
    mockGetPlayersByIds.mockResolvedValue([starter]);
    mockCalculateArenaRatings.mockReturnValue(new Map());

    const result = await startArena(1, 'MOV 0, 1');

    expect(result.arena_id).toBe(1);
    expect(result.placements).toHaveLength(10);
    expect(result.placements[0].slot_index).toBe(0);
    expect(result.placements[0].player_id).toBe(1);
    expect(mockGetStockBots).toHaveBeenCalledWith(9);
    expect(mockRunArenaBattle).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ slotIndex: 0 })]),
      ARENA_NUM_ROUNDS
    );
    expect(mockUpdatePlayerLastArenaAt).toHaveBeenCalledWith([1], expect.anything());
  });

  it('includes auto-join players by round-robin fairness', async () => {
    const starter = makePlayer({ id: 1, name: 'Starter' });
    const autoJoin1 = makePlayer({ id: 2, name: 'AutoJoin1', last_arena_at: null });
    const autoJoin2 = makePlayer({ id: 3, name: 'AutoJoin2', last_arena_at: new Date('2025-01-01') });

    mockGetAutoJoinPlayers.mockResolvedValue([
      { player_id: 2, name: 'AW1', redcode: 'ADD 1, 2', arena_rating: 1200, arena_rd: 350, arena_volatility: 0.06 },
      { player_id: 3, name: 'AW2', redcode: 'SUB 1, 2', arena_rating: 1300, arena_rd: 300, arena_volatility: 0.06 },
    ]);
    mockGetStockBots.mockReturnValue(
      Array.from({ length: 7 }, (_, i) => ({
        name: `[BOT] Bot${i}`,
        author: 'Test',
        redcode: 'MOV 0, 1',
      }))
    );
    mockRunArenaBattle.mockReturnValue(makeArenaResult(10));
    mockGetPlayersByIds.mockResolvedValue([starter, autoJoin1, autoJoin2]);
    mockCalculateArenaRatings.mockReturnValue(new Map([
      [1, { rating: 1220, rd: 340, volatility: 0.06 }],
      [2, { rating: 1210, rd: 345, volatility: 0.06 }],
      [3, { rating: 1310, rd: 295, volatility: 0.06 }],
    ]));

    const result = await startArena(1, 'MOV 0, 1');

    expect(result.placements).toHaveLength(10);
    expect(mockGetAutoJoinPlayers).toHaveBeenCalledWith([1], 9);
    expect(mockGetStockBots).toHaveBeenCalledWith(7);
    // All 3 humans should get last_arena_at updated
    expect(mockUpdatePlayerLastArenaAt).toHaveBeenCalledWith([1, 2, 3], expect.anything());
  });

  it('fills with all auto-join players when enough are available', async () => {
    const players = Array.from({ length: 10 }, (_, i) =>
      makePlayer({ id: i + 1, name: `Player${i + 1}` })
    );
    const autoJoinData = Array.from({ length: 9 }, (_, i) => ({
      player_id: i + 2,
      name: `AW${i + 2}`,
      redcode: 'MOV 0, 1',
      arena_rating: 1200,
      arena_rd: 350,
      arena_volatility: 0.06,
    }));

    mockGetAutoJoinPlayers.mockResolvedValue(autoJoinData);
    mockGetStockBots.mockReturnValue([]);
    mockRunArenaBattle.mockReturnValue(makeArenaResult(10));
    mockGetPlayersByIds.mockResolvedValue(players);
    mockCalculateArenaRatings.mockReturnValue(new Map());

    const result = await startArena(1, 'MOV 0, 1');

    expect(result.placements).toHaveLength(10);
    expect(mockGetStockBots).not.toHaveBeenCalled();
  });

  it('updates arena ratings for human participants', async () => {
    const starter = makePlayer({ id: 1, name: 'Starter' });
    mockGetAutoJoinPlayers.mockResolvedValue([]);
    mockGetStockBots.mockReturnValue(
      Array.from({ length: 9 }, (_, i) => ({
        name: `[BOT] Bot${i}`,
        author: 'Test',
        redcode: 'MOV 0, 1',
      }))
    );
    // Starter wins (placement 1)
    const arenaResult = makeArenaResult(10);
    arenaResult.placements[0] = makePlacement(0, 1000, 1);
    mockRunArenaBattle.mockReturnValue(arenaResult);
    mockGetPlayersByIds.mockResolvedValue([starter]);
    mockCalculateArenaRatings.mockReturnValue(new Map());

    await startArena(1, 'MOV 0, 1');

    // Solo human gets default rating update with 'win' (placement 1)
    expect(mockUpdatePlayerArenaRating).toHaveBeenCalledWith(
      1, 1200, 350, 0.06, 'win', expect.anything()
    );
  });

  it('determines result type correctly (win, loss, tie)', async () => {
    const players = [
      makePlayer({ id: 1, name: 'P1' }),
      makePlayer({ id: 2, name: 'P2' }),
      makePlayer({ id: 3, name: 'P3' }),
    ];
    mockGetAutoJoinPlayers.mockResolvedValue([
      { player_id: 2, name: 'AW2', redcode: 'MOV 0, 1', arena_rating: 1200, arena_rd: 350, arena_volatility: 0.06 },
      { player_id: 3, name: 'AW3', redcode: 'MOV 0, 1', arena_rating: 1200, arena_rd: 350, arena_volatility: 0.06 },
    ]);
    mockGetStockBots.mockReturnValue(
      Array.from({ length: 7 }, (_, i) => ({
        name: `[BOT] Bot${i}`,
        author: 'Test',
        redcode: 'MOV 0, 1',
      }))
    );
    const arenaResult = makeArenaResult(10);
    arenaResult.placements[0] = makePlacement(0, 1000, 1);  // P1 wins
    arenaResult.placements[1] = makePlacement(1, 500, 5);    // P2 middle
    arenaResult.placements[2] = makePlacement(2, 100, 10);   // P3 last
    mockRunArenaBattle.mockReturnValue(arenaResult);
    mockGetPlayersByIds.mockResolvedValue(players);
    mockCalculateArenaRatings.mockReturnValue(new Map([
      [1, { rating: 1250, rd: 330, volatility: 0.06 }],
      [2, { rating: 1200, rd: 340, volatility: 0.06 }],
      [3, { rating: 1150, rd: 340, volatility: 0.06 }],
    ]));

    await startArena(1, 'MOV 0, 1');

    expect(mockUpdatePlayerArenaRating).toHaveBeenCalledWith(1, 1250, 330, 0.06, 'win', expect.anything());
    expect(mockUpdatePlayerArenaRating).toHaveBeenCalledWith(2, 1200, 340, 0.06, 'tie', expect.anything());
    expect(mockUpdatePlayerArenaRating).toHaveBeenCalledWith(3, 1150, 340, 0.06, 'loss', expect.anything());
  });
});
