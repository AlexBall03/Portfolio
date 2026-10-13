import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sponsorshipSettings } from '@/db/schema';
import type { Database } from '@/db/types';
import { ADMIN_ID, OTHER_ID, stubAuthEnv } from '@/test/auth';
import { createTestDb } from '@/test/db';
import { json, mockGithub, sponsorshipPayload, sponsorshipsPage } from '@/test/github';
import { DEFAULT_SPONSORSHIP_SETTINGS } from './types';

/**
 * The sponsorship write path end to end, on a real (PGlite) database: Server
 * Action → requireAdmin → validation → service → repository → updateTag, and
 * what the public reads make of the stored settings.
 */

const session = vi.hoisted(() => ({ userId: null as string | null }));
const tags = vi.hoisted(() => [] as string[]);
const testDb = vi.hoisted(() => ({ db: undefined as unknown }));

vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: session.userId }), currentUser: async () => null }));
vi.mock('next/server', () => ({ connection: async () => {} }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_HTTP_ERROR_FALLBACK;404');
  },
  unstable_rethrow: () => {},
}));
vi.mock('next/cache', () => ({ updateTag: (tag: string) => tags.push(tag), cacheLife: () => {}, cacheTag: () => {} }));
vi.mock('@/db/client', () => ({
  getDb: async () => testDb.db as Database,
  withTransaction: <T,>(run: (tx: Database) => Promise<T>) => (testDb.db as Database).transaction(run),
}));

const actions = await import('./mutations');
const service = await import('./service');
const queries = await import('./queries');

let db: Database;
let close: () => Promise<void>;
let github: ReturnType<typeof mockGithub> | undefined;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  testDb.db = db;
}, 60_000);
afterAll(() => close());

beforeEach(() => {
  stubAuthEnv();
  vi.stubEnv('GITHUB_TOKEN', 'test-token');
  session.userId = ADMIN_ID;
  tags.length = 0;
  github?.restore();
  github = mockGithub(() =>
    json(
      sponsorshipsPage([
        sponsorshipPayload(1, 'zed', { createdAt: '2026-01-01T00:00:00Z' }),
        sponsorshipPayload(2, 'amy', { createdAt: '2026-05-01T00:00:00Z' }),
        sponsorshipPayload(3, 'secret', { privacyLevel: 'PRIVATE' }),
      ]),
    ),
  );
});

const rows = () => db.select().from(sponsorshipSettings);

describe('before the first save', () => {
  it('uses the defaults, with no row and no open-source claim', async () => {
    expect(await rows()).toEqual([]);
    const { supportItems, ...settings } = await service.loadSponsorshipSettings();
    expect(settings).toMatchObject({ enabled: true, sponsorsUrl: 'https://github.com/sponsors/AlexBall03' });
    expect(supportItems.map((i) => i.title)).toEqual(DEFAULT_SPONSORSHIP_SETTINGS.supportItems.map((i) => i.title));
    expect(JSON.stringify(DEFAULT_SPONSORSHIP_SETTINGS)).not.toMatch(/open[- ]source/i);
    expect(await queries.getSponsorshipSettings()).toEqual(DEFAULT_SPONSORSHIP_SETTINGS);
  });
});

describe('authorization', () => {
  it.each([
    ['signed out', null],
    ['another user', OTHER_ID],
  ])('rejects %s as a 404 before validating, writing, or refreshing', async (_case, userId) => {
    session.userId = userId;
    const valid = await service.loadSponsorshipSettings();
    await expect(actions.saveSponsorshipSettings({ ...valid, heading: 'hacked' })).rejects.toThrow('404');
    await expect(actions.saveSponsorshipSettings({})).rejects.toThrow('404');
    await expect(actions.refreshSponsors({})).rejects.toThrow('404');
    expect(await rows()).toEqual([]);
    expect(tags).toEqual([]);
  });
});

