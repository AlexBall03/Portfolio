/**
 * The site used to be bilingual: Spanish lived under `/es/…` and `/en/…`
 * redirected to the unprefixed English URL. Both prefixes are retired; this
 * maps an old URL's path to the English page that replaced it.
 */
const LEGACY_PREFIX = /^\/(?:es|en)(?=\/|$)/;

/**
 * The path a legacy `/es/…` or `/en/…` URL now lives at, or null when the path
 * isn't one. Leading slashes are collapsed so the result is always a path on
 * this site (`/es//evil.com` → `/evil.com`, never `//evil.com`).
 */
export function legacyLocaleRedirect(pathname: string): string | null {
  if (!LEGACY_PREFIX.test(pathname)) return null;
  const rest = pathname.replace(LEGACY_PREFIX, '').replace(/^\/+/, '');
  return `/${rest}`;
}
