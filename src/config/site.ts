/**
 * Structural, code-owned site constants. Editable content (name, bio, socials,
 * page copy, …) lives in the database — see src/features/profile and src/features/site.
 */
export const SITE_URL = 'https://alexball.dev';

/** The site's language: `<html lang>`, `Intl` formatting, and Open Graph. */
export const SITE_LANG = 'en';
export const INTL_LOCALE = 'en-US';
export const OG_LOCALE = 'en_US';

/** Generated share cards (Open Graph / Twitter), served by app/og/[...card]. */
export const SHARE_CARD_SIZE = { width: 1200, height: 630 } as const;

/**
 * Site path of a page's share card: "/" → /og/home.png, "/about" → /og/about.png,
 * "/projects/x" → /og/projects/x.png.
 */
export function shareCardPath(path: string): string {
  const trimmed = path.replace(/^\/+|\/+$/g, '');
  return `/og/${trimmed || 'home'}.png`;
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
export function shareCardUrl(path: string, version?: string | null): string {
  const url = absoluteUrl(shareCardPath(path));
  return version ? `${url}?v=${version}` : url;
}

export const GOOGLE_ANALYTICS_ID = 'G-YFKW4W2PS4';
