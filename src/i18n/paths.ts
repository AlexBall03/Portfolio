import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from './config';

/**
 * URL policy: the default locale is unprefixed (`/about`), every other locale
 * is prefixed (`/es/about`). Internally all routes live under `app/[locale]`;
 * proxy.ts rewrites unprefixed requests to `/en/...`.
 */

/** Public path for an internal (locale-less) path, e.g. ('es', '/about') -> '/es/about'. */
export function localizedPath(locale: Locale, path = '/'): string {
  const clean = `/${path.replace(/^\/+/, '')}`.replace(/\/+$/, '') || '/';
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === '/' ? `/${locale}` : `/${locale}${clean}`;
}

/** Splits a public pathname into its locale and the locale-less remainder. */
export function splitLocale(pathname: string): { locale: Locale; path: string; prefixed: boolean } {
  const [, first, ...rest] = pathname.split('/');
  if (isLocale(first)) {
    return { locale: first, path: `/${rest.join('/')}`.replace(/\/+$/, '') || '/', prefixed: true };
  }
  return { locale: DEFAULT_LOCALE, path: pathname.replace(/\/+$/, '') || '/', prefixed: false };
}

/** hreflang alternates for a locale-less path (absolute URLs are built by the caller). */
export function alternatePaths(path: string): Record<Locale, string> {
  return Object.fromEntries(LOCALES.map((l) => [l, localizedPath(l, path)])) as Record<Locale, string>;
}

/** Fills `{name}` placeholders in a dictionary template. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
