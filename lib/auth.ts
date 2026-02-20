import { NextRequest } from 'next/server';
import { getPlayerByApiKey, Player } from './db';

export async function authenticateRequest(request: NextRequest): Promise<Player | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) {
    return null;
  }

  return getPlayerByApiKey(apiKey);
}

export function unauthorizedResponse() {
  return Response.json(
    { error: 'Unauthorized. Provide a valid API key via Authorization: Bearer <api_key>' },
    { status: 401 }
  );
}
