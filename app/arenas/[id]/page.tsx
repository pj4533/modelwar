import Link from 'next/link';
import { getArenaById, getPlayersByIds } from '@/lib/db';
import { conservativeRating } from '@/lib/player-utils';
import { parseIdParam } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export default async function ArenaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = parseIdParam(id, 'arena ID');

  if (!parsed.ok) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto">
        <p className="text-red">Invalid arena ID</p>
        <Link href="/" className="text-cyan hover:underline">Back to leaderboard</Link>
      </div>
    );
  }

  const arena = await getArenaById(parsed.value);

  if (!arena) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto">
        <p className="text-red">Arena not found</p>
        <Link href="/" className="text-cyan hover:underline">Back to leaderboard</Link>
      </div>
    );
  }

  // Fetch player names
  const humanPlayerIds = arena.participants
    .filter((p) => p.player_id !== null)
    .map((p) => p.player_id!);
  const players = await getPlayersByIds(humanPlayerIds);
  const playerMap = new Map(players.map((p) => [p.id, p.name]));

  const sorted = [...arena.participants].sort(
    (a, b) => (a.placement ?? 99) - (b.placement ?? 99)
  );

  function placementColor(p: number): string {
    if (p === 1) return 'text-yellow glow-green';
    if (p === 2) return 'text-dim';
    if (p === 3) return 'text-orange';
    return '';
  }

  return (
    <div className="min-h-screen px-3 py-4 sm:p-6 max-w-3xl mx-auto">
      <header className="mb-4 pt-4 sm:mb-8 sm:pt-8">
        <Link href="/" className="text-cyan hover:underline text-sm">
          &lt; Back to MODELWAR
        </Link>
        <h1 className="text-2xl text-cyan glow-cyan mt-4 tracking-widest uppercase">
          ARENA #{arena.id}
        </h1>
        <p className="text-dim text-xs mt-1">
          {arena.total_rounds} rounds &mdash; {arena.participants.length} warriors
        </p>
      </header>

      {/* Placements */}
      <section className="mb-8">
        <h2 className="text-cyan glow-cyan text-sm mb-4 uppercase tracking-widest">
          {'// Results'}
        </h2>
        <div className="border border-border overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>Warrior</th>
                <th className="text-right">Score</th>
                <th className="text-right">Rating Change</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const name = p.is_stock_bot
                  ? p.stock_bot_name
                  : playerMap.get(p.player_id!) ?? `Player #${p.player_id}`;
                const ratingBefore = p.arena_rating_before !== null && p.arena_rd_before !== null
                  ? conservativeRating(p.arena_rating_before, p.arena_rd_before)
                  : null;
                const ratingAfter = p.arena_rating_after !== null && p.arena_rd_after !== null
                  ? conservativeRating(p.arena_rating_after, p.arena_rd_after)
                  : null;
                const ratingChange = ratingBefore !== null && ratingAfter !== null
                  ? ratingAfter - ratingBefore
                  : null;

                return (
                  <tr key={p.slot_index}>
                    <td className={placementColor(p.placement ?? 99)}>
                      {p.placement}
                    </td>
                    <td className={p.is_stock_bot ? 'text-dim' : ''}>
                      {p.player_id ? (
                        <Link href={`/players/${p.player_id}`} className="text-cyan hover:underline">
                          {name}
                        </Link>
                      ) : (
                        name
                      )}
                    </td>
                    <td className="text-right text-green">{p.total_score}</td>
                    <td className={`text-right ${ratingChange !== null && ratingChange >= 0 ? 'text-green' : 'text-red'}`}>
                      {ratingChange !== null
                        ? `${ratingChange >= 0 ? '+' : ''}${ratingChange}`
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Replay Link */}
      <section className="mb-8 text-center">
        <Link
          href={`/arenas/${arena.id}/replay`}
          className="text-cyan hover:underline text-sm tracking-widest"
        >
          [WATCH REPLAY]
        </Link>
      </section>

      <footer className="text-center text-dim text-xs py-8 border-t border-border">
        <Link href="/" className="text-cyan hover:underline">
          Return to MODELWAR
        </Link>
      </footer>
    </div>
  );
}
