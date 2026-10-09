import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CACHE_LIFE } from '@/lib/cache-tags';
import {
  activityPayload,
  commitPayload,
  contributorPayload,
  json,
  mockGithub,
  noContent,
  releasePayload,
  repoPayload,
  type Route,
} from '@/test/github';
import type { ProjectRepoRef } from './types';

/**
 * Project analytics end to end over a mocked GitHub: loaders → composer →
 * aggregation, including partial failures and the cache lifetime chosen.
 * (`'use cache'` is inert under Vitest, so every call reaches the mock.)
 */

const lives = vi.hoisted(() => [] as unknown[]);
vi.mock('next/cache', () => ({ cacheLife: (life: unknown) => lives.push(life), cacheTag: () => {} }));

const { getProjectGithub, resolvePublicRepository } = await import('./project');
const { loadRepoActivity, loadRepoMetadata, StatsPendingError } = await import('./repo-data');

const ref = (githubId: number | null, owner: string, name: string, over: Partial<ProjectRepoRef> = {}): ProjectRepoRef => ({
  githubId,
  owner,
  name,
  label: null,
  isPrimary: false,
  ...over,
});

/** A healthy public repository's endpoints. */
function healthy(id: number, fullName: string, over: Record<string, unknown> = {}): Route {
  return (path) => {
    if (path === `/repositories/${id}` || path === `/repos/${fullName}`) return json(repoPayload({ id, full_name: fullName, ...over }));
    if (path.startsWith(`/repos/${fullName}/commits`)) return json([commitPayload(`${id}a`, '2026-10-01T00:00:00Z')]);
    if (path === `/repos/${fullName}/stats/commit_activity`) return json(activityPayload([['2026-09-20', 2], ['2026-09-27', 3]]));
    if (path === `/repos/${fullName}/languages`) return json({ TypeScript: 300 });
    if (path.startsWith(`/repos/${fullName}/contributors`)) return json([contributorPayload(1, 'alex', 5)]);
    if (path.startsWith(`/repos/${fullName}/releases`)) return json([releasePayload(id, 'v1', '2026-09-01T00:00:00Z')]);
    return undefined;
  };
}

const routes = (...list: Route[]): Route => (path) => {
  for (const r of list) {
    const res = r(path);
    if (res) return res;
  }
  return undefined;
};

