import { formatCycle, computeProgress, reducer, createInitialState } from '../replay-logic';
import type { ReplayState } from '../types';

describe('formatCycle', () => {
  it('formats 0', () => {
    expect(formatCycle(0)).toBe('0');
  });

  it('formats small numbers without commas', () => {
    expect(formatCycle(999)).toBe('999');
  });

  it('formats thousands with comma', () => {
    expect(formatCycle(1000)).toBe('1,000');
  });

  it('formats typical cycle count', () => {
    expect(formatCycle(95160)).toBe('95,160');
  });

  it('formats maxCycles', () => {
    expect(formatCycle(500000)).toBe('500,000');
  });

  it('formats millions', () => {
    expect(formatCycle(1234567)).toBe('1,234,567');
  });
});

describe('computeProgress', () => {
  function makeState(overrides: Partial<ReplayState>): ReplayState {
    return { ...createInitialState(), ...overrides };
  }

  it('returns 0 when cycle is 0', () => {
    const state = makeState({ cycle: 0, maxCycles: 500000, endCycle: null });
    expect(computeProgress(state)).toBe(0);
  });

  it('uses maxCycles when endCycle is null', () => {
    const state = makeState({ cycle: 250000, maxCycles: 500000, endCycle: null });
    expect(computeProgress(state)).toBe(50);
  });

  it('uses endCycle when set (fixes the 19% bug)', () => {
    const state = makeState({ cycle: 95160, maxCycles: 500000, endCycle: 95160 });
    expect(computeProgress(state)).toBe(100);
  });

  it('shows partial progress toward endCycle', () => {
    const state = makeState({ cycle: 47580, maxCycles: 500000, endCycle: 95160 });
    expect(computeProgress(state)).toBeCloseTo(50, 0);
  });

  it('returns 0 when effectiveMax is 0', () => {
    const state = makeState({ cycle: 0, maxCycles: 0, endCycle: null });
    expect(computeProgress(state)).toBe(0);
  });
});

describe('createInitialState', () => {
  it('returns loading state with defaults', () => {
    const state = createInitialState();
    expect(state.status).toBe('loading');
    expect(state.cycle).toBe(0);
    expect(state.maxCycles).toBe(500000);
    expect(state.endCycle).toBeNull();
    expect(state.winner).toBeNull();
    expect(state.challengerAlive).toBe(true);
    expect(state.defenderAlive).toBe(true);
  });
});

