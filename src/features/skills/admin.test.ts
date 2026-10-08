import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { skillCategories, technologies } from '@/db/schema';
import { content } from '@/db/seed/content';
import { seedContent } from '@/db/seed/seed';
import type { Database } from '@/db/types';
import { ADMIN_ID, OTHER_ID, stubAuthEnv } from '@/test/auth';
import { createTestDb } from '@/test/db';
import { getSkillsOverview } from './repository';

/**
 * The Skills admin write path end to end on PGlite: Server Action →
 * requireAdmin → validation → service transaction → repository → updateTag.
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
    const before = await db.select().from(skillCategories);
    await expect(actions.saveSkillCategories({ stack: [], learning: [] })).rejects.toThrow('404');
    await expect(actions.saveTechnologies({ items: [] })).rejects.toThrow('404');
    expect(await db.select().from(skillCategories)).toEqual(before);
    expect(tags).toEqual([]);
  });
});

describe('skill categories', () => {
  it('reports invalid input by path', async () => {
    const values = await service.loadSkillCategories();
    values.stack[0]!.icon = '<svg onload=alert(1)>';
    values.stack[0]!.technologies = [];
    values.learning[0]!.slug = values.stack[1]!.slug;
    const result = await actions.saveSkillCategories(values);
    expect(!result.ok && Object.keys(result.fieldErrors).sort()).toEqual([
      'learning.0.slug',
      'stack.0.icon',
      'stack.0.technologies',
    ]);
    expect(tags).toEqual([]);
  });

  it('reorders, renames slugs (even swapped), adds technologies, hides, and records the author', async () => {
    const values = await service.loadSkillCategories();
    const [first, second, ...rest] = values.stack;
    const [a, b] = [first!.slug, second!.slug];
    const reordered = [{ ...second!, slug: a }, { ...first!, slug: b, visible: false }, ...rest];
    reordered[0]!.technologies = [...reordered[0]!.technologies, { key: 'zig', slug: 'zig', name: 'Zig' }];
    reordered[0]!.translations.es = { name: '' };

    const result = await actions.saveSkillCategories({ ...values, stack: reordered });
    expect(result.ok).toBe(true);
    expect(tags).toEqual(['skills']);

    const saved = await service.loadSkillCategories();
    expect(saved.stack.map((c) => c.id)).toEqual(reordered.map((c) => c.id));
    expect(saved.stack[0]).toMatchObject({ slug: a });
    expect(saved.stack[0]!.technologies.at(-1)).toMatchObject({ slug: 'zig', name: 'Zig' });

    const en = await getSkillsOverview(db, 'en');
    const es = await getSkillsOverview(db, 'es');
    expect(en.stack.map((c) => c.slug)).not.toContain(b); // hidden
    expect(es.stack[0]!.name).toBe(en.stack[0]!.name); // Spanish cleared → English fallback

    const [row] = await db.select().from(skillCategories).where(eq(skillCategories.id, reordered[0]!.id!));
    expect(row).toMatchObject({ updatedBy: ADMIN_ID, status: 'published', sortOrder: 0 });
    const [zig] = await db.select().from(technologies).where(eq(technologies.slug, 'zig'));
    expect(zig).toMatchObject({ name: 'Zig', createdBy: ADMIN_ID });
  });

  it('adds and removes categories', async () => {
    const values = await service.loadSkillCategories();
    const result = await actions.saveSkillCategories({
      stack: values.stack.slice(1),
      learning: [
        ...values.learning,
        {
          key: 'new-1',
          slug: 'systems',
          icon: 'cube',
          accent: 'gold',
          visible: true,
          technologies: [{ key: 'zig', slug: 'zig', name: 'Zig' }],
          translations: { en: { name: 'Systems' }, es: { name: 'Sistemas' } },
        },
      ],
    });
    expect(result.ok).toBe(true);
    const saved = await service.loadSkillCategories();
    expect(saved.stack).toHaveLength(values.stack.length - 1);
    expect(saved.learning.at(-1)).toMatchObject({ slug: 'systems', translations: { es: { name: 'Sistemas' } } });
  });
});

describe('technologies', () => {
  it('refuses to remove a technology that is still listed', async () => {
    const values = await service.loadTechnologyValues();
    const used = values.find((t) => t.projects + t.categories > 0)!;
    const result = await actions.saveTechnologies({ items: values.filter((t) => t.id !== used.id) });
    expect(!result.ok && result.fieldErrors.items).toContain(used.name);
    expect(await db.select().from(technologies).where(eq(technologies.id, used.id))).toHaveLength(1);
    expect(tags).toEqual([]);
  });

  it('rejects duplicate names', async () => {
    const values = await service.loadTechnologyValues();
    values[1]!.name = values[0]!.name.toUpperCase();
    const result = await actions.saveTechnologies({ items: values });
    expect(!result.ok && Object.keys(result.fieldErrors)).toEqual(['items.1.name']);
  });

  it('renames (slug unchanged) and removes unused ones, refreshing skills and projects', async () => {
    await db.insert(technologies).values({ slug: 'cobol', name: 'COBOL' });
    const values = await service.loadTechnologyValues();
    const target = values.find((t) => t.categories > 0)!;
    const items = values.filter((t) => t.slug !== 'cobol').map((t) => (t.id === target.id ? { ...t, name: 'Renamed' } : t));

    const result = await actions.saveTechnologies({ items });
    expect(result.ok).toBe(true);
    expect(tags).toEqual(['skills', 'projects']);
    const [row] = await db.select().from(technologies).where(eq(technologies.id, target.id));
    expect(row).toMatchObject({ name: 'Renamed', slug: target.slug, updatedBy: ADMIN_ID });
    expect(await db.select().from(technologies).where(eq(technologies.slug, 'cobol'))).toHaveLength(0);
  });
});
