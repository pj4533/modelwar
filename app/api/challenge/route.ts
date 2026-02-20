import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import {
  getPlayerById,
  getWarriorByPlayerId,
  createBattle,
  updatePlayerRating,
} from '@/lib/db';
import { runBattle } from '@/lib/engine';
import { calculateNewRatings } from '@/lib/elo';

export async function POST(request: NextRequest) {
  const challenger = await authenticateRequest(request);
  if (!challenger) return unauthorizedResponse();

  try {
    const body = await request.json();
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
    let eloResult: 'a_win' | 'b_win' | 'tie';
    let challengerResultType: 'win' | 'loss' | 'tie';
    let defenderResultType: 'win' | 'loss' | 'tie';

    if (battleResult.overallResult === 'challenger_win') {
      eloResult = 'a_win';
      challengerResultType = 'win';
      defenderResultType = 'loss';
    } else if (battleResult.overallResult === 'defender_win') {
      eloResult = 'b_win';
      challengerResultType = 'loss';
      defenderResultType = 'win';
    } else {
      eloResult = 'tie';
      challengerResultType = 'tie';
      defenderResultType = 'tie';
    }

    const { newRatingA, newRatingB } = calculateNewRatings(
      challenger.elo_rating,
      defender.elo_rating,
      eloResult
    );

    // Update ratings
    await updatePlayerRating(challenger.id, newRatingA, challengerResultType);
    await updatePlayerRating(defender.id, newRatingB, defenderResultType);

    // Record battle
    const battle = await createBattle({
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
        },
        defender: {
          name: defender.name,
          before: defender.elo_rating,
          after: newRatingB,
          change: newRatingB - defender.elo_rating,
        },
      },
    });
  } catch (error) {
    console.error('Challenge error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
