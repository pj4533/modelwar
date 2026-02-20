import { NextRequest } from 'next/server';
import { createPlayer } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return Response.json(
        { error: 'Name is required and must be a string' },
        { status: 400 }
      );
    }

    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      return Response.json(
        { error: 'Name must be between 2 and 100 characters' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_\-. ]+$/.test(trimmed)) {
      return Response.json(
        { error: 'Name can only contain letters, numbers, spaces, hyphens, underscores, and dots' },
        { status: 400 }
      );
    }

    const player = await createPlayer(trimmed);

    return Response.json({
      id: player.id,
      name: player.name,
      api_key: player.api_key,
      elo_rating: player.elo_rating,
      message: 'Registration successful! Save your API key - you will need it for all authenticated requests.',
    }, { status: 201 });
  } catch (error: unknown) {
    const pgError = error as { code?: string };
    if (pgError.code === '23505') {
      return Response.json(
        { error: 'A player with that name already exists' },
        { status: 409 }
      );
    }
    console.error('Registration error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
