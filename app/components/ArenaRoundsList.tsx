'use client';

import { useState } from 'react';
import Link from 'next/link';
import Pagination from './Pagination';
import { ARENA_COLORS } from '@/lib/arena-colors';

const ROUNDS_PER_PAGE = 20;

interface RoundData {
  round_number: number;
  winner_slot: number | null;
  survivor_count: number;
}

interface WarriorInfo {
  name: string;
  is_stock_bot: boolean;
}

interface ArenaRoundsListProps {
  arenaId: number;
  rounds: RoundData[];
  warriors: WarriorInfo[]; // indexed by slot
}

function rgbToHex([r, g, b]: readonly number[]): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export default function ArenaRoundsList({ arenaId, rounds, warriors }: ArenaRoundsListProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(rounds.length / ROUNDS_PER_PAGE);
  const start = (page - 1) * ROUNDS_PER_PAGE;
  const pageRounds = rounds.slice(start, start + ROUNDS_PER_PAGE);

  return (
    <div>
      <div className="border border-border overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th className="w-16">Round</th>
              <th>Result</th>
              <th className="text-right w-24"></th>
            </tr>
          </thead>
          <tbody>
            {pageRounds.map((r) => {
              const winner = r.winner_slot !== null ? warriors[r.winner_slot] : null;
              const color = r.winner_slot !== null ? ARENA_COLORS[r.winner_slot] : null;

              return (
                <tr key={r.round_number}>
                  <td className="text-dim">#{r.round_number}</td>
                  <td>
                    {winner && color ? (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full inline-block shrink-0"
                          style={{
                            backgroundColor: rgbToHex(color.active),
                            boxShadow: `0 0 4px ${rgbToHex(color.active)}`,
                          }}
                        />
                        <span style={{ color: rgbToHex(color.active) }}>
                          {winner.name}
                        </span>
                      </span>
                    ) : (
                      <span className="text-yellow">
                        TIE ({r.survivor_count} survivors)
                      </span>
                    )}
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/arenas/${arenaId}/rounds/${r.round_number}`}
                      className="text-cyan hover:underline text-xs tracking-wider"
                    >
                      REPLAY
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
