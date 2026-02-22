jest.mock('corewar');
jest.mock('../prng');

import { corewar } from 'corewar';
import { parseWarrior, runBattle } from '../engine';
import { mulberry32 } from '../prng';

const mockParse = corewar.parse as jest.Mock;
const mockInitialiseSimulator = corewar.initialiseSimulator as jest.Mock;
const mockRun = corewar.run as jest.Mock;
const mockMulberry32 = mulberry32 as jest.MockedFunction<typeof mulberry32>;

beforeEach(() => {
  mockParse.mockReset();
  mockInitialiseSimulator.mockReset();
  mockRun.mockReset();
  mockMulberry32.mockReset();
  // Default: return a function that behaves like Math.random
  mockMulberry32.mockReturnValue(() => 0.5);
});

function successParse(instructionCount = 5) {
  return {
    success: true,
    messages: [],
    tokens: Array.from({ length: instructionCount }, () => ({ category: 'OPCODE' })),
  };
}

function failParse(errors: Array<{ line: number; text: string }> = []) {
  return {
    success: false,
    messages: errors.map((e) => ({
      type: 'ERROR',
      position: { line: e.line },
      text: e.text,
    })),
    tokens: [],
  };
}

describe('parseWarrior', () => {
  it('returns success with instruction count for valid redcode', () => {
    mockParse.mockReturnValueOnce(successParse(10));

    const result = parseWarrior('MOV 0, 1');

    expect(result).toEqual({
      success: true,
      errors: [],
      instructionCount: 10,
    });
    expect(mockParse).toHaveBeenCalledWith('MOV 0, 1');
  });

  it('returns failure with formatted error messages', () => {
    mockParse.mockReturnValueOnce(
      failParse([
        { line: 3, text: 'Unknown opcode' },
        { line: 7, text: 'Missing operand' },
      ])
    );

    const result = parseWarrior('BAD CODE');

    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      'Line 3: Unknown opcode',
      'Line 7: Missing operand',
    ]);
  });

  it('fails when instruction count exceeds MAX_LENGTH (200)', () => {
    mockParse.mockReturnValueOnce(successParse(201));

    const result = parseWarrior('LONG WARRIOR');

    expect(result.success).toBe(false);
    expect(result.errors).toEqual([
      'Warrior exceeds maximum length of 200 instructions (has 201)',
    ]);
    expect(result.instructionCount).toBe(201);
  });
});

