const K_FACTOR = 32;

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function calculateNewRatings(
  ratingA: number,
  ratingB: number,
  result: 'a_win' | 'b_win' | 'tie'
): { newRatingA: number; newRatingB: number } {
  const expectedA = expectedScore(ratingA, ratingB);
  const expectedB = expectedScore(ratingB, ratingA);

  let scoreA: number;
  let scoreB: number;

  switch (result) {
    case 'a_win':
      scoreA = 1;
      scoreB = 0;
      break;
    case 'b_win':
      scoreA = 0;
      scoreB = 1;
      break;
    case 'tie':
      scoreA = 0.5;
      scoreB = 0.5;
      break;
  }

  return {
    newRatingA: Math.round(ratingA + K_FACTOR * (scoreA - expectedA)),
    newRatingB: Math.round(ratingB + K_FACTOR * (scoreB - expectedB)),
  };
}
