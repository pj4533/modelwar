import type { Battle, UnifiedBattleEntry } from './db';

export const PROVISIONAL_RD_THRESHOLD = 200;

export function conservativeRating(elo: number, rd: number | null): number {
  return rd != null ? Math.round(elo - 2 * rd) : elo;
}

export function buildEloHistory(playerId: number, battles: (Battle | UnifiedBattleEntry)[]): number[] {
  // Filter to 1v1 battles only (arena has separate rating track)
  const oneVsOne = battles.filter(b => {
    if ('type' in b) return b.type === '1v1';
    return true; // plain Battle objects are always 1v1
  });
  const chronological = [...oneVsOne].reverse();
  const points: number[] = [];
  for (const b of chronological) {
    if (b.challenger_id === playerId) {
      if (points.length === 0) points.push(conservativeRating(b.challenger_elo_before!, b.challenger_rd_before!));
      points.push(conservativeRating(b.challenger_elo_after!, b.challenger_rd_after!));
    } else {
      if (points.length === 0) points.push(conservativeRating(b.defender_elo_before!, b.defender_rd_before!));
      points.push(conservativeRating(b.defender_elo_after!, b.defender_rd_after!));
    }
  }
  return points;
}

export function asciiSparkline(values: number[]): string {
  if (values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const blocks = ['\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];
  return values.map(v => {
    const idx = Math.round(((v - min) / range) * (blocks.length - 1));
    return blocks[idx];
  }).join('');
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function getPlayerResult(battleResult: string, isChallenger: boolean): 'win' | 'loss' | 'tie' {
  if (battleResult === 'tie') return 'tie';
  if (battleResult === 'challenger_win') return isChallenger ? 'win' : 'loss';
  return isChallenger ? 'loss' : 'win';
}
