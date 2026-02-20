import { readFile } from 'fs/promises';
import { join } from 'path';

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
    console.error('Skill fetch error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
