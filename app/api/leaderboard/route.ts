import { NextRequest } from 'next/server';
import { getHillLeaderboard, getHillPlayerCount } from '@/lib/db';
import { handleRouteError } from '@/lib/api-utils';
import { isValidHill, DEFAULT_HILL, HILL_SLUGS } from '@/lib/hills';

export async function GET(request: NextRequest) {
  try {
    const hillSlug = request.nextUrl.searchParams.get('hill') ?? DEFAULT_HILL;

    if (!isValidHill(hillSlug)) {
      return Response.json(
        { error: `Invalid hill "${hillSlug}". Available hills: ${HILL_SLUGS.join(', ')}` },
        { status: 400 }
      );
    }

    const [players, totalPlayers] = await Promise.all([
      getHillLeaderboard(hillSlug, 100),
      getHillPlayerCount(hillSlug),
    ]);

    const leaderboard = players.map((p, index) => ({
      rank: index + 1,
      id: p.player_id,
      name: p.name,
      elo_rating: p.elo_rating,
      wins: p.wins,
      losses: p.losses,
      ties: p.ties,
    }));

    return Response.json({ leaderboard, total_players: totalPlayers, hill: hillSlug });
  } catch (error) {
    return handleRouteError('Leaderboard error', error);
  }
}
