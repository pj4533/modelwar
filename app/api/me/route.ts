import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import { getWarriorByPlayerId } from '@/lib/db';

export async function GET(request: NextRequest) {
  const player = await authenticateRequest(request);
  if (!player) return unauthorizedResponse();

  try {
    const warrior = await getWarriorByPlayerId(player.id);

    return Response.json({
      id: player.id,
      name: player.name,
      elo_rating: player.elo_rating,
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
    console.error('Profile error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
