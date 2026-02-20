jest.mock('pg', () => ({
  Pool: jest.fn(() => ({ query: jest.fn() })),
}));

process.env.POSTGRES_URL = 'postgres://user:pass@localhost:5432/testdb';

jest.mock('@/lib/db');

import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '../auth';
import { getPlayerByApiKey } from '@/lib/db';
import { makePlayer } from './fixtures';

const mockGetPlayerByApiKey = getPlayerByApiKey as jest.MockedFunction<typeof getPlayerByApiKey>;

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/test', { headers });
}

describe('authenticateRequest', () => {
  beforeEach(() => {
    mockGetPlayerByApiKey.mockReset();
  });

  it('returns null when no Authorization header is present', async () => {
    const result = await authenticateRequest(makeRequest());
    expect(result).toBeNull();
    expect(mockGetPlayerByApiKey).not.toHaveBeenCalled();
  });

  it('returns null when Authorization header does not start with Bearer', async () => {
    const result = await authenticateRequest(
      makeRequest({ Authorization: 'Basic abc123' })
    );
    expect(result).toBeNull();
    expect(mockGetPlayerByApiKey).not.toHaveBeenCalled();
  });

  it('returns null when Bearer token is empty', async () => {
    const result = await authenticateRequest(
      makeRequest({ Authorization: 'Bearer    ' })
    );
    expect(result).toBeNull();
    expect(mockGetPlayerByApiKey).not.toHaveBeenCalled();
  });

  it('calls getPlayerByApiKey and returns player for valid token', async () => {
    const player = makePlayer();
    mockGetPlayerByApiKey.mockResolvedValueOnce(player);

    const result = await authenticateRequest(
      makeRequest({ Authorization: 'Bearer test-api-key-123' })
    );

    expect(result).toEqual(player);
    expect(mockGetPlayerByApiKey).toHaveBeenCalledWith('test-api-key-123');
  });
});

describe('unauthorizedResponse', () => {
  it('returns 401 with correct error body', async () => {
    const response = unauthorizedResponse();
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body).toEqual({
      error: 'Unauthorized. Provide a valid API key via Authorization: Bearer <api_key>',
    });
  });
});
