import type {
  GithubCommit,
  GithubCommitActivity,
  GithubContributor,
  GithubRelease,
  GithubRepoDetail,
} from '@/integrations/github/schemas';
import type {
  ActivityWeek,
  Coverage,
  LanguageShare,
  ProjectGithub,
  ProjectGithubRepository,
  RepoAnalytics,
  RepoCommit,
  RepoContributor,
  RepoMetadataResult,
  RepoRelease,
} from './types';

/**
 * Normalization and aggregation for project GitHub analytics. Pure: every
 * counting rule lives here and is unit-tested (`project-analytics.test.ts`).
 *
 * Definitions:
 * - Repositories, stars, forks: distinct public repositories (by GitHub id).
 * - Activity: default-branch commits per week from GitHub's statistics API,
 *   summed over the weeks every covered repository reports (its last 52), so
 *   the period is the same for all of them. Not a lifetime count.
 * - Contributors: distinct GitHub accounts (by user id) GitHub lists as
 *   contributors to a default branch; bots excluded. Commits not linked to an
 *   account don't appear, and GitHub lists at most 500 per repository.
 * - Languages: bytes per language as GitHub detects them, summed across
 *   repositories before computing shares.
 * - Releases: published (non-draft) releases; at most 100 per repository read.
 * - Recent commits: newest default-branch commits, deduplicated by SHA.
 * - Last activity: newest default-branch commit or published release.
 */

export const RECENT_COMMITS = 8;
export const RECENT_RELEASES = 5;
export const TOP_CONTRIBUTORS = 12;
export const TOP_LANGUAGES = 6;
const RELEASE_PAGE = 100;

/* ── Normalization (GitHub payload → domain) ─────────────────────────────── */

/** Public metadata, or a contentless state for anything the public can't see. */
export function normalizeRepository(r: GithubRepoDetail): RepoMetadataResult {
  if (r.private || (r.visibility !== undefined && r.visibility !== 'public')) return { state: 'private' };
  return {
    state: 'public',
    repo: {
      id: r.id,
      owner: r.owner.login,
      name: r.name,
      fullName: r.full_name,
      url: r.html_url,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      archived: r.archived,
      pushedAt: r.pushed_at,
    },
  };
}

const repoUrl = (fullName: string) => `https://github.com/${fullName}`;

export function normalizeRepoCommit(c: GithubCommit, repository: string): RepoCommit | null {
  const date = c.commit.committer?.date ?? c.commit.author?.date;
  if (!date || Number.isNaN(Date.parse(date))) return null;
  return {
    sha: c.sha,
    message: c.commit.message.split('\n', 1)[0]!.trim(),
    url: c.html_url,
    date,
    repository,
    repositoryUrl: repoUrl(repository),
  };
}

/** Published releases only (a token with push access also sees drafts), newest first. */
export function normalizeReleases(list: readonly GithubRelease[], repository: string): { items: RepoRelease[]; capped: boolean } {
  const items = list
    .filter((r): r is GithubRelease & { published_at: string } => !r.draft && r.published_at !== null)
    .map((r) => ({
      id: r.id,
      tag: r.tag_name,
      name: r.name?.trim() || null,
      url: r.html_url,
      publishedAt: r.published_at,
      prerelease: r.prerelease,
      repository,
    }))
    .sort(byDate((r) => r.publishedAt));
  return { items, capped: list.length >= RELEASE_PAGE };
}

export function normalizeContributors(list: readonly GithubContributor[]): RepoContributor[] {
  return list
    .filter((c) => c.type !== 'Bot')
    .map((c) => ({ id: c.id, login: c.login, url: c.html_url, avatarUrl: c.avatar_url, contributions: c.contributions }));
}

