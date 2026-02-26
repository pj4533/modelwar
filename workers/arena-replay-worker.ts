import { Simulator, Assembler } from 'pmars-ts';
import type { SimulatorEventListener, CoreAccessEvent } from 'pmars-ts';

interface CoreEvent {
  warriorId: number;
  address: number;
  accessType: 'READ' | 'WRITE' | 'EXECUTE';
}

let pendingEvents: CoreEvent[] = [];
let warriorTasks: number[] = [];
let roundEnded = false;
let roundWinner: number | null = null; // slot index or null for tie
let currentCycle = 0;
let stepCount = 0;
let maxCycles = 80000;
let totalSteps = 0;
let prescanMode = false;

let storedSettings: {
  coreSize: number;
  maxCycles: number;
  maxLength: number;
  maxProcesses: number;
  minSeparation: number;
  seed: number;
} | null = null;
let storedRedcodes: string[] = [];
let storedRoundIndex = 0;
let numWarriors = 0;

let simulator: Simulator | null = null;

const eventListener: SimulatorEventListener = {
  onCoreAccess(events: CoreAccessEvent[]) {
    if (prescanMode) return;
    for (const item of events) {
      pendingEvents.push({
        warriorId: item.warriorId,
        address: item.address,
        accessType: item.accessType,
      });
    }
  },
  onTaskCount(counts) {
    if (prescanMode) return;
    for (const item of counts) {
      if (item.warriorId >= 0 && item.warriorId < numWarriors) {
        warriorTasks[item.warriorId] = item.taskCount;
      }
    }
  },
  onRoundEnd(event) {
    roundEnded = true;
    roundWinner = event.winnerId;
  },
};

function createSimulatorWithWarriors(
  settings: typeof storedSettings,
  redcodes: string[]
): Simulator {
  const assembler = new Assembler({
    coreSize: settings!.coreSize,
    maxCycles: settings!.maxCycles,
    maxLength: settings!.maxLength,
    maxProcesses: settings!.maxProcesses,
    minSeparation: settings!.minSeparation,
  });

  const warriors = redcodes.map((code, i) => {
    const result = assembler.assemble(code);
    if (!result.success) {
      throw new Error(`Failed to assemble warrior ${i}`);
    }
    return result.warrior!;
  });

  const sim = new Simulator({
    coreSize: settings!.coreSize,
    maxCycles: settings!.maxCycles,
    maxLength: settings!.maxLength,
    maxProcesses: settings!.maxProcesses,
    minSeparation: settings!.minSeparation,
    seed: settings!.seed,
  });

  sim.loadWarriors(warriors);
  return sim;
}

function fastForwardRounds(sim: Simulator, count: number): void {
  for (let i = 0; i < count; i++) {
    sim.runRound();
  }
}

function runToCompletion() {
  // Each step() call is one warrior turn. With N warriors,
  // a full round is maxCycles * numWarriors total steps.
  const remaining = totalSteps - stepCount;
  for (let i = 0; i < remaining && !roundEnded; i++) {
    simulator!.step();
    stepCount++;
  }
  currentCycle = Math.floor(stepCount / numWarriors);
}

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;

  if (msg.type === 'init') {
    try {
      const { redcodes, seed, settings, roundIndex } = msg;
      numWarriors = redcodes.length;
      maxCycles = settings.maxCycles;
      totalSteps = maxCycles * numWarriors;

      storedSettings = {
        coreSize: settings.coreSize,
        maxCycles: settings.maxCycles,
        maxLength: settings.maxLength,
        maxProcesses: settings.maxProcesses,
        minSeparation: settings.minSeparation,
        seed,
      };
      storedRedcodes = redcodes;
      storedRoundIndex = roundIndex;

      simulator = createSimulatorWithWarriors(storedSettings, redcodes);

      if (roundIndex > 0) {
        fastForwardRounds(simulator, roundIndex);
      }

      simulator.setEventListener(eventListener);
      simulator.setupRound();

      pendingEvents = [];
      warriorTasks = new Array(numWarriors).fill(0);
      roundEnded = false;
      roundWinner = null;
      currentCycle = 0;
      stepCount = 0;

      self.postMessage({ type: 'initialized' });
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err) });
    }
  } else if (msg.type === 'step') {
    // count = number of Core War cycles to advance
    // Each cycle requires numWarriors step() calls
    const count = msg.count || 1;
    const stepsToRun = count * numWarriors;
    pendingEvents = [];

    for (let i = 0; i < stepsToRun && !roundEnded && stepCount < totalSteps; i++) {
      simulator!.step();
      stepCount++;
    }
    currentCycle = Math.floor(stepCount / numWarriors);

    self.postMessage({
      type: 'events',
      events: pendingEvents,
      cycle: currentCycle,
      warriorTasks: [...warriorTasks],
    });

    if (roundEnded || stepCount >= totalSteps) {
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
      warriorTasks: [...warriorTasks],
    });

    if (roundEnded || stepCount >= totalSteps) {
      self.postMessage({
        type: 'round_end',
        winner: roundWinner,
        cycle: currentCycle,
      });
    }
  } else if (msg.type === 'prescan') {
    prescanMode = true;
    pendingEvents = [];

    runToCompletion();

    const endCycle = currentCycle;

    simulator = createSimulatorWithWarriors(storedSettings, storedRedcodes);

    if (storedRoundIndex > 0) {
      fastForwardRounds(simulator, storedRoundIndex);
    }

    simulator.setEventListener(eventListener);
    simulator.setupRound();

    prescanMode = false;
    pendingEvents = [];
    warriorTasks = new Array(numWarriors).fill(0);
    roundEnded = false;
    roundWinner = null;
    currentCycle = 0;
    stepCount = 0;

    self.postMessage({ type: 'prescan_done', endCycle });
  }
};
