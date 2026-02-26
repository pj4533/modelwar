import { buildEloHistory, asciiSparkline, getPlayerResult, ordinal } from '../player-utils';
import { makeBattle } from './fixtures';
import type { UnifiedBattleArena } from '../db';

describe('getPlayerResult', () => {
  it('returns win for challenger when challenger_win', () => {
    expect(getPlayerResult('challenger_win', true)).toBe('win');
  });

  it('returns loss for defender when challenger_win', () => {
    expect(getPlayerResult('challenger_win', false)).toBe('loss');
  });

  it('returns loss for challenger when defender_win', () => {
    expect(getPlayerResult('defender_win', true)).toBe('loss');
  });

  it('returns win for defender when defender_win', () => {
    expect(getPlayerResult('defender_win', false)).toBe('win');
  });

  it('returns tie for challenger when tie', () => {
    expect(getPlayerResult('tie', true)).toBe('tie');
  });

  it('returns tie for defender when tie', () => {
    expect(getPlayerResult('tie', false)).toBe('tie');
  });
});

describe('buildEloHistory', () => {
  it('returns empty array for no battles', () => {
    expect(buildEloHistory(1, [])).toEqual([]);
  });

  it('builds history for challenger battles', () => {
    const battles = [
      makeBattle({
        id: 2,
        challenger_id: 1,
        defender_id: 2,
        challenger_elo_before: 1216,
        challenger_elo_after: 1232,
        created_at: new Date('2025-01-02'),
      }),
      makeBattle({
        id: 1,
        challenger_id: 1,
        defender_id: 2,
        challenger_elo_before: 1200,
        challenger_elo_after: 1216,
        created_at: new Date('2025-01-01'),
      }),
    ];
    // Reversed: battle 1 first, then battle 2
    expect(buildEloHistory(1, battles)).toEqual([1200, 1216, 1232]);
  });

  it('builds history for defender battles', () => {
    const battles = [
      makeBattle({
        id: 1,
        challenger_id: 2,
        defender_id: 1,
        defender_elo_before: 1200,
        defender_elo_after: 1184,
        created_at: new Date('2025-01-01'),
      }),
    ];
    expect(buildEloHistory(1, battles)).toEqual([1200, 1184]);
  });

  it('handles mixed challenger and defender battles', () => {
    const battles = [
      makeBattle({
        id: 2,
        challenger_id: 3,
        defender_id: 1,
        defender_elo_before: 1216,
        defender_elo_after: 1200,
        created_at: new Date('2025-01-02'),
      }),
      makeBattle({
        id: 1,
        challenger_id: 1,
        defender_id: 2,
        challenger_elo_before: 1200,
        challenger_elo_after: 1216,
        created_at: new Date('2025-01-01'),
      }),
    ];
    // Reversed: battle 1 (as challenger 1200->1216), battle 2 (as defender 1216->1200)
    expect(buildEloHistory(1, battles)).toEqual([1200, 1216, 1200]);
  });

  it('computes conservative rating when RD values are present', () => {
    const battles = [
      makeBattle({
        id: 1,
        challenger_id: 1,
        defender_id: 2,
        challenger_elo_before: 1200,
        challenger_elo_after: 1232,
        challenger_rd_before: 350,
        challenger_rd_after: 320,
        created_at: new Date('2025-01-01'),
      }),
    ];
    // conservative = elo - 2*rd
    // before: 1200 - 2*350 = 500
    // after: 1232 - 2*320 = 592
    expect(buildEloHistory(1, battles)).toEqual([500, 592]);
  });

  it('computes conservative rating for defender with RD values', () => {
    const battles = [
      makeBattle({
        id: 1,
        challenger_id: 2,
        defender_id: 1,
        defender_elo_before: 1300,
        defender_elo_after: 1280,
        defender_rd_before: 200,
        defender_rd_after: 190,
        created_at: new Date('2025-01-01'),
      }),
    ];
    // before: 1300 - 2*200 = 900
    // after: 1280 - 2*190 = 900
    expect(buildEloHistory(1, battles)).toEqual([900, 900]);
  });

  it('falls back to raw elo when RD is null (pre-migration)', () => {
    const battles = [
      makeBattle({
        id: 1,
        challenger_id: 1,
        defender_id: 2,
        challenger_elo_before: 1200,
        challenger_elo_after: 1216,
        challenger_rd_before: null,
        challenger_rd_after: null,
        created_at: new Date('2025-01-01'),
      }),
    ];
    expect(buildEloHistory(1, battles)).toEqual([1200, 1216]);
  });

  it('handles mixed null and non-null RD across battles', () => {
    const battles = [
      makeBattle({
        id: 2,
        challenger_id: 1,
        defender_id: 2,
        challenger_elo_before: 1216,
        challenger_elo_after: 1248,
        challenger_rd_before: 320,
        challenger_rd_after: 300,
        created_at: new Date('2025-01-02'),
      }),
      makeBattle({
        id: 1,
        challenger_id: 1,
        defender_id: 2,
        challenger_elo_before: 1200,
        challenger_elo_after: 1216,
        challenger_rd_before: null,
        challenger_rd_after: null,
        created_at: new Date('2025-01-01'),
      }),
    ];
    // Battle 1 (null RD): raw 1200 -> 1216
    // Battle 2 (RD present): conservative 1216-2*320=576 -> 1248-2*300=648
    expect(buildEloHistory(1, battles)).toEqual([1200, 1216, 648]);
  });
});

