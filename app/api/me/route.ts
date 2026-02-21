import { NextRequest } from 'next/server';
import { getWarriorByPlayerId } from '@/lib/db';
import { conservativeRating } from '@/lib/player-utils';
import { withAuth, handleRouteError } from '@/lib/api-utils';

export const GET = withAuth(async (_request: NextRequest, player) => {
  try {
    const warrior = await getWarriorByPlayerId(player.id);

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
    });
  } catch (error) {
    return handleRouteError('Profile error', error);
  }
});
