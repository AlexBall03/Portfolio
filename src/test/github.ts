import { vi } from 'vitest';

/**
 * A fake GitHub REST API for tests: `fetch` is replaced by a router over
 * request paths (with query). Anything unrouted is a 404; any host other than
 * api.github.com fails the test. No test reaches the real GitHub.
 */

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

export const noContent = (status: 202 | 204) => new Response(status === 202 ? '{}' : null, { status });

export type Route = (path: string) => Response | Promise<Response> | undefined;

export function mockGithub(route: Route) {
  const calls: string[] = [];
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.origin !== 'https://api.github.com') throw new Error(`Unexpected request to ${url.origin}`);
    const path = `${url.pathname}${url.search}`;
    calls.push(path);
    return (await route(path)) ?? json({ message: 'Not Found' }, 404);
  });
  return { calls, restore: () => spy.mockRestore() };
}

export function repoPayload(over: Partial<Record<string, unknown>> & { id: number; full_name: string }) {
  const [owner = '', name = ''] = over.full_name.split('/');
  return {
    name,
    owner: { login: owner },
    private: false,
    visibility: 'public',
    description: `About ${name}`,
    html_url: `https://github.com/${over.full_name}`,
    language: 'TypeScript',
    stargazers_count: 0,
    forks_count: 0,
    archived: false,
    fork: false,
    default_branch: 'main',
    pushed_at: '2026-10-01T12:00:00Z',
    ...over,
  };
}

export const commitPayload = (sha: string, date: string, message = `Commit ${sha}`) => ({
  sha,
  html_url: `https://github.com/x/y/commit/${sha}`,
  commit: { message, author: { date }, committer: { date } },
});

/** GitHub's commit_activity weeks: `week` is a Sunday 00:00 UTC in unix seconds. */
export const activityPayload = (weeks: [string, number][]) =>
  weeks.map(([day, total]) => ({ week: Date.parse(`${day}T00:00:00Z`) / 1000, total, days: [total, 0, 0, 0, 0, 0, 0] }));

export const contributorPayload = (id: number, login: string, contributions: number, type = 'User') => ({
  id,
  login,
  type,
  contributions,
  avatar_url: `https://avatars.githubusercontent.com/u/${id}`,
  html_url: `https://github.com/${login}`,
});

export const releasePayload = (id: number, tag: string, publishedAt: string | null, over: Record<string, unknown> = {}) => ({
  id,
  tag_name: tag,
  name: tag,
  draft: false,
  prerelease: false,
  published_at: publishedAt,
  html_url: `https://github.com/x/y/releases/tag/${tag}`,
  ...over,
});
