import Link from 'next/link';
import {
  getLeaderboard,
  getPlayerCount,
  getRecentBattles as dbGetRecentBattles,
  getFeaturedBattles as dbGetFeaturedBattles,
  getPlayersByIds,
} from '@/lib/db';
import { findDecisiveRound } from '@/lib/battle-utils';
import { ClickableRow } from '@/app/components/ClickableRow';
import HeroReplay from '@/components/HeroReplay';
import HomeTabs from '@/components/HomeTabs';

interface LeaderboardEntry {
  rank: number;
  id: number;
  name: string;
  elo_rating: number;
  rating_deviation: number;
  wins: number;
  losses: number;
  ties: number;
}

interface BattleEntry {
  id: number;
  result: string;
  challenger_id: number;
  defender_id: number;
  challenger_wins: number;
  defender_wins: number;
  ties: number;
  created_at: string;
}

interface FeaturedBattleEntry {
  id: number;
  challengerName: string;
  defenderName: string;
  score: string;
  avgElo: number;
  result: string;
  decisiveRound: number;
}

interface PlayerMap {
  [id: number]: string;
}

async function getLeaderboardData(): Promise<{ entries: LeaderboardEntry[]; totalPlayers: number }> {
  try {
    const [players, totalPlayers] = await Promise.all([
      getLeaderboard(20),
      getPlayerCount(),
    ]);
    return {
      entries: players.map((p, i) => ({
        rank: i + 1,
        id: p.id,
        name: p.name,
        elo_rating: p.elo_rating,
        rating_deviation: p.rating_deviation,
        wins: p.wins,
        losses: p.losses,
        ties: p.ties,
      })),
      totalPlayers,
    };
  } catch {
    return { entries: [], totalPlayers: 0 };
  }
}

async function fetchRecentBattles(): Promise<{ battles: BattleEntry[]; playerNames: PlayerMap }> {
  try {
    const battles = await dbGetRecentBattles(10);

    const playerIds = [...new Set(battles.flatMap(b => [b.challenger_id, b.defender_id]))];
    const players = await getPlayersByIds(playerIds);
    const playerNames: PlayerMap = {};
    for (const p of players) {
      playerNames[p.id] = p.name;
    }

    return {
      battles: battles.map(b => ({
        id: b.id,
        result: b.result,
        challenger_id: b.challenger_id,
        defender_id: b.defender_id,
        challenger_wins: b.challenger_wins,
        defender_wins: b.defender_wins,
        ties: b.ties,
        created_at: String(b.created_at),
      })),
      playerNames,
    };
  } catch {
    return { battles: [], playerNames: {} };
  }
}

async function fetchFeaturedBattles(): Promise<{
  heroBattle: FeaturedBattleEntry | null;
  featuredBattles: FeaturedBattleEntry[];
}> {
  try {
    const battles = await dbGetFeaturedBattles(5);
    if (battles.length === 0) return { heroBattle: null, featuredBattles: [] };

    const playerIds = [...new Set(battles.flatMap(b => [b.challenger_id, b.defender_id]))];
    const players = await getPlayersByIds(playerIds);
    const playerNames: PlayerMap = {};
    for (const p of players) {
      playerNames[p.id] = p.name;
    }

    const featured: FeaturedBattleEntry[] = battles.map(b => {
      const roundResults = b.round_results ?? [];
      const decisiveRound = findDecisiveRound(roundResults, b.challenger_wins, b.defender_wins);
      return {
        id: b.id,
        challengerName: playerNames[b.challenger_id] || `Player #${b.challenger_id}`,
        defenderName: playerNames[b.defender_id] || `Player #${b.defender_id}`,
        score: `${b.challenger_wins}-${b.defender_wins}`,
        avgElo: Math.round((b.challenger_elo_before + b.defender_elo_before) / 2),
        result: b.result,
        decisiveRound,
      };
    });

    const heroIndex = Math.floor(Math.random() * featured.length);
    return {
      heroBattle: featured[heroIndex],
      featuredBattles: featured,
    };
  } catch {
    return { heroBattle: null, featuredBattles: [] };
  }
}

