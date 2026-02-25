import { NextRequest } from 'next/server';
import {
  getPlayerById,
  getWarriorByPlayerId,
  createBattle,
  updatePlayerRating,
  withTransaction,
  isMaintenanceMode,
  getRecentPairBattleCount,
} from '@/lib/db';
import { runBattle, parseWarrior } from '@/lib/engine';
import { calculateNewRatings, GlickoPlayer } from '@/lib/glicko';
import { conservativeRating } from '@/lib/player-utils';
import { withAuth, handleRouteError } from '@/lib/api-utils';
import { calculateDiminishingFactor, applyDiminishingFactor, DIMINISHING_WINDOW_MINUTES } from '@/lib/diminishing';

export const POST = withAuth(async (request: NextRequest, challenger) => {
  try {
    const maintenance = await isMaintenanceMode();
    if (maintenance) {
      return Response.json(
        { error: 'Arena is in maintenance mode. Battles are temporarily disabled.' },
        { status: 503 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }
    const { defender_id } = body;

    if (!defender_id || typeof defender_id !== 'number') {
      return Response.json(
        { error: 'defender_id is required and must be a number' },
        { status: 400 }
      );
    }

    if (defender_id === challenger.id) {
      return Response.json(
        { error: 'You cannot challenge yourself' },
        { status: 400 }
      );
    }

    const defender = await getPlayerById(defender_id);
    if (!defender) {
      return Response.json(
        { error: 'Defender not found' },
        { status: 404 }
      );
    }

    const challengerWarrior = await getWarriorByPlayerId(challenger.id);
    if (!challengerWarrior) {
      return Response.json(
        { error: 'You must upload a warrior before challenging' },
        { status: 400 }
      );
    }

    const defenderWarrior = await getWarriorByPlayerId(defender.id);
    if (!defenderWarrior) {
      return Response.json(
        { error: 'Defender has no warrior uploaded' },
        { status: 400 }
      );
    }

    // Validate warriors are within size limits (defense-in-depth)
    const challengerParse = parseWarrior(challengerWarrior.redcode);
    if (!challengerParse.success) {
      return Response.json(
        { error: 'Your warrior is invalid or exceeds the maximum length. Please re-upload.' },
        { status: 400 }
      );
    }
    const defenderParse = parseWarrior(defenderWarrior.redcode);
    if (!defenderParse.success) {
      return Response.json(
        { error: 'Defender warrior is invalid or exceeds the maximum length' },
        { status: 400 }
      );
    }

    // Run the battle
    const battleResult = runBattle(
      challengerWarrior.redcode,
      defenderWarrior.redcode
    );

    // Calculate new ELO ratings
    const resultMap = {
      challenger_win: { elo: 'a_win' as const, challenger: 'win' as const, defender: 'loss' as const },
      defender_win: { elo: 'b_win' as const, challenger: 'loss' as const, defender: 'win' as const },
      tie: { elo: 'tie' as const, challenger: 'tie' as const, defender: 'tie' as const },
    };
    const mapped = resultMap[battleResult.overallResult];
    const challengerResultType = mapped.challenger;
    const defenderResultType = mapped.defender;

    const challengerGlicko: GlickoPlayer = {
      rating: challenger.elo_rating,
      rd: challenger.rating_deviation,
      volatility: challenger.rating_volatility,
    };
    const defenderGlicko: GlickoPlayer = {
      rating: defender.elo_rating,
      rd: defender.rating_deviation,
      volatility: defender.rating_volatility,
    };

    const {
      newRatingA, newRdA, newVolatilityA,
      newRatingB, newRdB, newVolatilityB,
    } = calculateNewRatings(challengerGlicko, defenderGlicko, mapped.elo);

    // Update ratings and record battle atomically, with diminishing returns
    const oldA = { rating: challenger.elo_rating, rd: challenger.rating_deviation, volatility: challenger.rating_volatility };
    const oldB = { rating: defender.elo_rating, rd: defender.rating_deviation, volatility: defender.rating_volatility };
    const rawNewA = { rating: newRatingA, rd: newRdA, volatility: newVolatilityA };
    const rawNewB = { rating: newRatingB, rd: newRdB, volatility: newVolatilityB };

    const { battle, diminishingFactor } = await withTransaction(async (client) => {
      const pairCount = await getRecentPairBattleCount(
        challenger.id, defender.id, DIMINISHING_WINDOW_MINUTES, client
      );
      const factor = calculateDiminishingFactor(pairCount);

      const dim = applyDiminishingFactor(factor, oldA, oldB, rawNewA, rawNewB);

      await updatePlayerRating(challenger.id, dim.ratingA, dim.rdA, dim.volatilityA, challengerResultType, client);
      await updatePlayerRating(defender.id, dim.ratingB, dim.rdB, dim.volatilityB, defenderResultType, client);

      const b = await createBattle({
        challenger_id: challenger.id,
        defender_id: defender.id,
        challenger_warrior_id: challengerWarrior.id,
        defender_warrior_id: defenderWarrior.id,
        result: battleResult.overallResult,
        rounds: battleResult.rounds.length,
        challenger_wins: battleResult.challengerWins,
        defender_wins: battleResult.defenderWins,
        ties: battleResult.ties,
        challenger_elo_before: challenger.elo_rating,
        defender_elo_before: defender.elo_rating,
        challenger_elo_after: dim.ratingA,
        defender_elo_after: dim.ratingB,
        challenger_rd_before: challenger.rating_deviation,
        challenger_rd_after: dim.rdA,
        defender_rd_before: defender.rating_deviation,
        defender_rd_after: dim.rdB,
        challenger_redcode: challengerWarrior.redcode,
        defender_redcode: defenderWarrior.redcode,
        round_results: battleResult.rounds,
      }, client);

      return { battle: b, diminishingFactor: factor };
    });

    const dimA = applyDiminishingFactor(diminishingFactor, oldA, oldB, rawNewA, rawNewB);

    return Response.json({
      battle_id: battle.id,
      result: battleResult.overallResult,
      diminishing_factor: diminishingFactor,
      rounds: battleResult.rounds,
      score: {
        challenger_wins: battleResult.challengerWins,
        defender_wins: battleResult.defenderWins,
        ties: battleResult.ties,
      },
      rating_changes: {
        challenger: {
          name: challenger.name,
          before: conservativeRating(challenger.elo_rating, challenger.rating_deviation),
          after: conservativeRating(dimA.ratingA, dimA.rdA),
          change: conservativeRating(dimA.ratingA, dimA.rdA) - conservativeRating(challenger.elo_rating, challenger.rating_deviation),
        },
        defender: {
          name: defender.name,
          before: conservativeRating(defender.elo_rating, defender.rating_deviation),
          after: conservativeRating(dimA.ratingB, dimA.rdB),
          change: conservativeRating(dimA.ratingB, dimA.rdB) - conservativeRating(defender.elo_rating, defender.rating_deviation),
        },
      },
    });
  } catch (error) {
    return handleRouteError('Challenge error', error);
  }
});
