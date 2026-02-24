import { corewar, Assembler } from 'pmars-ts';

const CORE_SIZE = 8000;
const MAX_CYCLES = 80000;
const MAX_TASKS = 8000;
const MIN_SEPARATION = 100;
const NUM_ROUNDS = 5;
const MAX_WARRIOR_LENGTH = Math.floor(CORE_SIZE / 2 - MIN_SEPARATION);

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

// Assembler configured with correct options so warriors with FOR/ROF macros
// that expand beyond the default maxLength=100 are handled correctly.
const assembler = new Assembler({
  coreSize: CORE_SIZE,
  maxCycles: MAX_CYCLES,
  maxLength: MAX_WARRIOR_LENGTH,
  maxProcesses: MAX_TASKS,
  minSeparation: MIN_SEPARATION,
});

export function parseWarrior(redcode: string): ParseResult {
  const result = assembler.assemble(redcode);

  const errors = result.messages
    .filter((m) => m.type === 'ERROR')
    .map((m) => `Line ${m.line}: ${m.text}`);

  const instructionCount = result.warrior?.instructions.length ?? 0;

  return {
    success: result.success,
    errors,
    instructionCount,
  };
}

export function runBattle(challengerRedcode: string, defenderRedcode: string): BattleResult {
  // Validate warriors using properly-configured assembler
  const challengerResult = assembler.assemble(challengerRedcode);
  const defenderResult = assembler.assemble(defenderRedcode);

  if (!challengerResult.success || !defenderResult.success) {
    throw new Error('Cannot battle with invalid warriors');
  }

  // Run individual rounds with alternating positions for fairness
  const detailedRounds: RoundResult[] = [];
  let cWins = 0;
  let dWins = 0;
  let tieCount = 0;

  // Placeholder parse result — initialiseSimulator() re-assembles from data strings
  const placeholder = { success: true, metaData: { name: '', author: '', strategy: '' }, tokens: [], messages: [] };

  for (let i = 0; i < NUM_ROUNDS; i++) {
    const seed = Math.floor(Math.random() * 2147483647);

    const options = {
      coresize: CORE_SIZE,
      maximumCycles: MAX_CYCLES,
      instructionLimit: Math.floor(CORE_SIZE / 2 - MIN_SEPARATION),
      maxTasks: MAX_TASKS,
      minSeparation: MIN_SEPARATION,
      seed,
    };

    // Alternate starting positions by swapping warrior order each round
    const swapped = i % 2 !== 0;
    const warriors = swapped
      ? [{ source: placeholder, data: defenderRedcode }, { source: placeholder, data: challengerRedcode }]
      : [{ source: placeholder, data: challengerRedcode }, { source: placeholder, data: defenderRedcode }];

    corewar.initialiseSimulator(options, warriors);
    const roundResult = corewar.run() as { winnerId: number | null; outcome: string } | null;

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

export { CORE_SIZE, MAX_CYCLES, MAX_TASKS, MIN_SEPARATION, NUM_ROUNDS, MAX_WARRIOR_LENGTH };
