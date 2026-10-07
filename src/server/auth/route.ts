import 'server-only';
import { type AdminIdentity, getAuthorization } from './admin';

const PRIVATE = { 'Cache-Control': 'private, no-store' };

/** Same body and status as any unknown API path: reveals nothing. */
export const notFoundResponse = () => Response.json({ error: 'Not found' }, { status: 404, headers: PRIVATE });

/**
 * Wraps an `app/api/admin/*` Route Handler. Anyone but the admin gets a 404;
 * the handler receives the admin identity and its response is never cached.
 *
 *   export const GET = adminRoute(async (request, context, admin) => Response.json(...));
 */
export function adminRoute<Context>(
  handler: (request: Request, context: Context, admin: AdminIdentity) => Response | Promise<Response>,
) {
  return async (request: Request, context: Context): Promise<Response> => {
    const authorization = await getAuthorization();
    if (authorization.status !== 'admin') return notFoundResponse();
    const response = await handler(request, context, authorization.admin);
    response.headers.set('Cache-Control', PRIVATE['Cache-Control']);
    return response;
  };
}
