import Link from 'next/link';
import {
  getPlayerById,
  getWarriorByPlayerId,
  getBattlesByPlayerId,
  getPlayersByIds,
} from '@/lib/db';
import type { Battle } from '@/lib/db';
import { ClickableRow, ClickableLink } from '@/app/components/ClickableRow';
import { buildEloHistory, asciiSparkline, getPlayerResult } from '@/lib/player-utils';

interface PlayerData {
  player: {
    id: number;
    name: string;
    elo_rating: number;
    wins: number;
    losses: number;
    ties: number;
    created_at: Date;
  } | null;
  warrior: {
    name: string;
    redcode: string;
    updated_at: Date;
  } | null;
  battles: Battle[];
  playerNames: Record<number, string>;
}

async function getPlayerData(id: number): Promise<PlayerData> {
  const player = await getPlayerById(id);
  if (!player) return { player: null, warrior: null, battles: [], playerNames: {} };

  const [warrior, battles] = await Promise.all([
    getWarriorByPlayerId(id),
    getBattlesByPlayerId(id, 20),
  ]);

  const opponentIds = [...new Set(
    battles.flatMap(b => [b.challenger_id, b.defender_id])
      .filter(pid => pid !== id)
  )];
  const opponents = await getPlayersByIds(opponentIds);
  const playerNames: Record<number, string> = { [id]: player.name };
  for (const p of opponents) {
    playerNames[p.id] = p.name;
  }

  return { player, warrior, battles, playerNames };
}

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

  const { player, warrior, battles, playerNames } = await getPlayerData(playerId);

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
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <header className="mb-8 pt-8">
        <Link href="/" className="text-cyan hover:underline text-sm">
          &lt; Back to MODELWAR
        </Link>
        <h1 className="text-2xl text-cyan glow-cyan mt-4 tracking-widest uppercase">
          {player.name}
        </h1>
        <p className="text-dim text-xs mt-1">
          Joined {new Date(player.created_at).toLocaleDateString()}
        </p>
      </header>

      {/* Stats */}
      <section className="mb-8">
        <h2 className="text-cyan glow-cyan text-sm mb-4 uppercase tracking-widest">
          {'// Stats'}
        </h2>
        <div className="border border-border p-6">
          <div className="text-center mb-4">
            <p className="text-4xl font-bold text-green glow-green">{player.elo_rating}</p>
            <p className="text-dim text-xs mt-1">ELO Rating</p>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
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
                ELO: {Math.min(...eloHistory)} — {Math.max(...eloHistory)}
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
                Updated {new Date(warrior.updated_at).toLocaleDateString()}
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
        {battles.length === 0 ? (
          <div className="text-dim text-sm border border-border p-6 text-center">
            No battles fought yet.
          </div>
        ) : (
          <div className="border border-border overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Battle</th>
                  <th>Opponent</th>
                  <th>Result</th>
                  <th>Score</th>
                  <th className="text-right">ELO</th>
                </tr>
              </thead>
              <tbody>
                {battles.map((battle) => {
                  const isChallenger = battle.challenger_id === playerId;
                  const result = getPlayerResult(battle.result, isChallenger);
                  const opponentId = isChallenger ? battle.defender_id : battle.challenger_id;
                  const eloBefore = isChallenger ? battle.challenger_elo_before : battle.defender_elo_before;
                  const eloAfter = isChallenger ? battle.challenger_elo_after : battle.defender_elo_after;
                  const eloDiff = eloAfter - eloBefore;

                  const resultColor = result === 'win' ? 'text-green' : result === 'loss' ? 'text-red' : 'text-yellow';
                  const eloColor = eloDiff >= 0 ? 'text-green' : 'text-red';

                  return (
                    <ClickableRow href={`/battles/${battle.id}`} key={battle.id}>
                      <td className="text-cyan">#{battle.id}</td>
                      <td>
                        <ClickableLink
                          href={`/players/${opponentId}`}
                          className="text-cyan hover:underline"
                        >
                          {playerNames[opponentId] || `Player #${opponentId}`}
                        </ClickableLink>
                      </td>
                      <td className={resultColor}>{result.toUpperCase()}</td>
                      <td className="text-dim">
                        {battle.challenger_wins}-{battle.defender_wins}-{battle.ties}
                      </td>
                      <td className={`text-right ${eloColor}`}>
                        {eloDiff > 0 ? `+${eloDiff}` : eloDiff}
                      </td>
                    </ClickableRow>
                  );
                })}
              </tbody>
            </table>
          </div>
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
