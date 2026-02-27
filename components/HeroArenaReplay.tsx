'use client';

import { useEffect, useReducer, useRef } from 'react';
import type { ArenaReplayData } from './arena-replay/types';
import { reducer, createInitialState } from './arena-replay/arena-replay-logic';
import ArenaCoreCanvas from './arena-replay/ArenaCoreCanvas';
import Link from 'next/link';

const TARGET_SECONDS = 18;
const TARGET_FRAMES = TARGET_SECONDS * 60;
const MAX_FRAME_SKIP = 10;

interface HeroArenaReplayProps {
  arenaId: number;
  roundNumber: number;
  winnerName: string;
  runnerUpName: string;
  winnerScore: number;
  runnerUpScore: number;
  participantCount: number;
}

export default function HeroArenaReplay({
  arenaId,
  roundNumber,
  winnerName,
  runnerUpName,
  winnerScore,
  runnerUpScore,
  participantCount,
}: HeroArenaReplayProps) {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);
  const workerRef = useRef<Worker | null>(null);
  const rafRef = useRef<number | null>(null);
  const cyclesPerFrameRef = useRef<number>(100);
  const frameSkipRef = useRef<number>(1);
  const frameCountRef = useRef<number>(0);
  const errorRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch(`/api/arenas/${arenaId}/replay`);
        if (!res.ok) {
          errorRef.current = true;
          dispatch({ type: 'FETCH_ERROR', message: 'Failed to load' });
          return;
        }

        const data: ArenaReplayData = await res.json();
        if (cancelled) return;

        dispatch({ type: 'FETCH_SUCCESS', maxCycles: data.settings.maxCycles });

        const roundData = data.rounds.find((r) => r.round_number === roundNumber);
        if (!roundData) {
          errorRef.current = true;
          dispatch({ type: 'FETCH_ERROR', message: 'Round not found' });
          return;
        }

        const worker = new Worker(
          new URL('../workers/arena-replay-worker.ts', import.meta.url)
        );
        workerRef.current = worker;

        worker.onmessage = (e: MessageEvent) => {
          const msg = e.data;
          if (msg.type === 'initialized') {
            dispatch({ type: 'INITIALIZED' });
            worker.postMessage({ type: 'prescan' });
          } else if (msg.type === 'prescan_done') {
            const endCycle = msg.endCycle as number;
            if (endCycle <= TARGET_FRAMES) {
              cyclesPerFrameRef.current = 1;
              frameSkipRef.current = Math.min(
                MAX_FRAME_SKIP,
                Math.max(1, Math.round(TARGET_FRAMES / endCycle))
              );
            } else {
              cyclesPerFrameRef.current = Math.ceil(endCycle / TARGET_FRAMES);
              frameSkipRef.current = 1;
            }
            dispatch({ type: 'PRESCAN_DONE', endCycle });
            // Auto-play immediately
            dispatch({ type: 'PLAY' });
          } else if (msg.type === 'events') {
            dispatch({
              type: 'EVENTS',
              events: msg.events,
              cycle: msg.cycle,
              warriorTasks: msg.warriorTasks,
            });
          } else if (msg.type === 'round_end') {
            dispatch({ type: 'ROUND_END', winner: msg.winner, cycle: msg.cycle });
          } else if (msg.type === 'error') {
            errorRef.current = true;
            dispatch({ type: 'INIT_ERROR', message: msg.message });
          }
        };

        const redcodes = data.warriors
          .sort((a, b) => a.slot_index - b.slot_index)
          .map(w => w.redcode);

        worker.postMessage({
          type: 'init',
          redcodes,
          seed: roundData.seed,
          settings: data.settings,
          roundIndex: roundNumber - 1,
        });
      } catch {
        if (!cancelled) {
          errorRef.current = true;
          dispatch({ type: 'FETCH_ERROR', message: 'Failed to load' });
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      workerRef.current?.terminate();
      workerRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [arenaId, roundNumber]);

  // Animation loop
  useEffect(() => {
    if (state.status !== 'playing') {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    function tick() {
      if (!workerRef.current) return;
      frameCountRef.current++;
      if (frameCountRef.current % frameSkipRef.current === 0) {
        workerRef.current.postMessage({ type: 'step', count: cyclesPerFrameRef.current });
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [state.status]);

  // Silent failure: render nothing on error or loading
  if (state.status === 'error') return null;
  if (state.status === 'loading') {
    return (
      <div className="hero-replay-container">
        <div className="flex items-center justify-center h-48">
          <p className="text-cyan text-xs tracking-widest">LOADING ARENA REPLAY...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="hero-replay-container">
      <ArenaCoreCanvas
        territoryMap={state.territoryMap}
        activityMap={state.activityMap}
      />
      <div className="hero-replay-overlay">
        <div className="absolute top-2 left-3 right-16 text-cyan text-xs truncate">
          {'// NOW PLAYING: Arena #'}{arenaId} ({participantCount} players)
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-3 py-2">
          <div className="text-sm text-foreground truncate mr-2 min-w-0">
            <span className="text-green">{winnerName}</span>
            <span className="text-dim"> vs </span>
            <span className="text-magenta">{runnerUpName}</span>
          </div>
          <div className="text-xs shrink-0 whitespace-nowrap flex items-center gap-3">
            <span>
              <span className="text-green glow-green">{winnerName} WINS</span>
              <span className="text-cyan"> · {winnerScore}-{runnerUpScore}</span>
            </span>
            <Link
              href={`/arenas/${arenaId}/rounds/${roundNumber}`}
              className="text-cyan hover:underline"
            >
              [WATCH FULL ARENA]
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
