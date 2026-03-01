'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ClickableRow } from '@/app/components/ClickableRow';
import { PROVISIONAL_RD_THRESHOLD } from '@/lib/player-utils';
import Pagination from './Pagination';

interface LeaderboardEntry {
  rank: number;
  id: number;
  name: string;
  rating: number;
  rating_deviation: number;
  wins: number;
  losses: number;
  ties: number;
}

interface PaginatedLeaderboardProps {
  initialEntries: LeaderboardEntry[];
  totalPlayers: number;
  perPage: number;
  mode: '1v1' | 'arena';
}

export default function PaginatedLeaderboard({
  initialEntries,
  totalPlayers,
  perPage,
  mode,
}: PaginatedLeaderboardProps) {
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.ceil(totalPlayers / perPage);

  const handlePageChange = useCallback(async (newPage: number) => {
    if (newPage === 1) {
      setPage(1);
      setEntries(initialEntries);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?page=${newPage}&per_page=${perPage}&mode=${mode}`);
      const data = await res.json();
      setPage(newPage);
      setEntries(data.leaderboard);
    } catch {
      // Keep current page on error
    } finally {
      setLoading(false);
    }
  }, [perPage, mode, initialEntries]);

  const ratingLabel = mode === 'arena' ? 'Arena Rating' : 'Rating';
  const showProvisional = mode === '1v1';

  return (
    <>
      <div className={`border border-border overflow-x-auto ${loading ? 'opacity-50' : ''}`}>
        <table>
          <thead>
            <tr>
              <th className="w-12">#</th>
              <th>Player</th>
              <th className="text-right">{ratingLabel} <Link href="/ratings" className="text-dim hover:text-cyan font-normal text-xs">[?]</Link></th>
              <th className="text-right">W</th>
              <th className="text-right">L</th>
              <th className="text-right">T</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <ClickableRow href={`/players/${entry.id}`} key={entry.id}>
                <td className="text-dim">{entry.rank}</td>
                <td className={`${entry.rank <= 3 ? 'text-cyan glow-cyan' : ''} player-name-truncate`}>
                  {entry.name}
                </td>
                <td className="text-right font-bold">
                  {showProvisional && entry.rating_deviation > PROVISIONAL_RD_THRESHOLD ? (
                    <Link href="/ratings" className="inline-block text-yellow border border-yellow/40 bg-yellow/10 rounded-md px-2 py-0.5 hover:bg-yellow/20 transition-colors">{entry.rating}</Link>
                  ) : (
                    <span className="text-green glow-green">{entry.rating}</span>
                  )}
                </td>
                <td className="text-right text-green">{entry.wins}</td>
                <td className="text-right text-red">{entry.losses}</td>
                <td className="text-right text-yellow">{entry.ties}</td>
              </ClickableRow>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
    </>
  );
}
