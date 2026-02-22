import { GET } from '../route';

jest.mock('fs/promises');

import { readFile } from 'fs/promises';

const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /skill.md', () => {
  it('returns markdown content with correct content-type', async () => {
    const markdownContent = '# ModelWar Skill\n\nThis is a skill document.';
    mockReadFile.mockResolvedValue(markdownContent);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    const text = await res.text();
    expect(text).toBe(markdownContent);
  });

  it('returns 500 when file cannot be read', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Internal server error');
  });
});
