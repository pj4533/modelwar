'use client';

import { useState, useCallback } from 'react';
import { ClickableRow, ClickableLink } from '@/app/components/ClickableRow';
import LocalTimestamp from '@/app/components/LocalTimestamp';
import { getPlayerResult, conservativeRating, ordinal } from '@/lib/player-utils';
import type { UnifiedBattleEntry } from '@/lib/db';
import Pagination from './Pagination';

interface PaginatedBattleHistoryProps {
  playerId: number;
  initialBattles: UnifiedBattleEntry[];
  initialPlayerNames: Record<number, string>;
  totalBattles: number;
  perPage: number;
}

interface ApiUnifiedBattle {
  id: number;
  type: '1v1' | 'arena';
  href: string;
  // 1v1 fields
  opponent?: { id: number; name: string };
  // arena fields
  placement?: number;
  participant_count?: number;
  matchup?: string;
  // common
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
  const [battles, setBattles] = useState<UnifiedBattleEntry[]>(initialBattles);
  const [playerNames, setPlayerNames] = useState(initialPlayerNames);
  const [apiBattles, setApiBattles] = useState<ApiUnifiedBattle[] | null>(null);
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
    battles.map((entry) => {
      if (entry.type === '1v1') {
        const isChallenger = entry.challenger_id === playerId;
        const result = getPlayerResult(entry.result!, isChallenger);
        const opponentId = isChallenger ? entry.defender_id! : entry.challenger_id!;
        const eloBefore = isChallenger ? entry.challenger_elo_before! : entry.defender_elo_before!;
        const eloAfter = isChallenger ? entry.challenger_elo_after! : entry.defender_elo_after!;
        const rdBefore = isChallenger ? entry.challenger_rd_before : entry.defender_rd_before;
        const rdAfter = isChallenger ? entry.challenger_rd_after : entry.defender_rd_after;
        const eloDiff = conservativeRating(eloAfter, rdAfter) - conservativeRating(eloBefore, rdBefore);
        const resultColor = result === 'win' ? 'text-green' : result === 'loss' ? 'text-red' : 'text-yellow';
        const eloColor = eloDiff >= 0 ? 'text-green' : 'text-red';

        return (
          <ClickableRow href={`/battles/${entry.id}`} key={`1v1-${entry.id}`}>
            <td className="text-cyan">#{entry.id}</td>
            <td className="hidden sm:table-cell text-xs">1v1</td>
            <td className="text-dim hidden sm:table-cell text-xs">
              <LocalTimestamp date={String(entry.created_at)} />
            </td>
            <td className="player-name-truncate">
              <ClickableLink href={`/players/${opponentId}`} className="text-cyan hover:underline">
                {playerNames[opponentId] || `Player #${opponentId}`}
              </ClickableLink>
            </td>
            <td className={resultColor}>{result.toUpperCase()}</td>
            <td className="text-dim hidden sm:table-cell">
              {entry.challenger_wins}-{entry.defender_wins}-{entry.ties}
            </td>
            <td className={`text-right ${eloColor}`}>
              {eloDiff > 0 ? `+${eloDiff}` : eloDiff}
            </td>
          </ClickableRow>
        );
      } else {
        // Arena entry
        const placement = entry.placement!;
        const participantCount = entry.participant_count!;
        let result: 'win' | 'loss' | 'tie';
        if (placement === 1) result = 'win';
        else if (placement === participantCount) result = 'loss';
        else result = 'tie';
        const resultColor = result === 'win' ? 'text-green' : result === 'loss' ? 'text-red' : 'text-yellow';

        const ratingBefore = conservativeRating(
          entry.arena_rating_before ?? 1200,
          entry.arena_rd_before ?? 350
        );
        const ratingAfter = conservativeRating(
          entry.arena_rating_after ?? 1200,
          entry.arena_rd_after ?? 350
        );
        const ratingDiff = ratingAfter - ratingBefore;
        const eloColor = ratingDiff >= 0 ? 'text-green' : 'text-red';

        return (
          <ClickableRow href={`/arenas/${entry.id}`} key={`arena-${entry.id}`}>
            <td className="text-cyan">#{entry.id}</td>
            <td className="text-magenta hidden sm:table-cell text-xs">Arena</td>
            <td className="text-dim hidden sm:table-cell text-xs">
              <LocalTimestamp date={String(entry.created_at)} />
            </td>
            <td className="text-dim">
              {ordinal(placement)} / {participantCount}
            </td>
            <td className={resultColor}>{result.toUpperCase()}</td>
            <td className="text-dim hidden sm:table-cell">{entry.total_score}</td>
            <td className={`text-right ${eloColor}`}>
              {ratingDiff > 0 ? `+${ratingDiff}` : ratingDiff}
            </td>
          </ClickableRow>
        );
      }
    })
  );

  const renderApiBattles = () => (
    apiBattles!.map((battle) => {
      const resultColor = battle.result === 'win' ? 'text-green' : battle.result === 'loss' ? 'text-red' : 'text-yellow';
      const eloColor = battle.rating_change >= 0 ? 'text-green' : 'text-red';

      if (battle.type === '1v1') {
        return (
          <ClickableRow href={battle.href} key={`1v1-${battle.id}`}>
            <td className="text-cyan">#{battle.id}</td>
            <td className="hidden sm:table-cell text-xs">1v1</td>
            <td className="text-dim hidden sm:table-cell text-xs">
              <LocalTimestamp date={battle.created_at} />
            </td>
            <td className="player-name-truncate">
              <ClickableLink href={`/players/${battle.opponent!.id}`} className="text-cyan hover:underline">
                {battle.opponent!.name}
              </ClickableLink>
            </td>
            <td className={resultColor}>{battle.result.toUpperCase()}</td>
            <td className="text-dim hidden sm:table-cell">{battle.score}</td>
            <td className={`text-right ${eloColor}`}>
              {battle.rating_change > 0 ? `+${battle.rating_change}` : battle.rating_change}
            </td>
          </ClickableRow>
        );
      } else {
        return (
          <ClickableRow href={battle.href} key={`arena-${battle.id}`}>
            <td className="text-cyan">#{battle.id}</td>
            <td className="text-magenta hidden sm:table-cell text-xs">Arena</td>
            <td className="text-dim hidden sm:table-cell text-xs">
              <LocalTimestamp date={battle.created_at} />
            </td>
            <td className="text-dim">{battle.matchup}</td>
            <td className={resultColor}>{battle.result.toUpperCase()}</td>
            <td className="text-dim hidden sm:table-cell">{battle.score}</td>
            <td className={`text-right ${eloColor}`}>
              {battle.rating_change > 0 ? `+${battle.rating_change}` : battle.rating_change}
            </td>
          </ClickableRow>
        );
      }
    })
  );

  return (
    <>
      <div className={`border border-border overflow-x-auto ${loading ? 'opacity-50' : ''}`}>
        <table>
          <thead>
            <tr>
              <th>Battle</th>
              <th className="hidden sm:table-cell">Type</th>
              <th className="hidden sm:table-cell">When</th>
              <th>Matchup</th>
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
