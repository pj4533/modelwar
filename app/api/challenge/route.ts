import { NextRequest } from 'next/server';
import {
  getPlayerById,
  getWarriorByPlayerId,
  createBattle,
  withTransaction,
  getOrCreateHillStats,
  updateHillStats,
} from '@/lib/db';
import { runBattle, parseWarrior } from '@/lib/engine';
import { calculateNewRatings } from '@/lib/elo';
import { withAuth, handleRouteError } from '@/lib/api-utils';
import { getHill, isValidHill, DEFAULT_HILL, HILL_SLUGS } from '@/lib/hills';

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
    const { defender_id, hill: hillSlug = DEFAULT_HILL } = body;

    if (!defender_id || typeof defender_id !== 'number') {
      return Response.json(
        { error: 'defender_id is required and must be a number' },
        { status: 400 }
      );
    }

    // Validate hill
    if (!isValidHill(hillSlug)) {
      return Response.json(
        { error: `Invalid hill "${hillSlug}". Available hills: ${HILL_SLUGS.join(', ')}` },
        { status: 400 }
      );
    }

    const hill = getHill(hillSlug)!;

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

    // Validate warrior lengths against hill's maxLength
    const challengerParse = parseWarrior(challengerWarrior.redcode, hill.maxLength);
    if (!challengerParse.success) {
      return Response.json(
        { error: `Your warrior is too long for ${hill.name} (max ${hill.maxLength} instructions, has ${challengerParse.instructionCount})` },
        { status: 400 }
      );
    }

    const defenderParse = parseWarrior(defenderWarrior.redcode, hill.maxLength);
    if (!defenderParse.success) {
      return Response.json(
        { error: `Defender's warrior is too long for ${hill.name} (max ${hill.maxLength} instructions, has ${defenderParse.instructionCount})` },
        { status: 400 }
      );
    }

    // Run the battle with hill config
    const battleResult = runBattle(
      challengerWarrior.redcode,
      defenderWarrior.redcode,
      hill
    );

    // Get per-hill ELO ratings and calculate new ratings
    const battle = await withTransaction(async (client) => {
      const challengerStats = await getOrCreateHillStats(challenger.id, hillSlug, client);
      const defenderStats = await getOrCreateHillStats(defender.id, hillSlug, client);

      const resultMap = {
        challenger_win: { elo: 'a_win' as const, challenger: 'win' as const, defender: 'loss' as const },
        defender_win: { elo: 'b_win' as const, challenger: 'loss' as const, defender: 'win' as const },
        tie: { elo: 'tie' as const, challenger: 'tie' as const, defender: 'tie' as const },
      };
      const mapped = resultMap[battleResult.overallResult];

      const { newRatingA, newRatingB } = calculateNewRatings(
        challengerStats.elo_rating,
        defenderStats.elo_rating,
        mapped.elo
      );

      await updateHillStats(challenger.id, hillSlug, newRatingA, mapped.challenger, client);
      await updateHillStats(defender.id, hillSlug, newRatingB, mapped.defender, client);

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
        challenger_elo_before: challengerStats.elo_rating,
        defender_elo_before: defenderStats.elo_rating,
        challenger_elo_after: newRatingA,
        defender_elo_after: newRatingB,
        challenger_redcode: challengerWarrior.redcode,
        defender_redcode: defenderWarrior.redcode,
        round_results: battleResult.rounds,
        hill: hillSlug,
      }, client);
    });

    return Response.json({
      battle_id: battle.id,
      result: battleResult.overallResult,
      hill: hillSlug,
      rounds: battleResult.rounds,
      score: {
        challenger_wins: battleResult.challengerWins,
        defender_wins: battleResult.defenderWins,
        ties: battleResult.ties,
      },
      elo_changes: {
        challenger: {
          name: challenger.name,
          before: battle.challenger_elo_before,
          after: battle.challenger_elo_after,
          change: battle.challenger_elo_after - battle.challenger_elo_before,
        },
        defender: {
          name: defender.name,
          before: battle.defender_elo_before,
          after: battle.defender_elo_after,
          change: battle.defender_elo_after - battle.defender_elo_before,
        },
      },
    });
  } catch (error) {
    return handleRouteError('Challenge error', error);
  }
});
