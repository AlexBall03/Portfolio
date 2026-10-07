/**
 * Cache tags for `cacheTag()`. Future Admin mutations (Phase 4) call
 * `updateTag(CACHE_TAGS.x)` after a save so the public site updates immediately.
 */
export const CACHE_TAGS = {
  projects: 'projects',
  skills: 'skills',
  experience: 'experience',
  profile: 'profile',
  site: 'site',
  github: 'github',
} as const;

/** Cache lifetimes (seconds) for `cacheLife()`. */
export const CACHE_LIFE = {
  // Portfolio content changes only when edited, and edits invalidate by tag,
  // so the time-based lifetime is just a safety net.
  content: { stale: 300, revalidate: 60 * 60 * 24, expire: 60 * 60 * 24 * 30 },
  // Live GitHub data, matching the old API's 15-minute s-maxage.
  github: { stale: 300, revalidate: 900, expire: 60 * 60 * 24 },
  // A partially failed GitHub load: retry soon.
  githubDegraded: { stale: 60, revalidate: 60, expire: 300 },
} as const;
