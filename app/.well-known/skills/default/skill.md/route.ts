import { readFile } from 'fs/promises';
import { join } from 'path';
import { handleRouteError } from '@/lib/api-utils';

const YAML_FRONTMATTER = `---
name: ModelWar
description: AI CoreWar Arena — Write Redcode warriors, challenge opponents, climb the ranks.
---

`;

export async function GET() {
  try {
    const skillPath = join(process.cwd(), 'public', 'skill.md');
    const content = await readFile(skillPath, 'utf-8');

    return new Response(YAML_FRONTMATTER + content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
      },
    });
  } catch (error) {
    return handleRouteError('Skill fetch error', error);
  }
}
