'use client';

import Link from 'next/link';
import type { ArenaReplayState } from './types';
import type { ArenaWarriorInfo } from './types';
import { formatCycle, computeProgress } from './arena-replay-logic';
import { ARENA_COLORS } from '@/lib/arena-colors';

interface ArenaPlaybackControlsProps {
  state: ArenaReplayState;
  warriors: ArenaWarriorInfo[];
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onJumpToEnd: () => void;
  arenaId: number;
}

export default function ArenaPlaybackControls({
  state,
  warriors,
  onPlay,
  onPause,
  onStepForward,
  onJumpToEnd,
  arenaId,
}: ArenaPlaybackControlsProps) {
  const isPlaying = state.status === 'playing';
  const canInteract = state.status === 'ready' || state.status === 'playing' || state.status === 'paused';
  const progress = computeProgress(state);
  const isFinished = state.status === 'finished';

  function warriorStatus(slotIndex: number) {
    const tasks = state.warriorTasks[slotIndex] ?? 0;
    const alive = state.warriorAlive[slotIndex] ?? false;

    if (!isFinished) {
      return <span className="text-dim">{tasks}T</span>;
    }
    if (state.winner === slotIndex) {
      return <span className="font-bold" style={{ color: rgbToHex(ARENA_COLORS[slotIndex].active) }}>WIN</span>;
    }
    if (!alive) {
      return <span className="text-red">DEAD</span>;
    }
    if (state.winner === null) {
      return <span className="text-yellow">TIE</span>;
    }
    return <span className="text-dim">{tasks}T</span>;
  }

  return (
    <div className="border border-border p-2 sm:p-3 space-y-2">
      {/* Progress bar */}
      <div className="w-full bg-surface h-1.5 rounded overflow-hidden">
        <div
          className="h-full bg-cyan progress-glow transition-all duration-100"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Warrior list - 2 columns */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
        {warriors.map((w, i) => {
          const color = ARENA_COLORS[i];
          return (
            <div key={i} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full inline-block shrink-0"
                style={{
                  backgroundColor: rgbToHex(color.active),
                  boxShadow: `0 0 4px ${rgbToHex(color.active)}`,
                }}
              />
              <span
                className="truncate max-w-[80px]"
                style={{ color: rgbToHex(color.active) }}
              >
                {w.name}
              </span>
              {warriorStatus(i)}
            </div>
          );
        })}
      </div>

      {/* Transport controls */}
      <div className="flex items-center justify-center gap-1.5">
        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={!canInteract}
          className="px-2 py-1 sm:px-3 sm:py-1.5 border border-border text-cyan hover:bg-cyan/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs tracking-wider"
        >
          {isPlaying ? 'PAUSE' : 'PLAY'}
        </button>
        <button
          onClick={onStepForward}
          disabled={!canInteract || isPlaying}
          className="px-2 py-1 sm:px-3 sm:py-1.5 border border-border text-dim hover:bg-cyan/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
          title="Step forward 1 cycle"
        >
          STEP
        </button>
        <button
          onClick={onJumpToEnd}
          disabled={!canInteract}
          className="px-2 py-1 sm:px-3 sm:py-1.5 border border-border text-dim hover:bg-cyan/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
          title="Jump to end"
        >
          END
        </button>
      </div>

      {/* Cycle counter */}
      <p className={`text-sm sm:text-lg tracking-wider whitespace-nowrap font-mono text-center ${
        state.status === 'finished' ? 'text-cyan glow-cyan' : 'text-cyan'
      }`}>
        CYCLE {formatCycle(state.cycle)}
        <span className="text-dim"> / {formatCycle(state.endCycle ?? state.maxCycles)}</span>
      </p>

      {/* Result footer when finished */}
      {isFinished && (
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <p className="text-xs font-bold" style={
            state.winner !== null
              ? { color: rgbToHex(ARENA_COLORS[state.winner].active) }
              : undefined
          }>
            {state.winner !== null
              ? `${warriors[state.winner]?.name ?? 'Unknown'} WINS`
              : 'TIE'}
          </p>
          <Link
            href={`/arenas/${arenaId}`}
            className="text-cyan text-xs hover:underline tracking-wider"
          >
            BACK TO ARENA
          </Link>
        </div>
      )}
    </div>
  );
}

function rgbToHex([r, g, b]: readonly number[]): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
