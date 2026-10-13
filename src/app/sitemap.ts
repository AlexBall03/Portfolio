import type { MetadataRoute } from 'next';
import { SUPPORT_PATH } from '@/config/navigation';
import { getProjectSitemap } from '@/features/projects/queries';
import { getSponsorshipSettings } from '@/features/sponsorship/queries';
import { sponsorshipVisibility } from '@/features/sponsorship/sponsors';
import { sitemapEntries } from '@/lib/seo/sitemap';

/** Every public page at its canonical URL (published projects only), from the route config and DB. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, sponsorship] = await Promise.all([getProjectSitemap(), getSponsorshipSettings()]);
  return sitemapEntries(projects, sponsorshipVisibility(sponsorship).supportPage ? [SUPPORT_PATH] : []);
}