let github: ReturnType<typeof mockGithub> | undefined;
beforeEach(() => {
  vi.stubEnv('GITHUB_TOKEN', 'test-token');
  lives.length = 0;
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  github?.restore();
  github = undefined;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('getProjectGithub', () => {
  it('renders nothing and calls nobody without repositories or a token', async () => {
    github = mockGithub(() => json({}));
    expect((await getProjectGithub([])).status).toBe('unavailable');
    vi.stubEnv('GITHUB_TOKEN', '');
    expect((await getProjectGithub([ref(1, 'x', 'a')])).status).toBe('unconfigured');
    expect(github.calls).toEqual([]);
    expect(lives.at(-1)).toEqual(CACHE_LIFE.githubDegraded);
  });

  it('combines several repositories and caches a complete result for the normal lifetime', async () => {
    github = mockGithub(routes(healthy(1, 'x/a'), healthy(2, 'x/b')));
    const result = await getProjectGithub([ref(1, 'x', 'a', { isPrimary: true, label: 'frontend' }), ref(2, 'x', 'b', { label: 'api' })]);
    expect(result.status).toBe('ok');
    expect(result.repositories.map((r) => [r.fullName, r.label, r.isPrimary])).toEqual([
      ['x/a', 'frontend', true],
      ['x/b', 'api', false],
    ]);
    expect(result.activity?.total).toBe(10);
    expect(result.contributors?.total).toBe(1);
    expect(result.releases?.count).toBe(2);
    expect(lives.at(-1)).toEqual(CACHE_LIFE.githubProject);
  });

  it('keeps going when one repository fails, and caches that only briefly', async () => {
    github = mockGithub(routes((p) => (p === '/repositories/2' ? json({ message: 'boom' }, 502) : undefined), healthy(1, 'x/a')));
    const result = await getProjectGithub([ref(1, 'x', 'a'), ref(2, 'x', 'b')]);
    expect(result).toMatchObject({ status: 'partial', unavailable: 1 });
    expect(result.repositories.map((r) => r.fullName)).toEqual(['x/a']);
    expect(lives.at(-1)).toEqual(CACHE_LIFE.githubDegraded);
  });

  it('suppresses a repository that became private: nothing else is requested and nothing is shown', async () => {
    github = mockGithub(routes(healthy(1, 'x/a'), healthy(3, 'x/secret-plans', { private: true, visibility: 'private' })));
    const result = await getProjectGithub([ref(1, 'x', 'a'), ref(3, 'x', 'secret-plans')]);
    expect(result).toMatchObject({ unavailable: 1, status: 'partial' });
    expect(JSON.stringify(result)).not.toContain('secret-plans');
    expect(github.calls.filter((c) => c.includes('secret-plans'))).toEqual([]);
    // A definitive answer, not a failure: cached normally.
    expect(lives.at(-1)).toEqual(CACHE_LIFE.githubProject);
  });

  it('treats a deleted repository as unavailable', async () => {
    github = mockGithub(healthy(1, 'x/a'));
    const result = await getProjectGithub([ref(1, 'x', 'a'), ref(9, 'x', 'gone')]);
    expect(result).toMatchObject({ unavailable: 1 });
  });

  it('reports statistics GitHub is still computing as pending', async () => {
    github = mockGithub(routes((p) => (p === '/repos/x/b/stats/commit_activity' ? noContent(202) : undefined), healthy(1, 'x/a'), healthy(2, 'x/b')));
    const result = await getProjectGithub([ref(1, 'x', 'a'), ref(2, 'x', 'b')]);
    expect(result.activity).toMatchObject({ total: 5, covered: 1, of: 2, pending: 1 });
    expect(lives.at(-1)).toEqual(CACHE_LIFE.githubDegraded);
  });

  it('shows an empty repository as zero activity, not a failure', async () => {
    const empty: Route = (p) =>
      p.startsWith('/repos/x/empty/commits') ? json({ message: 'Git Repository is empty.' }, 409) : p === '/repos/x/empty/stats/commit_activity' || p.startsWith('/repos/x/empty/contributors') ? noContent(204) : p === '/repos/x/empty/languages' ? json({}) : p.startsWith('/repos/x/empty/releases') ? json([]) : undefined;
    github = mockGithub(routes(empty, healthy(4, 'x/empty')));
    const result = await getProjectGithub([ref(4, 'x', 'empty')]);
    expect(result.status).toBe('ok');
    expect(result.commits).toEqual([]);
    expect(result.activity).toMatchObject({ total: 0, weeks: [] });
    expect(result.releases?.count).toBe(0);
  });

  it('degrades only the part that hit a rate limit', async () => {
    const limited: Route = (p) => (p === '/repos/x/a/languages' ? json({ message: 'rate limit' }, 403, { 'x-ratelimit-remaining': '0' }) : undefined);
    github = mockGithub(routes(limited, healthy(1, 'x/a')));
    const result = await getProjectGithub([ref(1, 'x', 'a')]);
    expect(result.languages).toBeNull();
    expect(result.activity?.total).toBe(5);
    expect(result.status).toBe('partial');
  });

  it('looks repositories up by name until they have a stable id', async () => {
    github = mockGithub(healthy(1, 'x/a'));
    await getProjectGithub([ref(null, 'x', 'a')]);
    expect(github.calls[0]).toBe('/repos/x/a');
  });
});

describe('loader failure contract', () => {
  it('returns definitive answers and throws on transient failures (so a stale copy keeps serving)', async () => {
    github = mockGithub((p) =>
      p === '/repositories/5' ? json({ message: 'Not Found' }, 404) : p.endsWith('/stats/commit_activity') ? (p.includes('busy') ? noContent(202) : json({}, 503)) : undefined,
    );
    expect(await loadRepoMetadata('id:5')).toEqual({ state: 'not-found' });
    expect(await loadRepoMetadata('name:../x')).toEqual({ state: 'not-found' });
    await expect(loadRepoActivity('x/busy')).rejects.toBeInstanceOf(StatsPendingError);
    await expect(loadRepoActivity('x/down')).rejects.toMatchObject({ kind: 'upstream' });
  });
});

describe('resolvePublicRepository (admin verification)', () => {
  it('returns the stable id and canonical name of a public repository', async () => {
    github = mockGithub(() => json(repoPayload({ id: 42, full_name: 'AlexBall03/Portfolio' })));
    expect(await resolvePublicRepository({ owner: 'alexball03', name: 'portfolio' })).toEqual({
      status: 'public',
      id: 42,
      owner: 'AlexBall03',
      name: 'Portfolio',
      archived: false,
    });
  });

  it('distinguishes private, missing, unreachable, and unconfigured', async () => {
    const respond = { current: json({}) };
    github = mockGithub(() => respond.current);
    respond.current = json(repoPayload({ id: 1, full_name: 'a/b', private: true }));
    expect((await resolvePublicRepository({ owner: 'a', name: 'b' })).status).toBe('private');
    respond.current = json({ message: 'Not Found' }, 404);
    expect((await resolvePublicRepository({ owner: 'a', name: 'b' })).status).toBe('not-found');
    respond.current = json({ message: 'rate limit' }, 429);
    expect((await resolvePublicRepository({ owner: 'a', name: 'b' })).status).toBe('unavailable');
    vi.stubEnv('GITHUB_TOKEN', '');
    expect((await resolvePublicRepository({ owner: 'a', name: 'b' })).status).toBe('unconfigured');
  });
});
