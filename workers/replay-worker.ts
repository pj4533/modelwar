import { Simulator, Assembler } from 'pmars-ts';
import type { SimulatorEventListener, CoreAccessEvent, RoundResult } from 'pmars-ts';

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

// Stored init params for re-initialization after prescan
let storedSettings: {
  coreSize: number;
  maxCycles: number;
  maxLength: number;
  maxProcesses: number;
  minSeparation: number;
  seed: number;
} | null = null;
let storedChallengerRedcode = '';
let storedDefenderRedcode = '';
let storedRoundIndex = 0;

let simulator: Simulator | null = null;

const eventListener: SimulatorEventListener = {
  onCoreAccess(events: CoreAccessEvent[]) {
    if (prescanMode) return;
    for (const item of events) {
      pendingEvents.push({
        // challenger is always warrior 0, defender is always warrior 1
        warriorId: item.warriorId,
        address: item.address,
        accessType: item.accessType,
      });
    }
  },
  onTaskCount(counts) {
    if (prescanMode) return;
    for (const item of counts) {
      if (item.warriorId === 0) {
        challengerTasks = item.taskCount;
      } else {
        defenderTasks = item.taskCount;
      }
    }
  },
  onRoundEnd(event) {
    roundEnded = true;
    if (event.winnerId !== null) {
      roundWinner = event.winnerId === 0 ? 'challenger' : 'defender';
    } else {
      roundWinner = 'tie';
    }
  },
};

function createSimulatorWithWarriors(settings: typeof storedSettings, challengerRedcode: string, defenderRedcode: string): Simulator {
  const assembler = new Assembler({
    coreSize: settings!.coreSize,
    maxCycles: settings!.maxCycles,
    maxLength: settings!.maxLength,
    maxProcesses: settings!.maxProcesses,
    minSeparation: settings!.minSeparation,
  });

  const challengerResult = assembler.assemble(challengerRedcode);
  const defenderResult = assembler.assemble(defenderRedcode);

  if (!challengerResult.success || !defenderResult.success) {
    throw new Error('Failed to assemble warriors');
  }

  const sim = new Simulator({
    coreSize: settings!.coreSize,
    maxCycles: settings!.maxCycles,
    maxLength: settings!.maxLength,
    maxProcesses: settings!.maxProcesses,
    minSeparation: settings!.minSeparation,
    seed: settings!.seed,
  });

  sim.loadWarriors([challengerResult.warrior!, defenderResult.warrior!]);
  return sim;
}

function fastForwardRounds(sim: Simulator, numRounds: number): void {
  for (let i = 0; i < numRounds; i++) {
    sim.runRound();
  }
}

function runToCompletion() {
  const remaining = maxCycles - currentCycle;
  for (let i = 0; i < remaining && !roundEnded; i++) {
    simulator!.step();
    currentCycle++;
  }
}

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;

  if (msg.type === 'init') {
    try {
      const { challengerRedcode, defenderRedcode, seed, settings, roundIndex } = msg;
      maxCycles = settings.maxCycles;

      storedSettings = {
        coreSize: settings.coreSize,
        maxCycles: settings.maxCycles,
        maxLength: settings.maxLength,
        maxProcesses: settings.maxTasks,
        minSeparation: settings.minSeparation,
        seed,
      };
      storedChallengerRedcode = challengerRedcode;
      storedDefenderRedcode = defenderRedcode;
      storedRoundIndex = roundIndex;

      // Create simulator and load warriors
      simulator = createSimulatorWithWarriors(storedSettings, challengerRedcode, defenderRedcode);

      // Fast-forward prior rounds to build up correct pspace state
      if (roundIndex > 0) {
        fastForwardRounds(simulator, roundIndex);
      }

      // Set event listener for the target round
      simulator.setEventListener(eventListener);
      simulator.setupRound();

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
      simulator!.step();
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

    // Re-create simulator with same params for actual replay
    simulator = createSimulatorWithWarriors(storedSettings, storedChallengerRedcode, storedDefenderRedcode);

    // Fast-forward prior rounds again for correct pspace
    if (storedRoundIndex > 0) {
      fastForwardRounds(simulator, storedRoundIndex);
    }

    // Set event listener and set up the target round
    simulator.setEventListener(eventListener);
    simulator.setupRound();

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
