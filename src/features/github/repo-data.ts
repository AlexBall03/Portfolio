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
 * Failure contract: loaders never throw. Definitive answers (not found,
 * private, empty) are ordinary values cached for the resource's lifetime.
 * Transient failures (rate limit, outage, timeout, malformed response,
 * statistics still computing) come back as `{ ok: false }`, cached for only a
 * minute (`githubDegraded`) so they retry soon. They must not throw: an error
 * thrown inside `'use cache'` fails the page's prerender even when the caller
 * catches it, which would fail a deployment whenever GitHub is busy or down.
 */

/** GitHub is still computing a repository's statistics (HTTP 202). */
export class StatsPendingError extends Error {
  override name = 'StatsPendingError';
}

/** A loader's answer: the value, or a transient failure (`pending`: GitHub is still computing it). */
export type Loaded<T> = { ok: true; value: T } | { ok: false; pending: boolean; reason: string };

type Lifetime = (typeof CACHE_LIFE)[keyof typeof CACHE_LIFE];

/** Runs a load inside the caller's cache scope and picks that entry's lifetime from the outcome. */
async function settle<T>(life: Lifetime, run: () => Promise<T>): Promise<Loaded<T>> {
  try {
    const value = await run();
    cacheLife(life);
    return { ok: true, value };
  } catch (err) {
    cacheLife(CACHE_LIFE.githubDegraded);
    return { ok: false, pending: err instanceof StatsPendingError, reason: err instanceof Error ? err.message : String(err) };
  }
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
export async function loadRepoMetadata(key: string): Promise<Loaded<RepoMetadataResult>> {
  'use cache';
  cacheTag(CACHE_TAGS.github);
  return settle(CACHE_LIFE.githubRepo, async (): Promise<RepoMetadataResult> => {
    const ref = fromKey(key);
    if (!ref) return { state: 'not-found' };
    try {
      return normalizeRepository(await fetchRepository(ref));
    } catch (err) {
      // Deleted, renamed beyond GitHub's redirect, or blocked: a definitive answer.
      if (err instanceof GithubError && (err.kind === 'not-found' || err.kind === 'forbidden')) return { state: 'not-found' };
      throw err;
    }
  });
}

export async function loadRepoCommits(fullName: string): Promise<Loaded<RepoCommit[]>> {
  'use cache';
  cacheTag(CACHE_TAGS.github);
  return settle(CACHE_LIFE.githubCommits, async () => {
    const result = await fetchDefaultBranchCommits(fullName);
    if (result.status === 'empty') return [];
    if (result.status === 'pending') throw new StatsPendingError(`Commits for ${fullName} are not ready`);
    return result.data.flatMap((c) => normalizeRepoCommit(c, fullName) ?? []);
  });
}

export async function loadRepoActivity(fullName: string): Promise<Loaded<RepoActivity>> {
  'use cache';
  cacheTag(CACHE_TAGS.github);
  return settle(CACHE_LIFE.githubActivity, async (): Promise<RepoActivity> => {
    const result = await fetchCommitActivity(fullName);
    if (result.status === 'pending') throw new StatsPendingError(`Statistics for ${fullName} are being computed`);
    return { status: 'ok', weeks: result.status === 'empty' ? [] : normalizeActivity(result.data) };
  });
}

export async function loadRepoLanguages(fullName: string): Promise<Loaded<Record<string, number>>> {
  'use cache';
  cacheTag(CACHE_TAGS.github);
  return settle(CACHE_LIFE.githubLanguages, () => fetchLanguages(fullName));
}

export async function loadRepoContributors(fullName: string): Promise<Loaded<RepoContributor[]>> {
  'use cache';
  cacheTag(CACHE_TAGS.github);
  return settle(CACHE_LIFE.githubContributors, async () => {
    const result = await fetchContributors(fullName);
    if (result.status === 'empty') return [];
    if (result.status === 'pending') throw new StatsPendingError(`Contributors for ${fullName} are being computed`);
    return normalizeContributors(result.data);
  });
}

export async function loadRepoReleases(fullName: string): Promise<Loaded<{ items: RepoRelease[]; capped: boolean }>> {
  'use cache';
  cacheTag(CACHE_TAGS.github);
  return settle(CACHE_LIFE.githubReleases, async () => normalizeReleases(await fetchReleases(fullName), fullName));
}
