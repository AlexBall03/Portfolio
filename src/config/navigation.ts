import type { IconName } from '@/components/ui/Icon';
import type { PageKey } from '@/features/site/types';

/**
 * Top-level pages in navigation order. Route structure is code-owned; page
 * labels come from the UI dictionary and descriptions from the database.
 */
export const PAGES: readonly { key: PageKey; path: string; icon: IconName }[] = [
  { key: 'home', path: '/', icon: 'bolt' },
  { key: 'about', path: '/about', icon: 'user' },
  { key: 'projects', path: '/projects', icon: 'cube' },
  { key: 'experience', path: '/experience', icon: 'briefcase' },
  { key: 'resume', path: '/resume', icon: 'award' },
  { key: 'contact', path: '/contact', icon: 'mail' },
];

/** The page a (locale-less) path belongs to, for active-link highlighting. */
export function pageForPath(path: string): PageKey | null {
  if (path === '/') return 'home';
  return PAGES.find((p) => p.path !== '/' && (path === p.path || path.startsWith(`${p.path}/`)))?.key ?? null;
}
