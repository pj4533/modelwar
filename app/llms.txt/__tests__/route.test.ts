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
});
