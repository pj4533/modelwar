export interface ReplayData {
  battle_id: number;
  challenger: { name: string; redcode: string };
  defender: { name: string; redcode: string };
  round_results: Array<{ round: number; winner: string; seed: number }>;
  settings: SimSettings;
}

export interface SimSettings {
  coreSize: number;
  maxCycles: number;
  maxLength: number;
  maxTasks: number;
  minSeparation: number;
}

export interface CoreEvent {
  warriorId: number;
  address: number;
  accessType: 'READ' | 'WRITE' | 'EXECUTE';
}

export interface ReplayState {
  status: 'loading' | 'scanning' | 'ready' | 'playing' | 'paused' | 'finished' | 'error';
  errorMessage?: string;
  cycle: number;
  maxCycles: number;
  endCycle: number | null;
  territoryMap: Uint8Array;
  activityMap: Uint8Array;
  challengerTasks: number;
  defenderTasks: number;
  challengerAlive: boolean;
  defenderAlive: boolean;
  winner: string | null;
}
