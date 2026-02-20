import type { Battle } from './db';

export function buildEloHistory(playerId: number, battles: Battle[]): number[] {
  const chronological = [...battles].reverse();
  const points: number[] = [];
  for (const b of chronological) {
    if (b.challenger_id === playerId) {
      if (points.length === 0) points.push(b.challenger_elo_before);
      points.push(b.challenger_elo_after);
    } else {
      if (points.length === 0) points.push(b.defender_elo_before);
      points.push(b.defender_elo_after);
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

export function getPlayerResult(battleResult: string, isChallenger: boolean): 'win' | 'loss' | 'tie' {
  if (battleResult === 'tie') return 'tie';
  if (battleResult === 'challenger_win') return isChallenger ? 'win' : 'loss';
  return isChallenger ? 'loss' : 'win';
}
