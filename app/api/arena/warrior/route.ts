import { NextRequest } from 'next/server';
import { upsertArenaWarrior, isMaintenanceMode } from '@/lib/db';
import { parseWarrior } from '@/lib/engine';
import { MAX_WARRIOR_LENGTH } from '@/lib/arena-engine';
import { withAuth, handleRouteError } from '@/lib/api-utils';

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

    const { name, redcode, auto_join } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
      return Response.json(
        { error: 'name is required and must be 1-100 characters' },
        { status: 400 }
      );
    }

    if (!redcode || typeof redcode !== 'string') {
      return Response.json(
        { error: 'redcode is required and must be a string' },
        { status: 400 }
      );
    }

    const parseResult = parseWarrior(redcode);
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

    const autoJoin = typeof auto_join === 'boolean' ? auto_join : false;

    const warrior = await upsertArenaWarrior(player.id, name.trim(), redcode, autoJoin);

    return Response.json({
      id: warrior.id,
      name: warrior.name,
      redcode: warrior.redcode,
      auto_join: warrior.auto_join,
      instruction_count: parseResult.instructionCount,
      updated_at: warrior.updated_at,
    }, { status: 201 });
  } catch (error) {
    return handleRouteError('Arena warrior upload error', error);
  }
});
