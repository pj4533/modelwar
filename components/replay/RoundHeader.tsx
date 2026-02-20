'use client';

import Link from 'next/link';

interface RoundHeaderProps {
  battleId: number;
  roundNumber: number;
  totalRounds: number;
  challengerName: string;
  defenderName: string;
}

export default function RoundHeader({
  battleId,
  roundNumber,
  totalRounds,
  challengerName,
  defenderName,
}: RoundHeaderProps) {
  return (
    <header className="mb-3 flex items-baseline justify-between flex-wrap gap-2">
      <div>
        <h1 className="text-lg text-cyan glow-cyan tracking-widest">
          BATTLE #{battleId} &mdash; ROUND {roundNumber} OF {totalRounds}
        </h1>
        <p className="text-xs mt-1">
          <span className="text-green">{challengerName}</span>
          <span className="text-dim mx-2">vs</span>
          <span className="text-magenta">{defenderName}</span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="px-3 py-1.5 border border-border text-cyan hover:bg-cyan/10 text-xs tracking-wider"
        >
          HOME
        </Link>
        {roundNumber > 1 && (
          <Link
            href={`/battles/${battleId}/rounds/${roundNumber - 1}`}
            className="text-dim text-xs hover:text-cyan"
          >
            &lt; PREV
          </Link>
        )}
        <Link
          href={`/battles/${battleId}`}
          className="px-3 py-1.5 border border-border text-cyan hover:bg-cyan/10 text-xs tracking-wider"
        >
          BATTLE
        </Link>
        {roundNumber < totalRounds && (
          <Link
            href={`/battles/${battleId}/rounds/${roundNumber + 1}`}
            className="text-dim text-xs hover:text-cyan"
          >
            NEXT &gt;
          </Link>
        )}
      </div>
    </header>
  );
}