describe('ordinal', () => {
  it('returns correct ordinals for 1-4', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
    expect(ordinal(4)).toBe('4th');
  });

  it('returns th for teens', () => {
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(12)).toBe('12th');
    expect(ordinal(13)).toBe('13th');
  });

  it('returns correct ordinals for 21-23', () => {
    expect(ordinal(21)).toBe('21st');
    expect(ordinal(22)).toBe('22nd');
    expect(ordinal(23)).toBe('23rd');
  });

  it('returns th for larger numbers', () => {
    expect(ordinal(10)).toBe('10th');
    expect(ordinal(100)).toBe('100th');
  });
});

describe('buildEloHistory with unified entries', () => {
  it('skips arena entries in unified battle list', () => {
    const arenaEntry: UnifiedBattleArena = {
      type: 'arena',
      id: 5,
      created_at: new Date('2025-01-02'),
      placement: 3,
      participant_count: 10,
      total_score: 150,
      arena_rating_before: 1200,
      arena_rating_after: 1210,
      arena_rd_before: 300,
      arena_rd_after: 290,
      challenger_id: null,
      defender_id: null,
      result: null,
      challenger_wins: null,
      defender_wins: null,
      ties: null,
      challenger_elo_before: null,
      challenger_elo_after: null,
      defender_elo_before: null,
      defender_elo_after: null,
      challenger_rd_before: null,
      challenger_rd_after: null,
      defender_rd_before: null,
      defender_rd_after: null,
    };

    const battle1v1 = makeBattle({
      id: 1,
      challenger_id: 1,
      defender_id: 2,
      challenger_elo_before: 1200,
      challenger_elo_after: 1216,
      created_at: new Date('2025-01-01'),
    });

    // Arena entry should be filtered out, only 1v1 used
    const result = buildEloHistory(1, [arenaEntry, battle1v1]);
    expect(result).toEqual([1200, 1216]);
  });
});

describe('asciiSparkline', () => {
  it('returns empty string for empty array', () => {
    expect(asciiSparkline([])).toBe('');
  });

  it('returns empty string for single value', () => {
    expect(asciiSparkline([1200])).toBe('');
  });

  it('generates sparkline for two values', () => {
    const result = asciiSparkline([1200, 1250]);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('\u2581'); // lowest
    expect(result[1]).toBe('\u2588'); // highest
  });

  it('generates sparkline for equal values', () => {
    const result = asciiSparkline([1200, 1200, 1200]);
    expect(result).toHaveLength(3);
    // All same value, (v-min) = 0 for all, so index = 0 → lowest block
    expect(result).toBe('\u2581\u2581\u2581');
  });

  it('generates sparkline with ascending values', () => {
    const result = asciiSparkline([1000, 1100, 1200, 1300]);
    expect(result).toHaveLength(4);
    expect(result[0]).toBe('\u2581'); // min
    expect(result[3]).toBe('\u2588'); // max
  });

  it('generates sparkline with descending values', () => {
    const result = asciiSparkline([1300, 1200, 1100, 1000]);
    expect(result).toHaveLength(4);
    expect(result[0]).toBe('\u2588'); // max
    expect(result[3]).toBe('\u2581'); // min
  });
});
