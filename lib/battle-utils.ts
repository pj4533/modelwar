import type { RoundResultRecord } from './db';

export function findDecisiveRound(
  roundResults: RoundResultRecord[],
  challengerWins: number,
  defenderWins: number
): number {
  const overallWinner = challengerWins > defenderWins ? 'challenger' : 'defender';
  let winCount = 0;
  for (const round of roundResults) {
    if (round.winner === overallWinner) {
      winCount++;
      if (winCount === 3) return round.round;
    }
  }
  return roundResults[roundResults.length - 1]?.round ?? 5;
}
