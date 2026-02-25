import { NextRequest } from 'next/server';
import { handleRouteError, parseIdParam } from '@/lib/api-utils';
import { getPlayerById, getBattlesByPlayerId, getBattleCountByPlayerId, getPlayersByIds } from '@/lib/db';
import { conservativeRating, getPlayerResult } from '@/lib/player-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = parseIdParam(id, 'player ID');
    if (!parsed.ok) return parsed.response;

    const player = await getPlayerById(parsed.value);
    if (!player) {
      return Response.json({ error: 'Player not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page') || '20', 10) || 20));
    const offset = (page - 1) * perPage;

    const [battles, total] = await Promise.all([
      getBattlesByPlayerId(parsed.value, perPage, offset),
      getBattleCountByPlayerId(parsed.value),
    ]);

    const opponentIds = [...new Set(
      battles.flatMap(b => [b.challenger_id, b.defender_id])
        .filter(pid => pid !== parsed.value)
    )];
    const opponents = await getPlayersByIds(opponentIds);
    const playerNames: Record<number, string> = { [parsed.value]: player.name };
    for (const p of opponents) {
      playerNames[p.id] = p.name;
    }

    const formattedBattles = battles.map(battle => {
      const isChallenger = battle.challenger_id === parsed.value;
      const result = getPlayerResult(battle.result, isChallenger);
      const opponentId = isChallenger ? battle.defender_id : battle.challenger_id;
      const eloBefore = isChallenger ? battle.challenger_elo_before : battle.defender_elo_before;
      const eloAfter = isChallenger ? battle.challenger_elo_after : battle.defender_elo_after;
      const rdBefore = isChallenger ? battle.challenger_rd_before : battle.defender_rd_before;
      const rdAfter = isChallenger ? battle.challenger_rd_after : battle.defender_rd_after;
      const ratingChange = conservativeRating(eloAfter, rdAfter) - conservativeRating(eloBefore, rdBefore);

      return {
        id: battle.id,
        opponent: {
          id: opponentId,
          name: playerNames[opponentId] || `Player #${opponentId}`,
        },
        result,
        score: `${battle.challenger_wins}-${battle.defender_wins}-${battle.ties}`,
        rating_change: ratingChange,
        created_at: battle.created_at,
      };
    });

    return Response.json({
      battles: formattedBattles,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    return handleRouteError('Player battles fetch error', error);
  }
}
