jest.mock('pmars-ts');

import { Simulator, Assembler } from 'pmars-ts';
import { runArenaBattle, ARENA_NUM_ROUNDS, ARENA_MAX_WARRIORS } from '../arena-engine';

const MockAssembler = Assembler as jest.MockedClass<typeof Assembler>;
const mockAssemble = MockAssembler.prototype.assemble as jest.Mock;
const MockSimulator = Simulator as jest.MockedClass<typeof Simulator>;
const mockLoadWarriors = MockSimulator.prototype.loadWarriors as jest.Mock;
const mockRunRound = MockSimulator.prototype.runRound as jest.Mock;
const mockSetEventListener = MockSimulator.prototype.setEventListener as jest.Mock;

let capturedListener: { onTaskCount?: (counts: { warriorId: number; taskCount: number }[]) => void } | null = null;

beforeEach(() => {
  mockAssemble.mockReset();
  mockLoadWarriors.mockReset();
  mockRunRound.mockReset();
  mockSetEventListener.mockReset();
  capturedListener = null;

  mockSetEventListener.mockImplementation((listener: typeof capturedListener) => {
    capturedListener = listener;
  });
});

function successAssemble() {
  return {
    success: true,
    messages: [],
    warrior: {
      instructions: [{}],
      startOffset: 0,
      name: 'Test',
      author: 'Test',
      strategy: '',
      pin: null,
    },
  };
}

function failAssemble() {
  return { success: false, messages: [], warrior: null };
}

function makeWarriors(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    redcode: `MOV 0, ${i + 1}`,
    slotIndex: i,
  }));
}

describe('arena-engine', () => {
  describe('runArenaBattle', () => {
    it('throws for fewer than 2 warriors', () => {
      expect(() => runArenaBattle(makeWarriors(1))).toThrow('Arena requires 2-10 warriors');
    });

    it('throws for more than 10 warriors', () => {
      expect(() => runArenaBattle(makeWarriors(11))).toThrow('Arena requires 2-10 warriors');
    });

    it('throws on assembly failure', () => {
      mockAssemble.mockReturnValueOnce(successAssemble());
      mockAssemble.mockReturnValueOnce(failAssemble());

      expect(() => runArenaBattle(makeWarriors(2), 1)).toThrow('Failed to assemble');
    });

    it('runs battle with WIN outcome and correct scoring', () => {
      mockAssemble.mockReturnValue(successAssemble());
      mockRunRound.mockImplementation(() => {
        return { winnerId: 0, outcome: 'WIN' };
      });

      const result = runArenaBattle(makeWarriors(2), 1, 42);

      expect(result.seed).toBe(42);
      expect(result.roundResults).toHaveLength(1);

      const round = result.roundResults[0];
      expect(round.survivorCount).toBe(1);
      expect(round.winnerSlot).toBe(0);
      // W*(W-1)/1 = 2*1/1 = 2 for 2 warriors
      expect(round.scores[0]).toBe(2);
      expect(round.scores[1]).toBe(0);
    });

    it('handles TIE with multiple survivors using task counts', () => {
      mockAssemble.mockReturnValue(successAssemble());
      mockRunRound.mockImplementation(() => {
        // Simulate task counts
        if (capturedListener?.onTaskCount) {
          capturedListener.onTaskCount([
            { warriorId: 0, taskCount: 5 },
            { warriorId: 1, taskCount: 3 },
            { warriorId: 2, taskCount: 0 },
          ]);
        }
        return { winnerId: null, outcome: 'TIE' };
      });

      const result = runArenaBattle(makeWarriors(3), 1, 42);
      const round = result.roundResults[0];

      expect(round.survivorCount).toBe(2);
      expect(round.winnerSlot).toBeNull();
      // W*(W-1)/S = 3*2/2 = 3 each
      expect(round.scores[0]).toBe(3);
      expect(round.scores[1]).toBe(3);
      expect(round.scores[2]).toBe(0);
    });

    it('handles TIE with all dead (zero survivors)', () => {
      mockAssemble.mockReturnValue(successAssemble());
      mockRunRound.mockImplementation(() => {
        if (capturedListener?.onTaskCount) {
          capturedListener.onTaskCount([
            { warriorId: 0, taskCount: 0 },
            { warriorId: 1, taskCount: 0 },
          ]);
        }
        return { winnerId: null, outcome: 'TIE' };
      });

      const result = runArenaBattle(makeWarriors(2), 1, 42);
      expect(result.roundResults[0].survivorCount).toBe(0);
      expect(result.roundResults[0].scores[0]).toBe(0);
      expect(result.roundResults[0].scores[1]).toBe(0);
    });

    it('calculates placements by total score descending', () => {
      mockAssemble.mockReturnValue(successAssemble());
      let roundNum = 0;
      mockRunRound.mockImplementation(() => {
        roundNum++;
        // Alternate winners
        return { winnerId: roundNum % 2 === 0 ? 1 : 0, outcome: 'WIN' };
      });

      const result = runArenaBattle(makeWarriors(2), 3, 42);
      // Warrior 0 wins rounds 1,3 (2 wins), warrior 1 wins round 2 (1 win)
      expect(result.placements).toHaveLength(2);
      expect(result.placements[0].slotIndex).toBe(0);
      expect(result.placements[0].placement).toBe(1);
      expect(result.placements[1].slotIndex).toBe(1);
      expect(result.placements[1].placement).toBe(2);
    });

    it('gives tied scores the same placement', () => {
      mockAssemble.mockReturnValue(successAssemble());
      mockRunRound.mockImplementation(() => {
        if (capturedListener?.onTaskCount) {
          capturedListener.onTaskCount([
            { warriorId: 0, taskCount: 1 },
            { warriorId: 1, taskCount: 1 },
          ]);
        }
        return { winnerId: null, outcome: 'TIE' };
      });

      const result = runArenaBattle(makeWarriors(2), 1, 42);
      expect(result.placements[0].placement).toBe(1);
      expect(result.placements[1].placement).toBe(1);
    });

    it('defaults to 200 rounds', () => {
      mockAssemble.mockReturnValue(successAssemble());
      mockRunRound.mockReturnValue({ winnerId: 0, outcome: 'WIN' });

      const result = runArenaBattle(makeWarriors(2));
      expect(result.roundResults).toHaveLength(ARENA_NUM_ROUNDS);
      expect(mockRunRound).toHaveBeenCalledTimes(ARENA_NUM_ROUNDS);
    });

    it('generates random seed when none provided', () => {
      mockAssemble.mockReturnValue(successAssemble());
      mockRunRound.mockReturnValue({ winnerId: 0, outcome: 'WIN' });

      const result = runArenaBattle(makeWarriors(2), 1);
      expect(typeof result.seed).toBe('number');
      expect(result.seed).toBeGreaterThan(0);
    });

    it('uses (W*W-1)/S scoring for 10 warriors', () => {
      mockAssemble.mockReturnValue(successAssemble());
      mockRunRound.mockImplementation(() => {
        return { winnerId: 0, outcome: 'WIN' };
      });

      const result = runArenaBattle(makeWarriors(10), 1, 42);
      // W*(W-1)/1 = 10*9/1 = 90
      expect(result.roundResults[0].scores[0]).toBe(90);
    });
  });

  describe('constants', () => {
    it('ARENA_NUM_ROUNDS is 200', () => {
      expect(ARENA_NUM_ROUNDS).toBe(200);
    });

    it('ARENA_MAX_WARRIORS is 10', () => {
      expect(ARENA_MAX_WARRIORS).toBe(10);
    });
  });
});
