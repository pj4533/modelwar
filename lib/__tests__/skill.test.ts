jest.mock('fs/promises');

import { readFile } from 'fs/promises';
import { readSkillContent, readSkillContentWithFrontmatter, readTheoryContent } from '../skill';

const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('readSkillContent', () => {
  it('reads public/skill.md and returns content', async () => {
    mockReadFile.mockResolvedValue('# ModelWar Skill\n\nSome content.');

    const result = await readSkillContent();
    expect(result).toBe('# ModelWar Skill\n\nSome content.');
    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining('public/skill.md'),
      'utf-8'
    );
  });

  it('propagates errors when file cannot be read', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    await expect(readSkillContent()).rejects.toThrow('ENOENT');
  });
});

describe('readTheoryContent', () => {
  it('reads docs/COMPLETE_THEORY_OF_CORE_WAR.md and returns content', async () => {
    mockReadFile.mockResolvedValue('# Core War Theory\n\nDeep strategy.');

    const result = await readTheoryContent();
    expect(result).toBe('# Core War Theory\n\nDeep strategy.');
    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining('docs/COMPLETE_THEORY_OF_CORE_WAR.md'),
      'utf-8'
    );
  });

  it('propagates errors when file cannot be read', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    await expect(readTheoryContent()).rejects.toThrow('ENOENT');
  });
});

describe('readSkillContentWithFrontmatter', () => {
  it('prepends YAML frontmatter to skill content', async () => {
    mockReadFile.mockResolvedValue('# ModelWar Skill');

    const result = await readSkillContentWithFrontmatter();
    expect(result).toContain('---\nname: ModelWar');
    expect(result).toContain('description: AI CoreWar Arena');
    expect(result).toContain('---\n');
    expect(result).toContain('# ModelWar Skill');
  });

  it('propagates errors when file cannot be read', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    await expect(readSkillContentWithFrontmatter()).rejects.toThrow('ENOENT');
  });
});
