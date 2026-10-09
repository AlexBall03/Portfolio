import { describe, expect, it } from 'vitest';
import { activityPayload, commitPayload, contributorPayload, releasePayload, repoPayload } from '@/test/github';
import { monthlyTotals } from './components/ActivityChart';
import {
  aggregateProjectGithub,
  normalizeActivity,
  normalizeContributors,
  normalizeReleases,
  normalizeRepoCommit,
  normalizeRepository,
} from './project-analytics';
import type { RepoAnalytics, RepoMetadata } from './types';

/** The aggregation rules behind every number on a project's GitHub section. */

function meta(id: number, fullName: string, over: Partial<RepoMetadata> = {}): RepoMetadata {
  const result = normalizeRepository(repoPayload({ id, full_name: fullName }));
  if (result.state !== 'public') throw new Error('expected public');
  return { ...result.repo, ...over };
}

function repo(id: number, fullName: string, over: Partial<RepoAnalytics> = {}): RepoAnalytics {
  return {
    repo: meta(id, fullName),
    label: null,
    isPrimary: false,
    commits: [],
    activity: { status: 'ok', weeks: [] },
    languages: {},
    contributors: [],
    releases: { items: [], capped: false },
    ...over,
  };
}

const commits = (fullName: string, list: [string, string][]) =>
  list.map(([sha, date]) => normalizeRepoCommit(commitPayload(sha, date), fullName)!);

describe('normalization', () => {
  it('turns a private or internal repository into a contentless state', () => {
    expect(normalizeRepository(repoPayload({ id: 1, full_name: 'a/secret', private: true }))).toEqual({ state: 'private' });
    expect(normalizeRepository(repoPayload({ id: 1, full_name: 'a/corp', private: false, visibility: 'internal' }))).toEqual({
      state: 'private',
    });
    const legacy = repoPayload({ id: 1, full_name: 'a/b' });
    delete (legacy as Partial<typeof legacy>).visibility;
    expect(normalizeRepository(legacy).state).toBe('public');
  });

  it('keeps only published releases, newest first, and flags a full page', () => {
    const list = [
      releasePayload(1, 'v1.0.0', '2026-01-10T00:00:00Z'),
      releasePayload(2, 'v2.0.0-draft', null, { draft: true }),
      releasePayload(3, 'v1.1.0', '2026-03-10T00:00:00Z', { prerelease: true }),
    ];
    const { items, capped } = normalizeReleases(list, 'a/b');
    expect(items.map((r) => r.tag)).toEqual(['v1.1.0', 'v1.0.0']);
    expect(items[0]!.prerelease).toBe(true);
    expect(capped).toBe(false);
    const full = Array.from({ length: 100 }, (_, i) => releasePayload(i, `v${i}`, '2026-01-01T00:00:00Z'));
    expect(normalizeReleases(full, 'a/b').capped).toBe(true);
  });

  it('drops bots from contributors', () => {
    const list = normalizeContributors([contributorPayload(1, 'alex', 40), contributorPayload(2, 'dependabot[bot]', 9, 'Bot')]);
    expect(list.map((c) => c.login)).toEqual(['alex']);
  });

  it('keys activity weeks by their Sunday in UTC and keeps the first line of commit messages', () => {
    expect(normalizeActivity(activityPayload([['2026-09-27', 2], ['2026-09-20', 1]]))).toEqual([
      { week: '2026-09-20', count: 1 },
      { week: '2026-09-27', count: 2 },
    ]);
    expect(normalizeRepoCommit(commitPayload('abc', '2026-10-01T00:00:00Z', 'Fix bug\n\nLong body'), 'a/b')?.message).toBe('Fix bug');
    expect(normalizeRepoCommit({ ...commitPayload('abc', 'x'), commit: { message: 'm', author: null, committer: null } }, 'a/b')).toBeNull();
  });
});

