import { NextRequest } from 'next/server';
import {
  getQueueEntryByTicket,
  getOldestSessionExpiry,
  getSessionEntries,
  getPlayersByIds,
} from '@/lib/db';
import { triggerArenaBattle } from '@/lib/arena-trigger';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import { handleRouteError } from '@/lib/api-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const player = await authenticateRequest(request);
    if (!player) return unauthorizedResponse();

    const { ticketId } = await params;

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

      const sessionEntries = await getSessionEntries(entry.session_id);
      const playerIds = sessionEntries.map(e => e.player_id);
      const players = await getPlayersByIds(playerIds);
      const playersJoined = players.map(p => ({ id: p.id, name: p.name }));
      const timeRemainingMs = Math.max(0, new Date(entry.expires_at).getTime() - Date.now());

      return Response.json({
        ticket_id: entry.ticket_id,
        status: 'waiting',
        session_id: entry.session_id,
        poll_interval_ms: 2000,
        expires_at: entry.expires_at,
        players_joined: playersJoined,
        players_needed: 10,
        time_remaining_ms: timeRemainingMs,
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
}
