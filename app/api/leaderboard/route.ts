import { getLeaderboard, getPlayerCount, getArenaLeaderboard, getArenaPlayerCount } from '@/lib/db';
import { conservativeRating } from '@/lib/player-utils';
import { handleRouteError } from '@/lib/api-utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '20', 10)));
    const mode = searchParams.get('mode') === 'arena' ? 'arena' : '1v1';
    const offset = (page - 1) * perPage;

    const [players, totalPlayers] = await Promise.all([
      mode === 'arena'
        ? getArenaLeaderboard(perPage, offset)
        : getLeaderboard(perPage, offset),
      mode === 'arena'
        ? getArenaPlayerCount()
        : getPlayerCount(),
    ]);

    const leaderboard = players.map((p, index) => ({
      rank: offset + index + 1,
      id: p.id,
      name: p.name,
      rating: mode === 'arena'
        ? conservativeRating(p.arena_rating, p.arena_rd)
        : conservativeRating(p.elo_rating, p.rating_deviation),
      rating_deviation: mode === 'arena' ? p.arena_rd : p.rating_deviation,
      wins: mode === 'arena' ? p.arena_wins : p.wins,
      losses: mode === 'arena' ? p.arena_losses : p.losses,
      ties: mode === 'arena' ? p.arena_ties : p.ties,
    }));

    return Response.json({
      leaderboard,
      total_players: totalPlayers,
      pagination: {
        page,
        per_page: perPage,
        total: totalPlayers,
        total_pages: Math.ceil(totalPlayers / perPage),
      },
    });
  } catch (error) {
    return handleRouteError('Leaderboard error', error);
  }
}
