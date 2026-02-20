'use client';

import type { ReplayState, PlaybackSpeed } from './types';

const SPEED_OPTIONS: { label: string; value: PlaybackSpeed }[] = [
  { label: '1x', value: 100 },
  { label: '2x', value: 500 },
  { label: '5x', value: 1000 },
  { label: '10x', value: 2500 },
  { label: '50x', value: 10000 },
  { label: 'MAX', value: 50000 },
];

interface PlaybackControlsProps {
  state: ReplayState;
  onPlay: () => void;
  onPause: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onStepForward: () => void;
  onJumpToEnd: () => void;
}

function formatCycle(n: number): string {
  return n.toLocaleString();
}

export default function PlaybackControls({
  state,
  onPlay,
  onPause,
  onSpeedChange,
  onStepForward,
  onJumpToEnd,
}: PlaybackControlsProps) {
  const isPlaying = state.status === 'playing';
  const canInteract = state.status === 'ready' || state.status === 'playing' || state.status === 'paused';
  const progress = state.maxCycles > 0 ? (state.cycle / state.maxCycles) * 100 : 0;

  return (
    <div className="border border-border p-4 space-y-4">
      {/* Progress bar */}
      <div className="w-full bg-surface h-2 rounded overflow-hidden">
        <div
          className="h-full bg-cyan progress-glow transition-all duration-100"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Cycle counter */}
      <p className="text-dim text-xs text-center tracking-wider">
        CYCLE {formatCycle(state.cycle)} / {formatCycle(state.maxCycles)}
      </p>

      {/* Transport controls */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={!canInteract}
          className="min-w-[44px] min-h-[44px] px-4 py-2 border border-border text-cyan hover:bg-cyan/10 disabled:opacity-30 disabled:cursor-not-allowed text-sm tracking-wider"
        >
          {isPlaying ? 'PAUSE' : 'PLAY'}
        </button>
        <button
          onClick={onStepForward}
          disabled={!canInteract || isPlaying}
          className="min-w-[44px] min-h-[44px] px-3 py-2 border border-border text-dim hover:bg-cyan/10 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
          title="Step forward 1 cycle"
        >
          STEP
        </button>
        <button
          onClick={onJumpToEnd}
          disabled={!canInteract}
          className="min-w-[44px] min-h-[44px] px-3 py-2 border border-border text-dim hover:bg-cyan/10 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
          title="Jump to end"
        >
          END
        </button>
      </div>

      {/* Speed controls */}
      <div className="flex items-center justify-center gap-1 flex-wrap">
        <span className="text-dim text-xs mr-2 tracking-wider">SPEED:</span>
        {SPEED_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSpeedChange(opt.value)}
            disabled={!canInteract}
            className={`min-w-[44px] min-h-[44px] px-3 py-2 border text-xs tracking-wider disabled:opacity-30 disabled:cursor-not-allowed ${
              state.speed === opt.value
                ? 'speed-btn-active'
                : 'border-border text-dim hover:bg-cyan/10'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
