'use client';

import Link from 'next/link';
import type { ReplayState } from './types';
import { formatCycle, computeProgress } from './replay-logic';

interface PlaybackControlsProps {
  state: ReplayState;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onJumpToEnd: () => void;
  challengerName: string;
  defenderName: string;
  battleId: number;
}

export default function PlaybackControls({
  state,
  onPlay,
  onPause,
  onStepForward,
  onJumpToEnd,
  challengerName,
  defenderName,
  battleId,
}: PlaybackControlsProps) {
  const isPlaying = state.status === 'playing';
  const canInteract = state.status === 'ready' || state.status === 'playing' || state.status === 'paused';
  const progress = computeProgress(state);

  const isFinished = state.status === 'finished';

  // Determine warrior status display
  function warriorStatus(role: 'challenger' | 'defender') {
    if (!isFinished) {
      const tasks = role === 'challenger' ? state.challengerTasks : state.defenderTasks;
      return <span className="text-dim">{tasks}T</span>;
    }
    if (state.winner === role) {
      const colorClass = role === 'challenger' ? 'text-green glow-green' : 'text-magenta glow-magenta';
      return <span className={`${colorClass} font-bold`}>WIN</span>;
    }
    if (state.winner === 'tie') {
      return <span className="text-yellow">TIE</span>;
    }
    return <span className="text-red">DEAD</span>;
  }

  return (
    <div className="border border-border p-3 space-y-2">
      {/* Progress bar */}
      <div className="w-full bg-surface h-1.5 rounded overflow-hidden">
        <div
          className="h-full bg-cyan progress-glow transition-all duration-100"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Main controls row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: warrior info */}
        <div className="flex items-center gap-3 text-xs min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green inline-block shrink-0" style={{ boxShadow: '0 0 6px #39ff14' }} />
            <span className="text-green truncate max-w-[80px]">{challengerName}</span>
            {warriorStatus('challenger')}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-magenta inline-block shrink-0" style={{ boxShadow: '0 0 6px #ff00ff' }} />
            <span className="text-magenta truncate max-w-[80px]">{defenderName}</span>
            {warriorStatus('defender')}
          </div>
        </div>

        {/* Center: cycle counter */}
        <p className={`text-lg tracking-wider whitespace-nowrap font-mono ${
          state.status === 'finished' ? 'text-cyan glow-cyan' : 'text-cyan'
        }`}>
          CYCLE {formatCycle(state.cycle)}
          <span className="text-dim"> / {formatCycle(state.endCycle ?? state.maxCycles)}</span>
        </p>

        {/* Right: transport controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={isPlaying ? onPause : onPlay}
            disabled={!canInteract}
            className="px-3 py-1.5 border border-border text-cyan hover:bg-cyan/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs tracking-wider"
          >
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </button>
          <button
            onClick={onStepForward}
            disabled={!canInteract || isPlaying}
            className="px-3 py-1.5 border border-border text-dim hover:bg-cyan/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
            title="Step forward 1 cycle"
          >
            STEP
          </button>
          <button
            onClick={onJumpToEnd}
            disabled={!canInteract}
            className="px-3 py-1.5 border border-border text-dim hover:bg-cyan/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
            title="Jump to end"
          >
            END
          </button>
        </div>
      </div>

      {/* Result footer when finished */}
      {isFinished && (
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <p className={`text-xs font-bold ${
            state.winner === 'challenger' ? 'text-green glow-green' :
            state.winner === 'defender' ? 'text-magenta glow-magenta' :
            'text-yellow'
          }`}>
            {state.winner === 'challenger' ? `${challengerName} WINS` :
             state.winner === 'defender' ? `${defenderName} WINS` :
             'TIE'}
          </p>
          <Link
            href={`/battles/${battleId}`}
            className="text-cyan text-xs hover:underline tracking-wider"
          >
            BACK TO BATTLE
          </Link>
        </div>
      )}
    </div>
  );
}
