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

export type PlaybackSpeed = 100 | 500 | 1000 | 2500 | 10000 | 50000;

export interface ReplayState {
  status: 'loading' | 'ready' | 'playing' | 'paused' | 'finished' | 'error';
  errorMessage?: string;
  cycle: number;
  maxCycles: number;
  speed: PlaybackSpeed;
  territoryMap: Uint8Array;
  activityMap: Uint8Array;
  challengerTasks: number;
  defenderTasks: number;
  challengerAlive: boolean;
  defenderAlive: boolean;
  winner: string | null;
}
