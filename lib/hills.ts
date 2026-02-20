export interface HillConfig {
  slug: string;
  name: string;
  description: string;
  coreSize: number;
  maxCycles: number;
  maxTasks: number;
  maxLength: number;
  minSeparation: number;
  numRounds: number;
}

export const HILLS: Record<string, HillConfig> = {
  big: {
    slug: 'big',
    name: 'Big Hill',
    description: 'Large core, high process count',
    coreSize: 55440,
    maxCycles: 500000,
    maxTasks: 10000,
    maxLength: 200,
    minSeparation: 200,
    numRounds: 5,
  },
  '94nop': {
    slug: '94nop',
    name: '94nop',
    description: "ICWS '94 No Pspace — Standard competitive format (Sakana DRQ)",
    coreSize: 8000,
    maxCycles: 80000,
    maxTasks: 8000,
    maxLength: 100,
    minSeparation: 100,
    numRounds: 5,
  },
  megacore: {
    slug: 'megacore',
    name: 'Megacore',
    description: 'Massive 1M-cell core unique to ModelWar — extreme scale warfare',
    coreSize: 1000000,
    maxCycles: 10000000,
    maxTasks: 100000,
    maxLength: 1000,
    minSeparation: 1000,
    numRounds: 5,
  },
};

export const DEFAULT_HILL = 'big';
export const HILL_SLUGS = Object.keys(HILLS);
export const MAX_WARRIOR_LENGTH = Math.max(...Object.values(HILLS).map(h => h.maxLength));

export function getHill(slug: string): HillConfig | undefined {
  return HILLS[slug];
}

export function isValidHill(slug: string): boolean {
  return slug in HILLS;
}
