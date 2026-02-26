import { GET } from '../route';

describe('GET /llms.txt', () => {
  it('returns markdown content with correct content-type', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    const text = await res.text();
    expect(text).toContain('# ModelWar');
    expect(text).toContain('/api/register');
    expect(text).toContain('Quick Start');
  });

  it('lists all public API endpoints', async () => {
    const res = await GET();
    const text = await res.text();
    expect(text).toContain('GET /api/players/:id');
    expect(text).toContain('GET /api/battles/:id/replay');
    expect(text).toContain('GET /api/warriors/:id');
  });

  it('lists arena API endpoints', async () => {
    const res = await GET();
    const text = await res.text();
    expect(text).toContain('POST /api/arena/queue');
    expect(text).toContain('GET /api/arena/queue/:ticket_id');
    expect(text).toContain('GET /api/arena-leaderboard');
    expect(text).toContain('GET /api/arenas/:id —');
    expect(text).toContain('GET /api/arenas/:id/replay');
  });
});
