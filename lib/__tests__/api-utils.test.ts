import { parseIdParam } from '../api-utils';

describe('parseIdParam', () => {
  it('returns ok with parsed integer for valid numeric string', () => {
    const result = parseIdParam('42', 'battle ID');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  it('returns error response for non-numeric string', async () => {
    const result = parseIdParam('abc', 'battle ID');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const data = await result.response.json();
      expect(data.error).toBe('Invalid battle ID');
    }
  });

  it('uses the label in the error message', async () => {
    const result = parseIdParam('xyz', 'warrior ID');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const data = await result.response.json();
      expect(data.error).toBe('Invalid warrior ID');
    }
  });

  it('parses string integers correctly', () => {
    const result = parseIdParam('1', 'player ID');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(1);
    }
  });

  it('returns error for empty string', async () => {
    const result = parseIdParam('', 'player ID');
    expect(result.ok).toBe(false);
  });
});
