import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import {
  fetchContributionCalendar,
  fetchPublicEvents,
  fetchRepos,
  fetchUser,
} from '@/integrations/github/client';
import type { GithubRepo } from '@/integrations/github/schemas';
import { CACHE_LIFE, CACHE_TAGS } from '@/lib/cache-tags';
import { createLogger } from '@/lib/logger';
import { buildCalendar, calendarStart, toLevel } from './calendar';
import { normalizeEvent } from './events';
import type { Activity, ContributionCalendar, GithubOverview, GithubRepository } from './types';

const log = createLogger('github');

const MAX_REPOSITORIES = 4;
const MAX_ACTIVITY = 5;

/** Stats and the repo list come from the same set: public, non-fork repositories. */
export function summarizeRepos(repos: readonly GithubRepo[]) {
  const own = repos.filter((r) => !r.fork);
  const repositories: GithubRepository[] = [...own]
    .sort((a, b) => Date.parse(b.pushed_at ?? '0') - Date.parse(a.pushed_at ?? '0'))
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

  const summary = repoList ? summarizeRepos(repoList) : null;
  const activity: Activity[] | null = eventList
    ? eventList
        .flatMap((e) => normalizeEvent(e) ?? [])
        // The Events API no longer guarantees chronological order.
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, MAX_ACTIVITY)
    : null;

  const degraded = !profile || !repoList || !eventList || !contributionCalendar;
  cacheLife(degraded ? CACHE_LIFE.githubDegraded : CACHE_LIFE.github);

  return {
    username,
    profileUrl: profile?.html_url ?? `https://github.com/${username}`,
    stats:
      summary && profile
        ? { repositories: summary.count, stars: summary.stars, forks: summary.forks, followers: profile.followers }
        : null,
    repositories: summary?.repositories ?? null,
    activity,
    calendar: contributionCalendar,
    lastActivityAt: activity?.[0]?.createdAt ?? summary?.repositories[0]?.pushedAt ?? null,
  };
}
