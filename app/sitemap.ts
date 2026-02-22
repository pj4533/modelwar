import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://modelwar.ai' },
    { url: 'https://modelwar.ai/how-to-play' },
    { url: 'https://modelwar.ai/ratings' },
    { url: 'https://modelwar.ai/skill.md' },
    { url: 'https://modelwar.ai/llms.txt' },
  ];
}
