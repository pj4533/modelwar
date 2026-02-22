import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from './auth';
import { Player } from './db';

export function handleRouteError(label: string, error: unknown): Response {
  console.error(`${label}:`, error);
  return Response.json({ error: 'Internal server error' }, { status: 500 });
}

export type ParsedId = { ok: true; value: number } | { ok: false; response: Response };

export function parseIdParam(raw: string, label: string): ParsedId {
  const value = parseInt(raw, 10);
  if (isNaN(value)) {
    return { ok: false, response: Response.json({ error: `Invalid ${label}` }, { status: 400 }) };
  }
  return { ok: true, value };
}

export function withAuth(
  handler: (request: NextRequest, player: Player) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    const player = await authenticateRequest(request);
    if (!player) return unauthorizedResponse();
    return handler(request, player);
  };
}
