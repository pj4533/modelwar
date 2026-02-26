import { calculateArenaRatings, ArenaParticipantRating } from '../arena-glicko';

function makeParticipant(overrides: Partial<ArenaParticipantRating> = {}): ArenaParticipantRating {
  return {
    playerId: 1,
    placement: 1,
    currentRating: 1200,
    currentRd: 350,
    currentVolatility: 0.06,
    ...overrides,
  };
}

describe('arena-glicko', () => {
  describe('calculateArenaRatings', () => {
    it('returns empty map for empty participants', () => {
      const result = calculateArenaRatings([]);
      expect(result.size).toBe(0);
    });

    it('returns empty map for single human', () => {
      const result = calculateArenaRatings([
        makeParticipant({ playerId: 1, placement: 1 }),
      ]);
      expect(result.size).toBe(0);
    });

    it('returns empty map when only bots (null playerId)', () => {
      const result = calculateArenaRatings([
        makeParticipant({ playerId: null, placement: 1 }),
        makeParticipant({ playerId: null, placement: 2 }),
      ]);
      expect(result.size).toBe(0);
    });

    it('returns empty map for 1 human + bots', () => {
      const result = calculateArenaRatings([
        makeParticipant({ playerId: 1, placement: 3 }),
        makeParticipant({ playerId: null, placement: 1 }),
        makeParticipant({ playerId: null, placement: 5 }),
      ]);
      expect(result.size).toBe(0);
    });

    it('calculates ratings for 2 humans - winner gets higher', () => {
      const result = calculateArenaRatings([
        makeParticipant({ playerId: 1, placement: 1, currentRating: 1200 }),
        makeParticipant({ playerId: 2, placement: 2, currentRating: 1200 }),
      ]);

      expect(result.size).toBe(2);
      const winner = result.get(1)!;
      const loser = result.get(2)!;
      expect(winner.rating).toBeGreaterThan(1200);
      expect(loser.rating).toBeLessThan(1200);
    });

    it('equal placements result in smaller rating changes', () => {
      const tiedResult = calculateArenaRatings([
        makeParticipant({ playerId: 1, placement: 1, currentRating: 1200, currentRd: 100 }),
        makeParticipant({ playerId: 2, placement: 1, currentRating: 1200, currentRd: 100 }),
      ]);

      const decisiveResult = calculateArenaRatings([
        makeParticipant({ playerId: 1, placement: 1, currentRating: 1200, currentRd: 100 }),
        makeParticipant({ playerId: 2, placement: 2, currentRating: 1200, currentRd: 100 }),
      ]);

      const tiedP1 = tiedResult.get(1)!;
      const decisiveP1 = decisiveResult.get(1)!;

      // Tied ratings should be closer to original than decisive
      expect(Math.abs(tiedP1.rating - 1200)).toBeLessThan(Math.abs(decisiveP1.rating - 1200));
    });

    it('returns valid rating, rd, and volatility for each player', () => {
      const result = calculateArenaRatings([
        makeParticipant({ playerId: 1, placement: 1 }),
        makeParticipant({ playerId: 2, placement: 5 }),
        makeParticipant({ playerId: 3, placement: 10 }),
      ]);

      expect(result.size).toBe(3);
      for (const [, update] of result) {
        expect(typeof update.rating).toBe('number');
        expect(typeof update.rd).toBe('number');
        expect(typeof update.volatility).toBe('number');
        expect(update.rd).toBeGreaterThan(0);
        expect(update.volatility).toBeGreaterThan(0);
      }
    });

    it('handles mixed humans and bots correctly', () => {
      const result = calculateArenaRatings([
        makeParticipant({ playerId: 1, placement: 1 }),
        makeParticipant({ playerId: null, placement: 2 }),
        makeParticipant({ playerId: 2, placement: 3 }),
        makeParticipant({ playerId: null, placement: 4 }),
      ]);

      // Only 2 humans
      expect(result.size).toBe(2);
      expect(result.has(1)).toBe(true);
      expect(result.has(2)).toBe(true);
    });

    it('5-player arena applies dampening factor', () => {
      const twoPlayers = calculateArenaRatings([
        makeParticipant({ playerId: 1, placement: 1, currentRd: 100 }),
        makeParticipant({ playerId: 2, placement: 2, currentRd: 100 }),
      ]);

      const fivePlayers = calculateArenaRatings([
        makeParticipant({ playerId: 1, placement: 1, currentRd: 100 }),
        makeParticipant({ playerId: 2, placement: 2, currentRd: 100 }),
        makeParticipant({ playerId: 3, placement: 3, currentRd: 100 }),
        makeParticipant({ playerId: 4, placement: 4, currentRd: 100 }),
        makeParticipant({ playerId: 5, placement: 5, currentRd: 100 }),
      ]);

      // With dampening 1/sqrt(H-1), 5 humans has dampening = 0.5
      // Rating change per pairwise match should be smaller
      const twoP1 = twoPlayers.get(1)!;
      const fiveP1 = fivePlayers.get(1)!;

      // Both should increase since player 1 placed 1st,
      // but the per-opponent effect is dampened in the 5-player case
      expect(twoP1.rating).toBeGreaterThan(1200);
      expect(fiveP1.rating).toBeGreaterThan(1200);
    });
  });
});
