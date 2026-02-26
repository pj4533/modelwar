import {
  withTransaction,
  getAutoJoinPlayers,
  getArenaWarriorByPlayerId,
  createArena,
  createArenaParticipantsBatch,
  createArenaRoundsBatch,
  updatePlayerArenaRating,
  updatePlayerLastArenaAt,
  getPlayersByIds,
} from './db';
import type { ArenaParticipantInput, AutoJoinPlayer } from './db';
import { runArenaBattle, ARENA_NUM_ROUNDS } from './arena-engine';
import { getStockBots } from './stock-bots';
import { calculateArenaRatings } from './arena-glicko';
import type { ArenaWarrior } from './arena-engine';
import type { ArenaParticipantRating } from './arena-glicko';
import { randomUUID } from 'crypto';

const MAX_ARENA_SIZE = 10;

export interface ArenaStartResult {
  arena_id: number;
  placements: {
    slot_index: number;
    player_id: number | null;
    name: string;
    is_stock_bot: boolean;
    placement: number;
    total_score: number;
    rating_before: number | null;
    rating_after: number | null;
    rating_change: number | null;
  }[];
}

/**
 * Start an arena battle instantly.
 * The starter's persisted arena warrior is at slot 0.
 * Auto-join players fill next slots by round-robin fairness (oldest last_arena_at first).
 * Stock bots fill remaining slots.
 */
export async function startArena(
  starterPlayerId: number,
  starterRedcode: string
): Promise<ArenaStartResult> {
  // 1. Fetch auto-join players (excluding the starter)
  const autoJoinPlayers = await getAutoJoinPlayers([starterPlayerId], MAX_ARENA_SIZE - 1);

  // 2. Build warrior list
  const warriors: ArenaWarrior[] = [];
  const participantData: {
    playerId: number | null;
    slotIndex: number;
    isStockBot: boolean;
    stockBotName: string | null;
    redcode: string;
    playerName: string | null;
  }[] = [];

  let slotIndex = 0;

  // Starter at slot 0
  warriors.push({ redcode: starterRedcode, slotIndex });
  participantData.push({
    playerId: starterPlayerId,
    slotIndex,
    isStockBot: false,
    stockBotName: null,
    redcode: starterRedcode,
    playerName: null, // filled later
  });
  slotIndex++;

  // Auto-join players
  for (const ajp of autoJoinPlayers) {
    warriors.push({ redcode: ajp.redcode, slotIndex });
    participantData.push({
      playerId: ajp.player_id,
      slotIndex,
      isStockBot: false,
      stockBotName: null,
      redcode: ajp.redcode,
      playerName: ajp.name,
    });
    slotIndex++;
  }

  // Stock bots fill remaining slots
  const botsNeeded = MAX_ARENA_SIZE - slotIndex;
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
        playerName: null,
      });
      slotIndex++;
    }
  }

  // 3. Run the arena battle
  const arenaResult = runArenaBattle(warriors, ARENA_NUM_ROUNDS);

  // 4. Transaction: persist everything
  return withTransaction(async (client) => {
    // Fetch current arena ratings for human players
    const humanPlayerIds = participantData
      .filter((p) => !p.isStockBot && p.playerId !== null)
      .map((p) => p.playerId!);
    const players = await getPlayersByIds(humanPlayerIds);
    const playerMap = new Map(players.map((p) => [p.id, p]));

    // Build placement lookup
    const placementMap = new Map(
      arenaResult.placements.map((p) => [p.slotIndex, p])
    );

    // Calculate arena Glicko-2 rating updates
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

    // Create arena record
    const sessionId = randomUUID();
    const arena = await createArena(
      sessionId,
      arenaResult.seed,
      ARENA_NUM_ROUNDS,
      client
    );

    // Create arena participants (batched)
    const participantInputs: ArenaParticipantInput[] = participantData.map((pd) => {
      const placement = placementMap.get(pd.slotIndex);
      const player = pd.playerId ? playerMap.get(pd.playerId) : null;
      const ratingUpdate = pd.playerId ? ratingUpdates.get(pd.playerId) : undefined;

      return {
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
      };
    });
    await createArenaParticipantsBatch(arena.id, participantInputs, client);

    // Create arena rounds (batched)
    await createArenaRoundsBatch(
      arena.id,
      arenaResult.roundResults.map((rr) => ({
        roundNumber: rr.round,
        seed: rr.seed,
        survivorCount: rr.survivorCount,
        winnerSlot: rr.winnerSlot,
        scores: rr.scores,
      })),
      client
    );

    // Update player arena ratings
    for (const pd of participantData) {
      if (pd.isStockBot || !pd.playerId) continue;

      const ratingUpdate = ratingUpdates.get(pd.playerId);
      const placement = placementMap.get(pd.slotIndex);

      const p = placement?.placement ?? MAX_ARENA_SIZE;
      const firstPlaceCount = arenaResult.placements.filter(
        (pl) => pl.placement === 1
      ).length;
      let resultType: 'win' | 'loss' | 'tie';
      if (p === 1 && firstPlaceCount === 1) {
        resultType = 'win';
      } else if (p === 1 && firstPlaceCount > 1) {
        resultType = 'tie';
      } else if (p === MAX_ARENA_SIZE || p === participantData.length) {
        resultType = 'loss';
      } else {
        resultType = 'tie';
      }

      if (ratingUpdate) {
        await updatePlayerArenaRating(
          pd.playerId,
          ratingUpdate.rating,
          ratingUpdate.rd,
          ratingUpdate.volatility,
          resultType,
          client
        );
      } else {
        // No rating change (solo human) — still record participation
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

    // Update last_arena_at for all human participants
    await updatePlayerLastArenaAt(humanPlayerIds, client);

    // Build result
    const resultPlacements = participantData.map((pd) => {
      const placement = placementMap.get(pd.slotIndex);
      const player = pd.playerId ? playerMap.get(pd.playerId) : null;
      const ratingUpdate = pd.playerId ? ratingUpdates.get(pd.playerId) : undefined;

      const ratingBefore = player?.arena_rating ?? null;
      const rdBefore = player?.arena_rd ?? null;
      const ratingAfter = ratingUpdate?.rating ?? ratingBefore;
      const rdAfter = ratingUpdate?.rd ?? rdBefore;

      const consBefore = ratingBefore !== null && rdBefore !== null
        ? Math.round(ratingBefore - 2 * rdBefore)
        : null;
      const consAfter = ratingAfter !== null && rdAfter !== null
        ? Math.round(ratingAfter - 2 * rdAfter)
        : null;

      return {
        slot_index: pd.slotIndex,
        player_id: pd.playerId,
        name: pd.isStockBot ? pd.stockBotName! : (player?.name ?? pd.playerName ?? `Player #${pd.playerId}`),
        is_stock_bot: pd.isStockBot,
        placement: placement?.placement ?? MAX_ARENA_SIZE,
        total_score: placement?.totalScore ?? 0,
        rating_before: consBefore,
        rating_after: consAfter,
        rating_change: consBefore !== null && consAfter !== null ? consAfter - consBefore : null,
      };
    });

    // Sort by placement
    resultPlacements.sort((a, b) => a.placement - b.placement);

    return {
      arena_id: arena.id,
      placements: resultPlacements,
    };
  });
}
