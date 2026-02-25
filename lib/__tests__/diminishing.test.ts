import {
  calculateDiminishingFactor,
  applyDiminishingFactor,
  DIMINISHING_WINDOW_MINUTES,
  DIMINISHING_FLOOR,
} from '../diminishing';

describe('constants', () => {
  it('window is 2 minutes', () => {
    expect(DIMINISHING_WINDOW_MINUTES).toBe(2);
  });

  it('floor is 0.1', () => {
    expect(DIMINISHING_FLOOR).toBe(0.1);
  });
});

describe('calculateDiminishingFactor', () => {
  it('returns 1.0 for first battle (n=0)', () => {
    expect(calculateDiminishingFactor(0)).toBe(1.0);
  });

  it('returns 0.5 for second battle (n=1)', () => {
    expect(calculateDiminishingFactor(1)).toBe(0.5);
  });

  it('returns 1/3 for third battle (n=2)', () => {
    expect(calculateDiminishingFactor(2)).toBeCloseTo(1 / 3, 10);
  });

  it('returns 0.25 for fourth battle (n=3)', () => {
    expect(calculateDiminishingFactor(3)).toBe(0.25);
  });

  it('returns floor for n=9', () => {
    expect(calculateDiminishingFactor(9)).toBe(0.1);
  });

  it('returns floor for very large n', () => {
    expect(calculateDiminishingFactor(100)).toBe(0.1);
  });

  it('never goes below floor', () => {
    for (let n = 0; n <= 50; n++) {
      expect(calculateDiminishingFactor(n)).toBeGreaterThanOrEqual(DIMINISHING_FLOOR);
    }
  });

  it('is monotonically decreasing', () => {
    for (let n = 0; n < 20; n++) {
      expect(calculateDiminishingFactor(n)).toBeGreaterThanOrEqual(
        calculateDiminishingFactor(n + 1)
      );
    }
  });
});

describe('applyDiminishingFactor', () => {
  const oldA = { rating: 1200, rd: 350, volatility: 0.06 };
  const oldB = { rating: 1200, rd: 350, volatility: 0.06 };
  const newA = { rating: 1216, rd: 320, volatility: 0.059 };
  const newB = { rating: 1184, rd: 320, volatility: 0.061 };

  it('returns new values unchanged when factor is 1.0', () => {
    const result = applyDiminishingFactor(1.0, oldA, oldB, newA, newB);
    expect(result.ratingA).toBe(1216);
    expect(result.rdA).toBe(320);
    expect(result.volatilityA).toBe(0.059);
    expect(result.ratingB).toBe(1184);
    expect(result.rdB).toBe(320);
    expect(result.volatilityB).toBe(0.061);
  });

  it('interpolates halfway when factor is 0.5', () => {
    const result = applyDiminishingFactor(0.5, oldA, oldB, newA, newB);
    // rating: 1200 + (1216 - 1200) * 0.5 = 1208
    expect(result.ratingA).toBe(1208);
    // rd: 350 + (320 - 350) * 0.5 = 335
    expect(result.rdA).toBe(335);
    // volatility: 0.06 + (0.059 - 0.06) * 0.5 = 0.0595
    expect(result.volatilityA).toBe(0.0595);
    // rating: 1200 + (1184 - 1200) * 0.5 = 1192
    expect(result.ratingB).toBe(1192);
    expect(result.rdB).toBe(335);
    expect(result.volatilityB).toBe(0.0605);
  });

  it('returns old values when factor is near 0 (floor)', () => {
    const result = applyDiminishingFactor(0.1, oldA, oldB, newA, newB);
    // rating: 1200 + 16 * 0.1 = 1201.6 → 1202
    expect(result.ratingA).toBe(1202);
    // rd: 350 + (-30) * 0.1 = 347
    expect(result.rdA).toBe(347);
    // rating: 1200 + (-16) * 0.1 = 1198.4 → 1198
    expect(result.ratingB).toBe(1198);
    expect(result.rdB).toBe(347);
  });

  it('rounds rating to integer', () => {
    const result = applyDiminishingFactor(0.3, oldA, oldB, newA, newB);
    // 1200 + 16 * 0.3 = 1204.8 → 1205
    expect(Number.isInteger(result.ratingA)).toBe(true);
    expect(Number.isInteger(result.ratingB)).toBe(true);
  });

  it('rounds RD to 2 decimal places', () => {
    const result = applyDiminishingFactor(0.3, oldA, oldB, newA, newB);
    const rdStr = result.rdA.toString();
    const decimals = rdStr.includes('.') ? rdStr.split('.')[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });

  it('rounds volatility to 6 decimal places', () => {
    const result = applyDiminishingFactor(0.3, oldA, oldB, newA, newB);
    const volStr = result.volatilityA.toString();
    const decimals = volStr.includes('.') ? volStr.split('.')[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(6);
  });

  it('diminishes RD changes too (prevents false confidence)', () => {
    const result = applyDiminishingFactor(0.5, oldA, oldB, newA, newB);
    // RD should be between old (350) and new (320), not at new
    expect(result.rdA).toBeGreaterThan(newA.rd);
    expect(result.rdA).toBeLessThan(oldA.rd);
  });
});
