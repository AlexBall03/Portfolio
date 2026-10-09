import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { pageContent, sectionContent, socialLinks } from '@/db/schema';
import { content } from '@/db/seed/content';
import { seedContent } from '@/db/seed/seed';
import type { Database } from '@/db/types';
import { listSocialLinks } from '@/features/profile/repository';
import { ADMIN_ID, OTHER_ID, stubAuthEnv } from '@/test/auth';
import { createTestDb } from '@/test/db';
import { getPageContent, getSectionContent } from './repository';

/**
 * Page content, Contact, and Social links editors end to end on PGlite:
 * Server Action → requireAdmin → validation → service → repository → updateTag.
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

const actions = await import('./mutations');
const service = await import('./service');
const profileActions = await import('@/features/profile/mutations');
const profileService = await import('@/features/profile/service');

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

describe('authorization', () => {
  it.each([
    ['signed out', null],
    ['another user', OTHER_ID],
  ])('rejects %s as a 404 before validating or writing', async (_case, userId) => {
    session.userId = userId;
    const [sections, links] = [await db.select().from(sectionContent), await db.select().from(socialLinks)];
    for (const call of [
      () => actions.savePageCopy({ page: 'about' }),
      () => actions.saveContactCopy({}),
      () => profileActions.saveSocialLinks({ items: [] }),
    ]) {
      await expect(call()).rejects.toThrow('404');
    }
    expect(await db.select().from(sectionContent)).toEqual(sections);
    expect(await db.select().from(socialLinks)).toEqual(links);
    expect(tags).toEqual([]);
  });
});

describe('page content', () => {
  it('loads only the sections the page editor owns', async () => {
    expect(Object.keys((await service.loadPageCopy('about')).sections)).toEqual(['snapshot', 'about', 'stack']);
    expect((await service.loadPageCopy('contact')).sections).toEqual({});
    expect(Object.keys((await service.loadPageCopy('home')).sections)).toEqual(['featured', 'toolkit', 'cta']);
  });

  it('validates by path and refuses sections owned elsewhere', async () => {
    const values = await service.loadPageCopy('about');
    values.seo.seoDescription = '';
    values.sections.stack!.title = '';
    const result = await actions.savePageCopy(values);
    expect(!result.ok && Object.keys(result.fieldErrors).sort()).toEqual(['sections.stack.title', 'seo.seoDescription']);

    const contact = await service.loadPageCopy('contact');
    const intruder = await actions.savePageCopy({ ...contact, sections: { contact: await service.loadContactCopy() } });
    expect(!intruder.ok && Object.keys(intruder.fieldErrors)).toEqual(['sections.contact']);
    expect(tags).toEqual([]);
  });

  it('saves SEO and section copy and refreshes the site tag', async () => {
    const values = await service.loadPageCopy('about');
    values.seo.seoTitle = '';
    values.sections.about!.aside = 'Off the clock';

    const result = await actions.savePageCopy(values);
    expect(result.ok).toBe(true);
    expect(tags).toEqual(['site']);

    expect((await getSectionContent(db)).about?.aside).toBe('Off the clock');
    expect((await getPageContent(db, 'about'))?.seoTitle).toBeNull();

    const [row] = await db.select().from(sectionContent).where(eq(sectionContent.sectionKey, 'about'));
    expect(row).toMatchObject({ updatedBy: ADMIN_ID, subtitle: expect.any(String), body: null });
    const [seo] = await db.select().from(pageContent).where(eq(pageContent.pageKey, 'about'));
    expect(seo?.updatedBy).toBe(ADMIN_ID);
  });

  it('creates a section row on first save (a section added after the database was seeded)', async () => {
    await db.delete(sectionContent).where(eq(sectionContent.sectionKey, 'cta'));
    const values = await service.loadPageCopy('home');
    expect(values.sections.cta).toEqual({ eyebrow: '', title: '', subtitle: '', body: '', aside: '' });
    values.sections.cta = { eyebrow: 'Next', title: 'Say hello', subtitle: '', body: '', aside: '' };
    const result = await actions.savePageCopy(values);
    expect(result.ok).toBe(true);
    expect((await getSectionContent(db)).cta).toMatchObject({ eyebrow: 'Next', title: 'Say hello', subtitle: null });
  });

  it('lists every page and whether its search copy exists', async () => {
    const pages = await service.listPageCopy();
    expect(pages.map((p) => p.page)).toEqual(['home', 'about', 'projects', 'experience', 'resume', 'contact']);
    expect(pages.every((p) => p.complete)).toBe(true);
  });
});

describe('contact copy', () => {
  it('saves the contact section heading and introduction', async () => {
    const values = await service.loadContactCopy();
    values.body = 'Write to me.';
    values.title = '';
    const invalid = await actions.saveContactCopy(values);
    expect(!invalid.ok && invalid.fieldErrors).toEqual({ title: 'Required' });

    values.title = "Let's talk";
    const result = await actions.saveContactCopy(values);
    expect(result.ok).toBe(true);
    expect(tags).toEqual(['site']);
    expect((await getSectionContent(db)).contact).toMatchObject({ title: "Let's talk", body: 'Write to me.' });
  });
});

describe('social links', () => {
  it('rejects unsafe or invalid URLs and unknown platforms', async () => {
    const { items } = { items: await profileService.loadSocialLinks() };
    const bad = [
      { ...items[0]!, url: 'javascript:alert(1)' },
      { ...items[1]!, url: 'mailto:me@example.com' },
      { ...items[0]!, id: undefined, key: 'x', platform: 'myspace' },
    ];
    const result = await profileActions.saveSocialLinks({ items: bad });
    expect(!result.ok && Object.keys(result.fieldErrors).sort()).toEqual(['items.0.url', 'items.1.url', 'items.2.platform']);
    expect(tags).toEqual([]);
  });

  it('reorders, hides, adds, and removes; public reads follow', async () => {
    const items = await profileService.loadSocialLinks();
    const [first, second, ...rest] = items;
    const next = [
      { ...second!, handle: '' },
      { ...first!, visible: false },
      ...rest.slice(1),
      { key: 'new-1', platform: 'website' as const, label: 'Blog', url: 'https://blog.example.com', handle: '', visible: true },
    ];
    const result = await profileActions.saveSocialLinks({ items: next });
    expect(result.ok).toBe(true);
    expect(tags).toEqual(['profile']);

    const publicLinks = await listSocialLinks(db);
    expect(publicLinks.map((l) => l.label)).toEqual([second!.label, ...rest.slice(1).map((l) => l.label), 'Blog']);
    expect(publicLinks[0]!.handle).toBeNull();
    const [blog] = await db.select().from(socialLinks).where(eq(socialLinks.label, 'Blog'));
    expect(blog).toMatchObject({ createdBy: ADMIN_ID, updatedBy: ADMIN_ID });
  });
});
