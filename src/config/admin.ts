import type { IconName } from '@/components/ui/Icon';

/**
 * Admin route structure (code-owned, English-only). The admin lives outside
 * the localized site: no locale prefix, its own root layout.
 */
export const ADMIN_PATH = '/admin';
export const ADMIN_SIGN_IN_PATH = '/admin/sign-in';
export const ADMIN_API_PATH = '/api/admin';

const within = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

/** Any admin page or admin API route. */
export const isAdminPath = (pathname: string) => within(pathname, ADMIN_PATH) || within(pathname, ADMIN_API_PATH);
export const isAdminApiPath = (pathname: string) => within(pathname, ADMIN_API_PATH);
export const isAdminSignInPath = (pathname: string) => within(pathname, ADMIN_SIGN_IN_PATH);

export interface AdminNavItem {
  label: string;
  href: string;
  icon: IconName;
}

export interface AdminNavGroup {
  /** Omitted for the top group. */
  label?: string;
  items: readonly AdminNavItem[];
}

/**
 * Console navigation. Only working destinations are listed; Phase 4 adds its
 * groups here (Content: Projects, Skills, Experience, Resume · Site: Profile,
 * Social links, Contact, Page content, Configuration).
 */
export const ADMIN_NAV: readonly AdminNavGroup[] = [{ items: [{ label: 'Dashboard', href: ADMIN_PATH, icon: 'layout' }] }];

/** The nav item a pathname belongs to: exact for the dashboard, prefix for sections. */
export function activeAdminHref(pathname: string): string | null {
  const hrefs = ADMIN_NAV.flatMap((g) => g.items.map((i) => i.href));
  if (hrefs.includes(pathname)) return pathname;
  return hrefs.filter((h) => h !== ADMIN_PATH && pathname.startsWith(`${h}/`)).sort((a, b) => b.length - a.length)[0] ?? null;
}
