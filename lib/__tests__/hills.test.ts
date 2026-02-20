import {
  HILLS,
  DEFAULT_HILL,
  HILL_SLUGS,
  MAX_WARRIOR_LENGTH,
  getHill,
  isValidHill,
  HillConfig,
} from '../hills';

describe('HILLS', () => {
  it('contains exactly the expected keys', () => {
    expect(Object.keys(HILLS).sort()).toEqual(['94nop', 'big', 'megacore']);
  });

  describe('big hill config', () => {
    it('has the correct values', () => {
      expect(HILLS.big).toEqual<HillConfig>({
        slug: 'big',
        name: 'Big Hill',
        description: 'Large core, high process count',
        coreSize: 55440,
        maxCycles: 500000,
        maxTasks: 10000,
        maxLength: 200,
        minSeparation: 200,
        numRounds: 5,
      });
    });
  });

  describe('94nop hill config', () => {
    it('has the correct values', () => {
      expect(HILLS['94nop']).toEqual<HillConfig>({
        slug: '94nop',
        name: '94nop',
        description: "ICWS '94 No Pspace — Standard competitive format (Sakana DRQ)",
        coreSize: 8000,
        maxCycles: 80000,
        maxTasks: 8000,
        maxLength: 100,
        minSeparation: 100,
        numRounds: 5,
      });
    });
  });

  describe('megacore hill config', () => {
    it('has the correct values', () => {
      expect(HILLS.megacore).toEqual<HillConfig>({
        slug: 'megacore',
        name: 'Megacore',
        description: 'Massive 1M-cell core unique to ModelWar — extreme scale warfare',
        coreSize: 1000000,
        maxCycles: 10000000,
        maxTasks: 100000,
        maxLength: 1000,
        minSeparation: 1000,
        numRounds: 5,
      });
    });
  });

  it('every config slug matches its key', () => {
    for (const [key, config] of Object.entries(HILLS)) {
      expect(config.slug).toBe(key);
    }
  });
});

describe('DEFAULT_HILL', () => {
  it('is "big"', () => {
    expect(DEFAULT_HILL).toBe('big');
  });

  it('is a valid key in HILLS', () => {
    expect(HILLS[DEFAULT_HILL]).toBeDefined();
  });
});

describe('HILL_SLUGS', () => {
  it('contains all slugs', () => {
    expect(HILL_SLUGS).toContain('big');
    expect(HILL_SLUGS).toContain('94nop');
    expect(HILL_SLUGS).toContain('megacore');
  });

  it('has the same length as the number of HILLS entries', () => {
    expect(HILL_SLUGS.length).toBe(Object.keys(HILLS).length);
  });
});

describe('MAX_WARRIOR_LENGTH', () => {
  it('is 1000', () => {
    expect(MAX_WARRIOR_LENGTH).toBe(1000);
  });

  it('equals the maximum maxLength across all hills', () => {
    const computed = Math.max(...Object.values(HILLS).map(h => h.maxLength));
    expect(MAX_WARRIOR_LENGTH).toBe(computed);
  });

  it('is greater than or equal to every individual hill maxLength', () => {
    for (const config of Object.values(HILLS)) {
      expect(MAX_WARRIOR_LENGTH).toBeGreaterThanOrEqual(config.maxLength);
    }
  });
});

describe('getHill', () => {
  it('returns the correct config for "big"', () => {
    const hill = getHill('big');
    expect(hill).toBeDefined();
    expect(hill!.slug).toBe('big');
    expect(hill!.coreSize).toBe(55440);
  });

  it('returns the correct config for "94nop"', () => {
    const hill = getHill('94nop');
    expect(hill).toBeDefined();
    expect(hill!.slug).toBe('94nop');
    expect(hill!.coreSize).toBe(8000);
  });

  it('returns the correct config for "megacore"', () => {
    const hill = getHill('megacore');
    expect(hill).toBeDefined();
    expect(hill!.slug).toBe('megacore');
    expect(hill!.coreSize).toBe(1000000);
  });

  it('returns the same object reference as HILLS[slug]', () => {
    expect(getHill('big')).toBe(HILLS.big);
    expect(getHill('94nop')).toBe(HILLS['94nop']);
    expect(getHill('megacore')).toBe(HILLS.megacore);
  });

  it('returns undefined for an unknown slug', () => {
    expect(getHill('nonexistent')).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(getHill('')).toBeUndefined();
  });
});

describe('isValidHill', () => {
  it('returns true for "big"', () => {
    expect(isValidHill('big')).toBe(true);
  });

  it('returns true for "94nop"', () => {
    expect(isValidHill('94nop')).toBe(true);
  });

  it('returns true for "megacore"', () => {
    expect(isValidHill('megacore')).toBe(true);
  });

  it('returns false for an unknown slug', () => {
    expect(isValidHill('nonexistent')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isValidHill('')).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(isValidHill('Big')).toBe(false);
    expect(isValidHill('BIG')).toBe(false);
  });
});
