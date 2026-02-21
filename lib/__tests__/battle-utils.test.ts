import { findDecisiveRound } from '../battle-utils';
import type { RoundResultRecord } from '../db';

describe('findDecisiveRound', () => {
  it('returns correct round for standard 3-2 challenger win (rounds 1, 3, 5)', () => {
    const rounds: RoundResultRecord[] = [
      { round: 1, winner: 'challenger', seed: 100 },
      { round: 2, winner: 'defender', seed: 200 },
      { round: 3, winner: 'challenger', seed: 300 },
      { round: 4, winner: 'defender', seed: 400 },
      { round: 5, winner: 'challenger', seed: 500 },
    ];

    expect(findDecisiveRound(rounds, 3, 2)).toBe(5);
  });

  it('returns correct round for defender-win 3-2 battle (rounds 2, 3, 4)', () => {
    const rounds: RoundResultRecord[] = [
      { round: 1, winner: 'challenger', seed: 100 },
      { round: 2, winner: 'defender', seed: 200 },
      { round: 3, winner: 'defender', seed: 300 },
      { round: 4, winner: 'defender', seed: 400 },
      { round: 5, winner: 'challenger', seed: 500 },
    ];

    expect(findDecisiveRound(rounds, 2, 3)).toBe(4);
  });

  it('returns correct round for early clinch (rounds 1, 2, 3)', () => {
    const rounds: RoundResultRecord[] = [
      { round: 1, winner: 'challenger', seed: 100 },
      { round: 2, winner: 'challenger', seed: 200 },
      { round: 3, winner: 'challenger', seed: 300 },
      { round: 4, winner: 'defender', seed: 400 },
      { round: 5, winner: 'defender', seed: 500 },
    ];

    expect(findDecisiveRound(rounds, 3, 2)).toBe(3);
  });

  it('returns 5 as fallback for empty round_results', () => {
    expect(findDecisiveRound([], 3, 2)).toBe(5);
  });

  it('handles rounds with ties correctly', () => {
    const rounds: RoundResultRecord[] = [
      { round: 1, winner: 'challenger', seed: 100 },
      { round: 2, winner: 'tie', seed: 200 },
      { round: 3, winner: 'challenger', seed: 300 },
      { round: 4, winner: 'tie', seed: 400 },
      { round: 5, winner: 'challenger', seed: 500 },
    ];

    expect(findDecisiveRound(rounds, 3, 2)).toBe(5);
  });
});
