import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { ConfigError, githubEnv } from '@/config/env';
import { fetchRepository, GithubError } from '@/integrations/github/client';
import type { RepositoryRef } from '@/lib/github-repository';
import { CACHE_LIFE, CACHE_TAGS } from '@/lib/cache-tags';
import { createLogger } from '@/lib/logger';
import { aggregateProjectGithub, normalizeRepository } from './project-analytics';
import {
  loadRepoActivity,
  loadRepoCommits,
  loadRepoContributors,
  loadRepoLanguages,
  loadRepoMetadata,
  loadRepoReleases,
  repoKey,
  StatsPendingError,
} from './repo-data';
import type { ProjectGithub, ProjectRepoRef, RepoActivity, RepoAnalytics, RepoMetadata } from './types';

const log = createLogger('github');

const reason = (err: unknown) => (err instanceof Error ? err.message : String(err));

export function githubConfigured(): boolean {
  try {
    githubEnv();
    return true;
  } catch (err) {
    if (err instanceof ConfigError) return false;
    throw err;
  }
}

const EMPTY: Omit<ProjectGithub, 'status'> = {
  repositories: [],
  unavailable: 0,
  stars: null,
  forks: null,
  activity: null,
  languages: null,
  commits: null,
  contributors: null,
  releases: null,
  lastActivityAt: null,
};

/**
 * One project's GitHub analytics across its associated repositories. Each
 * repository and each of its parts loads independently: a failure degrades
 * only that part (never shown as zero), and a degraded result is cached for
 * only a minute so it heals quickly. Private or missing repositories are
 * counted, never named. The per-repository loaders (`repo-data.ts`) carry the
 * real freshness; this entry only composes them.
 */
export async function getProjectGithub(refs: readonly ProjectRepoRef[]): Promise<ProjectGithub> {
  'use cache';
  cacheTag(CACHE_TAGS.github);

  if (!refs.length) {
    cacheLife(CACHE_LIFE.githubProject);
    return { status: 'unavailable', ...EMPTY };
  }
  if (!githubConfigured()) {
    log.warn('GitHub integration not configured', { reason: 'GITHUB_TOKEN is not set' });
    cacheLife(CACHE_LIFE.githubDegraded);
    return { status: 'unconfigured', ...EMPTY };
  }

  let degraded = false;
  const metadata = await Promise.allSettled(refs.map((ref) => loadRepoMetadata(repoKey(ref))));
  let unavailable = 0;
  const visible: { ref: ProjectRepoRef; repo: RepoMetadata }[] = [];
  metadata.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value.state === 'public') {
      visible.push({ ref: refs[i]!, repo: result.value.repo });
      return;
    }
    unavailable++;
    if (result.status === 'rejected') {
      degraded = true;
      log.warn('GitHub repository unavailable', { repository: repoKey(refs[i]!), reason: reason(result.reason) });
    }
  });

  const part = <T,>(result: PromiseSettledResult<T>, what: string, repository: string): T | null => {
    if (result.status === 'fulfilled') return result.value;
    degraded = true;
    if (!(result.reason instanceof StatsPendingError)) {
      log.warn(`GitHub ${what} unavailable`, { repository, reason: reason(result.reason) });
    }
    return null;
  };

  const analytics: RepoAnalytics[] = await Promise.all(
    visible.map(async ({ ref, repo }) => {
      const name = repo.fullName;
      const [commits, activity, languages, contributors, releases] = await Promise.allSettled([
        loadRepoCommits(name),
        loadRepoActivity(name),
        loadRepoLanguages(name),
        loadRepoContributors(name),
        loadRepoReleases(name),
      ]);
      const pending = activity.status === 'rejected' && activity.reason instanceof StatsPendingError;
      // Retry soon: GitHub usually finishes computing within a minute.
      if (pending) degraded = true;
      return {
        repo,
        label: ref.label,
        isPrimary: ref.isPrimary,
        commits: part(commits, 'commits', name),
        activity: pending ? ({ status: 'pending' } satisfies RepoActivity) : part(activity, 'commit activity', name),
        languages: part(languages, 'languages', name),
        contributors: part(contributors, 'contributors', name),
        releases: part(releases, 'releases', name),
      };
    }),
  );

  const result = aggregateProjectGithub(analytics, unavailable);
  cacheLife(degraded ? CACHE_LIFE.githubDegraded : CACHE_LIFE.githubProject);
  return result;
}

export type RepositoryResolution =
  | { status: 'public'; id: number; owner: string; name: string; archived: boolean }
  | { status: 'private' | 'not-found' | 'unavailable' | 'unconfigured' };

/**
 * Verifies a repository for the admin, uncached (a save must see GitHub's
 * current answer): its stable id and canonical name when it's public.
 */
export async function resolvePublicRepository(ref: RepositoryRef): Promise<RepositoryResolution> {
  if (!githubConfigured()) return { status: 'unconfigured' };
  try {
    const result = normalizeRepository(await fetchRepository(ref));
    if (result.state !== 'public') return { status: result.state };
    const { id, owner, name, archived } = result.repo;
    return { status: 'public', id, owner, name, archived };
  } catch (err) {
    if (err instanceof GithubError && (err.kind === 'not-found' || err.kind === 'forbidden')) return { status: 'not-found' };
    log.warn('Could not verify GitHub repository', { reason: reason(err) });
    return { status: 'unavailable' };
  }
}