describe('runBattle', () => {
  function setupValidParse() {
    // runBattle parses both warriors, so we need two successful parses
    mockParse.mockReturnValueOnce(successParse(5));
    mockParse.mockReturnValueOnce(successParse(5));
  }

  it('returns challenger_win when challenger wins majority of rounds', () => {
    setupValidParse();

    // 5 rounds: challenger wins 3, defender wins 1, tie 1
    // Round 1 (i=0, not swapped): winnerId 0 → challenger
    // Round 2 (i=1, swapped): winnerId 0 → defender (swapped, so 0=defender)
    // Round 3 (i=2, not swapped): winnerId 0 → challenger
    // Round 4 (i=3, swapped): tie
    // Round 5 (i=4, not swapped): winnerId 0 → challenger
    mockRun
      .mockReturnValueOnce({ winnerId: 0, outcome: 'WIN' })
      .mockReturnValueOnce({ winnerId: 0, outcome: 'WIN' })
      .mockReturnValueOnce({ winnerId: 0, outcome: 'WIN' })
      .mockReturnValueOnce({ winnerId: null, outcome: 'DRAW' })
      .mockReturnValueOnce({ winnerId: 0, outcome: 'WIN' });

    const result = runBattle('CHALLENGER', 'DEFENDER');

    expect(result.overallResult).toBe('challenger_win');
    expect(result.challengerWins).toBe(3);
    expect(result.defenderWins).toBe(1);
    expect(result.ties).toBe(1);
    expect(result.rounds).toHaveLength(5);
  });

  it('returns defender_win when defender wins majority of rounds', () => {
    setupValidParse();

    // 5 rounds: winnerId 1 wins all
    // Even rounds (0,2,4): winnerId 1 = defender
    // Odd rounds (1,3): winnerId 1 = challenger (swapped)
    // So defender wins 3, challenger wins 2
    for (let i = 0; i < 5; i++) {
      mockRun.mockReturnValueOnce({ winnerId: 1, outcome: 'WIN' });
    }

    const result = runBattle('CHALLENGER', 'DEFENDER');

    expect(result.overallResult).toBe('defender_win');
    expect(result.defenderWins).toBe(3);
    expect(result.challengerWins).toBe(2);
  });

  it('returns tie when wins are equal', () => {
    setupValidParse();

    // 5 rounds: all ties (DRAW)
    for (let i = 0; i < 5; i++) {
      mockRun.mockReturnValueOnce({ winnerId: null, outcome: 'DRAW' });
    }

    const result = runBattle('CHALLENGER', 'DEFENDER');

    expect(result.overallResult).toBe('tie');
    expect(result.challengerWins).toBe(0);
    expect(result.defenderWins).toBe(0);
    expect(result.ties).toBe(5);
  });

  it('throws Error when challenger warrior is invalid', () => {
    mockParse.mockReturnValueOnce(failParse([{ line: 1, text: 'bad' }]));
    mockParse.mockReturnValueOnce(successParse(5));

    expect(() => runBattle('INVALID', 'VALID')).toThrow('Cannot battle with invalid warriors');
  });

  it('throws Error when defender warrior is invalid', () => {
    mockParse.mockReturnValueOnce(successParse(5));
    mockParse.mockReturnValueOnce(failParse([{ line: 1, text: 'bad' }]));

    expect(() => runBattle('VALID', 'INVALID')).toThrow('Cannot battle with invalid warriors');
  });

  it('includes a seed in each round result', () => {
    setupValidParse();

    for (let i = 0; i < 5; i++) {
      mockRun.mockReturnValueOnce({ winnerId: null, outcome: 'DRAW' });
    }

    const result = runBattle('CHALLENGER', 'DEFENDER');

    for (const round of result.rounds) {
      expect(round.seed).toBeDefined();
      expect(typeof round.seed).toBe('number');
      expect(round.seed).toBeGreaterThanOrEqual(0);
      expect(round.seed).toBeLessThan(2147483647);
    }
  });

  it('uses mulberry32 seeded PRNG for each round', () => {
    setupValidParse();

    for (let i = 0; i < 5; i++) {
      mockRun.mockReturnValueOnce({ winnerId: null, outcome: 'DRAW' });
    }

    runBattle('CHALLENGER', 'DEFENDER');

    // mulberry32 should be called once per round (5 rounds)
    expect(mockMulberry32).toHaveBeenCalledTimes(5);
  });

  it('alternates warrior positions: even rounds not swapped, odd rounds swapped', () => {
    setupValidParse();

    for (let i = 0; i < 5; i++) {
      mockRun.mockReturnValueOnce({ winnerId: null, outcome: 'DRAW' });
    }

    runBattle('CHALLENGER', 'DEFENDER');

    // Verify initialiseSimulator was called 5 times
    expect(mockInitialiseSimulator).toHaveBeenCalledTimes(5);

    // Even-indexed rounds (0, 2, 4): challenger first
    const call0Warriors = mockInitialiseSimulator.mock.calls[0][1];
    const call2Warriors = mockInitialiseSimulator.mock.calls[2][1];
    const call4Warriors = mockInitialiseSimulator.mock.calls[4][1];

    // Odd-indexed rounds (1, 3): defender first (swapped)
    const call1Warriors = mockInitialiseSimulator.mock.calls[1][1];
    const call3Warriors = mockInitialiseSimulator.mock.calls[3][1];

    // For even rounds, first warrior source should be challengerParsed
    // For odd rounds, first warrior source should be defenderParsed
    expect(call0Warriors[0].source).toBe(call2Warriors[0].source);
    expect(call0Warriors[0].source).toBe(call4Warriors[0].source);
    expect(call1Warriors[0].source).toBe(call3Warriors[0].source);
    // Even and odd should have swapped first warriors
    expect(call0Warriors[0].source).not.toBe(call1Warriors[0].source);
    expect(call0Warriors[0].source).toBe(call1Warriors[1].source);
  });

  it('passes maxTasks in options to initialiseSimulator', () => {
    setupValidParse();

    for (let i = 0; i < 5; i++) {
      mockRun.mockReturnValueOnce({ winnerId: null, outcome: 'DRAW' });
    }

    runBattle('CHALLENGER', 'DEFENDER');

    // Verify options include maxTasks
    const options = mockInitialiseSimulator.mock.calls[0][0];
    expect(options).toEqual({
      coresize: 55440,
      maximumCycles: 500000,
      instructionLimit: 200,
      maxTasks: 10000,
      minSeparation: 200,
    });
  });

  it('correctly counts wins/losses/ties across all 5 rounds', () => {
    setupValidParse();

    // Round 1 (i=0, not swapped): winnerId 0 → challenger wins
    mockRun.mockReturnValueOnce({ winnerId: 0, outcome: 'WIN' });
    // Round 2 (i=1, swapped): winnerId 0 → defender wins (0=defender when swapped)
    mockRun.mockReturnValueOnce({ winnerId: 0, outcome: 'WIN' });
    // Round 3 (i=2, not swapped): tie
    mockRun.mockReturnValueOnce({ winnerId: null, outcome: 'DRAW' });
    // Round 4 (i=3, swapped): winnerId 1 → challenger wins (1=challenger when swapped)
    mockRun.mockReturnValueOnce({ winnerId: 1, outcome: 'WIN' });
    // Round 5 (i=4, not swapped): winnerId 1 → defender wins
    mockRun.mockReturnValueOnce({ winnerId: 1, outcome: 'WIN' });

    const result = runBattle('C', 'D');

    expect(result.challengerWins).toBe(2);
    expect(result.defenderWins).toBe(2);
    expect(result.ties).toBe(1);
    expect(result.overallResult).toBe('tie');
    expect(result.rounds).toEqual([
      { round: 1, winner: 'challenger', seed: expect.any(Number) },
      { round: 2, winner: 'defender', seed: expect.any(Number) },
      { round: 3, winner: 'tie', seed: expect.any(Number) },
      { round: 4, winner: 'challenger', seed: expect.any(Number) },
      { round: 5, winner: 'defender', seed: expect.any(Number) },
    ]);
  });
});
