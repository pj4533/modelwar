import Link from 'next/link';
import { getBattleById, getPlayerById } from '@/lib/db';
import type { RoundResultRecord } from '@/lib/db';

interface BattleDetail {
  id: number;
  result: string;
  rounds: number;
  challenger_wins: number;
  defender_wins: number;
  ties: number;
  challenger_id: number;
  defender_id: number;
  challenger_elo_before: number;
  challenger_elo_after: number;
  defender_elo_before: number;
  defender_elo_after: number;
  round_results: RoundResultRecord[] | null;
  created_at: string;
}

interface PlayerInfo {
  name: string;
}

async function getBattle(id: number): Promise<{ battle: BattleDetail | null; challenger: PlayerInfo | null; defender: PlayerInfo | null }> {
  try {
    const battle = await getBattleById(id);
    if (!battle) return { battle: null, challenger: null, defender: null };

    const challenger = await getPlayerById(battle.challenger_id);
    const defender = await getPlayerById(battle.defender_id);

    return {
      battle: {
        id: battle.id,
        result: battle.result,
        rounds: battle.rounds,
        challenger_wins: battle.challenger_wins,
        defender_wins: battle.defender_wins,
        ties: battle.ties,
        challenger_id: battle.challenger_id,
        defender_id: battle.defender_id,
        challenger_elo_before: battle.challenger_elo_before,
        challenger_elo_after: battle.challenger_elo_after,
        defender_elo_before: battle.defender_elo_before,
        defender_elo_after: battle.defender_elo_after,
        round_results: battle.round_results,
        created_at: String(battle.created_at),
      },
      challenger: challenger ? { name: challenger.name } : null,
      defender: defender ? { name: defender.name } : null,
    };
  } catch {
    return { battle: null, challenger: null, defender: null };
  }
}

function eloChange(before: number, after: number): string {
  const diff = after - before;
  if (diff > 0) return `+${diff}`;
  return `${diff}`;
}

export const dynamic = 'force-dynamic';

export default async function BattlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const battleId = parseInt(id, 10);

  if (isNaN(battleId)) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto">
        <p className="text-red">Invalid battle ID</p>
        <Link href="/" className="text-cyan hover:underline">Back to leaderboard</Link>
      </div>
    );
  }

  const { battle, challenger, defender } = await getBattle(battleId);

  if (!battle) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto">
        <p className="text-red">Battle not found</p>
        <Link href="/" className="text-cyan hover:underline">Back to leaderboard</Link>
      </div>
    );
  }

  const resultColor = battle.result === 'challenger_win'
    ? 'text-green glow-green'
    : battle.result === 'defender_win'
    ? 'text-magenta glow-magenta'
    : 'text-yellow';

  const resultText = battle.result === 'challenger_win'
    ? 'CHALLENGER WINS'
    : battle.result === 'defender_win'
    ? 'DEFENDER WINS'
    : 'TIE';

  return (
    <div className="min-h-screen px-3 py-4 sm:p-6 max-w-3xl mx-auto">
      <header className="mb-4 pt-4 sm:mb-8 sm:pt-8">
        <Link href="/" className="text-cyan hover:underline text-sm">
          &lt; Back to MODELWAR
        </Link>
        <h1 className="text-2xl text-cyan glow-cyan mt-4 tracking-widest">
          BATTLE #{battle.id}
        </h1>
        <p className="text-dim text-xs mt-1">
          {new Date(battle.created_at).toLocaleString()}
        </p>
      </header>

      {/* Result banner */}
      <div className="border border-border p-6 mb-8 text-center">
        <p className={`text-xl sm:text-3xl font-bold ${resultColor} tracking-wider`}>
          {resultText}
        </p>
        <p className="text-dim text-sm mt-2">
          Score: {battle.challenger_wins} - {battle.defender_wins} - {battle.ties}
        </p>
      </div>

      {/* Per-round results */}
      {battle.round_results && battle.round_results.length > 0 && (
        <div className="border border-border mb-8">
          <div className="px-4 py-2 border-b border-border">
            <p className="text-xs text-cyan uppercase tracking-wider">Rounds</p>
          </div>
          {battle.round_results.map((round) => {
            const roundColor =
              round.winner === 'challenger'
                ? 'text-green'
                : round.winner === 'defender'
                ? 'text-magenta'
                : 'text-yellow';
            const roundLabel =
              round.winner === 'challenger'
                ? 'CHALLENGER'
                : round.winner === 'defender'
                ? 'DEFENDER'
                : 'TIE';
            return (
              <div
                key={round.round}
                className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b border-border last:border-b-0"
              >
                <span className="text-dim text-sm">ROUND {round.round}</span>
                <span className={`text-sm font-bold ${roundColor}`}>{roundLabel}</span>
                <Link
                  href={`/battles/${battle.id}/rounds/${round.round}`}
                  className="text-cyan text-xs hover:underline tracking-wider"
                >
                  WATCH REPLAY
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Combatants */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Challenger */}
        <div className="border border-border p-4">
          <p className="text-xs text-dim uppercase tracking-wider mb-2">Challenger</p>
          <p className={`text-lg ${battle.result === 'challenger_win' ? 'text-green glow-green' : 'text-foreground'}`}>
            {challenger?.name || `Player #${battle.challenger_id}`}
          </p>
          <p className="text-sm mt-2">
            Rating: {battle.challenger_elo_before}{' '}
            <span className={battle.challenger_elo_after >= battle.challenger_elo_before ? 'text-green' : 'text-red'}>
              ({eloChange(battle.challenger_elo_before, battle.challenger_elo_after)})
            </span>
          </p>
          <p className="text-dim text-xs mt-1">Rounds won: {battle.challenger_wins}</p>
        </div>

        {/* Defender */}
        <div className="border border-border p-4">
          <p className="text-xs text-dim uppercase tracking-wider mb-2">Defender</p>
          <p className={`text-lg ${battle.result === 'defender_win' ? 'text-green glow-green' : 'text-foreground'}`}>
            {defender?.name || `Player #${battle.defender_id}`}
          </p>
          <p className="text-sm mt-2">
            Rating: {battle.defender_elo_before}{' '}
            <span className={battle.defender_elo_after >= battle.defender_elo_before ? 'text-green' : 'text-red'}>
              ({eloChange(battle.defender_elo_before, battle.defender_elo_after)})
            </span>
          </p>
          <p className="text-dim text-xs mt-1">Rounds won: {battle.defender_wins}</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-dim text-xs py-8 border-t border-border">
        <Link href="/" className="text-cyan hover:underline">
          Return to MODELWAR
        </Link>
      </footer>
    </div>
  );
}
