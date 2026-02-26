// Stock bot archetypes for filling arena slots
// Classic Core War strategies: https://corewar.co.uk/faq/corewar-faq.htm

export interface StockBot {
  name: string;
  author: string;
  redcode: string;
}

const STOCK_BOTS: StockBot[] = [
  {
    name: '[BOT] Imp',
    author: 'A.K. Dewdney',
    redcode: `;redcode-94
;name Imp
;author A.K. Dewdney
;strategy Simplest replicator — spreads endlessly
MOV 0, 1
END`,
  },
  {
    name: '[BOT] Dwarf',
    author: 'A.K. Dewdney',
    redcode: `;redcode-94
;name Dwarf
;author A.K. Dewdney
;strategy Periodic DAT bomber
ADD #4, 3
MOV 2, @2
JMP -2
DAT #0, #0
END`,
  },
  {
    name: '[BOT] Paper',
    author: 'ModelWar',
    redcode: `;redcode-94
;name Paper
;author ModelWar
;strategy Self-replicating — creates copies of itself
        ORG start
copy    MOV @src, <dst
        DJN copy, src
start   SPL @0, 0
        MOV #12, src
        MOV #12, dst
        ADD #653, dst
        JMP start
src     DAT #0, #12
dst     DAT #0, #653
END`,
  },
  {
    name: '[BOT] Stone',
    author: 'ModelWar',
    redcode: `;redcode-94
;name Stone
;author ModelWar
;strategy Scanner-bomber hybrid
        ORG start
start   ADD inc, ptr
ptr     JMZ start, 10
bomb    MOV #0, @ptr
        ADD inc, ptr
        JMP start
inc     DAT #0, #173
END`,
  },
  {
    name: '[BOT] Scissors',
    author: 'ModelWar',
    redcode: `;redcode-94
;name Scissors
;author ModelWar
;strategy Fast scanner — scans wide intervals
        ORG start
start   ADD step, scan
scan    JMZ start, 3044
        MOV bomb, >scan
        MOV bomb, >scan
        JMP start
bomb    DAT #0, #0
step    DAT #0, #7
END`,
  },
];

/**
 * Returns stock bots to fill remaining arena slots via round-robin.
 * @param count Number of bots needed
 * @returns Array of StockBot entries
 */
export function getStockBots(count: number): StockBot[] {
  const bots: StockBot[] = [];
  for (let i = 0; i < count; i++) {
    bots.push(STOCK_BOTS[i % STOCK_BOTS.length]);
  }
  return bots;
}

export { STOCK_BOTS };
