import type { ReplayState, CoreEvent } from './types';

const DEFAULT_CORE_SIZE = 55440;

export function formatCycle(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function computeProgress(state: ReplayState): number {
  const effectiveMax = state.endCycle ?? state.maxCycles;
  return effectiveMax > 0 ? (state.cycle / effectiveMax) * 100 : 0;
}

export type Action =
  | { type: 'FETCH_SUCCESS'; maxCycles: number; coreSize: number }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'INITIALIZED' }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'EVENTS'; events: CoreEvent[]; cycle: number; challengerTasks: number; defenderTasks: number }
  | { type: 'ROUND_END'; winner: string; cycle: number }
  | { type: 'INIT_ERROR'; message: string }
  | { type: 'PRESCAN_DONE'; endCycle: number };

export function createInitialState(): ReplayState {
  return {
    status: 'loading',
    cycle: 0,
    maxCycles: 500000,
    endCycle: null,
    territoryMap: new Uint8Array(DEFAULT_CORE_SIZE),
    activityMap: new Uint8Array(DEFAULT_CORE_SIZE),
    challengerTasks: 0,
    defenderTasks: 0,
    challengerAlive: true,
    defenderAlive: true,
    winner: null,
  };
}

export function reducer(state: ReplayState, action: Action): ReplayState {
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
      const coreSize = state.territoryMap.length;
      const newTerritory = new Uint8Array(state.territoryMap);
      const newActivity = new Uint8Array(state.activityMap);

      for (let i = 0; i < coreSize; i++) {
        if (newActivity[i] > 0) newActivity[i]--;
      }

      for (const event of action.events) {
        const addr = event.address % coreSize;
        if (event.accessType === 'WRITE') {
          newTerritory[addr] = event.warriorId === 0 ? 1 : 2;
        }
        newActivity[addr] = 3;
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
        endCycle: action.cycle,
      };
    default:
      return state;
  }
}
