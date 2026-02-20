import { NextRequest } from 'next/server';
import { upsertWarrior } from '@/lib/db';
import { parseWarrior } from '@/lib/engine';
import { withAuth, handleRouteError } from '@/lib/api-utils';
import { HILLS } from '@/lib/hills';

export const POST = withAuth(async (request: NextRequest, player) => {
  try {
    const body = await request.json();
    const { name, redcode } = body;

    if (!name || typeof name !== 'string') {
      return Response.json(
        { error: 'Warrior name is required' },
        { status: 400 }
      );
    }

    if (!redcode || typeof redcode !== 'string') {
      return Response.json(
        { error: 'Redcode source is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 100) {
      return Response.json(
        { error: 'Warrior name must be between 1 and 100 characters' },
        { status: 400 }
      );
    }

    // Validate redcode (uses MAX_WARRIOR_LENGTH = 200, loosest limit)
    const parseResult = parseWarrior(redcode);
    if (!parseResult.success) {
      return Response.json(
        {
          error: 'Invalid Redcode',
          details: parseResult.errors,
        },
        { status: 400 }
      );
    }

    // Determine which hills this warrior is compatible with
    const compatible_hills = Object.values(HILLS)
      .filter(h => parseResult.instructionCount <= h.maxLength)
      .map(h => h.slug);

    const warrior = await upsertWarrior(player.id, trimmedName, redcode);

    return Response.json({
      id: warrior.id,
      name: warrior.name,
      instruction_count: parseResult.instructionCount,
      compatible_hills,
      message: 'Warrior uploaded successfully',
    }, { status: 201 });
  } catch (error) {
    return handleRouteError('Warrior upload error', error);
  }
});
