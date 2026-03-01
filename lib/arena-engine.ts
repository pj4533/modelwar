import { Simulator, Assembler } from 'pmars-ts';
import type { TaskCountEvent } from 'pmars-ts';

// Arena uses original 8000 core (independent of 1v1 settings)
const CORE_SIZE = 8000;
const MAX_CYCLES = 80000;
const MAX_TASKS = 8000;
const MIN_SEPARATION = 100;
const MAX_WARRIOR_LENGTH = 100;

// Arena-specific constants
export const ARENA_NUM_ROUNDS = 200;
export const ARENA_MAX_WARRIORS = 10;

export interface ArenaWarrior {
  redcode: string;
  slotIndex: number;
}

export interface ArenaRoundResult {
  round: number;
  seed: number;
  survivorCount: number;
  winnerSlot: number | null; // null if tie (multiple survivors or all dead)
  scores: number[]; // per-slot scores for this round (index = warrior array position)
}

export interface ArenaPlacement {
  slotIndex: number;
  totalScore: number;
  placement: number; // 1 = first, 10 = last
}

export interface ArenaResult {
  roundResults: ArenaRoundResult[];
  placements: ArenaPlacement[];
  seed: number;
}

const assembler = new Assembler({
  coreSize: CORE_SIZE,
  maxCycles: MAX_CYCLES,
  maxLength: MAX_WARRIOR_LENGTH,
  maxProcesses: MAX_TASKS,
  minSeparation: MIN_SEPARATION,
});

/**
 * Run a multi-warrior arena battle.
 * @param warriors Array of warriors with redcode and slot indices
 * @param rounds Number of rounds to simulate (default 200)
 * @param seed Random seed for deterministic simulation
 */
export function runArenaBattle(
  warriors: ArenaWarrior[],
  rounds: number = ARENA_NUM_ROUNDS,
  seed?: number
): ArenaResult {
  if (warriors.length < 2 || warriors.length > ARENA_MAX_WARRIORS) {
    throw new Error(`Arena requires 2-${ARENA_MAX_WARRIORS} warriors, got ${warriors.length}`);
  }

  // Assemble all warriors
  const assembled = warriors.map((w) => {
    const result = assembler.assemble(w.redcode);
    if (!result.success) {
      throw new Error(`Failed to assemble warrior at slot ${w.slotIndex}`);
    }
    return result.warrior!;
  });

  const battleSeed = seed ?? Math.floor(Math.random() * 2147483647);
  const W = warriors.length;
  const wScore = W * (W - 1); // e.g., 90 for 10 warriors

  // Create simulator for N warriors
  const sim = new Simulator({
    coreSize: CORE_SIZE,
    maxCycles: MAX_CYCLES,
    maxProcesses: MAX_TASKS,
    maxLength: MAX_WARRIOR_LENGTH,
    minSeparation: MIN_SEPARATION,
    warriors: W,
    seed: battleSeed,
  });

  // Track task counts via event listener
  let lastTaskCounts: number[] = new Array(W).fill(0);
  sim.setEventListener({
    onTaskCount: (counts: TaskCountEvent[]) => {
      // Zero all first — pmars-ts only reports alive warriors,
      // so dead warriors must be explicitly zeroed out
      lastTaskCounts.fill(0);
      for (const tc of counts) {
        if (tc.warriorId >= 0 && tc.warriorId < W) {
          lastTaskCounts[tc.warriorId] = tc.taskCount;
        }
      }
    },
  });

  sim.loadWarriors(assembled);

  // Accumulate scores per warrior across all rounds
  const totalScores = new Array(W).fill(0);
  const roundResults: ArenaRoundResult[] = [];

  for (let r = 0; r < rounds; r++) {
    // Reset task counts for this round
    lastTaskCounts = new Array(W).fill(0);

    const sr = sim.runRound();
    const scores = new Array(W).fill(0);
    let survivorCount: number;
    let winnerSlot: number | null = null;

    if (sr.outcome === 'WIN' && sr.winnerId !== null) {
      // Single survivor
      survivorCount = 1;
      winnerSlot = warriors[sr.winnerId].slotIndex;
      scores[sr.winnerId] = wScore; // 90 for 10 warriors
    } else {
      // TIE: determine survivors from task counts
      survivorCount = lastTaskCounts.filter((t) => t > 0).length;

      if (survivorCount > 0) {
        const scorePerSurvivor = Math.floor(wScore / survivorCount);
        for (let j = 0; j < W; j++) {
          if (lastTaskCounts[j] > 0) {
            scores[j] = scorePerSurvivor;
          }
        }
      }
      // If survivorCount === 0 (all dead), all scores stay 0
    }

    // Accumulate
    for (let j = 0; j < W; j++) {
      totalScores[j] += scores[j];
    }

    roundResults.push({
      round: r + 1,
      seed: battleSeed,
      survivorCount,
      winnerSlot,
      scores,
    });
  }

  // Calculate placements by total score (highest = 1st)
  const indexed = warriors.map((w, i) => ({
    slotIndex: w.slotIndex,
    totalScore: totalScores[i],
  }));

  // Sort by total score descending
  indexed.sort((a, b) => b.totalScore - a.totalScore);

  // Assign placements (tied scores get same placement)
  const placements: ArenaPlacement[] = [];
  for (let i = 0; i < indexed.length; i++) {
    let placement = i + 1;
    if (i > 0 && indexed[i].totalScore === indexed[i - 1].totalScore) {
      placement = placements[i - 1].placement;
    }
    placements.push({
      slotIndex: indexed[i].slotIndex,
      totalScore: indexed[i].totalScore,
      placement,
    });
  }

  return {
    roundResults,
    placements,
    seed: battleSeed,
  };
}

export { CORE_SIZE, MAX_CYCLES, MAX_TASKS, MIN_SEPARATION, MAX_WARRIOR_LENGTH };
