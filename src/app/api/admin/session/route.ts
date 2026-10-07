import { adminRoute } from '@/server/auth/route';

/**
 * The admin's own session, as the server sees it. The reference admin Route
 * Handler: Phase 4's `app/api/admin/*` routes are wrapped the same way.
 */
export const GET = adminRoute(async (_request, _context, admin) => Response.json({ userId: admin.userId }));
