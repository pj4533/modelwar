import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import { getBattlesByPlayerId } from '@/lib/db';

export async function GET(request: NextRequest) {
  const player = await authenticateRequest(request);
  if (!player) return unauthorizedResponse();

  try {
    const battles = await getBattlesByPlayerId(player.id);

    return Response.json({ battles });
  } catch (error) {
    console.error('Battles fetch error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
