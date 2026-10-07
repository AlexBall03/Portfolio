import { describe, expect, it, vi } from 'vitest';
import { en } from '@/i18n/dictionaries/en';
import { es } from '@/i18n/dictionaries/es';
import type { GithubEvent, GithubRepo } from '@/integrations/github/schemas';
import { buildCalendar, calendarStart } from './calendar';
import { describeActivity, normalizeEvent } from './events';
import { getGithubOverview, summarizeRepos } from './overview';

vi.mock('next/cache', () => ({ cacheLife: () => {}, cacheTag: () => {} }));

describe('unconfigured integration', () => {
  it('reports a missing token once and returns an empty overview without calling GitHub', async () => {
    vi.stubEnv('GITHUB_TOKEN', '');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const overview = await getGithubOverview('AlexBall03');
      expect(overview).toMatchObject({ stats: null, repositories: null, activity: null, calendar: null });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toContain('GITHUB_TOKEN');
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
      warn.mockRestore();
      fetchSpy.mockRestore();
    }
  });
});

describe('contribution calendar', () => {
  // 2026-10-07 is a Wednesday.
  const today = '2026-10-07';

  it('starts on a Sunday exactly 25 weeks before the current week', () => {
    const start = calendarStart(today);
    expect(new Date(`${start}T00:00:00Z`).getUTCDay()).toBe(0);
    expect(start).toBe('2026-04-12');
  });

  it('produces 26 full weeks with weekday-aligned rows and future days padded', () => {
    const cal = buildCalendar([], today);
    expect(cal.weeks).toHaveLength(26);
    expect(cal.weeks.every((w) => w.length === 7)).toBe(true);
    for (const week of cal.weeks) {
      week.forEach((day, i) => {
        if (day) expect(new Date(`${day.date}T00:00:00Z`).getUTCDay()).toBe(i);
      });
    }
    const last = cal.weeks.at(-1)!;
    expect(last[3]?.date).toBe(today); // Wednesday
    expect(last.slice(4)).toEqual([null, null, null]);
  });

  it('fills counts from data and totals only the visible window', () => {
    const cal = buildCalendar(
      [
        { date: '2026-10-06', count: 3, level: 2 },
        { date: '2026-01-01', count: 99, level: 4 }, // outside the window
      ],
      today,
    );
    expect(cal.weeks.at(-1)![2]).toEqual({ date: '2026-10-06', count: 3, level: 2 });
    expect(cal.total).toBe(3);
  });
});

const event = (type: string, payload: GithubEvent['payload']): GithubEvent => ({
  type,
  payload,
  created_at: '2026-10-06T12:00:00Z',
  repo: { name: 'AlexBall03/Portfolio' },
});

describe('activity events', () => {
  it('describes pushes by branch now that commit counts are gone', () => {
    const a = normalizeEvent(event('PushEvent', { ref: 'refs/heads/dev' }))!;
    expect(describeActivity(a, en.github.events)).toBe('Pushed to dev');
    expect(describeActivity(a, es.github.events)).toBe('Hizo push a dev');
    expect(a.repositoryUrl).toBe('https://github.com/AlexBall03/Portfolio');
  });

  it('distinguishes merged pull requests and tolerates missing titles', () => {
    const merged = normalizeEvent(
      event('PullRequestEvent', { action: 'closed', number: 12, pull_request: { merged: true } }),
    )!;
    expect(describeActivity(merged, en.github.events)).toBe('Merged pull request: #12');
  });

  it('drops event types the portfolio does not show', () => {
    expect(normalizeEvent(event('WatchEvent', { action: 'started' }))).toBeNull();
    expect(normalizeEvent(event('CreateEvent', { ref_type: 'something-new' }))).toBeNull();
  });
});

describe('repository summary', () => {
  const repo = (name: string, overrides: Partial<GithubRepo> = {}): GithubRepo => ({
    name,
    full_name: `AlexBall03/${name}`,
    description: null,
    html_url: `https://github.com/AlexBall03/${name}`,
    language: 'TypeScript',
    stargazers_count: 1,
    forks_count: 1,
    fork: false,
    archived: false,
    pushed_at: '2026-10-01T00:00:00Z',
    ...overrides,
  });

  it('derives every stat from the same non-fork set', () => {
    const s = summarizeRepos([
      repo('a'),
      repo('b', { pushed_at: '2026-10-05T00:00:00Z', stargazers_count: 4 }),
      repo('forked', { fork: true, stargazers_count: 100 }),
    ]);
    expect(s.count).toBe(2);
    expect(s.stars).toBe(5);
    expect(s.repositories.map((r) => r.name)).toEqual(['b', 'a']);
  });
});
