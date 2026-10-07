import { ADMIN_SIGN_IN_PATH, isAdminApiPath, isAdminSignInPath } from '@/config/admin';
import { isAdminUserId } from './policy';

export type GateDecision =
  | { action: 'next' }
  | { action: 'redirect'; location: string }
  /** Answer exactly like a URL that doesn't exist. */
  | { action: 'not-found' };

interface GateInput {
  pathname: string;
  search?: string;
  /** Clerk's user ID for this request; null when signed out or the session is invalid/expired. */
  userId: string | null;
  /** The configured admin ID; null when admin auth isn't configured. */
  adminUserId: string | null;
}

/**
 * Proxy-level decision for an admin request (the first of three layers; the
 * console layout and every admin action/route re-check with `requireAdmin`).
 * Pure, so every branch is unit-tested.
 */
export function adminGate({ pathname, search = '', userId, adminUserId }: GateInput): GateDecision {
  const api = isAdminApiPath(pathname);

  // Not configured: nobody is an admin. Pages render the configuration notice
  // (and still can't show anything protected); APIs simply don't exist.
  if (!adminUserId) return api ? { action: 'not-found' } : { action: 'next' };

  if (isAdminSignInPath(pathname)) return { action: 'next' };

  if (!userId) {
    if (api) return { action: 'not-found' };
    const returnTo = encodeURIComponent(`${pathname}${search}`);
    return { action: 'redirect', location: `${ADMIN_SIGN_IN_PATH}?redirect_url=${returnTo}` };
  }

  return isAdminUserId(userId, adminUserId) ? { action: 'next' } : { action: 'not-found' };
}
