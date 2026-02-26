import { NextRequest } from 'next/server';
import { handleRouteError, parseIdParam } from '@/lib/api-utils';
import { getPlayerById, getUnifiedBattlesByPlayerId, getUnifiedBattleCountByPlayerId, getPlayersByIds } from '@/lib/db';
import { conservativeRating, getPlayerResult, ordinal } from '@/lib/player-utils';

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

    const [entries, total] = await Promise.all([
      getUnifiedBattlesByPlayerId(parsed.value, perPage, offset),
      getUnifiedBattleCountByPlayerId(parsed.value),
    ]);

    // Collect opponent IDs from 1v1 entries only
    const opponentIds = [...new Set(
      entries
        .filter(e => e.type === '1v1')
        .flatMap(e => [e.challenger_id!, e.defender_id!])
        .filter(pid => pid !== parsed.value)
    )];
    const opponents = await getPlayersByIds(opponentIds);
    const playerNames: Record<number, string> = { [parsed.value]: player.name };
    for (const p of opponents) {
      playerNames[p.id] = p.name;
    }

    const formattedBattles = entries.map(entry => {
      if (entry.type === '1v1') {
        const isChallenger = entry.challenger_id === parsed.value;
        const result = getPlayerResult(entry.result!, isChallenger);
        const opponentId = isChallenger ? entry.defender_id! : entry.challenger_id!;
        const eloBefore = isChallenger ? entry.challenger_elo_before! : entry.defender_elo_before!;
        const eloAfter = isChallenger ? entry.challenger_elo_after! : entry.defender_elo_after!;
        const rdBefore = isChallenger ? entry.challenger_rd_before : entry.defender_rd_before;
        const rdAfter = isChallenger ? entry.challenger_rd_after : entry.defender_rd_after;
        const ratingChange = conservativeRating(eloAfter, rdAfter) - conservativeRating(eloBefore, rdBefore);

        return {
          id: entry.id,
          type: '1v1' as const,
          href: `/battles/${entry.id}`,
          opponent: {
            id: opponentId,
            name: playerNames[opponentId] || `Player #${opponentId}`,
          },
          result,
          score: `${entry.challenger_wins}-${entry.defender_wins}-${entry.ties}`,
          rating_change: ratingChange,
          created_at: entry.created_at,
        };
      } else {
        // Arena entry
        const placement = entry.placement!;
        const participantCount = entry.participant_count!;
        let result: 'win' | 'loss' | 'tie';
        if (placement === 1) result = 'win';
        else if (placement === participantCount) result = 'loss';
        else result = 'tie';

        const ratingBefore = conservativeRating(
          entry.arena_rating_before ?? 1200,
          entry.arena_rd_before ?? 350
        );
        const ratingAfter = conservativeRating(
          entry.arena_rating_after ?? 1200,
          entry.arena_rd_after ?? 350
        );

        return {
          id: entry.id,
          type: 'arena' as const,
          href: `/arenas/${entry.id}`,
          placement,
          participant_count: participantCount,
          matchup: `${ordinal(placement)} / ${participantCount}`,
          result,
          score: String(entry.total_score),
          rating_change: ratingAfter - ratingBefore,
          created_at: entry.created_at,
        };
      }
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
