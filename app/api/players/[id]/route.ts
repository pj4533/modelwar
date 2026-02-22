import { NextRequest } from 'next/server';
import { handleRouteError, parseIdParam } from '@/lib/api-utils';
import { getPlayerData } from '@/lib/player-data';
import { conservativeRating, buildEloHistory, getPlayerResult, PROVISIONAL_RD_THRESHOLD } from '@/lib/player-utils';

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

    const recentBattles = battles.map(battle => {
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
