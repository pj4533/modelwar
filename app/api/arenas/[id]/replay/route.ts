import { NextRequest } from 'next/server';
import { getArenaById, getArenaRounds, getPlayersByIds } from '@/lib/db';
import { handleRouteError, parseIdParam } from '@/lib/api-utils';
import { CORE_SIZE, MAX_CYCLES, MAX_TASKS, MIN_SEPARATION, MAX_WARRIOR_LENGTH, ARENA_NUM_ROUNDS } from '@/lib/arena-engine';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = parseIdParam(id, 'arena ID');
    if (!parsed.ok) return parsed.response;

    const arena = await getArenaById(parsed.value);
    if (!arena) {
      return Response.json({ error: 'Arena not found' }, { status: 404 });
    }

    const rounds = await getArenaRounds(arena.id);

    const playerIds = arena.participants
      .filter(p => p.player_id !== null)
      .map(p => p.player_id as number);
    const players = await getPlayersByIds(playerIds);
    const playerMap = new Map(players.map(p => [p.id, p]));

    const warriors = arena.participants
      .sort((a, b) => a.slot_index - b.slot_index)
      .map(p => ({
        slot_index: p.slot_index,
        name: p.is_stock_bot
          ? p.stock_bot_name
          : playerMap.get(p.player_id!)?.name ?? `Player #${p.player_id}`,
        redcode: p.redcode,
        is_stock_bot: p.is_stock_bot,
      }));

    const roundResults = rounds.map(r => ({
      round_number: r.round_number,
      seed: r.seed,
      survivor_count: r.survivor_count,
      winner_slot: r.winner_slot,
      scores: r.scores,
    }));

    return Response.json({
      arena_id: arena.id,
      seed: arena.seed,
      total_rounds: arena.total_rounds,
      warriors,
      rounds: roundResults,
      settings: {
        coreSize: CORE_SIZE,
        maxCycles: MAX_CYCLES,
        maxLength: MAX_WARRIOR_LENGTH,
        maxProcesses: MAX_TASKS,
        minSeparation: MIN_SEPARATION,
        warriors: warriors.length,
        rounds: ARENA_NUM_ROUNDS,
      },
    });
  } catch (error) {
    return handleRouteError('Arena replay fetch error', error);
  }
}
