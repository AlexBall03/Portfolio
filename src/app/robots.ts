import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    // /admin is reserved for the future authenticated Admin (Phase 3).
    rules: { userAgent: '*', allow: '/', disallow: ['/admin'] },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
