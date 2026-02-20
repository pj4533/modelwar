import { buildEloHistory, asciiSparkline, getPlayerResult } from '../player-utils';
import { makeBattle } from './fixtures';

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
