import type { IconName } from '@/components/ui/Icon';
import type { PageKey } from '@/features/site/types';

/**
 * Top-level pages in navigation order. Route structure is code-owned; page
 * labels come from the UI copy and descriptions from the database.
 */
export const PAGES: readonly { key: Exclude<PageKey, 'support'>; path: string; icon: IconName }[] = [
  { key: 'home', path: '/', icon: 'bolt' },
  { key: 'about', path: '/about', icon: 'user' },
  { key: 'projects', path: '/projects', icon: 'cube' },
  { key: 'experience', path: '/experience', icon: 'briefcase' },
  { key: 'resume', path: '/resume', icon: 'award' },
  { key: 'contact', path: '/contact', icon: 'mail' },
];

/**
 * The support (GitHub Sponsors) page. A real page with its own SEO copy, but
 * not part of the primary navigation or the pager: it is linked from the
 * footer, the palette, and the home section, and only while it is switched on.
 */
export const SUPPORT_PATH = '/support';

/** The page a path belongs to, for active-link highlighting. */
export function pageForPath(path: string): PageKey | null {
  if (path === '/') return 'home';
  if (path === SUPPORT_PATH) return 'support';
  return PAGES.find((p) => p.path !== '/' && (path === p.path || path.startsWith(`${p.path}/`)))?.key ?? null;
}
