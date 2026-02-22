/**
 * Integration tests for the battle engine using the REAL corewar library.
 *
 * These tests verify actual Core War simulation behavior — SPL task creation,
 * warrior survival, and engine/replay consistency. They exist because unit tests
 * with mocked corewar cannot catch bugs like the maxTasks/SPL regression where
 * the library silently made SPL a no-op.
 */
import { corewar } from 'corewar';
import { runBattle } from '../engine';
import { mulberry32 } from '../prng';

// Simple warriors for testing
const SPL_WARRIOR = ';redcode-94\nspl 0\nend\n';
const IMP_WARRIOR = ';redcode-94\nmov 0, 1\nend\n';
// SPL-dependent: task 1 jumps over DAT to become an imp, task 2 hits DAT and dies.
// With broken SPL: single task falls through to DAT and dies instantly.
const SPL_DEPENDENT = ';redcode-94\nspl 2\ndat 0, 0\nmov 0, 1\nend\n';

const SIM_OPTIONS = {
  coresize: 8000,
  maximumCycles: 80000,
  instructionLimit: 100,
  maxTasks: 8000,
  minSeparation: 100,
};

describe('engine integration (real corewar library)', () => {
  describe('SPL task creation', () => {
    it('creates multiple tasks when maxTasks is set', () => {
      const splParsed = corewar.parse(SPL_WARRIOR);
      const impParsed = corewar.parse(IMP_WARRIOR);

      let maxTasksSeen = 0;
      const messageProvider = {
        publishSync(topic: string, payload: unknown) {
          if (topic === 'TASK_COUNT') {
            const items = payload as Array<{ warriorId: number; taskCount: number }>;
            for (const item of items) {
              if (item.warriorId === 0 && item.taskCount > maxTasksSeen) {
                maxTasksSeen = item.taskCount;
              }
            }
          }
        },
      };

      corewar.initialiseSimulator(
        SIM_OPTIONS,
        [{ source: splParsed }, { source: impParsed }],
        messageProvider
      );

      for (let i = 0; i < 100; i++) {
        corewar.step();
      }

      // SPL 0 should create many tasks — if maxTasks is broken, this stays at 1
      expect(maxTasksSeen).toBeGreaterThan(1);
    });
  });

  describe('SPL-dependent warrior survival', () => {
    it('survives when SPL works (does not die instantly)', () => {
      const splDepParsed = corewar.parse(SPL_DEPENDENT);
      const impParsed = corewar.parse(IMP_WARRIOR);

      let roundEnded = false;
      let endCycle = 0;
      let winnerId: number | null = null;

      const messageProvider = {
        publishSync(topic: string, payload: unknown) {
          if (topic === 'ROUND_END') {
            roundEnded = true;
            const data = payload as { winnerId?: number };
            winnerId = data.winnerId ?? null;
          }
        },
      };

      corewar.initialiseSimulator(
        SIM_OPTIONS,
        [{ source: splDepParsed }, { source: impParsed }],
        messageProvider
      );

      let cycle = 0;
      while (!roundEnded && cycle < SIM_OPTIONS.maximumCycles) {
        corewar.step();
        cycle++;
      }
      endCycle = cycle;

      // With working SPL: one task survives as an imp, round goes to max cycles (draw)
      // With broken SPL: single task hits DAT and dies in ~2 cycles
      expect(endCycle).toBeGreaterThan(100);

      // Should be a draw (both survive as imps) or at least not an instant loss
      if (winnerId === 0) {
        // SPL-dependent warrior won — that's fine
      } else if (winnerId === null) {
        // Draw — expected outcome
      } else {
        // If the SPL warrior lost, it should NOT have been instant
        expect(endCycle).toBeGreaterThan(1000);
      }
    });
  });

  describe('runBattle end-to-end', () => {
    it('produces valid results with real Redcode warriors', () => {
      const result = runBattle(IMP_WARRIOR, IMP_WARRIOR);

      expect(result.rounds).toHaveLength(5);
      expect(result.challengerWins + result.defenderWins + result.ties).toBe(5);
      expect(['challenger_win', 'defender_win', 'tie']).toContain(result.overallResult);

      for (const round of result.rounds) {
        expect(round.seed).toBeGreaterThanOrEqual(0);
        expect(['challenger', 'defender', 'tie']).toContain(round.winner);
      }
    });

    it('does not produce instant deaths for SPL warriors', () => {
      // Use a more complex SPL warrior vs imp
      // If SPL is broken, the SPL warrior dies every round
      const splWarrior = [
        ';redcode-94',
        'spl 2',
        'dat 0, 0',
        'spl 0',
        'end',
      ].join('\n');

      const result = runBattle(splWarrior, IMP_WARRIOR);

      // An SPL warrior should not lose ALL 5 rounds to a simple imp.
      // With working SPL it creates multiple tasks that are hard to kill.
      // With broken SPL it dies instantly every time.
      expect(result.challengerWins + result.ties).toBeGreaterThan(0);
    });
  });

  describe('engine and replay code paths produce consistent results', () => {
    it('initialiseSimulator + run matches initialiseSimulator + step loop', () => {
      const impParsed = corewar.parse(IMP_WARRIOR);
      const splParsed = corewar.parse(SPL_WARRIOR);
      const seed = 12345;
      const warriors = [{ source: splParsed }, { source: impParsed }];

      // Path 1: initialiseSimulator + run (engine path)
      let engineWinner: number | null = null;
      const engineMp = {
        publishSync(topic: string, payload: unknown) {
          if (topic === 'ROUND_END') {
            const data = payload as { winnerId?: number };
            engineWinner = data.winnerId ?? null;
          }
        },
      };

      const origRandom1 = Math.random;
      Math.random = mulberry32(seed);
      corewar.initialiseSimulator(SIM_OPTIONS, warriors, engineMp);
      corewar.run();
      Math.random = origRandom1;

      // Path 2: initialiseSimulator + step loop (replay path)
      let replayWinner: number | null = null;
      const replayMp = {
        publishSync(topic: string, payload: unknown) {
          if (topic === 'ROUND_END') {
            const data = payload as { winnerId?: number };
            replayWinner = data.winnerId ?? null;
          }
        },
      };

      const origRandom2 = Math.random;
      Math.random = mulberry32(seed);
      corewar.initialiseSimulator(SIM_OPTIONS, warriors, replayMp);
      Math.random = origRandom2;

      let cycle = 0;
      let ended = false;
      while (!ended && cycle < SIM_OPTIONS.maximumCycles) {
        corewar.step();
        cycle++;
        if (replayWinner !== null || cycle >= SIM_OPTIONS.maximumCycles) {
          ended = true;
        }
      }

      // Both paths should determine the same winner
      expect(replayWinner).toBe(engineWinner);
    });
  });
});
