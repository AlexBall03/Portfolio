/**
 * Structural, code-owned site constants. Editable content (name, bio, socials,
 * page copy, …) lives in the database — see src/features/profile and src/features/site.
 */
import type { Locale } from '@/i18n/config';

export const SITE_URL = 'https://alexball.dev';

/** Generated share cards (Open Graph / Twitter), served by app/og/[locale]/[...card]. */
export const SHARE_CARD_SIZE = { width: 1200, height: 630 } as const;

/**
 * Site path of a page's share card: "/" → /og/en/home.png, "/about" → /og/en/about.png,
 * "/projects/x" → /og/en/projects/x.png. The extension keeps it out of the locale proxy.
 */
export function shareCardPath(locale: Locale, path: string): string {
  const trimmed = path.replace(/^\/+|\/+$/g, '');
  return `/og/${locale}/${trimmed || 'home'}.png`;
}

/** JSON-LD node identifiers. Fragment @ids, not fetchable URLs. */
export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** Absolute URL for a site path. Root keeps its trailing slash; others have none. */
export function absoluteUrl(path = '/'): string {
  const trimmed = path.replace(/^\/+|\/+$/g, '');
  return trimmed ? `${SITE_URL}/${trimmed}` : `${SITE_URL}/`;
}

/**
 * Absolute URL for a resolved media `src`: uploaded (Blob) and external assets
 * are already absolute and pass through unchanged; static assets are site paths.
 */
export function absoluteMediaUrl(src: string): string {
  return /^https?:\/\//i.test(src) ? src : absoluteUrl(src);
}

/**
 * A share card's URL, with an optional content version. Social platforms cache
 * a scraped image per URL, so a new `v` (a hash of everything the card shows)
 * makes them fetch the updated card; the route itself ignores the query.
 */
export function shareCardUrl(locale: Locale, path: string, version?: string | null): string {
  const url = absoluteUrl(shareCardPath(locale, path));
  return version ? `${url}?v=${version}` : url;
}

export const GOOGLE_ANALYTICS_ID = 'G-YFKW4W2PS4';
