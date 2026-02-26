// 10-color palette for arena warriors
// Each color has three variants: active (bright), fading, and territory (dark)

export interface ArenaColor {
  name: string;
  active: [number, number, number];
  fading: [number, number, number];
  territory: [number, number, number];
}

const ARENA_COLORS: ArenaColor[] = [
  { name: 'Green',   active: [57, 255, 20],   fading: [30, 160, 15],   territory: [10, 74, 10] },
  { name: 'Magenta', active: [255, 0, 255],    fading: [160, 0, 160],   territory: [58, 0, 58] },
  { name: 'Cyan',    active: [0, 204, 255],    fading: [0, 120, 160],   territory: [0, 50, 80] },
  { name: 'Orange',  active: [255, 136, 0],    fading: [160, 85, 0],    territory: [80, 42, 0] },
  { name: 'Yellow',  active: [255, 221, 0],    fading: [160, 140, 0],   territory: [80, 70, 0] },
  { name: 'Red',     active: [255, 51, 51],    fading: [160, 32, 32],   territory: [80, 16, 16] },
  { name: 'Purple',  active: [153, 102, 255],  fading: [96, 64, 160],   territory: [48, 32, 80] },
  { name: 'Teal',    active: [0, 255, 170],    fading: [0, 160, 107],   territory: [0, 80, 53] },
  { name: 'Pink',    active: [255, 102, 170],  fading: [160, 64, 107],  territory: [80, 32, 53] },
  { name: 'White',   active: [221, 221, 255],  fading: [140, 140, 160], territory: [70, 70, 80] },
];

export { ARENA_COLORS };
