jest.mock('corewar');

import { corewar } from 'corewar';
import { parseWarrior, runBattle } from '../engine';

const mockParse = corewar.parse as jest.Mock;
const mockRunMatch = corewar.runMatch as jest.Mock;

beforeEach(() => {
  mockParse.mockReset();
  mockRunMatch.mockReset();
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
    mockRunMatch
      .mockReturnValueOnce({ rounds: 1, results: [{ won: 1, drawn: 0, lost: 0 }, { won: 0, drawn: 0, lost: 1 }] })  // round 1: w1 wins (not swapped → challenger)
      .mockReturnValueOnce({ rounds: 1, results: [{ won: 1, drawn: 0, lost: 0 }, { won: 0, drawn: 0, lost: 1 }] })  // round 2: w1 wins (swapped → defender)
      .mockReturnValueOnce({ rounds: 1, results: [{ won: 1, drawn: 0, lost: 0 }, { won: 0, drawn: 0, lost: 1 }] })  // round 3: w1 wins (not swapped → challenger)
      .mockReturnValueOnce({ rounds: 1, results: [{ won: 0, drawn: 1, lost: 0 }, { won: 0, drawn: 1, lost: 0 }] })  // round 4: tie
      .mockReturnValueOnce({ rounds: 1, results: [{ won: 1, drawn: 0, lost: 0 }, { won: 0, drawn: 0, lost: 1 }] }); // round 5: w1 wins (not swapped → challenger)

    const result = runBattle('CHALLENGER', 'DEFENDER');

    expect(result.overallResult).toBe('challenger_win');
    expect(result.challengerWins).toBe(3);
    expect(result.defenderWins).toBe(1);
    expect(result.ties).toBe(1);
    expect(result.rounds).toHaveLength(5);
  });

  it('returns defender_win when defender wins majority of rounds', () => {
    setupValidParse();

    // 5 rounds: all w2 wins
    for (let i = 0; i < 5; i++) {
      mockRunMatch.mockReturnValueOnce({
        rounds: 1,
        results: [{ won: 0, drawn: 0, lost: 1 }, { won: 1, drawn: 0, lost: 0 }],
      });
    }

    const result = runBattle('CHALLENGER', 'DEFENDER');

    // w2 wins all rounds: in even rounds (0,2,4) w2=defender, in odd rounds (1,3) w2=challenger
    // So defender wins rounds 1,3,5 (indices 0,2,4) and challenger wins rounds 2,4 (indices 1,3)
    expect(result.overallResult).toBe('defender_win');
    expect(result.defenderWins).toBe(3);
    expect(result.challengerWins).toBe(2);
  });

  it('returns tie when wins are equal', () => {
    setupValidParse();

    // 5 rounds: all ties
    for (let i = 0; i < 5; i++) {
      mockRunMatch.mockReturnValueOnce({
        rounds: 1,
        results: [{ won: 0, drawn: 1, lost: 0 }, { won: 0, drawn: 1, lost: 0 }],
      });
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

  it('alternates warrior positions: even rounds not swapped, odd rounds swapped', () => {
    setupValidParse();

    for (let i = 0; i < 5; i++) {
      mockRunMatch.mockReturnValueOnce({
        rounds: 1,
        results: [{ won: 0, drawn: 1, lost: 0 }, { won: 0, drawn: 1, lost: 0 }],
      });
    }

    runBattle('CHALLENGER', 'DEFENDER');

    // Verify runMatch was called 5 times
    expect(mockRunMatch).toHaveBeenCalledTimes(5);

    // Even-indexed rounds (0, 2, 4): challenger first
    const call0Warriors = mockRunMatch.mock.calls[0][1];
    const call2Warriors = mockRunMatch.mock.calls[2][1];
    const call4Warriors = mockRunMatch.mock.calls[4][1];

    // Odd-indexed rounds (1, 3): defender first (swapped)
    const call1Warriors = mockRunMatch.mock.calls[1][1];
    const call3Warriors = mockRunMatch.mock.calls[3][1];

    // For even rounds, first warrior source should be challengerParsed
    // For odd rounds, first warrior source should be defenderParsed
    // We can verify by checking the source objects are different between even/odd calls
    expect(call0Warriors[0].source).toBe(call2Warriors[0].source);
    expect(call0Warriors[0].source).toBe(call4Warriors[0].source);
    expect(call1Warriors[0].source).toBe(call3Warriors[0].source);
    // Even and odd should have swapped first warriors
    expect(call0Warriors[0].source).not.toBe(call1Warriors[0].source);
    expect(call0Warriors[0].source).toBe(call1Warriors[1].source);
  });

  it('correctly counts wins/losses/ties across all 5 rounds', () => {
    setupValidParse();

    // Round 1 (i=0, not swapped): challenger wins
    mockRunMatch.mockReturnValueOnce({
      rounds: 1,
      results: [{ won: 1, drawn: 0, lost: 0 }, { won: 0, drawn: 0, lost: 1 }],
    });
    // Round 2 (i=1, swapped): w1 wins → w1 is defender when swapped → defender wins
    mockRunMatch.mockReturnValueOnce({
      rounds: 1,
      results: [{ won: 1, drawn: 0, lost: 0 }, { won: 0, drawn: 0, lost: 1 }],
    });
    // Round 3 (i=2, not swapped): tie
    mockRunMatch.mockReturnValueOnce({
      rounds: 1,
      results: [{ won: 0, drawn: 1, lost: 0 }, { won: 0, drawn: 1, lost: 0 }],
    });
    // Round 4 (i=3, swapped): w2 wins → w2 is challenger when swapped → challenger wins
    mockRunMatch.mockReturnValueOnce({
      rounds: 1,
      results: [{ won: 0, drawn: 0, lost: 1 }, { won: 1, drawn: 0, lost: 0 }],
    });
    // Round 5 (i=4, not swapped): defender wins
    mockRunMatch.mockReturnValueOnce({
      rounds: 1,
      results: [{ won: 0, drawn: 0, lost: 1 }, { won: 1, drawn: 0, lost: 0 }],
    });

    const result = runBattle('C', 'D');

    expect(result.challengerWins).toBe(2);
    expect(result.defenderWins).toBe(2);
    expect(result.ties).toBe(1);
    expect(result.overallResult).toBe('tie');
    expect(result.rounds).toEqual([
      { round: 1, winner: 'challenger' },
      { round: 2, winner: 'defender' },
      { round: 3, winner: 'tie' },
      { round: 4, winner: 'challenger' },
      { round: 5, winner: 'defender' },
    ]);
  });
});
