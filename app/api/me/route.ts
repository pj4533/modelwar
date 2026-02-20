import { NextRequest } from 'next/server';
import { getWarriorByPlayerId, getPlayerHillStats } from '@/lib/db';
import { withAuth, handleRouteError } from '@/lib/api-utils';

export const GET = withAuth(async (_request: NextRequest, player) => {
  try {
    const [warrior, hillStats] = await Promise.all([
      getWarriorByPlayerId(player.id),
      getPlayerHillStats(player.id),
    ]);

    const hillStatsMap: Record<string, { elo_rating: number; wins: number; losses: number; ties: number }> = {};
    for (const hs of hillStats) {
      hillStatsMap[hs.hill] = {
        elo_rating: hs.elo_rating,
        wins: hs.wins,
        losses: hs.losses,
        ties: hs.ties,
      };
    }

    return Response.json({
      id: player.id,
      name: player.name,
      elo_rating: player.elo_rating,
      wins: player.wins,
      losses: player.losses,
      ties: player.ties,
      hill_stats: hillStatsMap,
      warrior: warrior
        ? {
            id: warrior.id,
            name: warrior.name,
            redcode: warrior.redcode,
            updated_at: warrior.updated_at,
          }
        : null,
    });
  } catch (error) {
    return handleRouteError('Profile error', error);
  }
});
