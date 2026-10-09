/**
 * Cache tags for `cacheTag()`. Admin mutations (each feature's mutations.ts) call
 * `updateTag(CACHE_TAGS.x)` after a save so the public site updates immediately.
 */
export const CACHE_TAGS = {
  projects: 'projects',
  skills: 'skills',
  experience: 'experience',
  profile: 'profile',
  site: 'site',
  github: 'github',
  resume: 'resume',
} as const;

const HOUR = 60 * 60;
const WEEK = 7 * 24 * HOUR;

/** Cache lifetimes (seconds) for `cacheLife()`. */
export const CACHE_LIFE = {
  // Portfolio content changes only when edited, and edits invalidate by tag,
  // so the time-based lifetime is just a safety net.
  content: { stale: 300, revalidate: 60 * 60 * 24, expire: 60 * 60 * 24 * 30 },
  // Live GitHub data, matching the old API's 15-minute s-maxage.
  github: { stale: 300, revalidate: 900, expire: 60 * 60 * 24 },
  // A partially failed GitHub load: retry soon.
  githubDegraded: { stale: 60, revalidate: 60, expire: 300 },

  // Per-repository GitHub data (project analytics), shared by every page that
  // shows the repository. A week's `expire` lets a stale copy keep serving
  // through a GitHub outage: loaders throw on transient failures, and a failed
  // revalidation leaves the previous entry in place.
  githubRepo: { stale: 300, revalidate: 6 * HOUR, expire: WEEK },
  githubCommits: { stale: 300, revalidate: 30 * 60, expire: WEEK },
  githubActivity: { stale: 300, revalidate: 2 * HOUR, expire: WEEK },
  githubLanguages: { stale: 300, revalidate: 24 * HOUR, expire: WEEK },
  githubContributors: { stale: 300, revalidate: 24 * HOUR, expire: WEEK },
  githubReleases: { stale: 300, revalidate: 6 * HOUR, expire: WEEK },
  // One project's composed analytics (explicit, so inner lifetimes don't leak out).
  githubProject: { stale: 300, revalidate: 15 * 60, expire: WEEK },
} as const;
