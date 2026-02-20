import { corewar } from 'corewar';
import { mulberry32 } from './prng';
import { HILLS, MAX_WARRIOR_LENGTH } from './hills';
import type { HillConfig } from './hills';

export interface ParseResult {
  success: boolean;
  errors: string[];
  instructionCount: number;
}

export interface RoundResult {
  round: number;
  winner: 'challenger' | 'defender' | 'tie';
  seed: number;
}

export interface BattleResult {
  rounds: RoundResult[];
  challengerWins: number;
  defenderWins: number;
  ties: number;
  overallResult: 'challenger_win' | 'defender_win' | 'tie';
}

export function parseWarrior(redcode: string, maxLength: number = MAX_WARRIOR_LENGTH): ParseResult {
  const result = corewar.parse(redcode);

  const errors = result.messages
    .filter((m) => m.type === 'ERROR')
    .map((m) => `Line ${m.position.line}: ${m.text}`);

  const instructionCount = result.tokens.filter(
    (t) => t.category === 'OPCODE'
  ).length;

  if (result.success && instructionCount > maxLength) {
    return {
      success: false,
      errors: [`Warrior exceeds maximum length of ${maxLength} instructions (has ${instructionCount})`],
      instructionCount,
    };
  }

  return {
    success: result.success,
    errors,
    instructionCount,
  };
}

export function runBattle(challengerRedcode: string, defenderRedcode: string, hill?: HillConfig): BattleResult {
  const config = hill ?? HILLS.big;

  const challengerParsed = corewar.parse(challengerRedcode);
  const defenderParsed = corewar.parse(defenderRedcode);

  if (!challengerParsed.success || !defenderParsed.success) {
    throw new Error('Cannot battle with invalid warriors');
  }

  // Run individual rounds with alternating positions for fairness
  const detailedRounds: RoundResult[] = [];
  let cWins = 0;
  let dWins = 0;
  let tieCount = 0;

  const singleRules = {
    rounds: 1,
    options: {
      coresize: config.coreSize,
      maximumCycles: config.maxCycles,
      instructionLimit: config.maxLength,
      maxTasks: config.maxTasks,
      minSeparation: config.minSeparation,
    },
  };

  for (let i = 0; i < config.numRounds; i++) {
    const seed = Math.floor(Math.random() * 2147483647);
    const originalRandom = Math.random;
    Math.random = mulberry32(seed);

    // Alternate starting positions by swapping warrior order each round
    const swapped = i % 2 !== 0;
    const warriors = swapped
      ? [{ source: defenderParsed }, { source: challengerParsed }]
      : [{ source: challengerParsed }, { source: defenderParsed }];

    // Note: corewar's type definitions say `warriors` but the runtime
    // MatchResultMapper actually returns `results`. Cast to access it.
    const roundResult = corewar.runMatch(singleRules, warriors) as unknown as {
      rounds: number;
      results: { won: number; drawn: number; lost: number }[];
    };
    Math.random = originalRandom;

    const w1 = roundResult.results[0];
    const w2 = roundResult.results[1];

    let winner: 'challenger' | 'defender' | 'tie';
    if (w1.won > w2.won) {
      winner = swapped ? 'defender' : 'challenger';
    } else if (w2.won > w1.won) {
      winner = swapped ? 'challenger' : 'defender';
    } else {
      winner = 'tie';
    }

    if (winner === 'challenger') cWins++;
    else if (winner === 'defender') dWins++;
    else tieCount++;

    detailedRounds.push({ round: i + 1, winner, seed });
  }

  let overallResult: 'challenger_win' | 'defender_win' | 'tie';
  if (cWins > dWins) {
    overallResult = 'challenger_win';
  } else if (dWins > cWins) {
    overallResult = 'defender_win';
  } else {
    overallResult = 'tie';
  }

  return {
    rounds: detailedRounds,
    challengerWins: cWins,
    defenderWins: dWins,
    ties: tieCount,
    overallResult,
  };
}

// Backward-compatible constant exports derived from Big Hill
export const CORE_SIZE = HILLS.big.coreSize;
export const MAX_CYCLES = HILLS.big.maxCycles;
export const MAX_LENGTH = HILLS.big.maxLength;
export const MAX_TASKS = HILLS.big.maxTasks;
export const MIN_SEPARATION = HILLS.big.minSeparation;
export const NUM_ROUNDS = HILLS.big.numRounds;
