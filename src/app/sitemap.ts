import type { MetadataRoute } from 'next';
import { getProjectSitemap } from '@/features/projects/queries';
import { sitemapEntries } from '@/lib/seo/sitemap';

/** Every public page at its canonical URL (published projects only), from the route config and DB. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return sitemapEntries(await getProjectSitemap());
}
