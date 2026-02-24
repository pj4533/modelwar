import { corewar } from 'pmars-ts';

interface CoreEvent {
  warriorId: number;
  address: number;
  accessType: 'READ' | 'WRITE' | 'EXECUTE';
}

let pendingEvents: CoreEvent[] = [];
let challengerTasks = 0;
let defenderTasks = 0;
let roundEnded = false;
let roundWinner: string | null = null;
let currentCycle = 0;
let maxCycles = 80000;
let prescanMode = false;
// Maps worker-internal warrior indices to logical roles
let warriorIndexToRole: ('challenger' | 'defender')[];

// Stored init params for re-initialization after prescan
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let storedWarriors: any[] = [];
let storedSettings: {
  coresize: number;
  maximumCycles: number;
  instructionLimit: number;
  maxTasks: number;
  minSeparation: number;
  seed: number;
} | null = null;

const messageProvider = {
  publishSync(topic: string, payload: unknown) {
    if (prescanMode && topic !== 'ROUND_END') return;
    if (topic === 'CORE_ACCESS') {
      // PerKeyStrategy delivers an array of event objects
      const items = payload as Array<Record<string, unknown>>;
      for (const item of items) {
        const internalId = item.warriorId as number;
        pendingEvents.push({
          warriorId: warriorIndexToRole[internalId] === 'challenger' ? 0 : 1,
          address: item.address as number,
          accessType: item.accessType as 'READ' | 'WRITE' | 'EXECUTE',
        });
      }
    } else if (topic === 'TASK_COUNT') {
      // PerKeyStrategy delivers an array of task count objects
      const items = payload as Array<Record<string, unknown>>;
      for (const item of items) {
        const internalId = item.warriorId as number;
        const role = warriorIndexToRole[internalId];
        if (role === 'challenger') {
          challengerTasks = item.taskCount as number;
        } else {
          defenderTasks = item.taskCount as number;
        }
      }
    } else if (topic === 'ROUND_END') {
      // LatestOnlyStrategy delivers a single object
      const data = payload as Record<string, unknown>;
      roundEnded = true;
      const winnerId = data.winnerId as number | undefined;
      if (winnerId !== undefined && winnerId !== null) {
        roundWinner = warriorIndexToRole[winnerId];
      } else {
        roundWinner = 'tie';
      }
    }
  },
};

function runToCompletion() {
  const remaining = maxCycles - currentCycle;
  for (let i = 0; i < remaining && !roundEnded; i++) {
    corewar.step();
    currentCycle++;
  }
}

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;

  if (msg.type === 'init') {
    try {
      const { challengerRedcode, defenderRedcode, seed, settings, roundIndex } = msg;
      maxCycles = settings.maxCycles;

      const swapped = roundIndex % 2 !== 0;

      // Skip corewar.parse() — the default assembler has maxLength=100 which
      // rejects warriors with FOR/ROF macros that expand beyond 100 instructions.
      // Instead, pass placeholder parse results with raw redcode as data.
      // initialiseSimulator() re-assembles from data strings with correct options.
      const placeholder = { success: true, metaData: { name: '', author: '', strategy: '' }, tokens: [], messages: [] };
      const warriors = swapped
        ? [{ source: placeholder, data: defenderRedcode }, { source: placeholder, data: challengerRedcode }]
        : [{ source: placeholder, data: challengerRedcode }, { source: placeholder, data: defenderRedcode }];

      warriorIndexToRole = swapped
        ? ['defender', 'challenger']
        : ['challenger', 'defender'];

      const simSettings = {
        coresize: settings.coreSize,
        maximumCycles: settings.maxCycles,
        instructionLimit: settings.maxLength,
        maxTasks: settings.maxTasks,
        minSeparation: settings.minSeparation,
        seed,
      };

      corewar.initialiseSimulator(simSettings, warriors, messageProvider);

      storedWarriors = warriors;
      storedSettings = simSettings;

      pendingEvents = [];
      challengerTasks = 0;
      defenderTasks = 0;
      roundEnded = false;
      roundWinner = null;
      currentCycle = 0;

      self.postMessage({ type: 'initialized' });
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err) });
    }
  } else if (msg.type === 'step') {
    const count = msg.count || 1;
    pendingEvents = [];

    for (let i = 0; i < count && !roundEnded; i++) {
      corewar.step();
      currentCycle++;
    }

    self.postMessage({
      type: 'events',
      events: pendingEvents,
      cycle: currentCycle,
      challengerTasks,
      defenderTasks,
    });

    if (roundEnded) {
      self.postMessage({
        type: 'round_end',
        winner: roundWinner,
        cycle: currentCycle,
      });
    }
  } else if (msg.type === 'run_to_end') {
    pendingEvents = [];

    runToCompletion();

    self.postMessage({
      type: 'events',
      events: pendingEvents,
      cycle: currentCycle,
      challengerTasks,
      defenderTasks,
    });

    if (roundEnded || currentCycle >= maxCycles) {
      self.postMessage({
        type: 'round_end',
        winner: roundWinner ?? 'tie',
        cycle: currentCycle,
      });
    }
  } else if (msg.type === 'prescan') {
    prescanMode = true;
    pendingEvents = [];

    runToCompletion();

    const endCycle = currentCycle;

    // Re-initialize simulator with same params for actual replay
    corewar.initialiseSimulator(storedSettings!, storedWarriors, messageProvider);

    // Reset all state
    prescanMode = false;
    pendingEvents = [];
    challengerTasks = 0;
    defenderTasks = 0;
    roundEnded = false;
    roundWinner = null;
    currentCycle = 0;

    self.postMessage({ type: 'prescan_done', endCycle });
  }
};
