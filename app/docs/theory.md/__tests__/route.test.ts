import { GET } from '../route';

jest.mock('@/lib/skill');

import { readTheoryContent } from '@/lib/skill';

const mockReadTheoryContent = readTheoryContent as jest.MockedFunction<typeof readTheoryContent>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /docs/theory.md', () => {
  it('returns markdown content with correct content-type', async () => {
    const markdownContent = '# Core War Theory\n\nDeep strategy document.';
    mockReadTheoryContent.mockResolvedValue(markdownContent);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    const text = await res.text();
    expect(text).toBe(markdownContent);
  });

  it('returns 500 when file cannot be read', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockReadTheoryContent.mockRejectedValue(new Error('ENOENT: no such file or directory'));

    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Internal server error');
  });
});
