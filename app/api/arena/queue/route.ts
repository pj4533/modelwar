import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import {
  getWaitingEntryForPlayer,
  findOpenSession,
  createArenaQueueEntry,
  getSessionEntryCount,
  getSessionEntries,
  getPlayersByIds,
  getQueueEntryByTicket,
  isMaintenanceMode,
} from '@/lib/db';
import { parseWarrior } from '@/lib/engine';
import { triggerArenaBattle } from '@/lib/arena-trigger';
import { withAuth, handleRouteError } from '@/lib/api-utils';
import { MAX_WARRIOR_LENGTH } from '@/lib/arena-engine';

const MAX_ARENA_SIZE = 10;

export const POST = withAuth(async (request: NextRequest, player) => {
  try {
    const maintenance = await isMaintenanceMode();
    if (maintenance) {
      return Response.json(
        { error: 'Arena is in maintenance mode. Battles are temporarily disabled.' },
        { status: 503 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    const { warrior_code } = body;
    if (!warrior_code || typeof warrior_code !== 'string') {
      return Response.json(
        { error: 'warrior_code is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate warrior code
    const parseResult = parseWarrior(warrior_code);
    if (!parseResult.success) {
      return Response.json(
        { error: 'Invalid warrior code', details: parseResult.errors },
        { status: 400 }
      );
    }

    if (parseResult.instructionCount > MAX_WARRIOR_LENGTH) {
      return Response.json(
        { error: `Warrior exceeds arena limit of ${MAX_WARRIOR_LENGTH} instructions (has ${parseResult.instructionCount})` },
        { status: 400 }
      );
    }

    // Idempotency: return existing waiting ticket
    const existingEntry = await getWaitingEntryForPlayer(player.id);
    if (existingEntry) {
      const sessionEntries = await getSessionEntries(existingEntry.session_id);
      const playerIds = sessionEntries.map(e => e.player_id);
      const players = await getPlayersByIds(playerIds);
      const playersJoined = players.map(p => ({ id: p.id, name: p.name }));
      const timeRemainingMs = Math.max(0, new Date(existingEntry.expires_at).getTime() - Date.now());

      return Response.json({
        ticket_id: existingEntry.ticket_id,
        status: 'waiting',
        session_id: existingEntry.session_id,
        poll_interval_ms: 2000,
        expires_at: existingEntry.expires_at,
        players_joined: playersJoined,
        players_needed: MAX_ARENA_SIZE,
        time_remaining_ms: timeRemainingMs,
      });
    }

    // Find or create a session
    let sessionId = await findOpenSession();
    if (!sessionId) {
      sessionId = randomUUID();
    }

    // Create queue entry
    const entry = await createArenaQueueEntry(player.id, sessionId, warrior_code);

    // Check if session is now full (10 players)
    const count = await getSessionEntryCount(sessionId);

    if (count >= MAX_ARENA_SIZE) {
      // Trigger battle immediately
      const arenaId = await triggerArenaBattle(sessionId);
      if (arenaId) {
        // Re-fetch the entry to get updated results
        const updatedEntry = await getQueueEntryByTicket(entry.ticket_id);
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

    const sessionEntries = await getSessionEntries(sessionId);
    const playerIds = sessionEntries.map(e => e.player_id);
    const players = await getPlayersByIds(playerIds);
    const playersJoined = players.map(p => ({ id: p.id, name: p.name }));
    const timeRemainingMs = Math.max(0, new Date(entry.expires_at).getTime() - Date.now());

    return Response.json({
      ticket_id: entry.ticket_id,
      status: 'waiting',
      session_id: sessionId,
      poll_interval_ms: 2000,
      expires_at: entry.expires_at,
      players_joined: playersJoined,
      players_needed: MAX_ARENA_SIZE,
      time_remaining_ms: timeRemainingMs,
    });
  } catch (error) {
    return handleRouteError('Arena queue join error', error);
  }
});
