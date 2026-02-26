import { STOCK_BOTS, getStockBots } from '../stock-bots';

describe('stock-bots', () => {
  describe('STOCK_BOTS', () => {
    it('has exactly 5 bots', () => {
      expect(STOCK_BOTS).toHaveLength(5);
    });

    it('each bot has required fields', () => {
      for (const bot of STOCK_BOTS) {
        expect(bot.name).toBeDefined();
        expect(bot.author).toBeDefined();
        expect(bot.redcode).toBeDefined();
        expect(typeof bot.name).toBe('string');
        expect(typeof bot.author).toBe('string');
        expect(typeof bot.redcode).toBe('string');
      }
    });

    it('each bot name starts with [BOT]', () => {
      for (const bot of STOCK_BOTS) {
        expect(bot.name).toMatch(/^\[BOT\]/);
      }
    });

    it('includes all five archetypes', () => {
      const names = STOCK_BOTS.map((b) => b.name);
      expect(names).toContain('[BOT] Imp');
      expect(names).toContain('[BOT] Dwarf');
      expect(names).toContain('[BOT] Paper');
      expect(names).toContain('[BOT] Stone');
      expect(names).toContain('[BOT] Scissors');
    });
  });

  describe('getStockBots', () => {
    it('returns empty array for count 0', () => {
      expect(getStockBots(0)).toEqual([]);
    });

    it('returns first 3 bots for count 3', () => {
      const bots = getStockBots(3);
      expect(bots).toHaveLength(3);
      expect(bots[0].name).toBe('[BOT] Imp');
      expect(bots[1].name).toBe('[BOT] Dwarf');
      expect(bots[2].name).toBe('[BOT] Paper');
    });

    it('returns all 5 bots for count 5', () => {
      const bots = getStockBots(5);
      expect(bots).toHaveLength(5);
    });

    it('wraps around with round-robin for count > 5', () => {
      const bots = getStockBots(7);
      expect(bots).toHaveLength(7);
      expect(bots[5].name).toBe('[BOT] Imp');
      expect(bots[6].name).toBe('[BOT] Dwarf');
    });

    it('fills 9 slots correctly', () => {
      const bots = getStockBots(9);
      expect(bots).toHaveLength(9);
      // 0-4: Imp Dwarf Paper Stone Scissors, 5-8: Imp Dwarf Paper Stone
      expect(bots[8].name).toBe('[BOT] Stone');
    });
  });
});
