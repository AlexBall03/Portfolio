import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { ConfigError, githubEnv } from '@/config/env';
import {
  fetchContributionCalendar,
  fetchPublicEvents,
  fetchRecentCommits,
  fetchRepos,
  fetchUser,
} from '@/integrations/github/client';
import type { GithubRepo } from '@/integrations/github/schemas';
import { CACHE_LIFE, CACHE_TAGS } from '@/lib/cache-tags';
import { createLogger } from '@/lib/logger';
import { buildCalendar, calendarStart, toLevel } from './calendar';
import { mergeActivity, normalizeCommit, normalizeEvent } from './events';
import type { Activity, ContributionCalendar, GithubOverview, GithubRepository } from './types';

const log = createLogger('github');

const MAX_REPOSITORIES = 4;
const MAX_ACTIVITY = 5;
/** Repositories whose commits are read directly, to cover Events API lag. */
const COMMIT_REPOS = 3;
const COMMIT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const byPushedDesc = (a: GithubRepo, b: GithubRepo) => Date.parse(b.pushed_at ?? '0') - Date.parse(a.pushed_at ?? '0');

/**
 * The user's own work: public repositories that aren't forks, archived, or
 * the profile README repository (named after the user).
 */
export function ownRepos(repos: readonly GithubRepo[], username: string): GithubRepo[] {
  const profileRepo = username.toLowerCase();
  return repos.filter((r) => !r.fork && !r.archived && r.name.toLowerCase() !== profileRepo).sort(byPushedDesc);
}

/** Stats and the repo list come from the same set (see `ownRepos`). */
export function summarizeRepos(repos: readonly GithubRepo[], username: string) {
  const own = ownRepos(repos, username);
  const repositories: GithubRepository[] = own
    .slice(0, MAX_REPOSITORIES)
    .map((r) => ({
      name: r.name,
      description: r.description,
      url: r.html_url,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      pushedAt: r.pushed_at,
    }));
  return {
    repositories,
    count: own.length,
    stars: own.reduce((sum, r) => sum + r.stargazers_count, 0),
    forks: own.reduce((sum, r) => sum + r.forks_count, 0),
  };
}

async function loadCalendar(username: string): Promise<ContributionCalendar> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const from = new Date(`${calendarStart(today)}T00:00:00Z`);
  const result = await fetchContributionCalendar(username, from, now);
  const days = result.contributionsCollection.contributionCalendar.weeks.flatMap((w) =>
    w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount, level: toLevel(d.contributionLevel) })),
  );
  // Anchor on GitHub's latest day rather than the server clock, so the grid
  // ends on the same "today" GitHub's own profile shows.
  const latest = days.reduce((max, d) => (d.date > max ? d.date : max), today);
  return buildCalendar(days, latest);
}

function settled<T>(result: PromiseSettledResult<T>, part: string): T | null {
  if (result.status === 'fulfilled') return result.value;
  log.warn(`GitHub ${part} unavailable`, {
    reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
  });
  return null;
}

/**
 * Live GitHub data for the portfolio, cached for 15 minutes. Each part loads
 * independently; a partially degraded result is cached for only a minute so
 * a transient upstream failure heals quickly.
 */
export async function getGithubOverview(username: string): Promise<GithubOverview> {
  'use cache';
  cacheTag(CACHE_TAGS.github);

  // Without a token every part would fail the same way: report it once.
  try {
    githubEnv();
  } catch (err) {
    if (!(err instanceof ConfigError)) throw err;
    log.warn('GitHub integration not configured', { reason: err.message });
    cacheLife(CACHE_LIFE.githubDegraded);
    return {
      username,
      profileUrl: `https://github.com/${username}`,
      avatarUrl: null,
      stats: null,
      repositories: null,
      activity: null,
      calendar: null,
      lastActivityAt: null,
    };
  }

  const [user, repos, events, calendar] = await Promise.allSettled([
    fetchUser(username),
    fetchRepos(username),
    fetchPublicEvents(username),
    loadCalendar(username),
  ]);

  const profile = settled(user, 'profile');
  const repoList = settled(repos, 'repositories');
  const eventList = settled(events, 'events');
  const contributionCalendar = settled(calendar, 'contribution calendar');

  const summary = repoList ? summarizeRepos(repoList, username) : null;

  // The Events API can lag by hours, so read the latest commits of recently
  // pushed repositories directly. Best effort: events alone still render.
  const since = new Date(Date.now() - COMMIT_WINDOW_MS);
  const recentRepos = repoList
    ? ownRepos(repoList, username)
        .filter((r) => r.pushed_at && Date.parse(r.pushed_at) >= since.getTime())
        .slice(0, COMMIT_REPOS)
    : [];
  const commitResults = await Promise.allSettled(
    recentRepos.map((r) => fetchRecentCommits(r.full_name, username, since)),
  );
  const covered = new Map<string, string>();
  const commits: Activity[] = [];
  commitResults.forEach((result, i) => {
    const repo = recentRepos[i]!;
    const list = settled(result, `commits for ${repo.full_name}`);
    if (!list) return;
    covered.set(repo.full_name, repo.default_branch);
    commits.push(...list.map((c) => normalizeCommit(c, repo.full_name)));
  });

  const activity: Activity[] | null =
    eventList || commits.length > 0
      ? mergeActivity((eventList ?? []).flatMap((e) => normalizeEvent(e) ?? []), commits, covered).slice(0, MAX_ACTIVITY)
      : null;

  // Newest of everything seen: activity can trail a repository's push time.
  const lastActivityAt =
    [activity?.[0]?.createdAt, summary?.repositories[0]?.pushedAt]
      .filter((d): d is string => !!d)
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;

  const degraded = !profile || !repoList || !eventList || !contributionCalendar;
  cacheLife(degraded ? CACHE_LIFE.githubDegraded : CACHE_LIFE.github);

  return {
    username,
    profileUrl: profile?.html_url ?? `https://github.com/${username}`,
    avatarUrl: profile?.avatar_url ?? null,
    stats:
      summary && profile
        ? { repositories: summary.count, stars: summary.stars, forks: summary.forks, followers: profile.followers }
        : null,
    repositories: summary?.repositories ?? null,
    activity,
    calendar: contributionCalendar,
    lastActivityAt,
  };
}
