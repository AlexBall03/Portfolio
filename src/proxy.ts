import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from '@/i18n/config';
import { localizedPath, splitLocale } from '@/i18n/paths';

/**
 * Request routing that runs before rendering.
 *
 * Locale URL policy:
 *   /about        → rendered as /en/about (rewrite; English stays unprefixed)
 *   /en/about     → 308 to /about (one canonical URL per page)
 *   /es/about     → rendered as-is
 *   /about + cookie locale=es → 307 to /es/about (remembers an explicit choice)
 *
 * This is also where Clerk's middleware will slot in for /admin (Phase 3).
 */
export function proxy(request: NextRequest) {
  const { nextUrl } = request;

  // The retired api.alexball.dev subdomain: send any traffic to the main site.
  if (request.headers.get('host')?.startsWith('api.')) {
    return NextResponse.redirect('https://alexball.dev/', 308);
  }

  const { locale, path, prefixed } = splitLocale(nextUrl.pathname);

  if (prefixed) {
    if (locale !== DEFAULT_LOCALE) return NextResponse.next();
    return redirect(request, localizedPath(DEFAULT_LOCALE, path), 308);
  }

  const preferred = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(preferred) && preferred !== DEFAULT_LOCALE) {
    return redirect(request, localizedPath(preferred, path), 307);
  }

  const url = nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${path === '/' ? '' : path}`;
  return NextResponse.rewrite(url);
}

function redirect(request: NextRequest, pathname: string, status: 307 | 308) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url, status);
}

export const config = {
  // Everything except Next internals, API routes, and files with an extension
  // (static assets, robots.txt, sitemap.xml, the manifest, icons).
  matcher: ['/((?!_next/|api/|.*\\..*).*)'],
};
