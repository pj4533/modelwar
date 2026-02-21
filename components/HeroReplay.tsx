'use client';

import { useEffect, useReducer, useRef, useCallback } from 'react';
import type { ReplayData } from './replay/types';
import { reducer, createInitialState } from './replay/replay-logic';
import CoreCanvas from './replay/CoreCanvas';
import Link from 'next/link';

const TARGET_SECONDS = 18;
const TARGET_FRAMES = TARGET_SECONDS * 60;
const MAX_FRAME_SKIP = 10;

interface HeroReplayProps {
  battleId: number;
  roundNumber: number;
  challengerName: string;
  defenderName: string;
  score: string;
}

export default function HeroReplay({
  battleId,
  roundNumber,
  challengerName,
  defenderName,
  score,
}: HeroReplayProps) {
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
        const res = await fetch(`/api/battles/${battleId}/replay`);
        if (!res.ok) {
          errorRef.current = true;
          dispatch({ type: 'FETCH_ERROR', message: 'Failed to load' });
          return;
        }

        const data: ReplayData = await res.json();
        if (cancelled) return;

        dispatch({ type: 'FETCH_SUCCESS', maxCycles: data.settings.maxCycles });

        const roundData = data.round_results.find((r) => r.round === roundNumber);
        if (!roundData) {
          errorRef.current = true;
          dispatch({ type: 'FETCH_ERROR', message: 'Round not found' });
          return;
        }

        const worker = new Worker(
          new URL('../workers/replay-worker.ts', import.meta.url)
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
              challengerTasks: msg.challengerTasks,
              defenderTasks: msg.defenderTasks,
            });
          } else if (msg.type === 'round_end') {
            dispatch({ type: 'ROUND_END', winner: msg.winner, cycle: msg.cycle });
          } else if (msg.type === 'error') {
            errorRef.current = true;
            dispatch({ type: 'INIT_ERROR', message: msg.message });
          }
        };

        worker.postMessage({
          type: 'init',
          challengerRedcode: data.challenger.redcode,
          defenderRedcode: data.defender.redcode,
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
  }, [battleId, roundNumber]);

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
          <p className="text-cyan text-xs tracking-widest">LOADING REPLAY...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="hero-replay-container">
      <CoreCanvas
        territoryMap={state.territoryMap}
        activityMap={state.activityMap}
      />
      <div className="hero-replay-overlay">
        <div className="absolute top-2 left-3 right-16 text-cyan text-xs truncate">
          {'// NOW PLAYING: Battle #'}{battleId} — {score}
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-3 py-2">
          <div className="text-sm text-foreground truncate mr-2 min-w-0">
            <span className="text-green">{challengerName}</span>
            <span className="text-dim"> vs </span>
            <span className="text-magenta">{defenderName}</span>
          </div>
          <Link
            href={`/battles/${battleId}/rounds/${roundNumber}`}
            className="text-cyan text-xs hover:underline shrink-0 whitespace-nowrap"
          >
            [WATCH FULL BATTLE]
          </Link>
        </div>
      </div>
    </div>
  );
}
