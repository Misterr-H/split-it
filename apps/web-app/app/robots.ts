import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/landing', '/login', '/signup'],
        disallow: ['/groups', '/activity', '/friends', '/join/', '/api/'],
      },
    ],
    sitemap: 'https://split-it.xyz/sitemap.xml',
    host: 'https://split-it.xyz',
  };
}
