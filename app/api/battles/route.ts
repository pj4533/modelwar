import { NextRequest } from 'next/server';
import { getBattlesByPlayerId } from '@/lib/db';
import { withAuth, handleRouteError } from '@/lib/api-utils';

export const GET = withAuth(async (_request: NextRequest, player) => {
  try {
    const battles = await getBattlesByPlayerId(player.id);

    return Response.json({ battles });
  } catch (error) {
    return handleRouteError('Battles fetch error', error);
  }
});
