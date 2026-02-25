import { findDecisiveRound } from '../battle-utils';
import type { RoundResultRecord } from '../db';

function makeRounds(pattern: Array<'challenger' | 'defender' | 'tie'>): RoundResultRecord[] {
  return pattern.map((winner, i) => ({ round: i + 1, winner, seed: (i + 1) * 100 }));
}

describe('findDecisiveRound', () => {
  it('returns correct round when challenger reaches 51 wins at round 100', () => {
    // 51 challenger wins interleaved with 49 defender wins
    // Pattern: c, d, c, d, ... (50 pairs = rounds 1-100), last challenger win at round 99
    // Actually: alternate c/d for 98 rounds (49c, 49d), then c, c at rounds 99-100
    const pattern: Array<'challenger' | 'defender' | 'tie'> = [];
    for (let i = 0; i < 49; i++) { pattern.push('challenger', 'defender'); }
    pattern.push('challenger', 'challenger'); // rounds 99, 100 → 51st challenger win at round 100
    const rounds = makeRounds(pattern);

    expect(findDecisiveRound(rounds, 51, 49)).toBe(100);
  });

  it('returns correct round for defender clinch at round 51', () => {
    // Defender wins first 51 rounds, challenger wins remaining 49
    const pattern: Array<'challenger' | 'defender' | 'tie'> = [
      ...Array.from<'defender'>({ length: 51 }).fill('defender'),
      ...Array.from<'challenger'>({ length: 49 }).fill('challenger'),
    ];
    const rounds = makeRounds(pattern);

    expect(findDecisiveRound(rounds, 49, 51)).toBe(51);
  });

  it('returns correct round for early clinch (first 51 rounds)', () => {
    // Challenger wins first 51 rounds, defender wins remaining 49
    const pattern: Array<'challenger' | 'defender' | 'tie'> = [
      ...Array.from<'challenger'>({ length: 51 }).fill('challenger'),
      ...Array.from<'defender'>({ length: 49 }).fill('defender'),
    ];
    const rounds = makeRounds(pattern);

    expect(findDecisiveRound(rounds, 51, 49)).toBe(51);
  });

  it('returns 100 as fallback for empty round_results', () => {
    expect(findDecisiveRound([], 51, 49)).toBe(100);
  });

  it('handles rounds with ties correctly', () => {
    // 20 ties, then 51 challenger wins, then 29 defender wins = 100 rounds
    // Challenger's 51st win is at round 71
    const pattern: Array<'challenger' | 'defender' | 'tie'> = [
      ...Array.from<'tie'>({ length: 20 }).fill('tie'),
      ...Array.from<'challenger'>({ length: 51 }).fill('challenger'),
      ...Array.from<'defender'>({ length: 29 }).fill('defender'),
    ];
    const rounds = makeRounds(pattern);

    expect(findDecisiveRound(rounds, 51, 29)).toBe(71);
  });
});
