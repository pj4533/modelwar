'use client';

import { useEffect, useReducer, useRef, useCallback, useState } from 'react';
import type { ArenaReplayData } from './types';
import { reducer, createInitialState } from './arena-replay-logic';
import ArenaCoreCanvas from './ArenaCoreCanvas';
import ArenaPlaybackControls from './ArenaPlaybackControls';
import Link from 'next/link';

const TARGET_SECONDS = 18;
const TARGET_FRAMES = TARGET_SECONDS * 60;
const MAX_FRAME_SKIP = 10;

interface ArenaReplayViewerProps {
  arenaId: number;
  roundNumber: number;
}

export default function ArenaReplayViewer({ arenaId, roundNumber }: ArenaReplayViewerProps) {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);
  const [replayData, setReplayData] = useState<ArenaReplayData | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const rafRef = useRef<number | null>(null);
  const cyclesPerFrameRef = useRef<number>(100);
  const frameSkipRef = useRef<number>(1);
  const frameCountRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch(`/api/arenas/${arenaId}/replay`);
        if (!res.ok) {
          const data = await res.json();
          dispatch({ type: 'FETCH_ERROR', message: data.error || 'Failed to load replay' });
          return;
        }

        const data: ArenaReplayData = await res.json();
        if (cancelled) return;

        setReplayData(data);
        dispatch({ type: 'FETCH_SUCCESS', maxCycles: data.settings.maxCycles });

        const roundData = data.rounds.find(r => r.round_number === roundNumber);
        if (!roundData) {
          dispatch({ type: 'FETCH_ERROR', message: `Round ${roundNumber} not found` });
          return;
        }

        const worker = new Worker(
          new URL('../../workers/arena-replay-worker.ts', import.meta.url)
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
              frameSkipRef.current = Math.min(MAX_FRAME_SKIP, Math.max(1, Math.round(TARGET_FRAMES / endCycle)));
            } else {
              cyclesPerFrameRef.current = Math.ceil(endCycle / TARGET_FRAMES);
              frameSkipRef.current = 1;
            }
            dispatch({ type: 'PRESCAN_DONE', endCycle });
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
      } catch (err) {
        if (!cancelled) {
          dispatch({ type: 'FETCH_ERROR', message: String(err) });
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

  const handlePlay = useCallback(() => dispatch({ type: 'PLAY' }), []);
  const handlePause = useCallback(() => dispatch({ type: 'PAUSE' }), []);

  const handleStepForward = useCallback(() => {
    workerRef.current?.postMessage({ type: 'step', count: 1 });
  }, []);

  const handleJumpToEnd = useCallback(() => {
    dispatch({ type: 'PAUSE' });
    workerRef.current?.postMessage({ type: 'run_to_end' });
  }, []);

  if (state.status === 'loading' || state.status === 'scanning') {
    return (
      <div className="h-screen flex items-center justify-center p-4">
        <p className="text-cyan text-center tracking-widest">
          {state.status === 'scanning' ? 'SCANNING ARENA BATTLE...' : 'LOADING REPLAY...'}
        </p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <p className="text-red text-center">{state.errorMessage}</p>
        <p className="text-center mt-4">
          <Link href={`/arenas/${arenaId}`} className="text-cyan hover:underline text-sm">
            &lt; Back to Arena
          </Link>
        </p>
      </div>
    );
  }

  const sortedWarriors = replayData
    ? [...replayData.warriors].sort((a, b) => a.slot_index - b.slot_index)
    : [];

  return (
    <div className="p-2 sm:p-4 max-w-4xl mx-auto">
      <div className="mb-2 sm:mb-3">
        <Link href={`/arenas/${arenaId}`} className="text-cyan hover:underline text-xs tracking-wider">
          &lt; ARENA #{arenaId}
        </Link>
        <h2 className="text-cyan text-sm sm:text-base tracking-wider mt-1">
          ROUND {roundNumber} / {replayData?.total_rounds ?? '?'}
        </h2>
      </div>

      <ArenaCoreCanvas
        territoryMap={state.territoryMap}
        activityMap={state.activityMap}
      />

      <div className="mt-2 sm:mt-3">
        <ArenaPlaybackControls
          state={state}
          warriors={sortedWarriors}
          onPlay={handlePlay}
          onPause={handlePause}
          onStepForward={handleStepForward}
          onJumpToEnd={handleJumpToEnd}
          arenaId={arenaId}
        />
      </div>
    </div>
  );
}
