import { getLeaderboard, getPlayerCount } from '@/lib/db';

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
      elo_rating: p.elo_rating,
      wins: p.wins,
      losses: p.losses,
      ties: p.ties,
    }));

    return Response.json({ leaderboard, total_players: totalPlayers });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
