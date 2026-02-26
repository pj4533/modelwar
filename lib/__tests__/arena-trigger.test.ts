jest.mock('../db');
jest.mock('../arena-engine');
jest.mock('../stock-bots');
jest.mock('../arena-glicko');

import {
  lockSessionEntries,
  createArena,
  createArenaParticipant,
  createArenaRound,
  updateQueueEntriesCompleted,
  updatePlayerArenaRating,
  getPlayersByIds,
  withTransaction,
} from '../db';
import { runArenaBattle } from '../arena-engine';
import { getStockBots } from '../stock-bots';
import { calculateArenaRatings } from '../arena-glicko';
import { triggerArenaBattle } from '../arena-trigger';

const mockWithTransaction = withTransaction as jest.MockedFunction<typeof withTransaction>;
const mockLockSession = lockSessionEntries as jest.MockedFunction<typeof lockSessionEntries>;
const mockCreateArena = createArena as jest.MockedFunction<typeof createArena>;
const mockCreateParticipant = createArenaParticipant as jest.MockedFunction<typeof createArenaParticipant>;
const mockCreateRound = createArenaRound as jest.MockedFunction<typeof createArenaRound>;
const mockUpdateQueueCompleted = updateQueueEntriesCompleted as jest.MockedFunction<typeof updateQueueEntriesCompleted>;
const mockUpdateArenaRating = updatePlayerArenaRating as jest.MockedFunction<typeof updatePlayerArenaRating>;
const mockGetPlayers = getPlayersByIds as jest.MockedFunction<typeof getPlayersByIds>;
const mockRunBattle = runArenaBattle as jest.MockedFunction<typeof runArenaBattle>;
const mockGetStockBots = getStockBots as jest.MockedFunction<typeof getStockBots>;
const mockCalcRatings = calculateArenaRatings as jest.MockedFunction<typeof calculateArenaRatings>;

beforeEach(() => {
  jest.clearAllMocks();

  // withTransaction executes the callback with a mock client
  mockWithTransaction.mockImplementation(async (fn) => {
    const mockClient = {} as never;
    return fn(mockClient);
  });
});

function makeQueueEntry(playerId: number) {
  return {
    id: `uuid-${playerId}`,
    player_id: playerId,
    ticket_id: `ticket-${playerId}`,
    session_id: 'session-1',
    status: 'waiting',
    redcode: `MOV 0, ${playerId}`,
    arena_id: null,
    results: null,
    joined_at: new Date(),
    expires_at: new Date(Date.now() + 60000),
    created_at: new Date(),
  };
}

