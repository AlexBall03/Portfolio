import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { json, mockGithub, noContent, repoPayload } from '@/test/github';
import {
  classifyFailure,
  fetchCommitActivity,
  fetchContributors,
  fetchDefaultBranchCommits,
  fetchRepository,
  GithubError,
} from './client';

/** The REST client's status handling, against a mocked GitHub (no network). */

let github: ReturnType<typeof mockGithub> | undefined;
beforeEach(() => vi.stubEnv('GITHUB_TOKEN', 'test-token'));
afterEach(() => {
  github?.restore();
  github = undefined;
  vi.unstubAllEnvs();
});

const failure = (status: number, headers: Record<string, string> = {}) =>
  classifyFailure({ status, headers: new Headers(headers) }).kind;

describe('failure classification', () => {
  it('calls a 403 a rate limit only when GitHub says so', () => {
    expect(failure(429)).toBe('rate-limited');
    expect(failure(403, { 'x-ratelimit-remaining': '0' })).toBe('rate-limited');
    expect(failure(403, { 'retry-after': '60' })).toBe('rate-limited');
    expect(failure(403, { 'x-ratelimit-remaining': '4999' })).toBe('forbidden');
    expect(failure(451)).toBe('forbidden');
  });

  it('maps missing and server errors', () => {
    expect(failure(404)).toBe('not-found');
    expect(failure(410)).toBe('not-found');
    expect(failure(500)).toBe('upstream');
    expect(failure(502)).toBe('upstream');
  });
});

async function kindOf(promise: Promise<unknown>) {
  try {
    await promise;
    return 'resolved';
  } catch (err) {
    return err instanceof GithubError ? err.kind : 'other';
  }
}

describe('requests', () => {
  it('fetches by stable id or by name, only on api.github.com, with the token server-side', async () => {
    const seen: string[] = [];
    github = mockGithub((path) => {
      seen.push(path);
      return json(repoPayload({ id: 7, full_name: 'AlexBall03/Portfolio' }));
    });
    await fetchRepository({ id: 7 });
    await fetchRepository({ owner: 'AlexBall03', name: 'Portfolio' });
    expect(seen).toEqual(['/repositories/7', '/repos/AlexBall03/Portfolio']);
    const init = vi.mocked(globalThis.fetch).mock.calls[0]![1]!;
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer test-token');
  });

  it('refuses invalid names before any request', async () => {
    github = mockGithub(() => json({}));
    expect(await kindOf(fetchRepository({ owner: '../evil', name: 'x' }))).toBe('not-found');
    expect(await kindOf(fetchDefaultBranchCommits('a/b/c'))).toBe('not-found');
    expect(github.calls).toEqual([]);
  });

  it('reports statistics still being computed (202) as pending, and no data (204) as empty', async () => {
    github = mockGithub((path) => (path.includes('/a/pending/') ? noContent(202) : noContent(204)));
    expect(await fetchCommitActivity('a/pending')).toEqual({ status: 'pending' });
    expect(await fetchCommitActivity('a/none')).toEqual({ status: 'empty' });
  });

  it('treats 409 on commits as an empty repository', async () => {
    github = mockGithub(() => json({ message: 'Git Repository is empty.' }, 409));
    expect(await fetchDefaultBranchCommits('a/b')).toEqual({ status: 'empty' });
  });

  it('raises typed errors for rate limits, refusals, outages, and malformed bodies', async () => {
    const respond = { current: json({}) };
    github = mockGithub(() => respond.current);
    respond.current = json({ message: 'API rate limit exceeded' }, 403, { 'x-ratelimit-remaining': '0' });
    expect(await kindOf(fetchRepository({ id: 1 }))).toBe('rate-limited');
    respond.current = json({ message: 'Repository access blocked' }, 403);
    expect(await kindOf(fetchRepository({ id: 1 }))).toBe('forbidden');
    respond.current = json({ message: 'Server Error' }, 503);
    expect(await kindOf(fetchRepository({ id: 1 }))).toBe('upstream');
    respond.current = json({ id: 'not-a-number' });
    expect(await kindOf(fetchRepository({ id: 1 }))).toBe('invalid-response');
    respond.current = new Response('<html>', { status: 200 });
    expect(await kindOf(fetchRepository({ id: 1 }))).toBe('invalid-response');
  });

  it('turns a network failure or timeout into an upstream error', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(Object.assign(new Error('The operation timed out'), { name: 'TimeoutError' }));
    try {
      expect(await kindOf(fetchRepository({ id: 1 }))).toBe('upstream');
    } finally {
      spy.mockRestore();
    }
  });

  it('reports a missing token as a configuration error without calling GitHub', async () => {
    vi.stubEnv('GITHUB_TOKEN', '');
    github = mockGithub(() => json({}));
    expect(await kindOf(fetchRepository({ id: 1 }))).toBe('config');
    expect(github.calls).toEqual([]);
  });

  it('pages contributors and never passes a partial list off as complete', async () => {
    const page = (n: number, count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: n * 1000 + i,
        login: `u${n}-${i}`,
        type: 'User',
        contributions: 1,
        avatar_url: 'https://avatars.githubusercontent.com/u/1',
        html_url: 'https://github.com/u',
      }));
    github = mockGithub((path) => (/[?&]page=1$/.test(path) ? json(page(1, 100)) : json(page(2, 3))));
    const all = await fetchContributors('a/b');
    expect(all.status === 'ok' && all.data.length).toBe(103);
    github.restore();

    github = mockGithub((path) => (/[?&]page=1$/.test(path) ? json(page(1, 100)) : noContent(202)));
    expect(await kindOf(fetchContributors('a/b'))).toBe('upstream');
  });
});
