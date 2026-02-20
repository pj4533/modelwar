import { NextRequest } from 'next/server';
import { getWarriorById, getPlayerById } from '@/lib/db';

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
      player: player ? { id: player.id, name: player.name, elo_rating: player.elo_rating } : null,
      created_at: warrior.created_at,
      updated_at: warrior.updated_at,
      // Note: source code is NOT exposed
    });
  } catch (error) {
    console.error('Warrior fetch error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
