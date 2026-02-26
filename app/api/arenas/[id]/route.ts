import { NextRequest } from 'next/server';
import { getArenaById, getPlayersByIds } from '@/lib/db';
import { handleRouteError, parseIdParam } from '@/lib/api-utils';
import { conservativeRating } from '@/lib/player-utils';

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

    const playerIds = arena.participants
      .filter(p => p.player_id !== null)
      .map(p => p.player_id as number);
    const players = await getPlayersByIds(playerIds);
    const playerMap = new Map(players.map(p => [p.id, p]));

    const participants = arena.participants.map(p => ({
      slot_index: p.slot_index,
      player_id: p.player_id,
      name: p.is_stock_bot
        ? p.stock_bot_name
        : playerMap.get(p.player_id!)?.name ?? `Player #${p.player_id}`,
      is_stock_bot: p.is_stock_bot,
      placement: p.placement,
      total_score: p.total_score,
      rating_before: p.arena_rating_before !== null && p.arena_rd_before !== null
        ? conservativeRating(p.arena_rating_before, p.arena_rd_before)
        : null,
      rating_after: p.arena_rating_after !== null && p.arena_rd_after !== null
        ? conservativeRating(p.arena_rating_after, p.arena_rd_after)
        : null,
      rating_change: p.arena_rating_before !== null && p.arena_rating_after !== null
        && p.arena_rd_before !== null && p.arena_rd_after !== null
        ? conservativeRating(p.arena_rating_after, p.arena_rd_after) -
          conservativeRating(p.arena_rating_before, p.arena_rd_before)
        : null,
    }));

    return Response.json({
      id: arena.id,
      session_id: arena.session_id,
      seed: arena.seed,
      total_rounds: arena.total_rounds,
      status: arena.status,
      participants,
      started_at: arena.started_at,
      completed_at: arena.completed_at,
      created_at: arena.created_at,
    });
  } catch (error) {
    return handleRouteError('Arena fetch error', error);
  }
}
