import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth';
import { upsertWarrior } from '@/lib/db';
import { parseWarrior } from '@/lib/engine';

export async function POST(request: NextRequest) {
  const player = await authenticateRequest(request);
  if (!player) return unauthorizedResponse();

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

    // Validate redcode
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

    const warrior = await upsertWarrior(player.id, trimmedName, redcode);

    return Response.json({
      id: warrior.id,
      name: warrior.name,
      instruction_count: parseResult.instructionCount,
      message: 'Warrior uploaded successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Warrior upload error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
