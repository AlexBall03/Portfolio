import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    // The private admin (also sent with X-Robots-Tag: noindex).
    rules: { userAgent: '*', allow: '/', disallow: ['/admin'] },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
