import { NextRequest } from 'next/server';
import { getBattlesByPlayerId, getBattleCountByPlayerId } from '@/lib/db';
import { withAuth, handleRouteError } from '@/lib/api-utils';

export const GET = withAuth(async (request: NextRequest, player) => {
  try {
    const url = new URL(request.url);
    const pageParam = url.searchParams.get('page');
    const perPageParam = url.searchParams.get('per_page');

    if (pageParam || perPageParam) {
      const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
      const perPage = Math.min(100, Math.max(1, parseInt(perPageParam || '20', 10) || 20));
      const offset = (page - 1) * perPage;

      const [battles, total] = await Promise.all([
        getBattlesByPlayerId(player.id, perPage, offset),
        getBattleCountByPlayerId(player.id),
      ]);

      return Response.json({
        battles,
        pagination: {
          page,
          per_page: perPage,
          total,
          total_pages: Math.ceil(total / perPage),
        },
      });
    }

    const battles = await getBattlesByPlayerId(player.id);
    return Response.json({ battles });
  } catch (error) {
    return handleRouteError('Battles fetch error', error);
  }
});
