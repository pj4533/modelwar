import {
  withTransaction,
  lockSessionEntries,
  createArena,
  createArenaParticipant,
  createArenaRound,
  updateQueueEntriesCompleted,
  updatePlayerArenaRating,
  getPlayersByIds,
} from './db';
import { runArenaBattle, ARENA_NUM_ROUNDS } from './arena-engine';
import { getStockBots } from './stock-bots';
import { calculateArenaRatings } from './arena-glicko';
import type { ArenaWarrior } from './arena-engine';
import type { ArenaParticipantRating } from './arena-glicko';

const MAX_ARENA_SIZE = 10;

/**
 * Trigger an arena battle for the given session.
 * Uses SELECT ... FOR UPDATE to prevent double-trigger races.
 * Fills remaining slots with stock bots via round-robin.
 */
export async function triggerArenaBattle(sessionId: string): Promise<number | null> {
  return withTransaction(async (client) => {
    // 1. Lock waiting entries for this session (prevents double-trigger)
    const waitingEntries = await lockSessionEntries(sessionId, client);

    // Already triggered (no waiting entries)
    if (waitingEntries.length === 0) {
      return null;
    }

    // 2. Build warrior list from queue entries
    const warriors: ArenaWarrior[] = [];
    const participantData: {
      playerId: number | null;
      slotIndex: number;
      isStockBot: boolean;
      stockBotName: string | null;
      redcode: string;
    }[] = [];

    let slotIndex = 0;

    // Add human warriors
    for (const entry of waitingEntries) {
      warriors.push({ redcode: entry.redcode, slotIndex });
      participantData.push({
        playerId: entry.player_id,
        slotIndex,
        isStockBot: false,
        stockBotName: null,
        redcode: entry.redcode,
      });
      slotIndex++;
    }

    // 3. Fill remaining slots with stock bots
    const botsNeeded = MAX_ARENA_SIZE - waitingEntries.length;
    if (botsNeeded > 0) {
      const bots = getStockBots(botsNeeded);
      for (const bot of bots) {
        warriors.push({ redcode: bot.redcode, slotIndex });
        participantData.push({
          playerId: null,
          slotIndex,
          isStockBot: true,
          stockBotName: bot.name,
          redcode: bot.redcode,
        });
        slotIndex++;
      }
    }

    // 4. Run the arena battle
    const arenaResult = runArenaBattle(warriors, ARENA_NUM_ROUNDS);

    // 5. Fetch current arena ratings for human players
    const humanPlayerIds = waitingEntries.map((e) => e.player_id);
    const players = await getPlayersByIds(humanPlayerIds);
    const playerMap = new Map(players.map((p) => [p.id, p]));

    // 6. Build placement lookup
    const placementMap = new Map(
      arenaResult.placements.map((p) => [p.slotIndex, p])
    );

    // 7. Calculate arena Glicko-2 rating updates (human-only pairwise)
    const ratingParticipants: ArenaParticipantRating[] = participantData
      .filter((p) => !p.isStockBot && p.playerId !== null)
      .map((p) => {
        const player = playerMap.get(p.playerId!);
        const placement = placementMap.get(p.slotIndex);
        return {
          playerId: p.playerId,
          placement: placement?.placement ?? MAX_ARENA_SIZE,
          currentRating: player?.arena_rating ?? 1200,
          currentRd: player?.arena_rd ?? 350,
          currentVolatility: player?.arena_volatility ?? 0.06,
        };
      });

    const ratingUpdates = calculateArenaRatings(ratingParticipants);

    // 8. Create arena record
    const arena = await createArena(
      sessionId,
      arenaResult.seed,
      ARENA_NUM_ROUNDS,
      client
    );

    // 9. Create arena participants
    for (const pd of participantData) {
      const placement = placementMap.get(pd.slotIndex);
      const player = pd.playerId ? playerMap.get(pd.playerId) : null;
      const ratingUpdate = pd.playerId ? ratingUpdates.get(pd.playerId) : undefined;

      await createArenaParticipant(
        arena.id,
        {
          playerId: pd.playerId,
          slotIndex: pd.slotIndex,
          isStockBot: pd.isStockBot,
          stockBotName: pd.stockBotName,
          redcode: pd.redcode,
          placement: placement?.placement ?? MAX_ARENA_SIZE,
          totalScore: placement?.totalScore ?? 0,
          arenaRatingBefore: player?.arena_rating ?? null,
          arenaRatingAfter: ratingUpdate?.rating ?? null,
          arenaRdBefore: player?.arena_rd ?? null,
          arenaRdAfter: ratingUpdate?.rd ?? null,
        },
        client
      );
    }

    // 10. Create arena rounds
    for (const rr of arenaResult.roundResults) {
      await createArenaRound(
        arena.id,
        rr.round,
        rr.seed,
        rr.survivorCount,
        rr.winnerSlot,
        rr.scores,
        client
      );
    }

    // 11. Update player arena ratings
    for (const pd of participantData) {
      if (pd.isStockBot || !pd.playerId) continue;

      const ratingUpdate = ratingUpdates.get(pd.playerId);
      const placement = placementMap.get(pd.slotIndex);

      if (ratingUpdate) {
        // Determine result type: 1st = win, last = loss, else tie
        const p = placement?.placement ?? MAX_ARENA_SIZE;
        let resultType: 'win' | 'loss' | 'tie';
        if (p === 1) {
          resultType = 'win';
        } else if (p === MAX_ARENA_SIZE || p === participantData.length) {
          resultType = 'loss';
        } else {
          resultType = 'tie';
        }

        await updatePlayerArenaRating(
          pd.playerId,
          ratingUpdate.rating,
          ratingUpdate.rd,
          ratingUpdate.volatility,
          resultType,
          client
        );
      } else {
        // No rating change (solo human) — still record the participation
        const p = placement?.placement ?? MAX_ARENA_SIZE;
        let resultType: 'win' | 'loss' | 'tie';
        if (p === 1) resultType = 'win';
        else if (p === MAX_ARENA_SIZE) resultType = 'loss';
        else resultType = 'tie';

        const player = playerMap.get(pd.playerId);
        await updatePlayerArenaRating(
          pd.playerId,
          player?.arena_rating ?? 1200,
          player?.arena_rd ?? 350,
          player?.arena_volatility ?? 0.06,
          resultType,
          client
        );
      }
    }

    // 12. Update queue entries as completed with results
    const resultsByPlayerId = new Map<number, Record<string, unknown>>();
    for (const pd of participantData) {
      if (pd.isStockBot || !pd.playerId) continue;
      const placement = placementMap.get(pd.slotIndex);
      const ratingUpdate = ratingUpdates.get(pd.playerId);
      const player = playerMap.get(pd.playerId);

      const ratingBefore = player?.arena_rating ?? 1200;
      const rdBefore = player?.arena_rd ?? 350;
      const ratingAfter = ratingUpdate?.rating ?? ratingBefore;
      const rdAfter = ratingUpdate?.rd ?? rdBefore;

      resultsByPlayerId.set(pd.playerId, {
        arena_id: arena.id,
        your_rank: placement?.placement ?? MAX_ARENA_SIZE,
        your_score: placement?.totalScore ?? 0,
        total_participants: participantData.length,
        rating_before: ratingBefore - 2 * rdBefore,
        rating_after: ratingAfter - 2 * rdAfter,
        rating_change: (ratingAfter - 2 * rdAfter) - (ratingBefore - 2 * rdBefore),
      });
    }

    await updateQueueEntriesCompleted(sessionId, arena.id, resultsByPlayerId, client);

    return arena.id;
  });
}
