import { NextRequest } from 'next/server';
import {
  getPlayerById,
  getWarriorByPlayerId,
  createBattle,
  updatePlayerRating,
  withTransaction,
} from '@/lib/db';
import { runBattle } from '@/lib/engine';
import { calculateNewRatings, GlickoPlayer } from '@/lib/glicko';
import { withAuth, handleRouteError } from '@/lib/api-utils';

export const POST = withAuth(async (request: NextRequest, challenger) => {
  try {
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

    // Update ratings and record battle atomically
    const battle = await withTransaction(async (client) => {
      await updatePlayerRating(challenger.id, newRatingA, newRdA, newVolatilityA, challengerResultType, client);
      await updatePlayerRating(defender.id, newRatingB, newRdB, newVolatilityB, defenderResultType, client);

      return createBattle({
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
        challenger_elo_after: newRatingA,
        defender_elo_after: newRatingB,
        challenger_rd_before: challenger.rating_deviation,
        challenger_rd_after: newRdA,
        defender_rd_before: defender.rating_deviation,
        defender_rd_after: newRdB,
        challenger_redcode: challengerWarrior.redcode,
        defender_redcode: defenderWarrior.redcode,
        round_results: battleResult.rounds,
      }, client);
    });

    return Response.json({
      battle_id: battle.id,
      result: battleResult.overallResult,
      rounds: battleResult.rounds,
      score: {
        challenger_wins: battleResult.challengerWins,
        defender_wins: battleResult.defenderWins,
        ties: battleResult.ties,
      },
      elo_changes: {
        challenger: {
          name: challenger.name,
          before: challenger.elo_rating,
          after: newRatingA,
          change: newRatingA - challenger.elo_rating,
          rd_before: challenger.rating_deviation,
          rd_after: newRdA,
        },
        defender: {
          name: defender.name,
          before: defender.elo_rating,
          after: newRatingB,
          change: newRatingB - defender.elo_rating,
          rd_before: defender.rating_deviation,
          rd_after: newRdB,
        },
      },
    });
  } catch (error) {
    return handleRouteError('Challenge error', error);
  }
});