describe('triggerArenaBattle', () => {
  it('returns null when no waiting entries (already triggered)', async () => {
    mockLockSession.mockResolvedValue([]);

    const result = await triggerArenaBattle('session-1');
    expect(result).toBeNull();
  });

  it('triggers battle with human entries and stock bots', async () => {
    const entries = [makeQueueEntry(1), makeQueueEntry(2), makeQueueEntry(3)];
    mockLockSession.mockResolvedValue(entries);

    mockGetStockBots.mockReturnValue([
      { name: '[BOT] Imp', author: 'Test', redcode: 'MOV 0, 1' },
      { name: '[BOT] Dwarf', author: 'Test', redcode: 'ADD #4, 3' },
      { name: '[BOT] Paper', author: 'Test', redcode: 'MOV @0, <1' },
      { name: '[BOT] Stone', author: 'Test', redcode: 'ADD #173, 2' },
      { name: '[BOT] Scissors', author: 'Test', redcode: 'ADD #7, 2' },
      { name: '[BOT] Imp', author: 'Test', redcode: 'MOV 0, 1' },
      { name: '[BOT] Dwarf', author: 'Test', redcode: 'ADD #4, 3' },
    ]);

    mockGetPlayers.mockResolvedValue([
      { id: 1, name: 'P1', api_key: 'k', elo_rating: 1200, rating_deviation: 350, rating_volatility: 0.06, wins: 0, losses: 0, ties: 0, arena_rating: 1200, arena_rd: 350, arena_volatility: 0.06, arena_wins: 0, arena_losses: 0, arena_ties: 0, created_at: new Date(), updated_at: new Date() },
      { id: 2, name: 'P2', api_key: 'k', elo_rating: 1200, rating_deviation: 350, rating_volatility: 0.06, wins: 0, losses: 0, ties: 0, arena_rating: 1200, arena_rd: 350, arena_volatility: 0.06, arena_wins: 0, arena_losses: 0, arena_ties: 0, created_at: new Date(), updated_at: new Date() },
      { id: 3, name: 'P3', api_key: 'k', elo_rating: 1200, rating_deviation: 350, rating_volatility: 0.06, wins: 0, losses: 0, ties: 0, arena_rating: 1200, arena_rd: 350, arena_volatility: 0.06, arena_wins: 0, arena_losses: 0, arena_ties: 0, created_at: new Date(), updated_at: new Date() },
    ]);

    mockRunBattle.mockReturnValue({
      seed: 42,
      roundResults: [
        { round: 1, seed: 42, survivorCount: 1, winnerSlot: 0, scores: [90, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      ],
      placements: [
        { slotIndex: 0, totalScore: 90, placement: 1 },
        { slotIndex: 1, totalScore: 0, placement: 2 },
        { slotIndex: 2, totalScore: 0, placement: 2 },
        { slotIndex: 3, totalScore: 0, placement: 2 },
        { slotIndex: 4, totalScore: 0, placement: 2 },
        { slotIndex: 5, totalScore: 0, placement: 2 },
        { slotIndex: 6, totalScore: 0, placement: 2 },
        { slotIndex: 7, totalScore: 0, placement: 2 },
        { slotIndex: 8, totalScore: 0, placement: 2 },
        { slotIndex: 9, totalScore: 0, placement: 2 },
      ],
    });

    mockCalcRatings.mockReturnValue(new Map([
      [1, { rating: 1250, rd: 300, volatility: 0.06 }],
      [2, { rating: 1180, rd: 300, volatility: 0.06 }],
      [3, { rating: 1180, rd: 300, volatility: 0.06 }],
    ]));

    mockCreateArena.mockResolvedValue({
      id: 1, session_id: 'session-1', seed: 42, total_rounds: 200,
      status: 'completed', started_at: new Date(), completed_at: new Date(), created_at: new Date(),
    });
    mockCreateParticipant.mockResolvedValue({} as never);
    mockCreateRound.mockResolvedValue({} as never);
    mockUpdateQueueCompleted.mockResolvedValue(undefined);
    mockUpdateArenaRating.mockResolvedValue(undefined);

    const result = await triggerArenaBattle('session-1');

    expect(result).toBe(1);
    expect(mockGetStockBots).toHaveBeenCalledWith(7); // 10 - 3 humans
    expect(mockRunBattle).toHaveBeenCalled();
    expect(mockCreateArena).toHaveBeenCalled();
    expect(mockCreateParticipant).toHaveBeenCalledTimes(10); // 3 humans + 7 bots
    expect(mockUpdateArenaRating).toHaveBeenCalledTimes(3); // 3 humans
    expect(mockUpdateQueueCompleted).toHaveBeenCalled();
  });

  it('fills remaining slots with stock bots via round-robin', async () => {
    const entries = [makeQueueEntry(1)];
    mockLockSession.mockResolvedValue(entries);

    mockGetStockBots.mockReturnValue(
      Array(9).fill({ name: '[BOT] Imp', author: 'Test', redcode: 'MOV 0, 1' })
    );

    mockGetPlayers.mockResolvedValue([
      { id: 1, name: 'Solo', api_key: 'k', elo_rating: 1200, rating_deviation: 350, rating_volatility: 0.06, wins: 0, losses: 0, ties: 0, arena_rating: 1200, arena_rd: 350, arena_volatility: 0.06, arena_wins: 0, arena_losses: 0, arena_ties: 0, created_at: new Date(), updated_at: new Date() },
    ]);

    mockRunBattle.mockReturnValue({
      seed: 42,
      roundResults: [],
      placements: Array(10).fill(null).map((_, i) => ({
        slotIndex: i, totalScore: 0, placement: 1,
      })),
    });

    mockCalcRatings.mockReturnValue(new Map());
    mockCreateArena.mockResolvedValue({
      id: 2, session_id: 'session-1', seed: 42, total_rounds: 200,
      status: 'completed', started_at: new Date(), completed_at: new Date(), created_at: new Date(),
    });
    mockCreateParticipant.mockResolvedValue({} as never);
    mockCreateRound.mockResolvedValue({} as never);
    mockUpdateQueueCompleted.mockResolvedValue(undefined);
    mockUpdateArenaRating.mockResolvedValue(undefined);

    await triggerArenaBattle('session-1');

    expect(mockGetStockBots).toHaveBeenCalledWith(9);
  });
});
