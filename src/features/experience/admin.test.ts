import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { experiences } from '@/db/schema';
import { content } from '@/db/seed/content';
import { seedContent } from '@/db/seed/seed';
import type { Database } from '@/db/types';
import { ADMIN_ID, OTHER_ID, stubAuthEnv } from '@/test/auth';
import { createTestDb } from '@/test/db';
import { listExperiences } from './repository';
import type { ExperiencesValues } from './types';

/**
 * The Experience admin write path end to end on PGlite: Server Action →
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

const loadWith = async (patch: (v: ExperiencesValues) => void) => {
  const values = await service.loadExperiences();
  patch(values);
  return values;
};

describe('authorization', () => {
  it.each([
    ['signed out', null],
    ['another user', OTHER_ID],
  ])('rejects %s as a 404 before validating or writing', async (_case, userId) => {
    session.userId = userId;
    const before = await db.select().from(experiences);
    await expect(actions.saveExperiences({ career: [], education: [] })).rejects.toThrow('404');
    expect(await db.select().from(experiences)).toEqual(before);
    expect(tags).toEqual([]);
  });
});

describe('validation', () => {
  it('enforces the date rules', async () => {
    const values = await loadWith((v) => {
      const past = v.career.find((e) => !e.isCurrent)!;
      const pastIndex = v.career.indexOf(past);
      v.career[pastIndex] = { ...past, endDate: '' }; // ended entry without an end
      const current = v.career.findIndex((e) => e.isCurrent);
      v.career[current] = { ...v.career[current]!, endDate: '2001-01-01' }; // current but already ended
      v.education[0] = { ...v.education[0]!, isCurrent: false, startDate: '2020-01-01', endDate: '2019-01-01' };
      v.career[pastIndex]!.role = '';
    });
    const result = await actions.saveExperiences(values);
    expect(result.ok).toBe(false);
    const keys = !result.ok ? Object.keys(result.fieldErrors) : [];
    const pastIndex = values.career.findIndex((e) => !e.isCurrent && !e.endDate);
    const current = values.career.findIndex((e) => e.isCurrent);
    expect(keys).toEqual(
      expect.arrayContaining([`career.${pastIndex}.endDate`, `career.${current}.endDate`, 'education.0.endDate']),
    );
    expect(keys).toContain(`career.${pastIndex}.role`);
    expect(tags).toEqual([]);
  });
});

describe('saving', () => {
  it('reorders, hides, edits, and records the author', async () => {
    const values = await loadWith((v) => {
      v.career.reverse();
      v.career[0]!.visible = false;
      Object.assign(v.career[1]!, { organizationLabel: 'Career break', role: 'Sabbatical', employmentType: '', location: '' });
    });
    const result = await actions.saveExperiences(values);
    expect(result.ok).toBe(true);
    expect(tags).toEqual(['experience']);

    const saved = await service.loadExperiences();
    expect(saved.career.map((e) => e.id)).toEqual(values.career.map((e) => e.id));

    const career = (await listExperiences(db)).filter((e) => e.kind === 'career');
    expect(career.map((e) => e.id)).toEqual(values.career.slice(1).map((e) => e.id)); // hidden first one, order kept
    expect(career[0]).toMatchObject({ organization: 'Career break', role: 'Sabbatical', employmentType: null, location: null });

    const [row] = await db.select().from(experiences).where(eq(experiences.id, values.career[1]!.id!));
    expect(row).toMatchObject({ updatedBy: ADMIN_ID, sortOrder: 1, status: 'published' });
  });

  it('adds a current role with no end date and removes another entry', async () => {
    const values = await loadWith((v) => {
      v.education.pop();
      v.career.unshift({
        key: 'new-1',
        organization: 'Acme',
        startDate: '2026-09-01',
        endDate: '',
        datePrecision: 'month',
        isCurrent: true,
        visible: true,
        organizationLabel: '',
        role: 'Engineer',
        employmentType: '',
        location: '',
        summary: ['Builds things.'],
        tags: ['Go'],
      });
    });
    const result = await actions.saveExperiences(values);
    expect(result.ok).toBe(true);
    const saved = await service.loadExperiences();
    expect(saved.career[0]).toMatchObject({ organization: 'Acme', endDate: '', isCurrent: true });
    expect(saved.education).toHaveLength(values.education.length);
    const [row] = await db.select().from(experiences).where(eq(experiences.id, saved.career[0]!.id!));
    expect(row).toMatchObject({ endDate: null, createdBy: ADMIN_ID });
  });
});
