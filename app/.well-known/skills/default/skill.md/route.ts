import { readSkillContentWithFrontmatter } from '@/lib/skill';
import { handleRouteError } from '@/lib/api-utils';

export async function GET() {
  try {
    const content = await readSkillContentWithFrontmatter();

    return new Response(content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
      },
    });
  } catch (error) {
    return handleRouteError('Skill fetch error', error);
  }
}
