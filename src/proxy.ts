import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { ADMIN_SIGN_IN_PATH, isAdminApiPath, isAdminPath } from '@/config/admin';
import { authStatus } from '@/config/env';
import { legacyLocaleRedirect } from '@/lib/legacy-locale';
import { adminGate, type GateDecision } from '@/server/auth/gate';

/**
 * Request routing that runs before rendering.
 *
 * Public site: pages render at their own URL. The retired language prefixes
 * answer with a permanent redirect to the English page (query string kept):
 *   /es/projects/x?tech=react → 308 to /projects/x?tech=react
 *   /en/about                 → 308 to /about
 *
 * Admin (/admin, /api/admin): Clerk resolves the session and `adminGate` makes
 * the first authorization decision. Clerk runs only there and on Server Action
 * requests, so public pages never touch it.
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
  return publicRouting(request);
}

const withClerk = clerkMiddleware(
  async (auth, request) => {
    if (!isAdminPath(request.nextUrl.pathname)) return publicRouting(request);
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
      // Render the public site's 404 (real 404 status), exactly what any unknown URL gets:
      // a path no route claims reaches the site's catch-all.
      const url = request.nextUrl.clone();
      url.pathname = NOT_FOUND_PATH;
      url.search = '';
      return NextResponse.rewrite(url);
    }
  }
}

/** Matched by no route, so it renders the site's not-found page (`app/(site)/[...rest]`). */
const NOT_FOUND_PATH = '/not-found';

function publicRouting(request: NextRequest) {
  const target = legacyLocaleRedirect(request.nextUrl.pathname);
  if (!target) return NextResponse.next();
  // Same origin by construction: only the path of a clone of the request URL changes.
  const url = request.nextUrl.clone();
  url.pathname = target;
  return NextResponse.redirect(url, 308);
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
