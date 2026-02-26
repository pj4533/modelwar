import type { Player, Warrior, Battle, ArenaWarrior } from '../db';

export function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 1,
    name: 'TestPlayer',
    api_key: 'test-api-key-123',
    elo_rating: 1200,
    rating_deviation: 350,
    rating_volatility: 0.06,
    wins: 0,
    losses: 0,
    ties: 0,
    arena_rating: 1200,
    arena_rd: 350,
    arena_volatility: 0.06,
    arena_wins: 0,
    arena_losses: 0,
    arena_ties: 0,
    last_arena_at: null,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    ...overrides,
  };
}

export function makeWarrior(overrides: Partial<Warrior> = {}): Warrior {
  return {
    id: 1,
    player_id: 1,
    name: 'TestWarrior',
    redcode: 'MOV 0, 1',
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    ...overrides,
  };
}

export function makeArenaWarrior(overrides: Partial<ArenaWarrior> = {}): ArenaWarrior {
  return {
    id: 1,
    player_id: 1,
    name: 'ArenaWarrior',
    redcode: 'MOV 0, 1',
    auto_join: false,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    ...overrides,
  };
}

export function makeBattle(overrides: Partial<Battle> = {}): Battle {
  return {
    id: 1,
    challenger_id: 1,
    defender_id: 2,
    challenger_warrior_id: 1,
    defender_warrior_id: 2,
    result: 'challenger_win',
    rounds: 100,
    challenger_wins: 60,
    defender_wins: 30,
    ties: 10,
    challenger_elo_before: 1200,
    defender_elo_before: 1200,
    challenger_elo_after: 1216,
    defender_elo_after: 1184,
    challenger_rd_before: null,
    challenger_rd_after: null,
    defender_rd_before: null,
    defender_rd_after: null,
    challenger_redcode: null,
    defender_redcode: null,
    round_results: null,
    created_at: new Date('2025-01-01'),
    ...overrides,
  };
}
