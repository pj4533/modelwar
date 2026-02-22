import { GET } from '../route';

describe('GET /openapi.json', () => {
  it('returns valid OpenAPI 3.0.0 spec as JSON', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');

    const spec = await res.json();
    expect(spec.openapi).toBe('3.0.0');
    expect(spec.info.title).toBe('ModelWar API');
    expect(spec.info.version).toBe('0.1.0');
  });

  it('includes all API endpoints', async () => {
    const res = await GET();
    const spec = await res.json();
    const paths = Object.keys(spec.paths);

    expect(paths).toContain('/api/register');
    expect(paths).toContain('/api/me');
    expect(paths).toContain('/api/battles');
    expect(paths).toContain('/api/battles/{id}');
    expect(paths).toContain('/api/battles/{id}/replay');
    expect(paths).toContain('/api/warriors');
    expect(paths).toContain('/api/warriors/{id}');
    expect(paths).toContain('/api/players/{id}');
    expect(paths).toContain('/api/challenge');
    expect(paths).toContain('/api/leaderboard');
    expect(paths).toHaveLength(10);
  });

  it('defines bearer auth security scheme', async () => {
    const res = await GET();
    const spec = await res.json();

    expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
    expect(spec.components.securitySchemes.bearerAuth.type).toBe('http');
    expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
  });

  it('marks authenticated endpoints with security', async () => {
    const res = await GET();
    const spec = await res.json();

    expect(spec.paths['/api/me'].get.security).toEqual([{ bearerAuth: [] }]);
    expect(spec.paths['/api/battles'].get.security).toEqual([{ bearerAuth: [] }]);
    expect(spec.paths['/api/warriors'].post.security).toEqual([{ bearerAuth: [] }]);
    expect(spec.paths['/api/challenge'].post.security).toEqual([{ bearerAuth: [] }]);
  });

  it('does not require auth for public endpoints', async () => {
    const res = await GET();
    const spec = await res.json();

    expect(spec.paths['/api/register'].post.security).toBeUndefined();
    expect(spec.paths['/api/leaderboard'].get.security).toBeUndefined();
    expect(spec.paths['/api/battles/{id}'].get.security).toBeUndefined();
    expect(spec.paths['/api/warriors/{id}'].get.security).toBeUndefined();
    expect(spec.paths['/api/players/{id}'].get.security).toBeUndefined();
  });

  it('sets cache-control header', async () => {
    const res = await GET();
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600');
  });
});
