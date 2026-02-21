import { getLeaderboard, getPlayerCount } from '@/lib/db';
import { handleRouteError } from '@/lib/api-utils';

export async function GET() {
  try {
    const [players, totalPlayers] = await Promise.all([
      getLeaderboard(100),
      getPlayerCount(),
    ]);

    const leaderboard = players.map((p, index) => ({
      rank: index + 1,
      id: p.id,
      name: p.name,
      rating: Math.round(p.elo_rating - 2 * p.rating_deviation),
      elo_rating: p.elo_rating,
      rating_deviation: p.rating_deviation,
      wins: p.wins,
      losses: p.losses,
      ties: p.ties,
    }));

    return Response.json({ leaderboard, total_players: totalPlayers });
  } catch (error) {
    return handleRouteError('Leaderboard error', error);
  }
}
