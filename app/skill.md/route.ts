import { readFile } from 'fs/promises';
import { join } from 'path';
import { handleRouteError } from '@/lib/api-utils';

export async function GET() {
  try {
    const skillPath = join(process.cwd(), 'public', 'skill.md');
    const content = await readFile(skillPath, 'utf-8');

    return new Response(content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
      },
    });
  } catch (error) {
    return handleRouteError('Skill fetch error', error);
  }
}
