import { NextRequest } from 'next/server';
import { getArenaWarriorByPlayerId, isMaintenanceMode } from '@/lib/db';
import { startArena } from '@/lib/arena-start';
import { withAuth, handleRouteError } from '@/lib/api-utils';

export const POST = withAuth(async (_request: NextRequest, player) => {
  try {
    const maintenance = await isMaintenanceMode();
    if (maintenance) {
      return Response.json(
        { error: 'Arena is in maintenance mode. Battles are temporarily disabled.' },
        { status: 503 }
      );
    }

    const arenaWarrior = await getArenaWarriorByPlayerId(player.id);
    if (!arenaWarrior) {
      return Response.json(
        { error: 'No arena warrior found. Upload one first via POST /api/arena/warrior' },
        { status: 400 }
      );
    }

    const result = await startArena(player.id, arenaWarrior.redcode);

    return Response.json(result);
  } catch (error) {
    return handleRouteError('Arena start error', error);
  }
});
