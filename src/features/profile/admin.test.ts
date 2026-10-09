import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { profile, profileRoles, siteSettings } from '@/db/schema';
import { content } from '@/db/seed/content';
import { seedContent } from '@/db/seed/seed';
import type { Database } from '@/db/types';
import { getSiteSettings } from '@/features/site/repository';
import { ADMIN_ID, OTHER_ID, stubAuthEnv } from '@/test/auth';
import { createTestDb } from '@/test/db';
import { getProfile, listHighlights, listProfileRoles, replaceProfileRoles } from './repository';

/**
 * The admin write path end to end, on a real (PGlite) database: Server Action
 * → requireAdmin → validation → service transaction → repository → updateTag.
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
vi.mock('next/cache', () => ({ updateTag: (tag: string) => tags.push(tag) }));
vi.mock('@/db/client', () => ({
  getDb: async () => testDb.db as Database,
  withTransaction: <T,>(run: (tx: Database) => Promise<T>) => (testDb.db as Database).transaction(run),
}));

const profileActions = await import('./mutations');
const siteActions = await import('@/features/site/mutations');
const service = await import('./service');
const siteService = await import('@/features/site/service');

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  testDb.db = db;
  await seedContent(db, content);
}, 60_000);
afterAll(() => close());

beforeEach(() => {
  stubAuthEnv();
  session.userId = ADMIN_ID;
  tags.length = 0;
});

const detailsWith = async (patch: (v: Awaited<ReturnType<typeof service.loadProfileDetails>>) => void) => {
  const values = await service.loadProfileDetails();
  patch(values);
  return values;
};

describe('authorization', () => {
  it.each([
    ['signed out', null],
    ['another user', OTHER_ID],
  ])('rejects %s as a 404 before validating or writing', async (_case, userId) => {
    session.userId = userId;
    const before = await db.select().from(siteSettings);
    const valid = await siteService.loadSiteSettings();
    for (const call of [
      () => siteActions.saveSiteSettings({ ...valid, brandMark: 'hacked' }),
      () => profileActions.saveProfileDetails({}),
      () => profileActions.saveProfileRoles({ items: [] }),
      () => profileActions.saveProfileHighlights({ differentiator: [], resume: [] }),
      () => profileActions.saveSnapshotMetrics({ items: [] }),
    ]) {
      await expect(call()).rejects.toThrow('404');
    }
    expect(await db.select().from(siteSettings)).toEqual(before);
    expect((await listProfileRoles(db)).length).toBeGreaterThan(0);
    expect(tags).toEqual([]);
  });
});

describe('profile details', () => {
  it('reports invalid input by path and writes nothing', async () => {
    const values = await detailsWith((v) => {
      v.email = 'not-an-email';
      v.title = '';
      v.addressCountry = 'USA';
    });
    const result = await profileActions.saveProfileDetails(values);
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.fieldErrors).sort()).toEqual(['addressCountry', 'email', 'title']);
    expect(tags).toEqual([]);
  });

  it('saves, records the author, and refreshes the profile tag', async () => {
    const values = await detailsWith((v) => {
      v.title = 'Software Engineer & Builder';
      v.addressRegion = '';
      v.addressCountry = 'us';
    });
    const result = await profileActions.saveProfileDetails(values);
    expect(result.ok).toBe(true);
    expect(result.ok && result.data.title).toBe('Software Engineer & Builder');
    expect(tags).toEqual(['profile']);

    const [row] = await db.select().from(profile);
    expect(row).toMatchObject({ updatedBy: ADMIN_ID, addressRegion: null, addressCountry: 'US' });
    expect((await getProfile(db))?.title).toBe('Software Engineer & Builder');
  });
});

describe('profile lists', () => {
  it('adds, removes, reorders, and hides roles in one save', async () => {
    const { items } = { items: await service.loadProfileRoles() };
    const [first, second, ...rest] = items;
    const added = {
      key: 'new-1',
      accent: 'gold' as const,
      visible: true,
      label: 'Mentor',
    };
    const next = [{ ...second!, visible: false }, added, first!];
    const result = await profileActions.saveProfileRoles({ items: next });
    expect(result.ok).toBe(true);
    expect(tags).toEqual(['profile']);

    const saved = result.ok ? result.data.items : [];
    expect(saved).toHaveLength(3);
    expect(saved.map((r) => r.label)).toEqual([second!.label, 'Mentor', first!.label]);
    expect(saved[1]!.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(saved[1]!.key).toBe(saved[1]!.id);

    // Public read: hidden excluded, order kept.
    expect(await listProfileRoles(db)).toEqual([
      { label: 'Mentor', accent: 'gold' },
      { label: first!.label, accent: first!.accent },
    ]);
    const [newRow] = await db.select().from(profileRoles).where(eq(profileRoles.id, saved[1]!.id!));
    expect(newRow).toMatchObject({ createdBy: ADMIN_ID, updatedBy: ADMIN_ID });
    expect(rest.every((r) => !saved.some((s) => s.id === r.id))).toBe(true);
  });

  it('keeps highlight kinds separate', async () => {
    const highlights = await service.loadProfileHighlights();
    const resumeBefore = await listHighlights(db, 'resume');
    const result = await profileActions.saveProfileHighlights({ ...highlights, differentiator: [] });
    expect(result.ok).toBe(true);
    expect(await listHighlights(db, 'differentiator')).toEqual([]);
    expect(await listHighlights(db, 'resume')).toEqual(resumeBefore);
  });

  it('validates metric icons against the icon set', async () => {
    const { items } = { items: await service.loadSnapshotMetrics() };
    const result = await profileActions.saveSnapshotMetrics({ items: [{ ...items[0]!, icon: 'not-an-icon' }] });
    expect(!result.ok && result.fieldErrors).toEqual({ 'items.0.icon': 'Choose an icon from the set' });
    expect(tags).toEqual([]);
  });

  it('runs a list save atomically', async () => {
    const before = await service.loadProfileRoles();
    await expect(
      db.transaction(async (tx) => {
        await replaceProfileRoles(tx, [], { userId: ADMIN_ID });
        throw new Error('fails after the write');
      }),
    ).rejects.toThrow('fails after the write');
    expect(await service.loadProfileRoles()).toEqual(before);
  });
});

describe('configuration', () => {
  it('saves site settings, stores a blank GitHub user as null, and refreshes the site tag', async () => {
    const values = await siteService.loadSiteSettings();
    const result = await siteActions.saveSiteSettings({ ...values, githubUsername: '  ', defaultTheme: 'light' });
    expect(result.ok).toBe(true);
    expect(tags).toEqual(['site']);
    expect(await getSiteSettings(db)).toMatchObject({ githubUsername: null, defaultTheme: 'light' });
    const [row] = await db.select().from(siteSettings);
    expect(row?.updatedBy).toBe(ADMIN_ID);
    expect(result.ok && result.data.githubUsername).toBe('');
  });

  it('rejects an invalid GitHub username', async () => {
    const values = await siteService.loadSiteSettings();
    const result = await siteActions.saveSiteSettings({ ...values, githubUsername: 'bad name!' });
    expect(!result.ok && result.fieldErrors).toEqual({ githubUsername: 'Not a valid GitHub username' });
    expect(tags).toEqual([]);
  });
});
