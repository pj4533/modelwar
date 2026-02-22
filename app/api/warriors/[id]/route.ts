import { NextRequest } from 'next/server';
import { getWarriorById, getPlayerById } from '@/lib/db';
import { conservativeRating } from '@/lib/player-utils';
import { handleRouteError, parseIdParam } from '@/lib/api-utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = parseIdParam(id, 'warrior ID');
    if (!parsed.ok) return parsed.response;

    const warrior = await getWarriorById(parsed.value);
    if (!warrior) {
      return Response.json({ error: 'Warrior not found' }, { status: 404 });
    }

    const player = await getPlayerById(warrior.player_id);

    return Response.json({
      id: warrior.id,
      name: warrior.name,
      redcode: warrior.redcode,
      player: player ? { id: player.id, name: player.name, rating: conservativeRating(player.elo_rating, player.rating_deviation) } : null,
      created_at: warrior.created_at,
      updated_at: warrior.updated_at,
    });
  } catch (error) {
    return handleRouteError('Warrior fetch error', error);
  }
}
