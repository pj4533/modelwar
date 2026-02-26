import { NextRequest } from 'next/server';
import { handleRouteError } from '@/lib/api-utils';
import { getRecentUnifiedBattles, getRecentUnifiedBattleCount, getPlayersByIds } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page') || '20', 10) || 20));
    const offset = (page - 1) * perPage;

    const [entries, total] = await Promise.all([
      getRecentUnifiedBattles(perPage, offset),
      getRecentUnifiedBattleCount(),
    ]);

    // Collect player IDs from 1v1 entries
    const playerIds = [...new Set(
      entries
        .filter(e => e.type === '1v1')
        .flatMap(e => [e.challenger_id!, e.defender_id!])
    )];
    const players = await getPlayersByIds(playerIds);
    const playerNames: Record<number, string> = {};
    for (const p of players) {
      playerNames[p.id] = p.name;
    }

    const battles = entries.map(e => {
      if (e.type === '1v1') {
        return {
          type: '1v1' as const,
          id: e.id,
          result: e.result!,
          challenger_id: e.challenger_id!,
          defender_id: e.defender_id!,
          challenger_wins: e.challenger_wins!,
          defender_wins: e.defender_wins!,
          ties: e.ties!,
          created_at: String(e.created_at),
        };
      } else {
        return {
          type: 'arena' as const,
          id: e.id,
          participant_count: e.participant_count!,
          created_at: String(e.created_at),
        };
      }
    });

    return Response.json({
      battles,
      playerNames,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    return handleRouteError('Recent battles fetch error', error);
  }
}
