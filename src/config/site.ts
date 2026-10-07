/**
 * Structural, code-owned site constants. Editable content (name, bio, socials,
 * page copy, …) lives in the database — see src/features/profile and src/features/site.
 */
export const SITE_URL = 'https://alexball.dev';

export const OG_IMAGE = {
  path: '/assets/og-image.png',
  width: 1200,
  height: 630,
} as const;

/** JSON-LD node identifiers. Fragment @ids, not fetchable URLs. */
export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** Absolute URL for a site path. Root keeps its trailing slash; others have none. */
export function absoluteUrl(path = '/'): string {
  const trimmed = path.replace(/^\/+|\/+$/g, '');
  return trimmed ? `${SITE_URL}/${trimmed}` : `${SITE_URL}/`;
}

export const GOOGLE_ANALYTICS_ID = 'G-YFKW4W2PS4';