/** GitHub's unix-seconds week start → `YYYY-MM-DD` (always a Sunday, UTC). */
export function normalizeActivity(weeks: GithubCommitActivity): ActivityWeek[] {
  return weeks
    .map((w) => ({ week: new Date(w.week * 1000).toISOString().slice(0, 10), count: w.total }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

/* ── Aggregation ─────────────────────────────────────────────────────────── */

function byDate<T>(get: (item: T) => string) {
  return (a: T, b: T) => Date.parse(get(b)) - Date.parse(get(a));
}

const coverage = (covered: number, of: number): Coverage => ({ covered, of });

/** Weeks every covered repository reports: the only period their counts are comparable over. */
function commonWeeks(series: readonly ActivityWeek[][]): string[] {
  if (!series.length) return [];
  const [first, ...rest] = series.map((s) => new Set(s.map((w) => w.week)));
  return [...first!].filter((week) => rest.every((s) => s.has(week))).sort();
}

/**
 * Combines one project's repositories. `repos` are the public ones that
 * loaded (in project order); `unavailable` counts the rest.
 */
export function aggregateProjectGithub(input: readonly RepoAnalytics[], unavailable: number): ProjectGithub {
  // Distinct repositories by GitHub id (two associations can't, but renamed rows could collide).
  const seen = new Set<number>();
  const repos = input.filter((r) => (seen.has(r.repo.id) ? false : (seen.add(r.repo.id), true)));
  const of = repos.length;

  if (!of) {
    return {
      status: 'unavailable',
      repositories: [],
      unavailable,
      stars: null,
      forks: null,
      activity: null,
      languages: null,
      commits: null,
      contributors: null,
      releases: null,
      lastActivityAt: null,
    };
  }

  // Activity: only repositories whose statistics are ready, over their common weeks.
  const ready = repos.flatMap((r) => (r.activity?.status === 'ok' ? [{ id: r.repo.id, weeks: r.activity.weeks }] : []));
  const pending = repos.filter((r) => r.activity?.status === 'pending').length;
  // A repository with no commits reports no weeks: zero everywhere, so it doesn't narrow the period.
  const weeks = commonWeeks(ready.filter((r) => r.weeks.length).map((r) => r.weeks));
  const periodCommits = new Map(
    ready.map((r) => {
      const counts = new Map(r.weeks.map((w) => [w.week, w.count]));
      return [r.id, weeks.reduce((sum, week) => sum + (counts.get(week) ?? 0), 0)];
    }),
  );
  const activityWeeks = weeks.map((week) => ({
    week,
    count: ready.reduce((sum, r) => sum + (r.weeks.find((w) => w.week === week)?.count ?? 0), 0),
  }));
  const activity =
    ready.length
      ? {
          ...coverage(ready.length, of),
          weeks: activityWeeks,
          total: activityWeeks.reduce((sum, w) => sum + w.count, 0),
          pending,
        }
      : null;

  // Languages: bytes first, then shares.
  const withLanguages = repos.filter((r) => r.languages !== null);
  const bytes = new Map<string, number>();
  for (const r of withLanguages) {
    for (const [name, n] of Object.entries(r.languages!)) bytes.set(name, (bytes.get(name) ?? 0) + n);
  }
  const totalBytes = [...bytes.values()].reduce((a, b) => a + b, 0);
  const shares: LanguageShare[] = [...bytes]
    .map(([name, n]) => ({ name, bytes: n, share: totalBytes ? n / totalBytes : 0 }))
    .sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name));
  const top = shares.slice(0, TOP_LANGUAGES);
  const languages =
    withLanguages.length && totalBytes
      ? {
          ...coverage(withLanguages.length, of),
          items: top,
          otherShare: Math.max(0, 1 - top.reduce((sum, l) => sum + l.share, 0)),
        }
      : null;

  // Recent commits: merged newest first, one entry per SHA (mirrors share history).
  const withCommits = repos.filter((r) => r.commits !== null);
  const allCommits: RepoCommit[] = [];
  const shas = new Set<string>();
  for (const c of withCommits.flatMap((r) => r.commits!).sort(byDate((c) => c.date))) {
    if (shas.has(c.sha)) continue;
    shas.add(c.sha);
    allCommits.push(c);
  }

  // Contributors: one identity per GitHub account, contributions summed.
  const withContributors = repos.filter((r) => r.contributors !== null);
  const people = new Map<number, RepoContributor>();
  for (const c of withContributors.flatMap((r) => r.contributors!)) {
    const known = people.get(c.id);
    people.set(c.id, known ? { ...known, contributions: known.contributions + c.contributions } : { ...c });
  }
  const ranked = [...people.values()].sort((a, b) => b.contributions - a.contributions || a.login.localeCompare(b.login));

  // Releases: per-repository lists are already published-only.
  const withReleases = repos.filter((r) => r.releases !== null);
  const releaseList = withReleases.flatMap((r) => r.releases!.items).sort(byDate((r) => r.publishedAt));

  const lastActivityAt =
    [...allCommits.map((c) => c.date), ...releaseList.map((r) => r.publishedAt)].sort((a, b) => Date.parse(b) - Date.parse(a))[0] ??
    null;

  const repositories: ProjectGithubRepository[] = repos.map((r) => ({
    ...r.repo,
    label: r.label,
    isPrimary: r.isPrimary,
    periodCommits: periodCommits.get(r.repo.id) ?? null,
  }));

  const complete =
    unavailable === 0 &&
    repos.every(
      (r) =>
        r.activity?.status === 'ok' && r.languages !== null && r.commits !== null && r.contributors !== null && r.releases !== null,
    );

  return {
    status: complete ? 'ok' : 'partial',
    repositories,
    unavailable,
    stars: repos.reduce((sum, r) => sum + r.repo.stars, 0),
    forks: repos.reduce((sum, r) => sum + r.repo.forks, 0),
    activity,
    languages,
    commits: withCommits.length ? allCommits.slice(0, RECENT_COMMITS) : null,
    contributors: withContributors.length
      ? { ...coverage(withContributors.length, of), total: ranked.length, top: ranked.slice(0, TOP_CONTRIBUTORS) }
      : null,
    releases: withReleases.length
      ? {
          ...coverage(withReleases.length, of),
          count: releaseList.length,
          capped: withReleases.some((r) => r.releases!.capped),
          recent: releaseList.slice(0, RECENT_RELEASES),
        }
      : null,
    lastActivityAt,
  };
}
