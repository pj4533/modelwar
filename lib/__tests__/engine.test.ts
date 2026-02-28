jest.mock('pmars-ts');

import { Simulator, Assembler } from 'pmars-ts';
import { parseWarrior, runBattle, isSuicideWarrior } from '../engine';

const MockAssembler = Assembler as jest.MockedClass<typeof Assembler>;
const mockAssemble = MockAssembler.prototype.assemble as jest.Mock;
const MockSimulator = Simulator as jest.MockedClass<typeof Simulator>;
const mockLoadWarriors = MockSimulator.prototype.loadWarriors as jest.Mock;
const mockRun = MockSimulator.prototype.run as jest.Mock;

beforeEach(() => {
  mockAssemble.mockReset();
  mockLoadWarriors.mockReset();
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

function tieRounds(count: number) {
  return Array.from({ length: count }, () => ({ winnerId: null, outcome: 'TIE' }));
}

function simRounds(cWins: number, dWins: number, ties: number) {
  return [
    ...Array.from({ length: cWins }, () => ({ winnerId: 0, outcome: 'WIN' })),
    ...Array.from({ length: dWins }, () => ({ winnerId: 1, outcome: 'WIN' })),
    ...Array.from({ length: ties }, () => ({ winnerId: null, outcome: 'TIE' })),
  ];
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

describe('isSuicideWarrior', () => {
  it('detects bare DAT #0,#0', () => {
    expect(isSuicideWarrior('DAT #0,#0')).toBe(true);
  });

  it('detects with comments and END', () => {
    const code = `;redcode-94nop
;name SuicideFeed
DAT #0,#0
END`;
    expect(isSuicideWarrior(code)).toBe(true);
  });

  it('detects with different comment text', () => {
    const code = `;redcode-94nop
;name SomethingElse
;author Evil
DAT #0,#0
END`;
    expect(isSuicideWarrior(code)).toBe(true);
  });

  it('detects case-insensitive DAT', () => {
    expect(isSuicideWarrior('dat #0, #0')).toBe(true);
  });

  it('detects with spaces around comma', () => {
    expect(isSuicideWarrior('DAT #0 , #0')).toBe(true);
  });

  it('rejects multi-instruction warriors', () => {
    expect(isSuicideWarrior('MOV 0, 1\nDAT #0, #0')).toBe(false);
  });

  it('rejects real warriors', () => {
    const code = `;redcode-94nop
;name Imp
MOV 0, 1
END`;
    expect(isSuicideWarrior(code)).toBe(false);
  });

  it('rejects empty redcode', () => {
    expect(isSuicideWarrior('')).toBe(false);
  });

  it('rejects comment-only redcode', () => {
    expect(isSuicideWarrior(';just a comment')).toBe(false);
  });

  it('rejects DAT with non-zero operands', () => {
    expect(isSuicideWarrior('DAT #1, #0')).toBe(false);
    expect(isSuicideWarrior('DAT #0, #1')).toBe(false);
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

    // Simulator.run returns all round results at once
    // winnerId 0 = challenger, 1 = defender (no swapping)
    mockRun.mockReturnValueOnce(simRounds(60, 30, 10));

    const result = runBattle('CHALLENGER', 'DEFENDER');

    expect(result.overallResult).toBe('challenger_win');
    expect(result.challengerWins).toBe(60);
    expect(result.defenderWins).toBe(30);
    expect(result.ties).toBe(10);
    expect(result.rounds).toHaveLength(100);
  });

  it('returns defender_win when defender wins majority of rounds', () => {
    setupValidAssemble();

    mockRun.mockReturnValueOnce(simRounds(30, 60, 10));

    const result = runBattle('CHALLENGER', 'DEFENDER');

    expect(result.overallResult).toBe('defender_win');
    expect(result.defenderWins).toBe(60);
    expect(result.challengerWins).toBe(30);
  });

  it('returns tie when wins are equal', () => {
    setupValidAssemble();

    mockRun.mockReturnValueOnce(tieRounds(100));

    const result = runBattle('CHALLENGER', 'DEFENDER');

    expect(result.overallResult).toBe('tie');
    expect(result.challengerWins).toBe(0);
    expect(result.defenderWins).toBe(0);
    expect(result.ties).toBe(100);
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

  it('all rounds share the same seed value', () => {
    setupValidAssemble();

    mockRun.mockReturnValueOnce(tieRounds(100));

    const result = runBattle('CHALLENGER', 'DEFENDER');

    const seeds = result.rounds.map((r) => r.seed);
    expect(seeds[0]).toBeDefined();
    expect(typeof seeds[0]).toBe('number');
    expect(seeds[0]).toBeGreaterThanOrEqual(0);
    expect(seeds[0]).toBeLessThan(2147483647);
    // All rounds share the same seed
    expect(new Set(seeds).size).toBe(1);
  });

  it('passes correct WarriorData to loadWarriors (challenger index 0, defender index 1)', () => {
    setupValidAssemble();

    mockRun.mockReturnValueOnce(tieRounds(100));

    runBattle('CHALLENGER', 'DEFENDER');

    expect(mockLoadWarriors).toHaveBeenCalledTimes(1);
    const warriors = mockLoadWarriors.mock.calls[0][0];
    expect(warriors).toHaveLength(2);
    // Both should be WarriorData objects from the assembler
    expect(warriors[0].name).toBe('Test');
    expect(warriors[1].name).toBe('Test');
  });

  it('creates Simulator with direct API option names', () => {
    setupValidAssemble();

    mockRun.mockReturnValueOnce(tieRounds(100));

    runBattle('CHALLENGER', 'DEFENDER');

    // Verify Simulator was constructed with direct API options
    expect(MockSimulator).toHaveBeenCalledWith({
      coreSize: 8000,
      maxCycles: 80000,
      maxProcesses: 8000,
      maxLength: 3900,
      minSeparation: 100,
      seed: expect.any(Number),
    });
  });

  it('correctly counts wins/losses/ties across all 100 rounds', () => {
    setupValidAssemble();

    mockRun.mockReturnValueOnce(simRounds(40, 40, 20));

    const result = runBattle('C', 'D');

    expect(result.challengerWins).toBe(40);
    expect(result.defenderWins).toBe(40);
    expect(result.ties).toBe(20);
    expect(result.overallResult).toBe('tie');
    expect(result.rounds).toHaveLength(100);
    // Verify round numbering
    expect(result.rounds[0].round).toBe(1);
    expect(result.rounds[99].round).toBe(100);
    // First 40 are challenger wins, next 40 defender wins, last 20 ties
    expect(result.rounds[0].winner).toBe('challenger');
    expect(result.rounds[40].winner).toBe('defender');
    expect(result.rounds[80].winner).toBe('tie');
  });
});
