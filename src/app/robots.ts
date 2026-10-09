import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/config/site';

/**
 * Crawl hints only: robots.txt is not access control. The admin is protected by
 * authorization (src/server/auth) and also answers with X-Robots-Tag: noindex
 * (next.config.ts). /api/ holds only admin handlers. Share cards (/og/) stay
 * crawlable so link previews work.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
