import { NextRequest } from 'next/server';
import { getWarriorByPlayerId, getArenaWarriorByPlayerId } from '@/lib/db';
import { conservativeRating } from '@/lib/player-utils';
import { withAuth, handleRouteError } from '@/lib/api-utils';

export const GET = withAuth(async (_request: NextRequest, player) => {
  try {
    const [warrior, arenaWarrior] = await Promise.all([
      getWarriorByPlayerId(player.id),
      getArenaWarriorByPlayerId(player.id),
    ]);

    return Response.json({
      id: player.id,
      name: player.name,
      rating: conservativeRating(player.elo_rating, player.rating_deviation),
      wins: player.wins,
      losses: player.losses,
      ties: player.ties,
      warrior: warrior
        ? {
            id: warrior.id,
            name: warrior.name,
            redcode: warrior.redcode,
            updated_at: warrior.updated_at,
          }
        : null,
      arena_warrior: arenaWarrior
        ? {
            name: arenaWarrior.name,
            redcode: arenaWarrior.redcode,
            auto_join: arenaWarrior.auto_join,
            updated_at: arenaWarrior.updated_at,
          }
        : null,
      arena_rating: conservativeRating(player.arena_rating, player.arena_rd),
      arena_wins: player.arena_wins,
      arena_losses: player.arena_losses,
      arena_ties: player.arena_ties,
    });
  } catch (error) {
    return handleRouteError('Profile error', error);
  }
});
