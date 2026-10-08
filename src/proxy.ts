import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { ADMIN_SIGN_IN_PATH, isAdminApiPath, isAdminPath } from '@/config/admin';
import { authStatus } from '@/config/env';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from '@/i18n/config';
import { localizedPath, splitLocale } from '@/i18n/paths';
import { adminGate, type GateDecision } from '@/server/auth/gate';

/**
 * Request routing that runs before rendering.
 *
 * Locale URL policy (public site):
 *   /about        → rendered as /en/about (rewrite; English stays unprefixed)
 *   /en/about     → 308 to /about (one canonical URL per page)
 *   /es/about     → rendered as-is
 *   /about + cookie locale=es → 307 to /es/about (remembers an explicit choice)
 *
 * Admin (/admin, /api/admin): no locale handling; Clerk resolves the session
 * and `adminGate` makes the first authorization decision. Clerk runs only
 * there and on Server Action requests, so public pages never touch it.
 */
export function proxy(request: NextRequest, event: NextFetchEvent) {
  // The retired api.alexball.dev subdomain: send any traffic to the main site.
  if (request.headers.get('host')?.startsWith('api.')) {
    return NextResponse.redirect('https://alexball.dev/', 308);
  }

  const admin = isAdminPath(request.nextUrl.pathname);
  // Server Action IDs are global: an admin action can be POSTed to any path.
  // Resolving the session for every action lets the action's own
  // `requireAdmin()` reject it cleanly instead of erroring.
  const action = request.method === 'POST' && request.headers.has('next-action');

  if (authStatus().configured) {
    if (admin || action) return withClerk(request, event);
  } else if (admin) {
    return applyGate(request, adminGate({ pathname: request.nextUrl.pathname, userId: null, adminUserId: null }));
  }
  return localeRouting(request);
}

const withClerk = clerkMiddleware(
  async (auth, request) => {
    if (!isAdminPath(request.nextUrl.pathname)) return localeRouting(request);
    const config = authStatus();
    const { userId } = await auth();
    return applyGate(
      request,
      adminGate({
        pathname: request.nextUrl.pathname,
        search: request.nextUrl.search,
        userId,
        adminUserId: config.configured ? config.env.adminUserId : null,
      }),
    );
  },
  // Hand Clerk the key the proxy just validated, read at runtime. Clerk's own
  // default is `process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, which Next
  // inlines at build time, so it can differ from (and fail where) ours passes.
  () => {
    const config = authStatus();
    return { signInUrl: ADMIN_SIGN_IN_PATH, publishableKey: config.configured ? config.env.publishableKey : undefined };
  },
);

function applyGate(request: NextRequest, decision: GateDecision) {
  switch (decision.action) {
    case 'next':
      return NextResponse.next();
    case 'redirect':
      return NextResponse.redirect(new URL(decision.location, request.url), 307);
    case 'not-found': {
      if (isAdminApiPath(request.nextUrl.pathname)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
      }
      // Render the public site's 404 (real 404 status), exactly what any unknown URL gets.
      const url = request.nextUrl.clone();
      url.pathname = `/${DEFAULT_LOCALE}${request.nextUrl.pathname}`;
      url.search = '';
      return NextResponse.rewrite(url);
    }
  }
}

function localeRouting(request: NextRequest) {
  const { nextUrl } = request;
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
  matcher: [
    // Everything except Next internals, API routes, and files with an extension
    // (static assets, robots.txt, sitemap.xml, the manifest, icons).
    '/((?!_next/|api/|.*\\..*).*)',
    // Admin API routes.
    '/api/admin/:path*',
  ],
};
