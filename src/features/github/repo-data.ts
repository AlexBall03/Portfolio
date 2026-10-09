import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import {
  fetchCommitActivity,
  fetchContributors,
  fetchDefaultBranchCommits,
  fetchLanguages,
  fetchReleases,
  fetchRepository,
  GithubError,
} from '@/integrations/github/client';
import { isOwner, isRepositoryName } from '@/lib/github-repository';
import { CACHE_LIFE, CACHE_TAGS } from '@/lib/cache-tags';
import {
  normalizeActivity,
  normalizeContributors,
  normalizeReleases,
  normalizeRepoCommit,
  normalizeRepository,
} from './project-analytics';
import type { ProjectRepoRef, RepoActivity, RepoCommit, RepoContributor, RepoMetadataResult, RepoRelease } from './types';

/**
 * Per-repository GitHub reads, one cached loader per resource so each has its
 * own freshness (`CACHE_LIFE.github*`) and every page showing a repository
 * shares one entry. Keys are GitHub's canonical full name (from the metadata),
 * so two projects listing the same repository make one set of requests.
 *
 * Failure contract: definitive answers (not found, private, empty) are
 * returned and cached. Transient failures (rate limit, outage, timeout,
 * malformed response, statistics still computing) throw: nothing is cached,
 * and a stale entry from an earlier success keeps serving until it expires.
 */

/** GitHub is still computing a repository's statistics (HTTP 202). */
export class StatsPendingError extends Error {
  override name = 'StatsPendingError';
}

/** Cache key of an association: its stable id when known, else its name. */
export const repoKey = (ref: Pick<ProjectRepoRef, 'githubId' | 'owner' | 'name'>) =>
  ref.githubId ? `id:${ref.githubId}` : `name:${ref.owner}/${ref.name}`;

function fromKey(key: string): { id: number } | { owner: string; name: string } | null {
  const id = /^id:(\d{1,15})$/.exec(key);
  if (id) return { id: Number(id[1]) };
  const named = /^name:([^/]+)\/([^/]+)$/.exec(key);
  if (named && isOwner(named[1]!) && isRepositoryName(named[2]!)) return { owner: named[1]!, name: named[2]! };
  return null;
}

/** Public metadata, or `private` / `not-found` with nothing else. */
export async function loadRepoMetadata(key: string): Promise<RepoMetadataResult> {
  'use cache';
  cacheTag(CACHE_TAGS.github);
  cacheLife(CACHE_LIFE.githubRepo);
  const ref = fromKey(key);
  if (!ref) return { state: 'not-found' };
  try {
    return normalizeRepository(await fetchRepository(ref));
  } catch (err) {
    // Deleted, renamed beyond GitHub's redirect, or blocked: a definitive answer.
    if (err instanceof GithubError && (err.kind === 'not-found' || err.kind === 'forbidden')) return { state: 'not-found' };
    throw err;
  }
}

export async function loadRepoCommits(fullName: string): Promise<RepoCommit[]> {
  'use cache';
  cacheTag(CACHE_TAGS.github);
  cacheLife(CACHE_LIFE.githubCommits);
  const result = await fetchDefaultBranchCommits(fullName);
  if (result.status === 'empty') return [];
  if (result.status === 'pending') throw new GithubError('upstream', 'Commits not ready');
  return result.data.flatMap((c) => normalizeRepoCommit(c, fullName) ?? []);
}

export async function loadRepoActivity(fullName: string): Promise<RepoActivity> {
  'use cache';
  cacheTag(CACHE_TAGS.github);
  cacheLife(CACHE_LIFE.githubActivity);
  const result = await fetchCommitActivity(fullName);
  if (result.status === 'pending') throw new StatsPendingError(`Statistics for ${fullName} are being computed`);
  return { status: 'ok', weeks: result.status === 'empty' ? [] : normalizeActivity(result.data) };
}

export async function loadRepoLanguages(fullName: string): Promise<Record<string, number>> {
  'use cache';
  cacheTag(CACHE_TAGS.github);
  cacheLife(CACHE_LIFE.githubLanguages);
  return fetchLanguages(fullName);
}

export async function loadRepoContributors(fullName: string): Promise<RepoContributor[]> {
  'use cache';
  cacheTag(CACHE_TAGS.github);
  cacheLife(CACHE_LIFE.githubContributors);
  const result = await fetchContributors(fullName);
  if (result.status === 'empty') return [];
  if (result.status === 'pending') throw new StatsPendingError(`Contributors for ${fullName} are being computed`);
  return normalizeContributors(result.data);
}

export async function loadRepoReleases(fullName: string): Promise<{ items: RepoRelease[]; capped: boolean }> {
  'use cache';
  cacheTag(CACHE_TAGS.github);
  cacheLife(CACHE_LIFE.githubReleases);
  return normalizeReleases(await fetchReleases(fullName), fullName);
}
