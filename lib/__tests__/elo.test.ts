import { calculateNewRatings } from '../elo';

describe('calculateNewRatings', () => {
  describe('equal ratings', () => {
    it('a_win: winner gains, loser loses by same amount', () => {
      const { newRatingA, newRatingB } = calculateNewRatings(1200, 1200, 'a_win');
      expect(newRatingA).toBeGreaterThan(1200);
      expect(newRatingB).toBeLessThan(1200);
      // Symmetric: change should be equal and opposite
      expect(newRatingA - 1200).toBe(1200 - newRatingB);
    });

    it('b_win: symmetric with a_win', () => {
      const aWin = calculateNewRatings(1200, 1200, 'a_win');
      const bWin = calculateNewRatings(1200, 1200, 'b_win');
      // B winning should mirror A winning
      expect(bWin.newRatingB).toBe(aWin.newRatingA);
      expect(bWin.newRatingA).toBe(aWin.newRatingB);
    });

    it('tie: ratings remain unchanged', () => {
      const { newRatingA, newRatingB } = calculateNewRatings(1200, 1200, 'tie');
      expect(newRatingA).toBe(1200);
      expect(newRatingB).toBe(1200);
    });
  });

  describe('unequal ratings', () => {
    it('higher rated beats lower rated: small gain', () => {
      const { newRatingA, newRatingB } = calculateNewRatings(1400, 1000, 'a_win');
      const gain = newRatingA - 1400;
      // Expected win yields small gain
      expect(gain).toBeGreaterThan(0);
      expect(gain).toBeLessThan(16); // K=32, expected score near 1 → gain << K
    });

    it('lower rated beats higher rated: large gain (upset)', () => {
      const upset = calculateNewRatings(1000, 1400, 'a_win');
      const expected = calculateNewRatings(1400, 1000, 'a_win');
      // Upset gain should be much larger than expected-win gain
      expect(upset.newRatingA - 1000).toBeGreaterThan(expected.newRatingA - 1400);
    });
  });

  it('returns ratings rounded to integers', () => {
    // Use ratings that would produce fractional results
    const { newRatingA, newRatingB } = calculateNewRatings(1210, 1190, 'a_win');
    expect(Number.isInteger(newRatingA)).toBe(true);
    expect(Number.isInteger(newRatingB)).toBe(true);
  });
});
