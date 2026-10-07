import type { MetadataRoute } from 'next';
import { PAGES } from '@/config/navigation';
import { absoluteUrl } from '@/config/site';
import { getProjectSlugs } from '@/features/projects/queries';
import { DEFAULT_LOCALE, LOCALES } from '@/i18n/config';
import { localizedPath } from '@/i18n/paths';

/** Every public page in every locale, with hreflang alternates. Generated from the route config and DB. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getProjectSlugs();
  const paths = [...PAGES.map((p) => p.path), ...slugs.map((s) => `/projects/${s}`)];

  return paths.flatMap((path) =>
    LOCALES.map((locale) => ({
      url: absoluteUrl(localizedPath(locale, path)),
      changeFrequency: 'monthly' as const,
      priority: path === '/' && locale === DEFAULT_LOCALE ? 1 : 0.8,
      alternates: {
        languages: Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(localizedPath(l, path))])),
      },
    })),
  );
}
