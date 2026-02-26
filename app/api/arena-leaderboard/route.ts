import { getArenaLeaderboard } from '@/lib/db';
import { conservativeRating } from '@/lib/player-utils';
import { handleRouteError } from '@/lib/api-utils';

export async function GET() {
  try {
    const players = await getArenaLeaderboard(100);

    const leaderboard = players.map((p, index) => ({
      rank: index + 1,
      id: p.id,
      name: p.name,
      rating: conservativeRating(p.arena_rating, p.arena_rd),
      arena_wins: p.arena_wins,
      arena_losses: p.arena_losses,
      arena_ties: p.arena_ties,
    }));

    return Response.json({ leaderboard });
  } catch (error) {
    return handleRouteError('Arena leaderboard error', error);
  }
}
