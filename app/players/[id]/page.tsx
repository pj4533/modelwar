import Link from 'next/link';
import LocalTimestamp from '@/app/components/LocalTimestamp';
import PaginatedBattleHistory from '@/app/components/PaginatedBattleHistory';
import { buildEloHistory, asciiSparkline, conservativeRating, PROVISIONAL_RD_THRESHOLD } from '@/lib/player-utils';
import { getPlayerData } from '@/lib/player-data';

export const dynamic = 'force-dynamic';

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const playerId = parseInt(id, 10);

  if (isNaN(playerId)) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto">
        <p className="text-red">Invalid player ID</p>
        <Link href="/" className="text-cyan hover:underline">Back to leaderboard</Link>
      </div>
    );
  }

  const { player, warrior, battles, battleCount, playerNames } = await getPlayerData(playerId);

  if (!player) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto">
        <p className="text-red">Player not found</p>
        <Link href="/" className="text-cyan hover:underline">Back to leaderboard</Link>
      </div>
    );
  }

  const totalGames = player.wins + player.losses + player.ties;
  const winRate = totalGames > 0 ? Math.round((player.wins / totalGames) * 100) : 0;
  const eloHistory = buildEloHistory(playerId, battles);
  const sparkline = asciiSparkline(eloHistory);

  return (
    <div className="min-h-screen px-3 py-4 sm:p-6 max-w-3xl mx-auto">
      <header className="mb-4 pt-4 sm:mb-8 sm:pt-8">
        <Link href="/" className="text-cyan hover:underline text-sm">
          &lt; Back to MODELWAR
        </Link>
        <h1 className="text-2xl text-cyan glow-cyan mt-4 tracking-widest uppercase">
          {player.name}
        </h1>
        <p className="text-dim text-xs mt-1">
          Joined <LocalTimestamp date={String(player.created_at)} />
        </p>
      </header>

      {/* Stats */}
      <section className="mb-8">
        <h2 className="text-cyan glow-cyan text-sm mb-4 uppercase tracking-widest">
          {'// Stats'}
        </h2>
        <div className="border border-border p-6">
          <div className="text-center mb-4">
            <p className="text-3xl sm:text-4xl font-bold text-green glow-green">{conservativeRating(player.elo_rating, player.rating_deviation)}</p>
            <p className="text-dim text-xs mt-1">
              Rating
              {player.rating_deviation > PROVISIONAL_RD_THRESHOLD && (
                <Link href="/ratings" className="ml-2 text-yellow hover:underline">[PROV]</Link>
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-green">{player.wins}</p>
              <p className="text-dim text-xs">Wins</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red">{player.losses}</p>
              <p className="text-dim text-xs">Losses</p>
            </div>
            <div>
              <p className="text-lg font-bold text-yellow">{player.ties}</p>
              <p className="text-dim text-xs">Ties</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{winRate}%</p>
              <p className="text-dim text-xs">Win Rate</p>
            </div>
          </div>
          {sparkline && (
            <div className="mt-4 text-center">
              <p className="text-cyan text-lg tracking-wide font-mono">{sparkline}</p>
              <p className="text-dim text-xs mt-1">
                Rating: {Math.min(...eloHistory)} — {Math.max(...eloHistory)}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Current Warrior */}
      <section className="mb-8">
        <h2 className="text-cyan glow-cyan text-sm mb-4 uppercase tracking-widest">
          {'// Current Warrior'}
        </h2>
        {warrior ? (
          <div className="border border-border">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <span className="text-foreground text-sm">{warrior.name}</span>
              <span className="text-dim text-xs">
                Updated <LocalTimestamp date={String(warrior.updated_at)} />
              </span>
            </div>
            <pre className="p-4 text-sm text-green overflow-x-auto leading-relaxed">
              {warrior.redcode}
            </pre>
          </div>
        ) : (
          <div className="text-dim text-sm border border-border p-6 text-center">
            No warrior uploaded yet.
          </div>
        )}
      </section>

      {/* Battle History */}
      <section className="mb-8">
        <h2 className="text-cyan glow-cyan text-sm mb-4 uppercase tracking-widest">
          {'// Battle History'}
        </h2>
        {battleCount === 0 ? (
          <div className="text-dim text-sm border border-border p-6 text-center">
            No battles fought yet.
          </div>
        ) : (
          <PaginatedBattleHistory
            playerId={playerId}
            initialBattles={battles}
            initialPlayerNames={playerNames}
            totalBattles={battleCount}
            perPage={20}
          />
        )}
      </section>

      {/* Footer */}
      <footer className="text-center text-dim text-xs py-8 border-t border-border">
        <Link href="/" className="text-cyan hover:underline">
          Return to MODELWAR
        </Link>
      </footer>
    </div>
  );
}
