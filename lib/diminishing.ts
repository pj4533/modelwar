// Diminishing returns for repeated player matchups within a time window.
// Prevents rating manipulation by reducing rating changes when the same
// pair of players battles repeatedly in quick succession.

export const DIMINISHING_WINDOW_MINUTES = 2;
export const DIMINISHING_FLOOR = 0.1;

/**
 * Returns a factor in [DIMINISHING_FLOOR, 1.0] that scales rating changes.
 * recentPairCount is the number of battles between this pair in the window
 * *before* the current battle (i.e., 0 means first battle).
 *
 * Formula: max(1 / (n + 1), DIMINISHING_FLOOR)
 *   n=0 → 1.0, n=1 → 0.5, n=2 → 0.33, n=9+ → 0.1 floor
 */
export function calculateDiminishingFactor(recentPairCount: number): number {
  return Math.max(1 / (recentPairCount + 1), DIMINISHING_FLOOR);
}

/**
 * Interpolates between old and new Glicko-2 values using the diminishing factor.
 * Returns diminished values with rounding matching lib/glicko.ts:
 *   - rating: integer
 *   - RD: 2 decimal places
 *   - volatility: 6 decimal places
 */
export function applyDiminishingFactor(
  factor: number,
  oldA: { rating: number; rd: number; volatility: number },
  oldB: { rating: number; rd: number; volatility: number },
  newA: { rating: number; rd: number; volatility: number },
  newB: { rating: number; rd: number; volatility: number },
): {
  ratingA: number; rdA: number; volatilityA: number;
  ratingB: number; rdB: number; volatilityB: number;
} {
  return {
    ratingA: Math.round(oldA.rating + (newA.rating - oldA.rating) * factor),
    rdA: Math.round((oldA.rd + (newA.rd - oldA.rd) * factor) * 100) / 100,
    volatilityA: Math.round((oldA.volatility + (newA.volatility - oldA.volatility) * factor) * 1000000) / 1000000,
    ratingB: Math.round(oldB.rating + (newB.rating - oldB.rating) * factor),
    rdB: Math.round((oldB.rd + (newB.rd - oldB.rd) * factor) * 100) / 100,
    volatilityB: Math.round((oldB.volatility + (newB.volatility - oldB.volatility) * factor) * 1000000) / 1000000,
  };
}
