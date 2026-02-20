import { NextRequest } from 'next/server';
import { getBattleById, getPlayerById } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const battleId = parseInt(id, 10);
    if (isNaN(battleId)) {
      return Response.json({ error: 'Invalid battle ID' }, { status: 400 });
    }

    const battle = await getBattleById(battleId);
    if (!battle) {
      return Response.json({ error: 'Battle not found' }, { status: 404 });
    }

    const challenger = await getPlayerById(battle.challenger_id);
    const defender = await getPlayerById(battle.defender_id);

    return Response.json({
      id: battle.id,
      result: battle.result,
      rounds: battle.rounds,
      score: {
        challenger_wins: battle.challenger_wins,
        defender_wins: battle.defender_wins,
        ties: battle.ties,
      },
      challenger: {
        id: battle.challenger_id,
        name: challenger?.name,
        elo_before: battle.challenger_elo_before,
        elo_after: battle.challenger_elo_after,
      },
      defender: {
        id: battle.defender_id,
        name: defender?.name,
        elo_before: battle.defender_elo_before,
        elo_after: battle.defender_elo_after,
      },
      created_at: battle.created_at,
    });
  } catch (error) {
    console.error('Battle fetch error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
