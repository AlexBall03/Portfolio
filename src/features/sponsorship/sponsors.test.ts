import { describe, expect, it } from 'vitest';
import { sponsorshipPayload } from '@/test/github';
import { sponsorshipSettingsInput } from './schema';
import { normalizeSponsors, previewOf, sortSponsors, sponsorLogin, sponsorshipVisibility, visibleSponsors } from './sponsors';
import { DEFAULT_SPONSORSHIP_SETTINGS, type Sponsor } from './types';

const sponsor = (id: number, login: string, over: Partial<Sponsor> = {}): Sponsor => ({
  id,
  login,
  name: null,
  avatarUrl: `https://avatars.githubusercontent.com/u/${id}`,
  url: `https://github.com/${login}`,
  kind: 'user',
  since: null,
  ...over,
});

const logins = (list: readonly Sponsor[]) => list.map((s) => s.login);

describe('normalizeSponsors', () => {
  it('keeps only active, explicitly public sponsorships', () => {
    const sponsors = normalizeSponsors([
      sponsorshipPayload(1, 'public-user'),
      sponsorshipPayload(2, 'private-user', { privacyLevel: 'PRIVATE' }),
      sponsorshipPayload(3, 'unknown-privacy', { privacyLevel: 'SOMETHING_NEW' }),
      sponsorshipPayload(4, 'lapsed', { isActive: false }),
    ]);
    expect(logins(sponsors)).toEqual(['public-user']);
  });

  it('maps presentation fields only, and one entry per account', () => {
    const [org, ...rest] = normalizeSponsors([
      sponsorshipPayload(9, 'acme', { createdAt: '2026-03-01T00:00:00Z' }, { __typename: 'Organization', name: ' Acme Inc ' }),
      sponsorshipPayload(9, 'acme'),
    ]);
    expect(rest).toEqual([]);
    expect(org).toEqual({
      id: 9,
      login: 'acme',
      name: 'Acme Inc',
      avatarUrl: 'https://avatars.githubusercontent.com/u/9',
      url: 'https://github.com/acme',
      kind: 'organization',
      since: '2026-03-01T00:00:00Z',
    });
  });

  it('never invents a date', () => {
    const [missing, invalid] = normalizeSponsors([
      sponsorshipPayload(1, 'a', { createdAt: null }),
      sponsorshipPayload(2, 'b', { createdAt: 'not a date' }),
    ]);
    expect(missing!.since).toBeNull();
    expect(invalid!.since).toBeNull();
  });
});

describe('hidden sponsors', () => {
  const list = [sponsor(1, 'one'), sponsor(2, 'two'), sponsor(3, 'three')];

  it('excludes hidden accounts by stable id, whatever their login is now', () => {
    const shown = visibleSponsors(list, [{ githubId: 2, login: 'old-name' }]);
    expect(logins(shown)).toEqual(['one', 'three']);
    // The displayed count is the length of this list, so hidden sponsors are never counted.
    expect(shown).toHaveLength(2);
  });

  it('is reversible: nothing hidden shows everyone', () => {
    expect(visibleSponsors(list, [])).toEqual(list);
  });
});

describe('sortSponsors', () => {
  const list = [
    sponsor(1, 'zed', { since: '2026-01-10T00:00:00Z' }),
    sponsor(2, 'amy', { name: 'Amy', since: '2026-05-01T00:00:00Z' }),
    sponsor(3, 'undated-b'),
    sponsor(4, 'bob', { name: 'bob', since: '2025-11-30T00:00:00Z' }),
    sponsor(5, 'undated-a'),
  ];

  it('orders newest first, undated sponsorships last', () => {
    expect(logins(sortSponsors(list, 'newest'))).toEqual(['amy', 'zed', 'bob', 'undated-a', 'undated-b']);
  });

  it('orders oldest first, undated sponsorships still last', () => {
    expect(logins(sortSponsors(list, 'oldest'))).toEqual(['bob', 'zed', 'amy', 'undated-a', 'undated-b']);
  });

  it('orders alphabetically by display name, ignoring case', () => {
    expect(logins(sortSponsors(list, 'alphabetical'))).toEqual(['amy', 'bob', 'undated-a', 'undated-b', 'zed']);
  });

  it('does not reorder its input', () => {
    sortSponsors(list, 'alphabetical');
    expect(list[0]!.login).toBe('zed');
  });
});

