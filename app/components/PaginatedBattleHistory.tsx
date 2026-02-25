'use client';

import { useState, useCallback } from 'react';
import { ClickableRow, ClickableLink } from '@/app/components/ClickableRow';
import LocalTimestamp from '@/app/components/LocalTimestamp';
import { getPlayerResult, conservativeRating } from '@/lib/player-utils';
import type { Battle } from '@/lib/db';
import Pagination from './Pagination';

interface PaginatedBattleHistoryProps {
  playerId: number;
  initialBattles: Battle[];
  initialPlayerNames: Record<number, string>;
  totalBattles: number;
  perPage: number;
}

interface ApiBattle {
  id: number;
  opponent: { id: number; name: string };
  result: 'win' | 'loss' | 'tie';
  score: string;
  rating_change: number;
  created_at: string;
}

export default function PaginatedBattleHistory({
  playerId,
  initialBattles,
  initialPlayerNames,
  totalBattles,
  perPage,
}: PaginatedBattleHistoryProps) {
  const [page, setPage] = useState(1);
  const [battles, setBattles] = useState<Battle[]>(initialBattles);
  const [playerNames, setPlayerNames] = useState(initialPlayerNames);
  const [apiBattles, setApiBattles] = useState<ApiBattle[] | null>(null);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.ceil(totalBattles / perPage);

  const handlePageChange = useCallback(async (newPage: number) => {
    if (newPage === 1) {
      setPage(1);
      setBattles(initialBattles);
      setPlayerNames(initialPlayerNames);
      setApiBattles(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/players/${playerId}/battles?page=${newPage}&per_page=${perPage}`);
      const data = await res.json();
      setPage(newPage);
      setApiBattles(data.battles);
      setBattles([]);
    } catch {
      // Keep current page on error
    } finally {
      setLoading(false);
    }
  }, [playerId, perPage, initialBattles, initialPlayerNames]);

  const renderServerBattles = () => (
    battles.map((battle) => {
      const isChallenger = battle.challenger_id === playerId;
      const result = getPlayerResult(battle.result, isChallenger);
      const opponentId = isChallenger ? battle.defender_id : battle.challenger_id;
      const eloBefore = isChallenger ? battle.challenger_elo_before : battle.defender_elo_before;
      const eloAfter = isChallenger ? battle.challenger_elo_after : battle.defender_elo_after;
      const rdBefore = isChallenger ? battle.challenger_rd_before : battle.defender_rd_before;
      const rdAfter = isChallenger ? battle.challenger_rd_after : battle.defender_rd_after;
      const eloDiff = conservativeRating(eloAfter, rdAfter) - conservativeRating(eloBefore, rdBefore);
      const resultColor = result === 'win' ? 'text-green' : result === 'loss' ? 'text-red' : 'text-yellow';
      const eloColor = eloDiff >= 0 ? 'text-green' : 'text-red';

      return (
        <ClickableRow href={`/battles/${battle.id}`} key={battle.id}>
          <td className="text-cyan">#{battle.id}</td>
          <td className="text-dim hidden sm:table-cell text-xs">
            <LocalTimestamp date={String(battle.created_at)} />
          </td>
          <td className="player-name-truncate">
            <ClickableLink href={`/players/${opponentId}`} className="text-cyan hover:underline">
              {playerNames[opponentId] || `Player #${opponentId}`}
            </ClickableLink>
          </td>
          <td className={resultColor}>{result.toUpperCase()}</td>
          <td className="text-dim hidden sm:table-cell">
            {battle.challenger_wins}-{battle.defender_wins}-{battle.ties}
          </td>
          <td className={`text-right ${eloColor}`}>
            {eloDiff > 0 ? `+${eloDiff}` : eloDiff}
          </td>
        </ClickableRow>
      );
    })
  );

  const renderApiBattles = () => (
    apiBattles!.map((battle) => {
      const resultColor = battle.result === 'win' ? 'text-green' : battle.result === 'loss' ? 'text-red' : 'text-yellow';
      const eloColor = battle.rating_change >= 0 ? 'text-green' : 'text-red';

      return (
        <ClickableRow href={`/battles/${battle.id}`} key={battle.id}>
          <td className="text-cyan">#{battle.id}</td>
          <td className="text-dim hidden sm:table-cell text-xs">
            <LocalTimestamp date={battle.created_at} />
          </td>
          <td className="player-name-truncate">
            <ClickableLink href={`/players/${battle.opponent.id}`} className="text-cyan hover:underline">
              {battle.opponent.name}
            </ClickableLink>
          </td>
          <td className={resultColor}>{battle.result.toUpperCase()}</td>
          <td className="text-dim hidden sm:table-cell">{battle.score}</td>
          <td className={`text-right ${eloColor}`}>
            {battle.rating_change > 0 ? `+${battle.rating_change}` : battle.rating_change}
          </td>
        </ClickableRow>
      );
    })
  );

  return (
    <>
      <div className={`border border-border overflow-x-auto ${loading ? 'opacity-50' : ''}`}>
        <table>
          <thead>
            <tr>
              <th>Battle</th>
              <th className="hidden sm:table-cell">When</th>
              <th>Opponent</th>
              <th>Result</th>
              <th className="hidden sm:table-cell">Score</th>
              <th className="text-right">Rating</th>
            </tr>
          </thead>
          <tbody>
            {apiBattles ? renderApiBattles() : renderServerBattles()}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
    </>
  );
}
