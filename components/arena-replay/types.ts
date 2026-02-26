export interface ArenaReplayData {
  arena_id: number;
  seed: number;
  total_rounds: number;
  warriors: ArenaWarriorInfo[];
  rounds: ArenaRoundResult[];
  settings: ArenaSimSettings;
}

export interface ArenaWarriorInfo {
  slot_index: number;
  name: string;
  redcode: string;
  is_stock_bot: boolean;
}

export interface ArenaRoundResult {
  round_number: number;
  seed: number;
  survivor_count: number;
  winner_slot: number | null;
  scores: Record<string, number>;
}

export interface ArenaSimSettings {
  coreSize: number;
  maxCycles: number;
  maxLength: number;
  maxProcesses: number;
  minSeparation: number;
  warriors: number;
  rounds: number;
}

export interface CoreEvent {
  warriorId: number;
  address: number;
  accessType: 'READ' | 'WRITE' | 'EXECUTE';
}

export interface ArenaReplayState {
  status: 'loading' | 'scanning' | 'ready' | 'playing' | 'paused' | 'finished' | 'error';
  errorMessage?: string;
  cycle: number;
  maxCycles: number;
  endCycle: number | null;
  territoryMap: Uint8Array;
  activityMap: Uint8Array;
  warriorTasks: number[];
  warriorAlive: boolean[];
  winner: number | null; // slot index of winner, null for tie/ongoing
}
