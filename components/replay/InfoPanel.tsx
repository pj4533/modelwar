'use client';

import Link from 'next/link';
import type { ReplayState } from './types';

interface InfoPanelProps {
  state: ReplayState;
  challengerName: string;
  defenderName: string;
  battleId: number;
  roundNumber: number;
}

export default function InfoPanel({
  state,
  challengerName,
  defenderName,
  battleId,
  roundNumber,
}: InfoPanelProps) {
  const winnerLabel =
    state.winner === 'challenger'
      ? challengerName
      : state.winner === 'defender'
      ? defenderName
      : state.winner === 'tie'
      ? 'TIE'
      : null;

  return (
    <div className="border border-border p-4 space-y-4">
      <h3 className="text-xs text-cyan uppercase tracking-wider">Warriors</h3>

      {/* Challenger */}
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-green inline-block" style={{ boxShadow: '0 0 6px #39ff14' }} />
        <div className="flex-1 min-w-0">
          <p className="text-green text-sm truncate">{challengerName}</p>
          <p className="text-dim text-xs">
            Tasks: {state.challengerTasks}
            {!state.challengerAlive && state.status !== 'loading' && (
              <span className="text-red ml-2">DEAD</span>
            )}
          </p>
        </div>
      </div>

      {/* Defender */}
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-magenta inline-block" style={{ boxShadow: '0 0 6px #ff00ff' }} />
        <div className="flex-1 min-w-0">
          <p className="text-magenta text-sm truncate">{defenderName}</p>
          <p className="text-dim text-xs">
            Tasks: {state.defenderTasks}
            {!state.defenderAlive && state.status !== 'loading' && (
              <span className="text-red ml-2">DEAD</span>
            )}
          </p>
        </div>
      </div>

      {/* Round result */}
      {state.status === 'finished' && winnerLabel && (
        <div className="border-t border-border pt-3">
          <p className="text-xs text-dim uppercase tracking-wider mb-1">Round {roundNumber} Result</p>
          <p className={`text-sm font-bold ${
            state.winner === 'challenger' ? 'text-green glow-green' :
            state.winner === 'defender' ? 'text-magenta glow-magenta' :
            'text-yellow'
          }`}>
            {winnerLabel === 'TIE' ? 'TIE' : `${winnerLabel} WINS`}
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="border-t border-border pt-3">
        <Link
          href={`/battles/${battleId}`}
          className="text-cyan text-xs hover:underline tracking-wider"
        >
          &lt; BACK TO BATTLE
        </Link>
      </div>
    </div>
  );
}