describe('previewOf', () => {
  const list = [sponsor(1, 'a'), sponsor(2, 'b'), sponsor(3, 'c')];

  it('shows up to the limit and counts the rest', () => {
    expect(previewOf(list, 2)).toEqual({ shown: list.slice(0, 2), more: 1 });
    expect(previewOf(list, 8)).toEqual({ shown: list, more: 0 });
    expect(previewOf([], 8)).toEqual({ shown: [], more: 0 });
  });
});

describe('sponsorshipVisibility', () => {
  const all = { enabled: true, showHomeSection: true, supportPageEnabled: true, showSponsors: true };

  it('follows each switch while sponsorship is on', () => {
    expect(sponsorshipVisibility(all)).toEqual({ home: true, supportPage: true, sponsors: true });
    expect(sponsorshipVisibility({ ...all, showHomeSection: false })).toEqual({ home: false, supportPage: true, sponsors: true });
    expect(sponsorshipVisibility({ ...all, supportPageEnabled: false, showSponsors: false })).toEqual({
      home: true,
      supportPage: false,
      sponsors: false,
    });
  });

  it('turns everything off with the master switch', () => {
    expect(sponsorshipVisibility({ ...all, enabled: false })).toEqual({ home: false, supportPage: false, sponsors: false });
  });
});

describe('settings validation', () => {
  const valid = { ...DEFAULT_SPONSORSHIP_SETTINGS };
  const errorPaths = (input: unknown) => {
    const parsed = sponsorshipSettingsInput.safeParse(input);
    return parsed.success ? [] : parsed.error.issues.map((i) => i.path.join('.'));
  };

  it('accepts the defaults', () => {
    expect(errorPaths(valid)).toEqual([]);
  });

  it('only accepts a GitHub Sponsors address as the destination', () => {
    expect(sponsorLogin('https://github.com/sponsors/AlexBall03')).toBe('AlexBall03');
    expect(sponsorLogin('https://github.com/sponsors/AlexBall03/')).toBe('AlexBall03');
    for (const sponsorsUrl of [
      'https://github.com/AlexBall03',
      'http://github.com/sponsors/AlexBall03',
      'https://github.com.evil.example/sponsors/AlexBall03',
      'https://github.com/sponsors/AlexBall03/../../x',
      'javascript:alert(1)',
      '',
    ]) {
      expect(sponsorLogin(sponsorsUrl), sponsorsUrl).toBeNull();
      expect(errorPaths({ ...valid, sponsorsUrl }), sponsorsUrl).toEqual(['sponsorsUrl']);
    }
  });

  it('bounds the preview limit and takes a number input as text', () => {
    const parsed = sponsorshipSettingsInput.parse({ ...valid, homeSponsorLimit: '12' });
    expect(parsed.homeSponsorLimit).toBe(12);
    for (const homeSponsorLimit of [0, 25, 2.5, '', 'many']) {
      expect(errorPaths({ ...valid, homeSponsorLimit }), String(homeSponsorLimit)).toEqual(['homeSponsorLimit']);
    }
  });

  it('requires the copy, an allowed order, and real account ids', () => {
    expect(
      errorPaths({
        ...valid,
        heading: ' ',
        ctaLabel: 'x'.repeat(41),
        sponsorSort: 'richest',
        hiddenSponsors: [{ githubId: -1, login: 'x' }],
        supportItems: [{ title: '', body: 'b' }],
      }).sort(),
    ).toEqual(['ctaLabel', 'heading', 'hiddenSponsors.0.githubId', 'sponsorSort', 'supportItems.0.title']);
  });

  it('stores one hidden entry per account', () => {
    const parsed = sponsorshipSettingsInput.parse({
      ...valid,
      hiddenSponsors: [
        { githubId: 7, login: 'seven' },
        { githubId: 7, login: 'seven-renamed' },
      ],
    });
    expect(parsed.hiddenSponsors).toEqual([{ githubId: 7, login: 'seven' }]);
  });
});
