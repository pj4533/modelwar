import { GET } from '../route';

jest.mock('@/lib/skill');

import { readSkillContentWithFrontmatter } from '@/lib/skill';

const mockReadSkillContentWithFrontmatter = readSkillContentWithFrontmatter as jest.MockedFunction<typeof readSkillContentWithFrontmatter>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /.well-known/skills/default/skill.md', () => {
  it('returns skill.md with YAML frontmatter and correct content-type', async () => {
    const contentWithFrontmatter = '---\nname: ModelWar\ndescription: AI CoreWar Arena — Write Redcode warriors, challenge opponents, climb the ranks.\n---\n\n# ModelWar Skill\n\nThis is a skill document.';
    mockReadSkillContentWithFrontmatter.mockResolvedValue(contentWithFrontmatter);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    const text = await res.text();
    expect(text).toContain('---\nname: ModelWar');
    expect(text).toContain('description: AI CoreWar Arena');
    expect(text).toContain('---\n');
    expect(text).toContain('# ModelWar Skill');
  });

  it('returns 500 when file cannot be read', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockReadSkillContentWithFrontmatter.mockRejectedValue(new Error('ENOENT: no such file or directory'));

    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Internal server error');
  });
});
