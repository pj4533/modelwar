export interface BattleSummary {
  id: number;
  opponent: { id: number; name: string };
  result: 'win' | 'loss' | 'tie';
  score: string;
  rating_change: number;
  created_at: Date;
}

export interface PlayerProfileResponse {
  id: number;
  name: string;
  rating: number;
  provisional: boolean;
  wins: number;
  losses: number;
  ties: number;
  win_rate: number;
  rating_history: number[];
  warrior: {
    name: string;
    redcode: string;
    updated_at: Date;
  } | null;
  recent_battles: BattleSummary[];
  created_at: Date;
}

export interface BattleDetailResponse {
  id: number;
  result: string;
  rounds: number;
  round_results: unknown[] | null;
  score: {
    challenger_wins: number;
    defender_wins: number;
    ties: number;
  };
  challenger: {
    id: number;
    name: string | undefined;
    elo_before: number;
    elo_after: number;
    rd_before: number | null;
    rd_after: number | null;
    redcode: string | null;
  };
  defender: {
    id: number;
    name: string | undefined;
    elo_before: number;
    elo_after: number;
    rd_before: number | null;
    rd_after: number | null;
    redcode: string | null;
  };
  created_at: Date;
}
