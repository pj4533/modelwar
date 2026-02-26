'use client';

import { useState, useCallback } from 'react';
import { ClickableRow } from '@/app/components/ClickableRow';
import LocalTimestamp from '@/app/components/LocalTimestamp';
import Pagination from './Pagination';

interface RecentEntry {
  type: '1v1' | 'arena';
  id: number;
  result?: string;
  challenger_id?: number;
  defender_id?: number;
  challenger_wins?: number;
  defender_wins?: number;
  ties?: number;
  participant_count?: number;
  created_at: string;
}

interface PlayerMap {
  [id: number]: string;
}

interface PaginatedRecentActivityProps {
  initialBattles: RecentEntry[];
  initialPlayerNames: PlayerMap;
  totalBattles: number;
  perPage: number;
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

export default function PaginatedRecentActivity({
  initialBattles,
  initialPlayerNames,
  totalBattles,
  perPage,
}: PaginatedRecentActivityProps) {
  const [page, setPage] = useState(1);
  const [battles, setBattles] = useState<RecentEntry[]>(initialBattles);
  const [playerNames, setPlayerNames] = useState<PlayerMap>(initialPlayerNames);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.ceil(totalBattles / perPage);

  const handlePageChange = useCallback(async (newPage: number) => {
    if (newPage === 1) {
      setPage(1);
      setBattles(initialBattles);
      setPlayerNames(initialPlayerNames);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/recent-battles?page=${newPage}&per_page=${perPage}`);
      const data = await res.json();
      setPage(newPage);
      setBattles(data.battles);
      setPlayerNames(data.playerNames);
    } catch {
      // Keep current page on error
    } finally {
      setLoading(false);
    }
  }, [perPage, initialBattles, initialPlayerNames]);

  return (
    <>
      <h2 className="text-cyan glow-cyan text-sm mb-4 uppercase tracking-widest">
        {'// Recent Activity'}
      </h2>
      {battles.length === 0 ? (
        <div className="text-dim text-sm border border-border p-6 text-center">
          No battles fought yet. Upload a warrior and issue a challenge!
        </div>
      ) : (
        <>
          <div className={`border border-border overflow-x-auto ${loading ? 'opacity-50' : ''}`}>
            <table>
              <thead>
                <tr>
                  <th className="hidden sm:table-cell">ID</th>
                  <th className="hidden sm:table-cell">Type</th>
                  <th className="hidden sm:table-cell">When</th>
                  <th>Challenger</th>
                  <th className="text-center hidden sm:table-cell">vs</th>
                  <th>Defender</th>
                  <th>Score</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {battles.map((battle) => {
                  if (battle.type === '1v1') {
                    const r = resultLabel(battle.result!);
                    return (
                      <ClickableRow href={`/battles/${battle.id}`} key={`1v1-${battle.id}`}>
                        <td className="text-cyan hidden sm:table-cell">#{battle.id}</td>
                        <td className="hidden sm:table-cell text-xs">1v1</td>
                        <td className="text-dim hidden sm:table-cell text-xs">
                          <LocalTimestamp date={battle.created_at} />
                        </td>
                        <td className={`${battle.result === 'challenger_win' ? 'text-green' : ''} player-name-truncate`}>
                          {playerNames[battle.challenger_id!] || `Player #${battle.challenger_id}`}
                        </td>
                        <td className="text-center text-dim hidden sm:table-cell">vs</td>
                        <td className={`${battle.result === 'defender_win' ? 'text-green' : ''} player-name-truncate`}>
                          {playerNames[battle.defender_id!] || `Player #${battle.defender_id}`}
                        </td>
                        <td className="text-dim">
                          {battle.challenger_wins}-{battle.defender_wins}-{battle.ties}
                        </td>
                        <td className={r.color}>{r.text}</td>
                      </ClickableRow>
                    );
                  } else {
                    return (
                      <ClickableRow href={`/arenas/${battle.id}`} key={`arena-${battle.id}`}>
                        <td className="text-cyan hidden sm:table-cell">#{battle.id}</td>
                        <td className="text-magenta hidden sm:table-cell text-xs">Arena</td>
                        <td className="text-dim hidden sm:table-cell text-xs">
                          <LocalTimestamp date={battle.created_at} />
                        </td>
                        <td className="text-cyan player-name-truncate">
                          Arena #{battle.id}
                        </td>
                        <td className="text-center text-dim hidden sm:table-cell"></td>
                        <td className="text-dim player-name-truncate">
                          {battle.participant_count} players
                        </td>
                        <td className="text-dim">&mdash;</td>
                        <td className="text-cyan">COMPLETED</td>
                      </ClickableRow>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </>
      )}
    </>
  );
}
