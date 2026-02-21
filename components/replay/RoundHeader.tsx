'use client';

import Link from 'next/link';

interface RoundHeaderProps {
  battleId: number;
  roundNumber: number;
  totalRounds: number;
  challengerName: string;
  defenderName: string;
  onViewCode: (role: 'challenger' | 'defender') => void;
}

export default function RoundHeader({
  battleId,
  roundNumber,
  totalRounds,
  challengerName,
  defenderName,
  onViewCode,
}: RoundHeaderProps) {
  return (
    <header className="mb-3 space-y-2">
      {/* Top row: navigation buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="px-2 py-1 sm:px-3 sm:py-1.5 border border-border text-cyan hover:bg-cyan/10 text-xs tracking-wider"
          >
            HOME
          </Link>
          <Link
            href={`/battles/${battleId}`}
            className="px-2 py-1 sm:px-3 sm:py-1.5 border border-border text-cyan hover:bg-cyan/10 text-xs tracking-wider"
          >
            BATTLE
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {roundNumber > 1 && (
            <Link
              href={`/battles/${battleId}/rounds/${roundNumber - 1}`}
              className="text-dim text-xs hover:text-cyan"
            >
              &lt; PREV
            </Link>
          )}
          {roundNumber < totalRounds && (
            <Link
              href={`/battles/${battleId}/rounds/${roundNumber + 1}`}
              className="text-dim text-xs hover:text-cyan"
            >
              NEXT &gt;
            </Link>
          )}
        </div>
      </div>
      {/* Bottom row: title + combatant names */}
      <div>
        <h1 className="text-sm sm:text-lg text-cyan glow-cyan tracking-widest">
          BATTLE #{battleId} &mdash; ROUND {roundNumber} OF {totalRounds}
        </h1>
        <p className="text-sm mt-1">
          <button
            onClick={() => onViewCode('challenger')}
            className="text-green glow-green hover:underline cursor-pointer"
          >
            [{challengerName}]
          </button>
          <span className="text-dim mx-2">vs</span>
          <button
            onClick={() => onViewCode('defender')}
            className="text-magenta glow-magenta hover:underline cursor-pointer"
          >
            [{defenderName}]
          </button>
        </p>
        <p className="text-dim text-xs mt-0.5 tracking-wider">TAP NAME TO VIEW CODE</p>
      </div>
    </header>
  );
}
