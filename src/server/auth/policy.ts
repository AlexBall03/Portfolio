/**
 * The admin rule, in one place: a Clerk identity is the administrator only if
 * its stable user ID equals the configured ADMIN_CLERK_USER_ID. Never by name
 * or email. Missing values on either side fail closed.
 *
 * Pure (no `server-only`, no Clerk import) so the proxy and tests share it.
 */
export function isAdminUserId(userId: string | null | undefined, adminUserId: string | null | undefined): boolean {
  if (!userId || !adminUserId) return false;
  return userId === adminUserId;
}
