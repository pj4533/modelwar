import { NextRequest } from 'next/server';
import { getBattleById, getPlayerById } from '@/lib/db';
import { handleRouteError } from '@/lib/api-utils';
import { getHill, HILLS } from '@/lib/hills';

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

    if (!battle.challenger_redcode || !battle.defender_redcode) {
      return Response.json(
        { error: 'Replay not available for this battle' },
        { status: 404 }
      );
    }

    const hillConfig = getHill(battle.hill || 'big') ?? HILLS.big;

    const challenger = await getPlayerById(battle.challenger_id);
    const defender = await getPlayerById(battle.defender_id);

    return Response.json({
      battle_id: battle.id,
      hill: hillConfig.slug,
      challenger: {
        name: challenger?.name ?? `Player #${battle.challenger_id}`,
        redcode: battle.challenger_redcode,
      },
      defender: {
        name: defender?.name ?? `Player #${battle.defender_id}`,
        redcode: battle.defender_redcode,
      },
      round_results: battle.round_results,
      settings: {
        coreSize: hillConfig.coreSize,
        maxCycles: hillConfig.maxCycles,
        maxLength: hillConfig.maxLength,
        maxTasks: hillConfig.maxTasks,
        minSeparation: hillConfig.minSeparation,
      },
    });
  } catch (error) {
    return handleRouteError('Replay fetch error', error);
  }
}
