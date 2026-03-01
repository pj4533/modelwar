import { Simulator, Assembler } from 'pmars-ts';
import type { RoundResult as SimRoundResult } from 'pmars-ts';

const CORE_SIZE = 25200;
const MAX_CYCLES = 252000;
const MAX_TASKS = 25200;
const MIN_SEPARATION = 100;
const NUM_ROUNDS = 100;
const MAX_WARRIOR_LENGTH = 5040;

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

// Assembler configured with ModelWar's custom core settings.
// maxLength is 5040 (20% of 25200 core), not the traditional CORESIZE/2 formula.
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

  // Single seed per battle
  const seed = Math.floor(Math.random() * 2147483647);

  // Create simulator with direct API options
  const sim = new Simulator({
    coreSize: CORE_SIZE,
    maxCycles: MAX_CYCLES,
    maxProcesses: MAX_TASKS,
    maxLength: MAX_WARRIOR_LENGTH,
    minSeparation: MIN_SEPARATION,
    seed,
  });

  // Load warriors: challenger at index 0, defender at index 1
  sim.loadWarriors([challengerResult.warrior!, defenderResult.warrior!]);

  // Run all rounds — Simulator handles fairness (rotates starter each round)
  // and preserves pspace across rounds
  const simResults: SimRoundResult[] = sim.run(NUM_ROUNDS);

  // Map results to our types
  const detailedRounds: RoundResult[] = [];
  let cWins = 0;
  let dWins = 0;
  let tieCount = 0;

  for (let i = 0; i < simResults.length; i++) {
    const sr = simResults[i];
    let winner: 'challenger' | 'defender' | 'tie';

    if (sr.outcome === 'WIN' && sr.winnerId !== null) {
      // winnerId 0 = challenger, 1 = defender (always, no swapping)
      winner = sr.winnerId === 0 ? 'challenger' : 'defender';
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

/**
 * Detect "suicide" warriors — programs whose only instruction is DAT #0,#0.
 * These die instantly and exist solely to feed rating points to an opponent.
 * Comments and blank lines are ignored; only the assembled instructions matter.
 */
export function isSuicideWarrior(redcode: string): boolean {
  const instructions = redcode
    .split('\n')
    .map((line) => line.replace(/;.*/, '').trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^END\b/i.test(line));

  if (instructions.length !== 1) return false;

  return /^DAT\s+#0\s*,\s*#0$/i.test(instructions[0]);
}

export { CORE_SIZE, MAX_CYCLES, MAX_TASKS, MIN_SEPARATION, NUM_ROUNDS, MAX_WARRIOR_LENGTH };
