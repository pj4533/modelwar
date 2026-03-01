import type { ArenaReplayState, CoreEvent } from './types';

const CORE_SIZE = 8000;
const NUM_WARRIORS = 10;

export function formatCycle(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function computeProgress(state: ArenaReplayState): number {
  const effectiveMax = state.endCycle ?? state.maxCycles;
  return effectiveMax > 0 ? (state.cycle / effectiveMax) * 100 : 0;
}

export type Action =
  | { type: 'FETCH_SUCCESS'; maxCycles: number }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'INITIALIZED' }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'EVENTS'; events: CoreEvent[]; cycle: number; warriorTasks: number[] }
  | { type: 'ROUND_END'; winner: number | null; cycle: number }
  | { type: 'INIT_ERROR'; message: string }
  | { type: 'PRESCAN_DONE'; endCycle: number };

export function createInitialState(): ArenaReplayState {
  return {
    status: 'loading',
    cycle: 0,
    maxCycles: 80000,
    endCycle: null,
    territoryMap: new Uint8Array(CORE_SIZE),
    activityMap: new Uint8Array(CORE_SIZE),
    warriorTasks: new Array(NUM_WARRIORS).fill(0),
    warriorAlive: new Array(NUM_WARRIORS).fill(true),
    winner: null,
  };
}

export function reducer(state: ArenaReplayState, action: Action): ArenaReplayState {
  switch (action.type) {
    case 'FETCH_SUCCESS':
      return { ...state, maxCycles: action.maxCycles };
    case 'FETCH_ERROR':
      return { ...state, status: 'error', errorMessage: action.message };
    case 'INITIALIZED':
      return { ...state, status: 'scanning' };
    case 'PRESCAN_DONE':
      return { ...state, status: 'ready', endCycle: action.endCycle };
    case 'INIT_ERROR':
      return { ...state, status: 'error', errorMessage: action.message };
    case 'PLAY':
      return { ...state, status: 'playing' };
    case 'PAUSE':
      return { ...state, status: state.status === 'playing' ? 'paused' : state.status };
    case 'EVENTS': {
      const newTerritory = new Uint8Array(state.territoryMap);
      const newActivity = new Uint8Array(state.activityMap);

      for (let i = 0; i < CORE_SIZE; i++) {
        if (newActivity[i] > 0) newActivity[i]--;
      }

      for (const event of action.events) {
        const addr = event.address % CORE_SIZE;
        // Territory value: 0 = empty, 1-10 = warrior slot+1
        if (event.accessType === 'WRITE') {
          newTerritory[addr] = event.warriorId + 1;
        }
        newActivity[addr] = 3;
        if (event.accessType === 'EXECUTE' && newTerritory[addr] === 0) {
          newTerritory[addr] = event.warriorId + 1;
        }
      }

      const warriorAlive = action.warriorTasks.map(t => t > 0);

      return {
        ...state,
        cycle: action.cycle,
        warriorTasks: action.warriorTasks,
        warriorAlive,
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
        endCycle: action.cycle,
      };
    default:
      return state;
  }
}
