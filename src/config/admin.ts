import type { IconName } from '@/components/ui/Icon';

/**
 * Admin route structure (code-owned, English-only). The admin lives outside
 * the localized site: no locale prefix, its own root layout.
 */
export const ADMIN_PATH = '/admin';
export const ADMIN_SIGN_IN_PATH = '/admin/sign-in';
export const ADMIN_API_PATH = '/api/admin';
export const ADMIN_PROFILE_PATH = '/admin/profile';
export const ADMIN_CONFIGURATION_PATH = '/admin/configuration';
export const ADMIN_PROJECTS_PATH = '/admin/projects';
export const ADMIN_SKILLS_PATH = '/admin/skills';
export const ADMIN_EXPERIENCE_PATH = '/admin/experience';
export const ADMIN_SOCIAL_LINKS_PATH = '/admin/social-links';
export const ADMIN_CONTACT_PATH = '/admin/contact';
export const ADMIN_CONTENT_PATH = '/admin/content';

/** A project's admin pages: the Details editor, or one of its tabs. */
export const adminProjectPath = (id: string, tab?: 'media' | 'preview') =>
  `${ADMIN_PROJECTS_PATH}/${id}${tab ? `/${tab}` : ''}`;

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
 * Console navigation. Only working destinations are listed (Phase 4D adds
 * Resume under Content).
 */
export const ADMIN_NAV: readonly AdminNavGroup[] = [
  { items: [{ label: 'Dashboard', href: ADMIN_PATH, icon: 'layout' }] },
  {
    label: 'Content',
    items: [
      { label: 'Projects', href: ADMIN_PROJECTS_PATH, icon: 'layers' },
      { label: 'Skills', href: ADMIN_SKILLS_PATH, icon: 'code' },
      { label: 'Experience', href: ADMIN_EXPERIENCE_PATH, icon: 'briefcase' },
    ],
  },
  {
    label: 'Site',
    items: [
      { label: 'Profile', href: ADMIN_PROFILE_PATH, icon: 'user' },
      { label: 'Social links', href: ADMIN_SOCIAL_LINKS_PATH, icon: 'globe' },
      { label: 'Contact', href: ADMIN_CONTACT_PATH, icon: 'mail' },
      { label: 'Page content', href: ADMIN_CONTENT_PATH, icon: 'file' },
      { label: 'Configuration', href: ADMIN_CONFIGURATION_PATH, icon: 'gauge' },
    ],
  },
];

/** The nav item a pathname belongs to: exact for the dashboard, prefix for sections. */
export function activeAdminHref(pathname: string): string | null {
  const hrefs = ADMIN_NAV.flatMap((g) => g.items.map((i) => i.href));
  if (hrefs.includes(pathname)) return pathname;
  return hrefs.filter((h) => h !== ADMIN_PATH && pathname.startsWith(`${h}/`)).sort((a, b) => b.length - a.length)[0] ?? null;
}
