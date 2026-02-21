import { NextRequest } from 'next/server';
import { getWarriorById, getPlayerById } from '@/lib/db';
import { handleRouteError } from '@/lib/api-utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const warriorId = parseInt(id, 10);
    if (isNaN(warriorId)) {
      return Response.json({ error: 'Invalid warrior ID' }, { status: 400 });
    }

    const warrior = await getWarriorById(warriorId);
    if (!warrior) {
      return Response.json({ error: 'Warrior not found' }, { status: 404 });
    }

    const player = await getPlayerById(warrior.player_id);

    return Response.json({
      id: warrior.id,
      name: warrior.name,
      player: player ? { id: player.id, name: player.name, elo_rating: player.elo_rating, rating_deviation: player.rating_deviation } : null,
      created_at: warrior.created_at,
      updated_at: warrior.updated_at,
    });
  } catch (error) {
    return handleRouteError('Warrior fetch error', error);
  }
}
