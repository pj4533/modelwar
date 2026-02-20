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
    <header className="mb-6">
      <Link href={`/battles/${battleId}`} className="text-cyan hover:underline text-sm">
        &lt; Back to Battle #{battleId}
      </Link>
      <h1 className="text-xl text-cyan glow-cyan mt-3 tracking-widest">
        BATTLE #{battleId} &mdash; ROUND {roundNumber} OF {totalRounds}
      </h1>
      <p className="mt-2 text-sm">
        <span className="text-green">{challengerName}</span>
        <span className="text-dim mx-2">vs</span>
        <span className="text-magenta">{defenderName}</span>
      </p>
      <div className="flex gap-3 mt-2">
        {roundNumber > 1 && (
          <Link
            href={`/battles/${battleId}/rounds/${roundNumber - 1}`}
            className="text-dim text-xs hover:text-cyan"
          >
            &lt; PREV ROUND
          </Link>
        )}
        {roundNumber < totalRounds && (
          <Link
            href={`/battles/${battleId}/rounds/${roundNumber + 1}`}
            className="text-dim text-xs hover:text-cyan"
          >
            NEXT ROUND &gt;
          </Link>
        )}
      </div>
    </header>
  );
}
