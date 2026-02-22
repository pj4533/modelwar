import { NextRequest } from 'next/server';
import { getBattleById, getPlayerById } from '@/lib/db';
import { handleRouteError, parseIdParam } from '@/lib/api-utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = parseIdParam(id, 'battle ID');
    if (!parsed.ok) return parsed.response;

    const battle = await getBattleById(parsed.value);
    if (!battle) {
      return Response.json({ error: 'Battle not found' }, { status: 404 });
    }

    const challenger = await getPlayerById(battle.challenger_id);
    const defender = await getPlayerById(battle.defender_id);

    return Response.json({
      id: battle.id,
      result: battle.result,
      rounds: battle.rounds,
      round_results: battle.round_results,
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
        rd_before: battle.challenger_rd_before,
        rd_after: battle.challenger_rd_after,
        redcode: battle.challenger_redcode,
      },
      defender: {
        id: battle.defender_id,
        name: defender?.name,
        elo_before: battle.defender_elo_before,
        elo_after: battle.defender_elo_after,
        rd_before: battle.defender_rd_before,
        rd_after: battle.defender_rd_after,
        redcode: battle.defender_redcode,
      },
      created_at: battle.created_at,
    });
  } catch (error) {
    return handleRouteError('Battle fetch error', error);
  }
}