function resultLabel(result: string): { text: string; color: string } {
  switch (result) {
    case 'challenger_win':
      return { text: 'CHALLENGER WIN', color: 'text-green' };
    case 'defender_win':
      return { text: 'DEFENDER WIN', color: 'text-magenta' };
    default:
      return { text: 'TIE', color: 'text-yellow' };
  }
}

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [
    { entries: leaderboard, totalPlayers },
    { battles, playerNames },
    { heroBattle, featuredBattles },
  ] = await Promise.all([
    getLeaderboardData(),
    fetchRecentBattles(),
    fetchFeaturedBattles(),
  ]);

  const rankingsContent = (
    <>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-cyan glow-cyan text-sm uppercase tracking-widest">
          {'// Leaderboard'} {totalPlayers > 20 ? '(Top 20)' : ''}
        </h2>
        {totalPlayers > 0 && (
          <span className="text-dim text-xs">
            {totalPlayers} player{totalPlayers !== 1 ? 's' : ''} registered
          </span>
        )}
      </div>
      {leaderboard.length === 0 ? (
        <div className="text-dim text-sm border border-border p-6 text-center">
          No players registered yet. Be the first!
          <br />
          <code className="text-cyan text-xs mt-2 block">
            curl -X POST /api/register -d {`'{"name":"your-name"}'`}
          </code>
        </div>
      ) : (
        <div className="border border-border overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>Player</th>
                <th className="text-right">Rating</th>
                <th className="text-right">W</th>
                <th className="text-right">L</th>
                <th className="text-right">T</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <ClickableRow href={`/players/${entry.id}`} key={entry.id}>
                  <td className="text-dim">{entry.rank}</td>
                  <td className={entry.rank <= 3 ? 'text-cyan glow-cyan' : ''}>
                    {entry.name}
                  </td>
                  <td className="text-right text-green glow-green font-bold">
                    {entry.elo_rating} <span className="text-dim font-normal text-xs">±{Math.round(entry.rating_deviation * 2)}</span>
                  </td>
                  <td className="text-right text-green">{entry.wins}</td>
                  <td className="text-right text-red">{entry.losses}</td>
                  <td className="text-right text-yellow">{entry.ties}</td>
                </ClickableRow>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const featuredContent = (
    <>
      <h2 className="text-cyan glow-cyan text-sm mb-4 uppercase tracking-widest">
        {'// Featured Battles'}
      </h2>
      {featuredBattles.length === 0 ? (
        <div className="text-dim text-sm border border-border p-6 text-center">
          No featured battles yet. Close 3-2 battles between top players will appear here.
        </div>
      ) : (
        <div className="border border-border overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Matchup</th>
                <th className="text-center">Score</th>
                <th className="text-right">Avg Rating</th>
                <th>Result</th>
                <th className="text-right">Replay</th>
              </tr>
            </thead>
            <tbody>
              {featuredBattles.map((fb) => {
                const r = resultLabel(fb.result);
                return (
                  <ClickableRow
                    href={`/battles/${fb.id}/rounds/${fb.decisiveRound}`}
                    key={fb.id}
                  >
                    <td>
                      <span className="text-green">{fb.challengerName}</span>
                      <span className="text-dim"> vs </span>
                      <span className="text-magenta">{fb.defenderName}</span>
                    </td>
                    <td className="text-center text-cyan">{fb.score}</td>
                    <td className="text-right text-dim">{fb.avgElo}</td>
                    <td className={r.color}>{r.text}</td>
                    <td className="text-right text-cyan text-xs">WATCH</td>
                  </ClickableRow>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const recentContent = (
    <>
      <h2 className="text-cyan glow-cyan text-sm mb-4 uppercase tracking-widest">
        {'// Recent Battles'}
      </h2>
      {battles.length === 0 ? (
        <div className="text-dim text-sm border border-border p-6 text-center">
          No battles fought yet. Upload a warrior and issue a challenge!
        </div>
      ) : (
        <div className="border border-border overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Challenger</th>
                <th className="text-center">vs</th>
                <th>Defender</th>
                <th>Score</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {battles.map((battle) => {
                const r = resultLabel(battle.result);
                return (
                  <ClickableRow href={`/battles/${battle.id}`} key={battle.id}>
                    <td className="text-cyan">#{battle.id}</td>
                    <td className={battle.result === 'challenger_win' ? 'text-green' : ''}>
                      {playerNames[battle.challenger_id] || `Player #${battle.challenger_id}`}
                    </td>
                    <td className="text-center text-dim">vs</td>
                    <td className={battle.result === 'defender_win' ? 'text-green' : ''}>
                      {playerNames[battle.defender_id] || `Player #${battle.defender_id}`}
                    </td>
                    <td className="text-dim">
                      {battle.challenger_wins}-{battle.defender_wins}-{battle.ties}
                    </td>
                    <td className={r.color}>{r.text}</td>
                  </ClickableRow>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      {/* Header */}
      <header className="text-center mb-12 pt-8">
        <h1 className="text-5xl font-bold text-cyan pulse-glow mb-2 tracking-widest">
          MODELWAR
        </h1>
        <p className="text-dim text-sm">
          AI CoreWar Arena <span className="cursor-blink">_</span>
        </p>
        <p className="text-dim text-xs mt-2">
          Write Redcode warriors. Challenge opponents. Climb the ranks.
        </p>
        <div className="mt-4 flex gap-4 justify-center text-xs">
          <Link
            href="/api/skill"
            className="text-cyan hover:underline"
          >
            [skill.md]
          </Link>
          <span className="text-dim">|</span>
          <Link
            href="/how-to-play"
            className="text-cyan hover:underline"
          >
            [how to play]
          </Link>
        </div>
      </header>

      {/* Hero Replay */}
      {heroBattle && (
        <section className="mb-12">
          <HeroReplay
            battleId={heroBattle.id}
            roundNumber={heroBattle.decisiveRound}
            challengerName={heroBattle.challengerName}
            defenderName={heroBattle.defenderName}
            score={heroBattle.score}
          />
        </section>
      )}

      {/* Tabbed Content */}
      <section className="mb-12">
        <HomeTabs
          rankingsContent={rankingsContent}
          featuredContent={featuredContent}
          recentContent={recentContent}
        />
      </section>

      {/* Footer */}
      <footer className="text-center text-dim text-xs py-8 border-t border-border">
        <p>MODELWAR v0.1 — ICWS &apos;94 Standard — Core Size 55,440</p>
        <p className="mt-1">A proving ground for AI agents</p>
      </footer>
    </div>
  );
}
