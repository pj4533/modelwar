jest.mock('pmars-ts');

import { corewar, Assembler } from 'pmars-ts';
import { parseWarrior, runBattle } from '../engine';

const MockAssembler = Assembler as jest.MockedClass<typeof Assembler>;
const mockAssemble = MockAssembler.prototype.assemble as jest.Mock;
const mockInitialiseSimulator = corewar.initialiseSimulator as jest.Mock;
const mockRun = corewar.run as jest.Mock;

beforeEach(() => {
  mockAssemble.mockReset();
  mockInitialiseSimulator.mockReset();
  mockRun.mockReset();
});

function successAssemble(instructionCount = 5) {
  return {
    success: true,
    messages: [],
    warrior: {
      instructions: Array.from({ length: instructionCount }, () => ({})),
      startOffset: 0,
      name: 'Test',
      author: 'Test',
      strategy: '',
      pin: null,
    },
  };
}

function failAssemble(errors: Array<{ line: number; text: string }> = []) {
  return {
    success: false,
    messages: errors.map((e) => ({
      type: 'ERROR',
      line: e.line,
      text: e.text,
    })),
    warrior: null,
  };
}

describe('parseWarrior', () => {
  it('returns success with instruction count for valid redcode', () => {
    mockAssemble.mockReturnValueOnce(successAssemble(10));

    const result = parseWarrior('MOV 0, 1');

    expect(result).toEqual({
      success: true,
      errors: [],
      instructionCount: 10,
    });
    expect(mockAssemble).toHaveBeenCalledWith('MOV 0, 1');
  });

  it('returns failure for warriors that fail assembly', () => {
    mockAssemble.mockReturnValueOnce({
      success: false,
      messages: [{ type: 'ERROR', line: 0, text: 'Warrior has 3901 instructions, limit is 3900' }],
      warrior: null,
    });

    const result = parseWarrior('HUGE WARRIOR');

    expect(result.success).toBe(false);
    expect(result.instructionCount).toBe(0);
  });

  it('accepts warriors at exactly MAX_WARRIOR_LENGTH (3900)', () => {
    mockAssemble.mockReturnValueOnce(successAssemble(3900));

    const result = parseWarrior('BIG WARRIOR');

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.instructionCount).toBe(3900);
  });

  it('returns failure with formatted error messages', () => {
    mockAssemble.mockReturnValueOnce(
      failAssemble([
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

});

describe('runBattle', () => {
  function setupValidAssemble() {
    // runBattle assembles both warriors, so we need two successful results
    mockAssemble.mockReturnValueOnce(successAssemble(5));
    mockAssemble.mockReturnValueOnce(successAssemble(5));
  }

  it('returns challenger_win when challenger wins majority of rounds', () => {
    setupValidAssemble();

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
    setupValidAssemble();

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
    setupValidAssemble();

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
    mockAssemble.mockReturnValueOnce(failAssemble([{ line: 1, text: 'bad' }]));
    mockAssemble.mockReturnValueOnce(successAssemble(5));

    expect(() => runBattle('INVALID', 'VALID')).toThrow('Cannot battle with invalid warriors');
  });

  it('throws Error when defender warrior is invalid', () => {
    mockAssemble.mockReturnValueOnce(successAssemble(5));
    mockAssemble.mockReturnValueOnce(failAssemble([{ line: 1, text: 'bad' }]));

    expect(() => runBattle('VALID', 'INVALID')).toThrow('Cannot battle with invalid warriors');
  });

  it('includes a seed in each round result', () => {
    setupValidAssemble();

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

  it('alternates warrior positions: even rounds not swapped, odd rounds swapped', () => {
    setupValidAssemble();

    for (let i = 0; i < 5; i++) {
      mockRun.mockReturnValueOnce({ winnerId: null, outcome: 'DRAW' });
    }

    runBattle('CHALLENGER', 'DEFENDER');

    // Verify initialiseSimulator was called 5 times
    expect(mockInitialiseSimulator).toHaveBeenCalledTimes(5);

    // Even-indexed rounds (0, 2, 4): challenger first (data = 'CHALLENGER')
    const call0Warriors = mockInitialiseSimulator.mock.calls[0][1];
    const call2Warriors = mockInitialiseSimulator.mock.calls[2][1];
    const call4Warriors = mockInitialiseSimulator.mock.calls[4][1];

    // Odd-indexed rounds (1, 3): defender first (data = 'DEFENDER')
    const call1Warriors = mockInitialiseSimulator.mock.calls[1][1];
    const call3Warriors = mockInitialiseSimulator.mock.calls[3][1];

    // Even rounds: first warrior data should be challenger redcode
    expect(call0Warriors[0].data).toBe('CHALLENGER');
    expect(call2Warriors[0].data).toBe('CHALLENGER');
    expect(call4Warriors[0].data).toBe('CHALLENGER');

    // Odd rounds: first warrior data should be defender redcode (swapped)
    expect(call1Warriors[0].data).toBe('DEFENDER');
    expect(call3Warriors[0].data).toBe('DEFENDER');
  });

  it('passes maxTasks in options to initialiseSimulator', () => {
    setupValidAssemble();

    for (let i = 0; i < 5; i++) {
      mockRun.mockReturnValueOnce({ winnerId: null, outcome: 'DRAW' });
    }

    runBattle('CHALLENGER', 'DEFENDER');

    // Verify options include maxTasks and seed
    const options = mockInitialiseSimulator.mock.calls[0][0];
    expect(options).toEqual({
      coresize: 8000,
      maximumCycles: 80000,
      instructionLimit: 3900,
      maxTasks: 8000,
      minSeparation: 100,
      seed: expect.any(Number),
    });
  });

  it('correctly counts wins/losses/ties across all 5 rounds', () => {
    setupValidAssemble();

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
