import { NextRequest } from 'next/server';
import { handleRouteError, parseIdParam } from '@/lib/api-utils';
import { getPlayerData } from '@/lib/player-data';
import { conservativeRating, buildEloHistory, getPlayerResult, ordinal, PROVISIONAL_RD_THRESHOLD } from '@/lib/player-utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = parseIdParam(id, 'player ID');
    if (!parsed.ok) return parsed.response;

    const { player, warrior, battles, playerNames } = await getPlayerData(parsed.value);
    if (!player) {
      return Response.json({ error: 'Player not found' }, { status: 404 });
    }

    const totalGames = player.wins + player.losses + player.ties;
    const winRate = totalGames > 0 ? Math.round((player.wins / totalGames) * 100) : 0;
    const ratingHistory = buildEloHistory(parsed.value, battles);

    const recentBattles = battles.map(entry => {
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
      id: player.id,
      name: player.name,
      rating: conservativeRating(player.elo_rating, player.rating_deviation),
      provisional: player.rating_deviation > PROVISIONAL_RD_THRESHOLD,
      wins: player.wins,
      losses: player.losses,
      ties: player.ties,
      win_rate: winRate,
      rating_history: ratingHistory,
      warrior: warrior ? {
        name: warrior.name,
        redcode: warrior.redcode,
        updated_at: warrior.updated_at,
      } : null,
      recent_battles: recentBattles,
      created_at: player.created_at,
    });
  } catch (error) {
    return handleRouteError('Player fetch error', error);
  }
}
