import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CACHE_LIFE } from '@/lib/cache-tags';
import { json, mockGithub, sponsorshipPayload, sponsorshipsPage, type Route } from '@/test/github';

/**
 * The sponsor read over a mocked GitHub: what each kind of answer becomes, and
 * that a failure is always a value. (`'use cache'` is inert under Vitest.)
 */

const lives = vi.hoisted(() => [] as unknown[]);
const logged = vi.hoisted(() => [] as unknown[]);
vi.mock('next/cache', () => ({ cacheLife: (life: unknown) => lives.push(life), cacheTag: () => {} }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ warn: (...args: unknown[]) => logged.push(args), error: (...args: unknown[]) => logged.push(args), info: () => {} }),
}));

const { loadPublicSponsors } = await import('./sponsor-data');

let github: ReturnType<typeof mockGithub> | undefined;
const serve = (route: Route) => (github = mockGithub(route));

beforeEach(() => {
  vi.stubEnv('GITHUB_TOKEN', 'test-token');
  lives.length = 0;
  logged.length = 0;
});
afterEach(() => {
  github?.restore();
  github = undefined;
  vi.unstubAllEnvs();
});

describe('loadPublicSponsors', () => {
  it('returns the public sponsors and when they were read', async () => {
    serve(() =>
      json(
        sponsorshipsPage([
          sponsorshipPayload(1, 'public-user'),
          sponsorshipPayload(2, 'private-user', { privacyLevel: 'PRIVATE' }),
        ]),
      ),
    );
    const result = await loadPublicSponsors('AlexBall03');
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.sponsors.map((s) => s.login)).toEqual(['public-user']);
    expect(Number.isNaN(Date.parse(result.fetchedAt))).toBe(false);
    expect(lives).toEqual([CACHE_LIFE.githubSponsors]);
    // A private sponsor leaves no trace in what is cached and sent on.
    expect(JSON.stringify(result)).not.toContain('private-user');
  });

  it('reports no sponsors as an empty list, not as a failure', async () => {
    serve(() => json(sponsorshipsPage([])));
    expect(await loadPublicSponsors('AlexBall03')).toMatchObject({ status: 'ok', sponsors: [] });
  });

  it('distinguishes a missing token, a refused token, and an outage', async () => {
    vi.stubEnv('GITHUB_TOKEN', '');
    expect(await loadPublicSponsors('AlexBall03')).toEqual({ status: 'unconfigured' });

    vi.stubEnv('GITHUB_TOKEN', 'test-token');
    serve(() => json({ message: 'Bad credentials' }, 401));
    expect(await loadPublicSponsors('AlexBall03')).toEqual({ status: 'unauthorized' });
    github!.restore();

    serve(() => json({ data: { user: null }, errors: [{ type: 'FORBIDDEN', message: 'Resource not accessible by personal access token' }] }));
    expect(await loadPublicSponsors('AlexBall03')).toEqual({ status: 'unauthorized' });
    github!.restore();

    serve(() => json({ message: 'Server Error' }, 502));
    expect(await loadPublicSponsors('AlexBall03')).toEqual({ status: 'unavailable', reason: 'upstream' });
    github!.restore();

    serve(() => json({}, 403, { 'x-ratelimit-remaining': '0' }));
    expect(await loadPublicSponsors('AlexBall03')).toEqual({ status: 'unavailable', reason: 'rate-limited' });
    github!.restore();

    serve(() => json({ data: 'nonsense' }));
    expect(await loadPublicSponsors('AlexBall03')).toEqual({ status: 'unavailable', reason: 'invalid-response' });
  });

  it('caches a failure only briefly, and logs the kind without sponsor data or the token', async () => {
    serve(() => json({ message: 'Server Error' }, 500));
    await loadPublicSponsors('AlexBall03');
    expect(lives).toEqual([CACHE_LIFE.githubDegraded]);
    expect(logged).toEqual([['GitHub sponsors unavailable', { kind: 'upstream' }]]);
  });

  it('never throws, even when the network does', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('socket hang up'));
    await expect(loadPublicSponsors('AlexBall03')).resolves.toEqual({ status: 'unavailable', reason: 'upstream' });
    spy.mockRestore();
  });
});
