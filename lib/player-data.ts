import {
  getPlayerById,
  getWarriorByPlayerId,
  getBattlesByPlayerId,
  getPlayersByIds,
} from '@/lib/db';
import type { Battle } from '@/lib/db';

export interface PlayerData {
  player: {
    id: number;
    name: string;
    elo_rating: number;
    rating_deviation: number;
    wins: number;
    losses: number;
    ties: number;
    created_at: Date;
  } | null;
  warrior: {
    name: string;
    redcode: string;
    updated_at: Date;
  } | null;
  battles: Battle[];
  playerNames: Record<number, string>;
}

export async function getPlayerData(id: number): Promise<PlayerData> {
  const player = await getPlayerById(id);
  if (!player) return { player: null, warrior: null, battles: [], playerNames: {} };

  const [warrior, battles] = await Promise.all([
    getWarriorByPlayerId(id),
    getBattlesByPlayerId(id, 20),
  ]);

  const opponentIds = [...new Set(
    battles.flatMap(b => [b.challenger_id, b.defender_id])
      .filter(pid => pid !== id)
  )];
  const opponents = await getPlayersByIds(opponentIds);
  const playerNames: Record<number, string> = { [id]: player.name };
  for (const p of opponents) {
    playerNames[p.id] = p.name;
  }

  return { player, warrior, battles, playerNames };
}
