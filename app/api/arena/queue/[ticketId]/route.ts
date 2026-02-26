import { NextRequest } from 'next/server';
import {
  getQueueEntryByTicket,
  getOldestSessionExpiry,
} from '@/lib/db';
import { triggerArenaBattle } from '@/lib/arena-trigger';
import { withAuth, handleRouteError } from '@/lib/api-utils';

export const GET = withAuth(async (
  request: NextRequest,
  player
) => {
  try {
    const ticketId = request.nextUrl.pathname.split('/').pop()!;

    const entry = await getQueueEntryByTicket(ticketId);
    if (!entry) {
      return Response.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Verify ownership
    if (entry.player_id !== player.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (entry.status === 'completed') {
      return Response.json({
        ticket_id: entry.ticket_id,
        status: 'completed',
        arena_id: entry.arena_id,
        results: entry.results,
      });
    }

    if (entry.status === 'expired') {
      return Response.json({
        ticket_id: entry.ticket_id,
        status: 'expired',
      });
    }

    if (entry.status === 'waiting') {
      // Check if session has expired
      const oldestExpiry = await getOldestSessionExpiry(entry.session_id);
      const now = new Date();

      if (oldestExpiry && now > oldestExpiry) {
        // Session expired — trigger battle with bot-filling
        const arenaId = await triggerArenaBattle(entry.session_id);
        if (arenaId) {
          // Re-fetch to get updated results
          const updatedEntry = await getQueueEntryByTicket(ticketId);
          if (updatedEntry && updatedEntry.status === 'completed') {
            return Response.json({
              ticket_id: updatedEntry.ticket_id,
              status: 'completed',
              arena_id: arenaId,
              results: updatedEntry.results,
            });
          }
        }
      }

      return Response.json({
        ticket_id: entry.ticket_id,
        status: 'waiting',
        session_id: entry.session_id,
        poll_interval_ms: 2000,
        expires_at: entry.expires_at,
      });
    }

    // Fallback for unknown status
    return Response.json({
      ticket_id: entry.ticket_id,
      status: entry.status,
    });
  } catch (error) {
    return handleRouteError('Arena queue poll error', error);
  }
});