describe('aggregateProjectGithub', () => {
  it('has nothing to show when no public repository loaded, and never reports zeros for that', () => {
    const result = aggregateProjectGithub([], 2);
    expect(result).toMatchObject({ status: 'unavailable', unavailable: 2, stars: null, forks: null, activity: null, commits: null });
  });

  it('counts each repository once (by GitHub id) and sums stars and forks', () => {
    const a = repo(1, 'x/a', { repo: meta(1, 'x/a', { stars: 5, forks: 2 }) });
    const b = repo(2, 'x/b', { repo: meta(2, 'x/b', { stars: 3, forks: 1 }) });
    const renamed = repo(1, 'x/a-old', { repo: meta(1, 'x/a-old', { stars: 5, forks: 2 }) });
    const result = aggregateProjectGithub([a, b, renamed], 0);
    expect(result.repositories.map((r) => r.fullName)).toEqual(['x/a', 'x/b']);
    expect(result).toMatchObject({ stars: 8, forks: 3, status: 'ok' });
  });

  it('deduplicates contributors by GitHub identity across repositories', () => {
    const a = repo(1, 'x/a', { contributors: normalizeContributors([contributorPayload(10, 'alex', 30), contributorPayload(11, 'sam', 5)]) });
    const b = repo(2, 'x/b', { contributors: normalizeContributors([contributorPayload(10, 'alex', 12), contributorPayload(12, 'kim', 8)]) });
    const { contributors } = aggregateProjectGithub([a, b], 0);
    expect(contributors?.total).toBe(3);
    expect(contributors?.top.map((c) => [c.login, c.contributions])).toEqual([
      ['alex', 42],
      ['kim', 8],
      ['sam', 5],
    ]);
  });

  it('sums language bytes before computing shares', () => {
    // Per-repository percentages would average to 50% TypeScript; by bytes it is 10%.
    const a = repo(1, 'x/a', { languages: { TypeScript: 100 } });
    const b = repo(2, 'x/b', { languages: { Python: 900 } });
    const { languages } = aggregateProjectGithub([a, b], 0);
    expect(languages?.items).toEqual([
      { name: 'Python', bytes: 900, share: 0.9 },
      { name: 'TypeScript', bytes: 100, share: 0.1 },
    ]);
    expect(languages?.otherShare).toBeCloseTo(0);
  });

  it('folds languages past the top six into Other', () => {
    const many = Object.fromEntries(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((n, i) => [n, 80 - i * 10]));
    const { languages } = aggregateProjectGithub([repo(1, 'x/a', { languages: many })], 0);
    expect(languages?.items.map((l) => l.name)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(languages?.otherShare).toBeCloseTo(30 / 360);
  });

  it('sums activity only over the weeks every repository reports', () => {
    // b's statistics were computed a week later: its window starts and ends one week on.
    const a = repo(1, 'x/a', { activity: { status: 'ok', weeks: [{ week: '2026-09-13', count: 4 }, { week: '2026-09-20', count: 1 }] } });
    const b = repo(2, 'x/b', { activity: { status: 'ok', weeks: [{ week: '2026-09-20', count: 2 }, { week: '2026-09-27', count: 7 }] } });
    const result = aggregateProjectGithub([a, b], 0);
    expect(result.activity).toMatchObject({ weeks: [{ week: '2026-09-20', count: 3 }], total: 3, covered: 2, of: 2, pending: 0 });
    expect(result.repositories.map((r) => r.periodCommits)).toEqual([1, 2]);
  });

  it('does not let an empty repository narrow the period', () => {
    const a = repo(1, 'x/a', { activity: { status: 'ok', weeks: [{ week: '2026-09-20', count: 5 }] } });
    const empty = repo(2, 'x/empty', { activity: { status: 'ok', weeks: [] } });
    const result = aggregateProjectGithub([a, empty], 0);
    expect(result.activity?.total).toBe(5);
    expect(result.repositories.map((r) => r.periodCommits)).toEqual([5, 0]);
  });

  it('reports pending statistics and partial coverage instead of zeros', () => {
    const a = repo(1, 'x/a', { activity: { status: 'ok', weeks: [{ week: '2026-09-20', count: 5 }] } });
    const b = repo(2, 'x/b', { activity: { status: 'pending' }, languages: null });
    const result = aggregateProjectGithub([a, b], 0);
    expect(result.status).toBe('partial');
    expect(result.activity).toMatchObject({ total: 5, covered: 1, of: 2, pending: 1 });
    expect(result.languages).toBeNull(); // a's {} has no bytes; b failed: nothing to show
    expect(result.repositories[1]!.periodCommits).toBeNull();
  });

  it('merges commits newest first, once per SHA, keeping their repository', () => {
    const a = repo(1, 'x/a', { commits: commits('x/a', [['s1', '2026-10-01T10:00:00Z'], ['s2', '2026-09-01T10:00:00Z']]) });
    const mirror = repo(2, 'x/mirror', { commits: commits('x/mirror', [['s1', '2026-10-01T10:00:00Z'], ['s3', '2026-10-05T10:00:00Z']]) });
    const result = aggregateProjectGithub([a, mirror], 0);
    expect(result.commits?.map((c) => [c.sha, c.repository])).toEqual([
      ['s3', 'x/mirror'],
      ['s1', 'x/a'],
      ['s2', 'x/a'],
    ]);
  });

  it('dates the last activity by the newest commit or release', () => {
    const a = repo(1, 'x/a', {
      commits: commits('x/a', [['s1', '2026-09-01T00:00:00Z']]),
      releases: normalizeReleases([releasePayload(1, 'v1', '2026-09-15T00:00:00Z')], 'x/a'),
    });
    expect(aggregateProjectGithub([a], 0).lastActivityAt).toBe('2026-09-15T00:00:00Z');
  });

  it('counts releases across repositories and carries the cap', () => {
    const a = repo(1, 'x/a', { releases: normalizeReleases([releasePayload(1, 'v1', '2026-01-01T00:00:00Z')], 'x/a') });
    const b = repo(2, 'x/b', { releases: { items: [], capped: true } });
    expect(aggregateProjectGithub([a, b], 0).releases).toMatchObject({ count: 1, capped: true, covered: 2, of: 2 });
  });

  it('marks the result partial when a repository is unavailable, without naming it', () => {
    const result = aggregateProjectGithub([repo(1, 'x/a')], 1);
    expect(result).toMatchObject({ status: 'partial', unavailable: 1 });
    expect(JSON.stringify(result)).not.toContain('secret');
  });
});

describe('activity table view', () => {
  it('groups weeks by the month of their Sunday', () => {
    expect(
      monthlyTotals([
        { week: '2026-08-30', count: 1 },
        { week: '2026-09-06', count: 2 },
        { week: '2026-09-13', count: 3 },
      ]),
    ).toEqual([
      { month: '2026-08', count: 1 },
      { month: '2026-09', count: 5 },
    ]);
  });
});