describe('saving', () => {
  it('reports invalid input by path and writes nothing', async () => {
    const valid = await service.loadSponsorshipSettings();
    const result = await actions.saveSponsorshipSettings({
      ...valid,
      sponsorsUrl: 'https://example.com/sponsors/AlexBall03',
      homeSponsorLimit: 99,
      ctaLabel: '',
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.fieldErrors).sort()).toEqual(['ctaLabel', 'homeSponsorLimit', 'sponsorsUrl']);
    expect(await rows()).toEqual([]);
    expect(tags).toEqual([]);
  });

  it('creates the row, records the author, and refreshes the sponsorship tag', async () => {
    const valid = await service.loadSponsorshipSettings();
    const result = await actions.saveSponsorshipSettings({
      ...valid,
      heading: '  Back my work  ',
      homeSponsorLimit: '4',
      sponsorSort: 'alphabetical',
      supportItems: [{ key: 'new-1', title: 'Hosting', body: 'Servers and domains.' }],
    });
    expect(result.ok).toBe(true);
    expect(result.ok && result.data).toMatchObject({
      heading: 'Back my work',
      homeSponsorLimit: 4,
      supportItems: [{ key: 'item-0', title: 'Hosting', body: 'Servers and domains.' }],
    });
    expect(tags).toEqual(['sponsorship']);

    const [row, ...rest] = await rows();
    expect(rest).toEqual([]);
    expect(row).toMatchObject({ id: 1, createdBy: ADMIN_ID, updatedBy: ADMIN_ID, sponsorSort: 'alphabetical' });
    expect(row!.supportItems).toEqual([{ title: 'Hosting', body: 'Servers and domains.' }]);
  });

  it('updates the same row on later saves', async () => {
    const values = await service.loadSponsorshipSettings();
    const result = await actions.saveSponsorshipSettings({ ...values, ctaLabel: 'Become a sponsor' });
    expect(result.ok && result.data.ctaLabel).toBe('Become a sponsor');
    expect(await rows()).toHaveLength(1);
    expect((await queries.getSponsorshipSettings()).ctaLabel).toBe('Become a sponsor');
  });
});

describe('the public sponsor list', () => {
  const save = async (patch: Record<string, unknown>) => {
    const result = await actions.saveSponsorshipSettings({ ...(await service.loadSponsorshipSettings()), ...patch });
    expect(result.ok).toBe(true);
  };
  const shown = async () => {
    const list = await queries.getSponsorList();
    return list.state === 'ok' ? list.sponsors.map((s) => s.login) : list.state;
  };

  it('lists public sponsors only, in the configured order', async () => {
    await save({ enabled: true, showSponsors: true, hiddenSponsors: [], sponsorSort: 'newest' });
    expect(await shown()).toEqual(['amy', 'zed']);
    await save({ sponsorSort: 'oldest' });
    expect(await shown()).toEqual(['zed', 'amy']);
  });

  it('keeps a hidden sponsor out until they are shown again', async () => {
    await save({ hiddenSponsors: [{ githubId: 1, login: 'zed' }] });
    expect(await shown()).toEqual(['amy']);
    // Stored, so it survives every later read of GitHub.
    expect((await rows())[0]!.hiddenSponsors).toEqual([{ githubId: 1, login: 'zed' }]);
    expect(await shown()).toEqual(['amy']);
    await save({ hiddenSponsors: [] });
    expect(await shown()).toEqual(['zed', 'amy']);
  });

  it('is disabled by the list switch or the master switch, without asking GitHub', async () => {
    await save({ showSponsors: false });
    github!.calls.length = 0;
    expect(await shown()).toBe('disabled');
    await save({ showSponsors: true, enabled: false });
    expect(await shown()).toBe('disabled');
    expect(github!.calls).toEqual([]);
    await save({ enabled: true });
  });

  it('reports a GitHub failure as unavailable, never as an empty list', async () => {
    github!.restore();
    github = mockGithub(() => json({ message: 'Server Error' }, 503));
    expect(await shown()).toBe('unavailable');
    github.restore();
    github = mockGithub(() => json(sponsorshipsPage([])));
    expect(await shown()).toEqual([]);
  });
});

describe('refresh', () => {
  it('expires the sponsorship cache and writes nothing', async () => {
    const before = await rows();
    const result = await actions.refreshSponsors({});
    expect(result.ok).toBe(true);
    expect(tags).toEqual(['sponsorship']);
    expect(await rows()).toEqual(before);
  });
});
