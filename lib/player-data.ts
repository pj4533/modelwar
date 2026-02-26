import {
  getPlayerById,
  getWarriorByPlayerId,
  getUnifiedBattlesByPlayerId,
  getUnifiedBattleCountByPlayerId,
  getPlayersByIds,
} from '@/lib/db';
import type { UnifiedBattleEntry } from '@/lib/db';

export interface PlayerData {
  player: {
    id: number;
    name: string;
    elo_rating: number;
    rating_deviation: number;
    wins: number;
    losses: number;
    ties: number;
    arena_rating: number;
    arena_rd: number;
    arena_volatility: number;
    arena_wins: number;
    arena_losses: number;
    arena_ties: number;
    created_at: Date;
  } | null;
  warrior: {
    name: string;
    redcode: string;
    updated_at: Date;
  } | null;
  battles: UnifiedBattleEntry[];
  battleCount: number;
  playerNames: Record<number, string>;
}

export async function getPlayerData(id: number): Promise<PlayerData> {
  const player = await getPlayerById(id);
  if (!player) return { player: null, warrior: null, battles: [], battleCount: 0, playerNames: {} };

  const [warrior, battles, battleCount] = await Promise.all([
    getWarriorByPlayerId(id),
    getUnifiedBattlesByPlayerId(id, 20),
    getUnifiedBattleCountByPlayerId(id),
  ]);

  // Only collect opponent IDs from 1v1 entries
  const opponentIds = [...new Set(
    battles
      .filter(b => b.type === '1v1')
      .flatMap(b => [b.challenger_id!, b.defender_id!])
      .filter(pid => pid !== id)
  )];
  const opponents = await getPlayersByIds(opponentIds);
  const playerNames: Record<number, string> = { [id]: player.name };
  for (const p of opponents) {
    playerNames[p.id] = p.name;
  }

  return { player, warrior, battles, battleCount, playerNames };
}
