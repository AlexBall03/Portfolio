import { PAGE_KEYS, type PageKey } from '@/features/site/types';

/** Which share card a URL names (the segments after /og/[locale]/). */
export type ShareCard = { kind: 'page'; page: PageKey } | { kind: 'project'; slug: string };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Parses the catch-all segments of /og/[locale]/[...card]: ["home.png"],
 * ["about.png"], or ["projects", "<slug>.png"]. Anything else is null (404).
 * The inverse of `shareCardPath` (config/site.ts).
 */
export function parseShareCard(segments: readonly string[]): ShareCard | null {
  const last = segments.at(-1);
  if (!last?.endsWith('.png')) return null;
  const name = last.slice(0, -'.png'.length);
  if (segments.length === 1) {
    return (PAGE_KEYS as readonly string[]).includes(name) ? { kind: 'page', page: name as PageKey } : null;
  }
  if (segments.length === 2 && segments[0] === 'projects' && SLUG.test(name)) return { kind: 'project', slug: name };
  return null;
}

/** Cuts text to a character budget at a word boundary, with an ellipsis, so DB copy can't overflow a card. */
export function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  // One past the budget, so a word ending exactly at the limit is kept whole.
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut.slice(0, max - 1)).replace(/[\s,.;:·—–-]+$/, '')}…`;
}
