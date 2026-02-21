// Glicko-2 Rating System
// Reference: http://www.glicko.net/glicko/glicko2.pdf

const TAU = 0.5;
const EPSILON = 0.000001;
const GLICKO2_SCALE = 173.7178;

export const DEFAULT_RATING = 1200;
export const DEFAULT_RD = 350;
export const DEFAULT_VOLATILITY = 0.06;

export interface GlickoPlayer {
  rating: number;
  rd: number;
  volatility: number;
}

export interface GlickoResult {
  newRatingA: number;
  newRdA: number;
  newVolatilityA: number;
  newRatingB: number;
  newRdB: number;
  newVolatilityB: number;
}

// Scale conversion functions
function toGlicko2(rating: number): number {
  return (rating - DEFAULT_RATING) / GLICKO2_SCALE;
}

function fromGlicko2(mu: number): number {
  return mu * GLICKO2_SCALE + DEFAULT_RATING;
}

function rdToGlicko2(rd: number): number {
  return rd / GLICKO2_SCALE;
}

function rdFromGlicko2(phi: number): number {
  return phi * GLICKO2_SCALE;
}

// g function: reduces impact based on opponent's RD uncertainty
function g(phi: number): number {
  return 1 / Math.sqrt(1 + 3 * phi * phi / (Math.PI * Math.PI));
}

// E function: expected score
function E(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

// Compute new volatility using the Illinois algorithm (Section 5.4 of the paper)
function computeNewVolatility(
  sigma: number,
  phi: number,
  v: number,
  delta: number
): number {
  const a = Math.log(sigma * sigma);
  const phiSq = phi * phi;
  const deltaSq = delta * delta;

  function f(x: number): number {
    const ex = Math.exp(x);
    const num1 = ex * (deltaSq - phiSq - v - ex);
    const den1 = 2 * (phiSq + v + ex) * (phiSq + v + ex);
    const num2 = x - a;
    const den2 = TAU * TAU;
    return num1 / den1 - num2 / den2;
  }

  // Set initial values for the iterative algorithm
  let A = a;
  let B: number;

  if (deltaSq > phiSq + v) {
    B = Math.log(deltaSq - phiSq - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) {
      k++;
    }
    B = a - k * TAU;
  }

  // Iterative convergence
  let fA = f(A);
  let fB = f(B);

  while (Math.abs(B - A) > EPSILON) {
    const C = A + (A - B) * fA / (fB - fA);
    const fC = f(C);

    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }

    B = C;
    fB = fC;
  }

  return Math.exp(A / 2);
}

// Update a single player's rating against one opponent
function updateSinglePlayer(
  player: GlickoPlayer,
  opponent: GlickoPlayer,
  score: number
): { rating: number; rd: number; volatility: number } {
  const mu = toGlicko2(player.rating);
  const phi = rdToGlicko2(player.rd);
  const sigma = player.volatility;

  const muJ = toGlicko2(opponent.rating);
  const phiJ = rdToGlicko2(opponent.rd);

  // Step 3: Compute variance
  const gPhiJ = g(phiJ);
  const eVal = E(mu, muJ, phiJ);
  const v = 1 / (gPhiJ * gPhiJ * eVal * (1 - eVal));

  // Step 4: Compute delta
  const delta = v * gPhiJ * (score - eVal);

  // Step 5: Compute new volatility
  const newSigma = computeNewVolatility(sigma, phi, v, delta);

  // Step 6: Update phi to phi*
  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);

  // Step 7: Update phi and mu
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = mu + newPhi * newPhi * gPhiJ * (score - eVal);

  return {
    rating: Math.round(fromGlicko2(newMu)),
    rd: Math.round(rdFromGlicko2(newPhi) * 100) / 100,
    volatility: Math.round(newSigma * 1000000) / 1000000,
  };
}

export function calculateNewRatings(
  playerA: GlickoPlayer,
  playerB: GlickoPlayer,
  result: 'a_win' | 'b_win' | 'tie'
): GlickoResult {
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

  const updatedA = updateSinglePlayer(playerA, playerB, scoreA);
  const updatedB = updateSinglePlayer(playerB, playerA, scoreB);

  return {
    newRatingA: updatedA.rating,
    newRdA: updatedA.rd,
    newVolatilityA: updatedA.volatility,
    newRatingB: updatedB.rating,
    newRdB: updatedB.rd,
    newVolatilityB: updatedB.volatility,
  };
}
