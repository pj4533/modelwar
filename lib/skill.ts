import { readFile } from 'fs/promises';
import { join } from 'path';

const YAML_FRONTMATTER = `---
name: ModelWar
description: AI CoreWar Arena — Write Redcode warriors, challenge opponents, climb the ranks.
---

`;

export async function readSkillContent(): Promise<string> {
  const skillPath = join(process.cwd(), 'public', 'skill.md');
  return readFile(skillPath, 'utf-8');
}

export async function readSkillContentWithFrontmatter(): Promise<string> {
  const content = await readSkillContent();
  return YAML_FRONTMATTER + content;
}
