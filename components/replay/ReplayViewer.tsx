'use client';

import { useEffect, useReducer, useRef, useCallback, useState } from 'react';
import type { ReplayData } from './types';
import { reducer, createInitialState } from './replay-logic';
import CoreCanvas from './CoreCanvas';
import PlaybackControls from './PlaybackControls';
import RoundHeader from './RoundHeader';
import Link from 'next/link';

const TARGET_SECONDS = 15;
const TARGET_FRAMES = TARGET_SECONDS * 60;

interface ReplayViewerProps {
  battleId: number;
  roundNumber: number;
}

export default function ReplayViewer({ battleId, roundNumber }: ReplayViewerProps) {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);
  const [replayData, setReplayData] = useState<ReplayData | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const rafRef = useRef<number | null>(null);
  const cyclesPerFrameRef = useRef<number>(100);

  // Fetch replay data and initialize worker
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch(`/api/battles/${battleId}/replay`);
        if (!res.ok) {
          const data = await res.json();
          dispatch({ type: 'FETCH_ERROR', message: data.error || 'Failed to load replay' });
          return;
        }

        const data: ReplayData = await res.json();
        if (cancelled) return;

        setReplayData(data);
        dispatch({ type: 'FETCH_SUCCESS', maxCycles: data.settings.maxCycles });

        const roundData = data.round_results.find((r) => r.round === roundNumber);
        if (!roundData) {
          dispatch({ type: 'FETCH_ERROR', message: `Round ${roundNumber} not found` });
          return;
        }

        const worker = new Worker(
          new URL('../../workers/replay-worker.ts', import.meta.url)
        );
        workerRef.current = worker;

        worker.onmessage = (e: MessageEvent) => {
          const msg = e.data;
          if (msg.type === 'initialized') {
            dispatch({ type: 'INITIALIZED' });
            worker.postMessage({ type: 'prescan' });
          } else if (msg.type === 'prescan_done') {
            const endCycle = msg.endCycle as number;
            cyclesPerFrameRef.current = Math.max(1, Math.ceil(endCycle / TARGET_FRAMES));
            dispatch({ type: 'PRESCAN_DONE', endCycle });
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

      workerRef.current.postMessage({ type: 'step', count: cyclesPerFrameRef.current });
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

  if (state.status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center p-4">
        <p className="text-cyan text-center tracking-widest">LOADING REPLAY...</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <p className="text-red text-center">{state.errorMessage}</p>
        <p className="text-center mt-4">
          <Link href={`/battles/${battleId}`} className="text-cyan hover:underline text-sm">
            &lt; Back to Battle
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-4 max-w-4xl mx-auto">
      <RoundHeader
        battleId={battleId}
        roundNumber={roundNumber}
        totalRounds={replayData?.round_results.length ?? 5}
        challengerName={replayData?.challenger.name ?? 'Challenger'}
        defenderName={replayData?.defender.name ?? 'Defender'}
      />

      <div className="flex-1 min-h-0">
        <CoreCanvas
          territoryMap={state.territoryMap}
          activityMap={state.activityMap}
        />
      </div>

      <div className="mt-3">
        <PlaybackControls
          state={state}
          onPlay={handlePlay}
          onPause={handlePause}
          onStepForward={handleStepForward}
          onJumpToEnd={handleJumpToEnd}
          challengerName={replayData?.challenger.name ?? 'Challenger'}
          defenderName={replayData?.defender.name ?? 'Defender'}
          battleId={battleId}
        />
      </div>
    </div>
  );
}
