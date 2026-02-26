// Arena Glicko-2 Rating System — Human-Only Pairwise
// Uses standard Glicko-2 with multi-opponent support for arena placements.
// Reference: http://www.glicko.net/glicko/glicko2.pdf

const TAU = 0.5;
const EPSILON = 0.000001;
const GLICKO2_SCALE = 173.7178;
const DEFAULT_RATING = 1200;

export interface ArenaParticipantRating {
  playerId: number | null; // null for bots
  placement: number;       // 1 = first, 10 = last
  currentRating: number;
  currentRd: number;
  currentVolatility: number;
}

export interface ArenaRatingUpdate {
  rating: number;
  rd: number;
  volatility: number;
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

// g function
function g(phi: number): number {
  return 1 / Math.sqrt(1 + 3 * phi * phi / (Math.PI * Math.PI));
}

// E function: expected score
function E(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

// Compute new volatility using Illinois algorithm
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

/**
 * Calculate arena Glicko-2 ratings using human-only pairwise decomposition.
 *
 * After a battle, only human-vs-human placements are used for rating updates.
 * Bots participate in gameplay but are excluded from rating math.
 *
 * For each human, all their pairwise opponents are processed in one
 * Glicko-2 rating period (multi-opponent update).
 *
 * @param participants All arena participants (bots will be filtered out)
 * @returns Map of playerId -> new rating/rd/volatility (empty if < 2 humans)
 */
export function calculateArenaRatings(
  participants: ArenaParticipantRating[]
): Map<number, ArenaRatingUpdate> {
  // Filter to human participants only
  const humans = participants.filter((p) => p.playerId !== null);

  // Need at least 2 humans for pairwise rating
  if (humans.length < 2) {
    return new Map();
  }

  const H = humans.length;
  const dampening = 1 / Math.sqrt(H - 1);
  const results = new Map<number, ArenaRatingUpdate>();

  for (const player of humans) {
    const mu = toGlicko2(player.currentRating);
    const phi = rdToGlicko2(player.currentRd);
    const sigma = player.currentVolatility;

    // Opponents are all other humans
    const opponents = humans.filter((h) => h.playerId !== player.playerId);

    // Step 3: Compute variance v and delta across all opponents
    let vInv = 0; // 1/v accumulator
    let deltaSum = 0;

    for (const opp of opponents) {
      const muJ = toGlicko2(opp.currentRating);
      const phiJ = rdToGlicko2(opp.currentRd);
      const gJ = g(phiJ);
      const eJ = E(mu, muJ, phiJ);

      // Pairwise score: better placement (lower number) = 1.0
      let score: number;
      if (player.placement < opp.placement) {
        score = 1.0;
      } else if (player.placement > opp.placement) {
        score = 0.0;
      } else {
        score = 0.5;
      }

      // Apply dampening
      score = 0.5 + (score - 0.5) * dampening;

      vInv += gJ * gJ * eJ * (1 - eJ);
      deltaSum += gJ * (score - eJ);
    }

    const v = 1 / vInv;
    const delta = v * deltaSum;

    // Step 5: Compute new volatility
    const newSigma = computeNewVolatility(sigma, phi, v, delta);

    // Step 6: Update phi*
    const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);

    // Step 7: Update phi and mu
    const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
    const newMu = mu + newPhi * newPhi * deltaSum;

    results.set(player.playerId!, {
      rating: Math.round(fromGlicko2(newMu)),
      rd: Math.round(rdFromGlicko2(newPhi) * 100) / 100,
      volatility: Math.round(newSigma * 1000000) / 1000000,
    });
  }

  return results;
}
