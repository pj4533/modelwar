import { NextRequest } from 'next/server';
import { getBattleById, getPlayerById } from '@/lib/db';
import { handleRouteError, parseIdParam } from '@/lib/api-utils';
import { CORE_SIZE, MAX_CYCLES, MAX_LENGTH, MAX_TASKS, MIN_SEPARATION } from '@/lib/engine';

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

    if (!battle.challenger_redcode || !battle.defender_redcode) {
      return Response.json(
        { error: 'Replay not available for this battle' },
        { status: 404 }
      );
    }

    const challenger = await getPlayerById(battle.challenger_id);
    const defender = await getPlayerById(battle.defender_id);

    return Response.json({
      battle_id: battle.id,
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
        coreSize: CORE_SIZE,
        maxCycles: MAX_CYCLES,
        maxLength: MAX_LENGTH,
        maxTasks: MAX_TASKS,
        minSeparation: MIN_SEPARATION,
      },
    });
  } catch (error) {
    return handleRouteError('Replay fetch error', error);
  }
}
