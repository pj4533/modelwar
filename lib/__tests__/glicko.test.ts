import { calculateNewRatings, DEFAULT_RATING, DEFAULT_RD, DEFAULT_VOLATILITY, GlickoPlayer } from '../glicko';

const defaultPlayer: GlickoPlayer = { rating: 1200, rd: 350, volatility: 0.06 };
const establishedPlayer: GlickoPlayer = { rating: 1400, rd: 50, volatility: 0.06 };
const lowRdPlayer: GlickoPlayer = { rating: 1200, rd: 50, volatility: 0.06 };

describe('calculateNewRatings', () => {
  describe('default constants', () => {
    it('exports correct default values', () => {
      expect(DEFAULT_RATING).toBe(1200);
      expect(DEFAULT_RD).toBe(350);
      expect(DEFAULT_VOLATILITY).toBe(0.06);
    });
  });

  describe('equal ratings, high RD', () => {
    it('a_win: winner gains, loser loses, both RDs decrease', () => {
      const result = calculateNewRatings(defaultPlayer, defaultPlayer, 'a_win');
      expect(result.newRatingA).toBeGreaterThan(1200);
      expect(result.newRatingB).toBeLessThan(1200);
      expect(result.newRdA).toBeLessThan(350);
      expect(result.newRdB).toBeLessThan(350);
    });
  });

  describe('symmetry', () => {
    it('b_win mirrors a_win results', () => {
      const aWin = calculateNewRatings(defaultPlayer, defaultPlayer, 'a_win');
      const bWin = calculateNewRatings(defaultPlayer, defaultPlayer, 'b_win');
      expect(bWin.newRatingB).toBe(aWin.newRatingA);
      expect(bWin.newRatingA).toBe(aWin.newRatingB);
      expect(bWin.newRdB).toBe(aWin.newRdA);
      expect(bWin.newRdA).toBe(aWin.newRdB);
    });
  });

  describe('tie between equal ratings', () => {
    it('ratings stay the same or change minimally, RDs decrease', () => {
      const result = calculateNewRatings(defaultPlayer, defaultPlayer, 'tie');
      // For equal ratings, tie should keep ratings the same
      expect(result.newRatingA).toBe(1200);
      expect(result.newRatingB).toBe(1200);
      // RDs should still decrease (playing a game increases confidence)
      expect(result.newRdA).toBeLessThan(350);
      expect(result.newRdB).toBeLessThan(350);
    });
  });

  describe('unequal ratings', () => {
    it('higher-rated beating lower-rated gives small gain', () => {
      const highRated: GlickoPlayer = { rating: 1400, rd: 350, volatility: 0.06 };
      const lowRated: GlickoPlayer = { rating: 1000, rd: 350, volatility: 0.06 };
      const result = calculateNewRatings(highRated, lowRated, 'a_win');
      const gain = result.newRatingA - 1400;
      expect(gain).toBeGreaterThan(0);
      // Expected win yields smaller gain than upset
      const upset = calculateNewRatings(lowRated, highRated, 'a_win');
      const upsetGain = upset.newRatingA - 1000;
      expect(upsetGain).toBeGreaterThan(gain);
    });

    it('upset: lower-rated beating higher-rated gives larger gain', () => {
      const highRated: GlickoPlayer = { rating: 1400, rd: 350, volatility: 0.06 };
      const lowRated: GlickoPlayer = { rating: 1000, rd: 350, volatility: 0.06 };
      const result = calculateNewRatings(lowRated, highRated, 'a_win');
      const upsetGain = result.newRatingA - 1000;
      expect(upsetGain).toBeGreaterThan(100);
    });
  });

  describe('RD effects', () => {
    it('low-RD player has smaller rating changes per game', () => {
      const highRdOpponent: GlickoPlayer = { rating: 1200, rd: 350, volatility: 0.06 };

      const highRdResult = calculateNewRatings(defaultPlayer, highRdOpponent, 'a_win');
      const lowRdResult = calculateNewRatings(lowRdPlayer, highRdOpponent, 'a_win');

      const highRdChange = Math.abs(highRdResult.newRatingA - defaultPlayer.rating);
      const lowRdChange = Math.abs(lowRdResult.newRatingA - lowRdPlayer.rating);

      expect(highRdChange).toBeGreaterThan(lowRdChange);
    });
  });

  describe('opponent RD effects', () => {
    it('opponent with low RD causes bigger impact than opponent with high RD', () => {
      const playerA: GlickoPlayer = { rating: 1200, rd: 200, volatility: 0.06 };
      const highRdOpponent: GlickoPlayer = { rating: 1200, rd: 350, volatility: 0.06 };
      const lowRdOpponent: GlickoPlayer = { rating: 1200, rd: 50, volatility: 0.06 };

      const vsHighRd = calculateNewRatings(playerA, highRdOpponent, 'a_win');
      const vsLowRd = calculateNewRatings(playerA, lowRdOpponent, 'a_win');

      const changeVsHighRd = Math.abs(vsHighRd.newRatingA - playerA.rating);
      const changeVsLowRd = Math.abs(vsLowRd.newRatingA - playerA.rating);

      // Beating a well-established opponent (low RD) should give bigger change
      expect(changeVsLowRd).toBeGreaterThan(changeVsHighRd);
    });
  });

  describe('volatility', () => {
    it('stays within reasonable bounds', () => {
      const result = calculateNewRatings(defaultPlayer, defaultPlayer, 'a_win');
      expect(result.newVolatilityA).toBeGreaterThan(0);
      expect(result.newVolatilityA).toBeLessThan(0.2);
      expect(result.newVolatilityB).toBeGreaterThan(0);
      expect(result.newVolatilityB).toBeLessThan(0.2);
    });

    it('volatility for established player stays stable', () => {
      const result = calculateNewRatings(establishedPlayer, lowRdPlayer, 'a_win');
      expect(result.newVolatilityA).toBeGreaterThan(0);
      expect(result.newVolatilityA).toBeLessThan(0.2);
    });
  });

  describe('rounding', () => {
    it('ratings are rounded to integers', () => {
      const result = calculateNewRatings(defaultPlayer, defaultPlayer, 'a_win');
      expect(Number.isInteger(result.newRatingA)).toBe(true);
      expect(Number.isInteger(result.newRatingB)).toBe(true);
    });

    it('RD is rounded to 2 decimal places', () => {
      const result = calculateNewRatings(defaultPlayer, defaultPlayer, 'a_win');
      const decimalPlaces = (n: number) => {
        const s = n.toString();
        const dot = s.indexOf('.');
        return dot === -1 ? 0 : s.length - dot - 1;
      };
      expect(decimalPlaces(result.newRdA)).toBeLessThanOrEqual(2);
      expect(decimalPlaces(result.newRdB)).toBeLessThanOrEqual(2);
    });
  });
});
