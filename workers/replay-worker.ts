import { corewar } from 'corewar';
import { mulberry32 } from '../lib/prng';

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
let maxCycles = 500000;
// Maps worker-internal warrior indices to logical roles
let warriorIndexToRole: ('challenger' | 'defender')[];

const messageProvider = {
  publishSync(topic: string, payload: unknown) {
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

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;

  if (msg.type === 'init') {
    try {
      const { challengerRedcode, defenderRedcode, seed, settings, roundIndex } = msg;
      maxCycles = settings.maxCycles;

      const challengerParsed = corewar.parse(challengerRedcode);
      const defenderParsed = corewar.parse(defenderRedcode);

      if (!challengerParsed.success || !defenderParsed.success) {
        self.postMessage({ type: 'error', message: 'Failed to parse warrior Redcode' });
        return;
      }

      const swapped = roundIndex % 2 !== 0;
      const warriors = swapped
        ? [{ source: defenderParsed }, { source: challengerParsed }]
        : [{ source: challengerParsed }, { source: defenderParsed }];

      warriorIndexToRole = swapped
        ? ['defender', 'challenger']
        : ['challenger', 'defender'];

      const originalRandom = Math.random;
      Math.random = mulberry32(seed);

      corewar.initialiseSimulator(
        {
          coresize: settings.coreSize,
          maximumCycles: settings.maxCycles,
          instructionLimit: settings.maxLength,
          // maxTasks intentionally omitted — matches runMatch() behavior in engine.ts
          minSeparation: settings.minSeparation,
        },
        warriors,
        messageProvider
      );

      Math.random = originalRandom;

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

    const remaining = maxCycles - currentCycle;
    for (let i = 0; i < remaining && !roundEnded; i++) {
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

    if (roundEnded || currentCycle >= maxCycles) {
      self.postMessage({
        type: 'round_end',
        winner: roundWinner ?? 'tie',
        cycle: currentCycle,
      });
    }
  }
};
