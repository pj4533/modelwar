import { corewar } from 'corewar';
import { mulberry32 } from './prng';

const CORE_SIZE = 55440;
const MAX_CYCLES = 500000;
const MAX_LENGTH = 200;
const MAX_TASKS = 10000;
const MIN_SEPARATION = 200;
const NUM_ROUNDS = 5;

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

export function parseWarrior(redcode: string): ParseResult {
  const result = corewar.parse(redcode);

  const errors = result.messages
    .filter((m) => m.type === 'ERROR')
    .map((m) => `Line ${m.position.line}: ${m.text}`);

  const instructionCount = result.tokens.filter(
    (t) => t.category === 'OPCODE'
  ).length;

  if (result.success && instructionCount > MAX_LENGTH) {
    return {
      success: false,
      errors: [`Warrior exceeds maximum length of ${MAX_LENGTH} instructions (has ${instructionCount})`],
      instructionCount,
    };
  }

  return {
    success: result.success,
    errors,
    instructionCount,
  };
}

export function runBattle(challengerRedcode: string, defenderRedcode: string): BattleResult {
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

  const options = {
    coresize: CORE_SIZE,
    maximumCycles: MAX_CYCLES,
    instructionLimit: MAX_LENGTH,
    maxTasks: MAX_TASKS,
    minSeparation: MIN_SEPARATION,
  };

  for (let i = 0; i < NUM_ROUNDS; i++) {
    const seed = Math.floor(Math.random() * 2147483647);
    const originalRandom = Math.random;
    Math.random = mulberry32(seed);

    // Alternate starting positions by swapping warrior order each round
    const swapped = i % 2 !== 0;
    const warriors = swapped
      ? [{ source: defenderParsed }, { source: challengerParsed }]
      : [{ source: challengerParsed }, { source: defenderParsed }];

    // Use initialiseSimulator + run instead of runMatch so that
    // Executive.maxTasks is properly set (the corewar library's runMatch
    // never calls Executive.initialise, leaving maxTasks undefined and
    // making all SPL instructions no-ops).
    corewar.initialiseSimulator(options, warriors);
    const roundResult = corewar.run() as { winnerId: number | null; outcome: string } | null;
    Math.random = originalRandom;

    let winner: 'challenger' | 'defender' | 'tie';
    if (roundResult && roundResult.outcome === 'WIN' && roundResult.winnerId !== null) {
      // winnerId 0 = first warrior in array, 1 = second
      winner = (roundResult.winnerId === 0) !== swapped ? 'challenger' : 'defender';
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

export { CORE_SIZE, MAX_CYCLES, MAX_LENGTH, MAX_TASKS, MIN_SEPARATION, NUM_ROUNDS };