describe('reducer', () => {
  let initialState: ReplayState;

  beforeEach(() => {
    initialState = createInitialState();
  });

  describe('FETCH_SUCCESS', () => {
    it('sets maxCycles', () => {
      const state = reducer(initialState, { type: 'FETCH_SUCCESS', maxCycles: 80000 });
      expect(state.maxCycles).toBe(80000);
    });
  });

  describe('FETCH_ERROR', () => {
    it('sets error status and message', () => {
      const state = reducer(initialState, { type: 'FETCH_ERROR', message: 'Not found' });
      expect(state.status).toBe('error');
      expect(state.errorMessage).toBe('Not found');
    });
  });

  describe('INITIALIZED', () => {
    it('sets status to ready', () => {
      const state = reducer(initialState, { type: 'INITIALIZED' });
      expect(state.status).toBe('ready');
    });
  });

  describe('INIT_ERROR', () => {
    it('sets error status and message', () => {
      const state = reducer(initialState, { type: 'INIT_ERROR', message: 'Parse failed' });
      expect(state.status).toBe('error');
      expect(state.errorMessage).toBe('Parse failed');
    });
  });

  describe('PLAY', () => {
    it('sets status to playing', () => {
      const state = reducer({ ...initialState, status: 'ready' }, { type: 'PLAY' });
      expect(state.status).toBe('playing');
    });
  });

  describe('PAUSE', () => {
    it('pauses when playing', () => {
      const state = reducer({ ...initialState, status: 'playing' }, { type: 'PAUSE' });
      expect(state.status).toBe('paused');
    });

    it('does not change status when not playing', () => {
      const state = reducer({ ...initialState, status: 'ready' }, { type: 'PAUSE' });
      expect(state.status).toBe('ready');
    });
  });

  describe('EVENTS', () => {
    it('updates cycle and task counts', () => {
      const state = reducer(initialState, {
        type: 'EVENTS',
        events: [],
        cycle: 100,
        challengerTasks: 3,
        defenderTasks: 2,
      });
      expect(state.cycle).toBe(100);
      expect(state.challengerTasks).toBe(3);
      expect(state.defenderTasks).toBe(2);
      expect(state.challengerAlive).toBe(true);
      expect(state.defenderAlive).toBe(true);
    });

    it('marks warrior as dead when tasks reach 0', () => {
      const state = reducer(initialState, {
        type: 'EVENTS',
        events: [],
        cycle: 5000,
        challengerTasks: 0,
        defenderTasks: 1,
      });
      expect(state.challengerAlive).toBe(false);
      expect(state.defenderAlive).toBe(true);
    });

    it('applies WRITE events to territory map', () => {
      const state = reducer(initialState, {
        type: 'EVENTS',
        events: [
          { warriorId: 0, address: 10, accessType: 'WRITE' },
          { warriorId: 1, address: 20, accessType: 'WRITE' },
        ],
        cycle: 1,
        challengerTasks: 1,
        defenderTasks: 1,
      });
      expect(state.territoryMap[10]).toBe(1); // challenger
      expect(state.territoryMap[20]).toBe(2); // defender
    });

    it('sets activity to 3 for all event types', () => {
      const state = reducer(initialState, {
        type: 'EVENTS',
        events: [
          { warriorId: 0, address: 5, accessType: 'READ' },
          { warriorId: 0, address: 6, accessType: 'WRITE' },
          { warriorId: 0, address: 7, accessType: 'EXECUTE' },
        ],
        cycle: 1,
        challengerTasks: 1,
        defenderTasks: 1,
      });
      expect(state.activityMap[5]).toBe(3);
      expect(state.activityMap[6]).toBe(3);
      expect(state.activityMap[7]).toBe(3);
    });

    it('marks territory on EXECUTE if unclaimed', () => {
      const state = reducer(initialState, {
        type: 'EVENTS',
        events: [{ warriorId: 1, address: 15, accessType: 'EXECUTE' }],
        cycle: 1,
        challengerTasks: 1,
        defenderTasks: 1,
      });
      expect(state.territoryMap[15]).toBe(2); // defender
    });

    it('does not overwrite territory on EXECUTE if already claimed', () => {
      // First claim territory for challenger via WRITE
      const state1 = reducer(initialState, {
        type: 'EVENTS',
        events: [{ warriorId: 0, address: 15, accessType: 'WRITE' }],
        cycle: 1,
        challengerTasks: 1,
        defenderTasks: 1,
      });
      expect(state1.territoryMap[15]).toBe(1); // challenger

      // Defender EXECUTE should not overwrite
      const state2 = reducer(state1, {
        type: 'EVENTS',
        events: [{ warriorId: 1, address: 15, accessType: 'EXECUTE' }],
        cycle: 2,
        challengerTasks: 1,
        defenderTasks: 1,
      });
      expect(state2.territoryMap[15]).toBe(1); // still challenger
    });

    it('decays activity on each step', () => {
      // Set activity to 3
      const state1 = reducer(initialState, {
        type: 'EVENTS',
        events: [{ warriorId: 0, address: 5, accessType: 'READ' }],
        cycle: 1,
        challengerTasks: 1,
        defenderTasks: 1,
      });
      expect(state1.activityMap[5]).toBe(3);

      // Decay: 3 -> 2
      const state2 = reducer(state1, {
        type: 'EVENTS',
        events: [],
        cycle: 2,
        challengerTasks: 1,
        defenderTasks: 1,
      });
      expect(state2.activityMap[5]).toBe(2);

      // Decay: 2 -> 1
      const state3 = reducer(state2, {
        type: 'EVENTS',
        events: [],
        cycle: 3,
        challengerTasks: 1,
        defenderTasks: 1,
      });
      expect(state3.activityMap[5]).toBe(1);

      // Decay: 1 -> 0
      const state4 = reducer(state3, {
        type: 'EVENTS',
        events: [],
        cycle: 4,
        challengerTasks: 1,
        defenderTasks: 1,
      });
      expect(state4.activityMap[5]).toBe(0);
    });

    it('wraps addresses beyond CORE_SIZE', () => {
      const CORE_SIZE = 55440;
      const state = reducer(initialState, {
        type: 'EVENTS',
        events: [{ warriorId: 0, address: CORE_SIZE + 10, accessType: 'WRITE' }],
        cycle: 1,
        challengerTasks: 1,
        defenderTasks: 1,
      });
      expect(state.territoryMap[10]).toBe(1);
    });
  });

  describe('ROUND_END', () => {
    it('sets finished status with winner and endCycle', () => {
      const state = reducer(initialState, {
        type: 'ROUND_END',
        winner: 'challenger',
        cycle: 95160,
      });
      expect(state.status).toBe('finished');
      expect(state.winner).toBe('challenger');
      expect(state.cycle).toBe(95160);
      expect(state.endCycle).toBe(95160);
    });

    it('handles tie result', () => {
      const state = reducer(initialState, {
        type: 'ROUND_END',
        winner: 'tie',
        cycle: 500000,
      });
      expect(state.winner).toBe('tie');
      expect(state.endCycle).toBe(500000);
    });

    it('progress is 100% after ROUND_END', () => {
      const state = reducer(initialState, {
        type: 'ROUND_END',
        winner: 'defender',
        cycle: 95160,
      });
      expect(computeProgress(state)).toBe(100);
    });
  });

  describe('default', () => {
    it('returns state unchanged for unknown action', () => {
      const state = reducer(initialState, { type: 'UNKNOWN' } as unknown as Parameters<typeof reducer>[1]);
      expect(state).toBe(initialState);
    });
  });
});
