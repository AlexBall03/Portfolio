import 'server-only';
import { type AdminIdentity, getAuthorization } from './admin';

const PRIVATE = { 'Cache-Control': 'private, no-store' };

/** Same body and status as any unknown API path: reveals nothing. */
export const notFoundResponse = () => Response.json({ error: 'Not found' }, { status: 404, headers: PRIVATE });

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * A state-changing request must come from the site itself. Browsers send
 * `Origin` on every cross-origin and every non-GET request; a mismatch means
 * another site is driving the admin's session (CSRF), so it is refused even
 * though the session cookie is valid.
 */
export function isSameOrigin(request: Request): boolean {
  if (SAFE_METHODS.has(request.method)) return true;
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Wraps an `app/api/admin/*` Route Handler. Anyone but the admin, and any
 * cross-site write, gets a 404; the handler receives the admin identity and
 * its response is never cached.
 *
 *   export const GET = adminRoute(async (request, context, admin) => Response.json(...));
 */
export function adminRoute<Context>(
  handler: (request: Request, context: Context, admin: AdminIdentity) => Response | Promise<Response>,
) {
  return async (request: Request, context: Context): Promise<Response> => {
    const authorization = await getAuthorization();
    if (authorization.status !== 'admin' || !isSameOrigin(request)) return notFoundResponse();
    const response = await handler(request, context, authorization.admin);
    response.headers.set('Cache-Control', PRIVATE['Cache-Control']);
    return response;
  };
}
