'use client';

import { useEffect, useReducer, useRef, useCallback, useState } from 'react';
import type { ReplayData, ReplayState, PlaybackSpeed, CoreEvent } from './types';
import CoreCanvas from './CoreCanvas';
import PlaybackControls from './PlaybackControls';
import InfoPanel from './InfoPanel';
import RoundHeader from './RoundHeader';
import Link from 'next/link';

const DEFAULT_CORE_SIZE = 55440;

type Action =
  | { type: 'FETCH_SUCCESS'; maxCycles: number; coreSize: number }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'INITIALIZED' }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SET_SPEED'; speed: PlaybackSpeed }
  | { type: 'EVENTS'; events: CoreEvent[]; cycle: number; challengerTasks: number; defenderTasks: number }
  | { type: 'ROUND_END'; winner: string; cycle: number }
  | { type: 'INIT_ERROR'; message: string };

function createInitialState(): ReplayState {
  return {
    status: 'loading',
    cycle: 0,
    maxCycles: 500000,
    speed: 1000,
    territoryMap: new Uint8Array(DEFAULT_CORE_SIZE),
    activityMap: new Uint8Array(DEFAULT_CORE_SIZE),
    challengerTasks: 0,
    defenderTasks: 0,
    challengerAlive: true,
    defenderAlive: true,
    winner: null,
  };
}

function reducer(state: ReplayState, action: Action): ReplayState {
  switch (action.type) {
    case 'FETCH_SUCCESS': {
      const coreSize = action.coreSize;
      return {
        ...state,
        maxCycles: action.maxCycles,
        territoryMap: new Uint8Array(coreSize),
        activityMap: new Uint8Array(coreSize),
      };
    }
    case 'FETCH_ERROR':
      return { ...state, status: 'error', errorMessage: action.message };
    case 'INITIALIZED':
      return { ...state, status: 'ready' };
    case 'INIT_ERROR':
      return { ...state, status: 'error', errorMessage: action.message };
    case 'PLAY':
      return { ...state, status: 'playing' };
    case 'PAUSE':
      return { ...state, status: state.status === 'playing' ? 'paused' : state.status };
    case 'SET_SPEED':
      return { ...state, speed: action.speed };
    case 'EVENTS': {
      const coreSize = state.territoryMap.length;
      const newTerritory = new Uint8Array(state.territoryMap);
      const newActivity = new Uint8Array(state.activityMap);

      // Decay activity
      for (let i = 0; i < coreSize; i++) {
        if (newActivity[i] > 0) newActivity[i]--;
      }

      // Apply events
      for (const event of action.events) {
        const addr = event.address % coreSize;
        if (event.accessType === 'WRITE') {
          newTerritory[addr] = event.warriorId === 0 ? 1 : 2;
        }
        newActivity[addr] = 3;
        // Also mark territory on EXECUTE if not yet claimed
        if (event.accessType === 'EXECUTE' && newTerritory[addr] === 0) {
          newTerritory[addr] = event.warriorId === 0 ? 1 : 2;
        }
      }

      return {
        ...state,
        cycle: action.cycle,
        challengerTasks: action.challengerTasks,
        defenderTasks: action.defenderTasks,
        challengerAlive: action.challengerTasks > 0,
        defenderAlive: action.defenderTasks > 0,
        territoryMap: newTerritory,
        activityMap: newActivity,
      };
    }
    case 'ROUND_END':
      return {
        ...state,
        status: 'finished',
        winner: action.winner,
        cycle: action.cycle,
      };
    default:
      return state;
  }
}

interface ReplayViewerProps {
  battleId: number;
  roundNumber: number;
}

export default function ReplayViewer({ battleId, roundNumber }: ReplayViewerProps) {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);
  const [replayData, setReplayData] = useState<ReplayData | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const rafRef = useRef<number | null>(null);
  const speedRef = useRef(state.speed);

  // Keep speedRef in sync
  useEffect(() => {
    speedRef.current = state.speed;
  }, [state.speed]);

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
        dispatch({
          type: 'FETCH_SUCCESS',
          maxCycles: data.settings.maxCycles,
          coreSize: data.settings.coreSize,
        });

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

      workerRef.current.postMessage({ type: 'step', count: speedRef.current });
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
  const handleSpeedChange = useCallback((speed: PlaybackSpeed) => dispatch({ type: 'SET_SPEED', speed }), []);

  const handleStepForward = useCallback(() => {
    workerRef.current?.postMessage({ type: 'step', count: 1 });
  }, []);

  const handleJumpToEnd = useCallback(() => {
    dispatch({ type: 'PAUSE' });
    workerRef.current?.postMessage({ type: 'run_to_end' });
  }, []);

  const coreSize = replayData?.settings.coreSize ?? DEFAULT_CORE_SIZE;

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen p-6 max-w-5xl mx-auto pt-12">
        <p className="text-cyan text-center tracking-widest">LOADING REPLAY...</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="min-h-screen p-6 max-w-5xl mx-auto pt-12">
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
    <div className="min-h-screen p-6 max-w-5xl mx-auto pt-8">
      <RoundHeader
        battleId={battleId}
        roundNumber={roundNumber}
        totalRounds={replayData?.round_results.length ?? 5}
        challengerName={replayData?.challenger.name ?? 'Challenger'}
        defenderName={replayData?.defender.name ?? 'Defender'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4">
        <div className="space-y-4">
          <CoreCanvas
            territoryMap={state.territoryMap}
            activityMap={state.activityMap}
            coreSize={coreSize}
          />
          <PlaybackControls
            state={state}
            onPlay={handlePlay}
            onPause={handlePause}
            onSpeedChange={handleSpeedChange}
            onStepForward={handleStepForward}
            onJumpToEnd={handleJumpToEnd}
          />
        </div>
        <InfoPanel
          state={state}
          challengerName={replayData?.challenger.name ?? 'Challenger'}
          defenderName={replayData?.defender.name ?? 'Defender'}
          battleId={battleId}
          roundNumber={roundNumber}
        />
      </div>
    </div>
  );
}
