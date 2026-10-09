import type { MetadataRoute } from 'next';
import { PAGES } from '@/config/navigation';
import { absoluteUrl } from '@/config/site';
import { DEFAULT_LOCALE, LOCALES } from '@/i18n/config';
import { localizedPath } from '@/i18n/paths';

export interface SitemapProject {
  slug: string;
  /** ISO timestamp of the project page's last content change. */
  updatedAt: string;
}

/**
 * Every public page in every locale, each with reciprocal hreflang alternates
 * (plus x-default). `lastModified` is set only where a real content timestamp
 * exists: project pages, and the projects index (its newest project). Other
 * pages compose several editors' content, so they get none rather than a guess.
 * No priority/changefreq: search engines ignore them and they'd be arbitrary.
 */
export function sitemapEntries(projects: readonly SitemapProject[]): MetadataRoute.Sitemap {
  const newest = projects.reduce<string | undefined>((a, p) => (!a || p.updatedAt > a ? p.updatedAt : a), undefined);
  const paths: { path: string; lastModified?: string }[] = [
    ...PAGES.map((p) => ({ path: p.path, lastModified: p.path === '/projects' ? newest : undefined })),
    ...projects.map((p) => ({ path: `/projects/${p.slug}`, lastModified: p.updatedAt })),
  ];

  return paths.flatMap(({ path, lastModified }) => {
    const languages = {
      ...Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(localizedPath(l, path))])),
      'x-default': absoluteUrl(localizedPath(DEFAULT_LOCALE, path)),
    };
    return LOCALES.map((locale) => ({
      url: absoluteUrl(localizedPath(locale, path)),
      ...(lastModified ? { lastModified } : {}),
      alternates: { languages },
    }));
  });
}
