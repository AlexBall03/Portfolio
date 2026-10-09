import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { projectRepositories, projects } from '@/db/schema';
import { content } from '@/db/seed/content';
import { seedContent } from '@/db/seed/seed';
import type { Database } from '@/db/types';
import { ADMIN_ID, OTHER_ID, stubAuthEnv } from '@/test/auth';
import { createTestDb } from '@/test/db';
import { json, mockGithub, repoPayload } from '@/test/github';
import { findProjectBySlug } from './repository';
import type { RepositoriesValues } from './types';

/**
 * The GitHub tab end to end on a real (PGlite) database, with GitHub mocked:
 * Server Action → authorization → validation → GitHub verification →
 * transaction → public read model.
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

/** What the fake GitHub knows: lower-case full name → repository. */
const REPOS: Record<string, { id: number; full_name: string; private?: boolean }> = {
  'alexball03/portfolio': { id: 101, full_name: 'AlexBall03/Portfolio' },
  'alexball03/portfolio-api': { id: 102, full_name: 'AlexBall03/portfolio-api' },
  'alexball03/old-name': { id: 101, full_name: 'AlexBall03/Portfolio' }, // renamed: GitHub redirects
  'alexball03/weather': { id: 201, full_name: 'AlexBall03/Weather' },
  'alexball03/secret': { id: 301, full_name: 'AlexBall03/secret', private: true },
};
const down = { current: false };

let github: ReturnType<typeof mockGithub>;
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
  vi.stubEnv('GITHUB_TOKEN', 'test-token');
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  session.userId = ADMIN_ID;
  tags.length = 0;
  down.current = false;
  github = mockGithub((path) => {
    if (down.current) return json({ message: 'Server Error' }, 503);
    const byName = /^\/repos\/([^/]+\/[^/]+)$/.exec(path);
    const byId = /^\/repositories\/(\d+)$/.exec(path);
    const repo = byName ? REPOS[byName[1]!.toLowerCase()] : byId ? Object.values(REPOS).find((r) => r.id === Number(byId[1])) : undefined;
    return repo ? json(repoPayload(repo)) : undefined;
  });
});
afterEach(() => {
  github.restore();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function createProject(slug: string, status: 'draft' | 'published' = 'published') {
  const values = service.blankProject();
  values.slug = slug;
  values.status = status;
  Object.assign(values, { name: `Project ${slug}`, tagline: 'Tagline', summary: 'Summary.', body: [] });
  const result = await actions.createProject(values);
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result.data.id!;
}

type Row = { id?: string; input: string; label?: string; isPrimary?: boolean };
const save = (projectId: string, repositories: Row[], analyticsVisible = true) =>
  actions.saveProjectRepositories({
    projectId,
    analyticsVisible,
    repositories: repositories.map((r) => ({ label: '', isPrimary: false, ...r })),
  });

async function saved(projectId: string, rows: Row[], visible = true): Promise<RepositoriesValues> {
  const result = await save(projectId, rows, visible);
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result.data;
}

const stored = (projectId: string) =>
  db.select().from(projectRepositories).where(eq(projectRepositories.projectId, projectId)).orderBy(projectRepositories.sortOrder);

async function publicProject(slug: string) {
  const lookup = await findProjectBySlug(db, slug);
  return lookup.kind === 'found' ? lookup.project : null;
}

describe('authorization', () => {
  it.each([
    ['signed out', null],
    ['another user', OTHER_ID],
  ])('rejects %s as a 404 before validating, calling GitHub, or writing', async (_case, userId) => {
    const projectId = await createProject(userId ? 'gh-auth-other' : 'gh-auth-anon');
    tags.length = 0;
    github.calls.length = 0;
    session.userId = userId;
    await expect(save(projectId, [{ input: 'AlexBall03/Portfolio' }])).rejects.toThrow('404');
    expect(await stored(projectId)).toEqual([]);
    expect(github.calls).toEqual([]);
    expect(tags).toEqual([]);
  });
});

describe('associations', () => {
  it('stores several repositories by stable id and canonical name, in order, with labels and one primary', async () => {
    const projectId = await createProject('gh-multi');
    const result = await saved(projectId, [
      { input: 'https://github.com/alexball03/portfolio-api.git', label: 'api' },
      { input: 'alexball03/portfolio', label: 'frontend', isPrimary: true },
    ]);
    expect(result.repositories.map((r) => [r.input, r.label, r.isPrimary])).toEqual([
      ['AlexBall03/portfolio-api', 'api', false],
      ['AlexBall03/Portfolio', 'frontend', true],
    ]);
    expect((await stored(projectId)).map((r) => [r.githubId, r.owner, r.name])).toEqual([
      [102, 'AlexBall03', 'portfolio-api'],
      [101, 'AlexBall03', 'Portfolio'],
    ]);
    expect(Object.values(result.checks).map((c) => c.status)).toEqual(['public', 'public']);
    expect(tags).toContain('projects');

    // The public read model: primary first, labels carried, analytics on.
    const p = await publicProject('gh-multi');
    expect(p?.githubAnalytics).toBe(true);
    expect(p?.repositories.map((r) => [r.githubId, r.label, r.isPrimary])).toEqual([
      [101, 'frontend', true],
      [102, 'api', false],
    ]);
  });

  it('removes and reorders associations, keeping row ids', async () => {
    const projectId = await createProject('gh-edit');
    const first = await saved(projectId, [{ input: 'AlexBall03/Portfolio' }, { input: 'AlexBall03/portfolio-api' }]);
    const [a, b] = first.repositories;
    const next = await saved(projectId, [{ id: b!.id, input: b!.input }]);
    expect(next.repositories.map((r) => r.id)).toEqual([b!.id]);
    const swapped = await saved(projectId, [
      { id: b!.id, input: 'AlexBall03/Portfolio' },
      { input: 'AlexBall03/portfolio-api' },
    ]);
    expect(swapped.repositories.map((r) => r.input)).toEqual(['AlexBall03/Portfolio', 'AlexBall03/portfolio-api']);
    expect(swapped.repositories[0]!.id).toBe(b!.id);
    expect(a).toBeDefined();
  });

  it('lets one repository belong to several projects', async () => {
    const one = await createProject('gh-shared-1');
    const two = await createProject('gh-shared-2');
    await saved(one, [{ input: 'AlexBall03/Portfolio' }]);
    await saved(two, [{ input: 'AlexBall03/Portfolio' }]);
    expect((await stored(two))[0]?.githubId).toBe(101);
  });

  it('allows no repositories at all, and then the page has no GitHub section to show', async () => {
    const projectId = await createProject('gh-none');
    const result = await saved(projectId, [], true);
    expect(result.repositories).toEqual([]);
    expect((await publicProject('gh-none'))?.repositories).toEqual([]);
  });
});

describe('validation', () => {
  it('rejects malformed and non-GitHub input without calling GitHub', async () => {
    const projectId = await createProject('gh-invalid');
    github.calls.length = 0;
    const result = await save(projectId, [{ input: 'https://gitlab.com/a/b' }, { input: 'not a repo' }]);
    expect(!result.ok && Object.keys(result.fieldErrors).sort()).toEqual(['repositories.0.input', 'repositories.1.input']);
    expect(github.calls).toEqual([]);
  });

  it('rejects duplicates by name, by GitHub id (an old name), and more than one primary', async () => {
    const projectId = await createProject('gh-dupes');
    const byName = await save(projectId, [{ input: 'alexball03/portfolio' }, { input: 'https://github.com/AlexBall03/Portfolio' }]);
    expect(!byName.ok && byName.fieldErrors.repositories).toMatch(/once/);
    const byId = await save(projectId, [{ input: 'AlexBall03/Portfolio' }, { input: 'AlexBall03/old-name' }]);
    expect(!byId.ok && byId.fieldErrors['repositories.1.input']).toMatch(/same repository/);
    const primaries = await save(projectId, [
      { input: 'AlexBall03/Portfolio', isPrimary: true },
      { input: 'AlexBall03/portfolio-api', isPrimary: true },
    ]);
    expect(!primaries.ok && primaries.fieldErrors.repositories).toMatch(/primary/);
    expect(await stored(projectId)).toEqual([]);
  });

  it('accepts only public repositories that exist', async () => {
    const projectId = await createProject('gh-public-only');
    const secret = await save(projectId, [{ input: 'AlexBall03/secret' }]);
    expect(!secret.ok && secret.fieldErrors['repositories.0.input']).toMatch(/public/);
    const missing = await save(projectId, [{ input: 'AlexBall03/nope' }]);
    expect(!missing.ok && missing.fieldErrors['repositories.0.input']).toMatch(/not found/i);
    expect(await stored(projectId)).toEqual([]);
  });

  it('refuses to add a repository GitHub can’t verify, but keeps unrelated edits possible', async () => {
    const projectId = await createProject('gh-outage');
    const first = await saved(projectId, [{ input: 'AlexBall03/Portfolio' }]);
    down.current = true;
    const adding = await save(projectId, [{ id: first.repositories[0]!.id, input: 'AlexBall03/Portfolio' }, { input: 'AlexBall03/portfolio-api' }]);
    expect(!adding.ok && adding.fieldErrors['repositories.1.input']).toMatch(/reach GitHub/);
    // An already verified row needs no GitHub call: a label change saves during the outage.
    const relabel = await save(projectId, [{ id: first.repositories[0]!.id, input: 'AlexBall03/Portfolio', label: 'frontend' }]);
    expect(relabel.ok).toBe(true);
    expect((await stored(projectId))[0]?.label).toBe('frontend');
  });

  it('verifies a pre-Phase 5B row (no id) on save, and keeps it unverified during an outage', async () => {
    const [weather] = await db.select().from(projectRepositories).where(eq(projectRepositories.name, 'Weather'));
    expect(weather?.githubId).toBeNull();
    down.current = true;
    const kept = await save(weather!.projectId, [{ id: weather!.id, input: 'AlexBall03/Weather', isPrimary: true }]);
    expect(kept.ok).toBe(true);
    expect((await stored(weather!.projectId))[0]?.githubId).toBeNull();
    down.current = false;
    await saved(weather!.projectId, [{ id: weather!.id, input: 'AlexBall03/Weather', isPrimary: true }]);
    expect((await stored(weather!.projectId))[0]?.githubId).toBe(201);
  });
});

describe('publication boundaries', () => {
  it('starts analytics off; the switch alone decides, and only published projects are public', async () => {
    const projectId = await createProject('gh-visibility');
    const [row] = await db.select({ visible: projects.githubAnalyticsVisible }).from(projects).where(eq(projects.id, projectId));
    expect(row?.visible).toBe(false);

    await saved(projectId, [{ input: 'AlexBall03/Portfolio' }], false);
    expect((await publicProject('gh-visibility'))?.githubAnalytics).toBe(false);
    // The admin preview reads the same model, unfiltered: it can show the section marked Hidden.
    expect((await service.loadProjectPreview(projectId))?.repositories).toHaveLength(1);

    await saved(projectId, [{ input: 'AlexBall03/Portfolio' }], true);
    expect((await publicProject('gh-visibility'))?.githubAnalytics).toBe(true);

    const draftId = await createProject('gh-draft', 'draft');
    await saved(draftId, [{ input: 'AlexBall03/Portfolio' }], true);
    expect(await publicProject('gh-draft')).toBeNull();
  });

  it('reports what GitHub says about stored rows (renamed, private) to the admin only', async () => {
    const projectId = await createProject('gh-checks');
    const first = await saved(projectId, [{ input: 'AlexBall03/Portfolio' }]);
    // Simulate a rename on GitHub after the save: the stored name is now old.
    await db.update(projectRepositories).set({ name: 'Old-Portfolio' }).where(eq(projectRepositories.projectId, projectId));
    const loaded = await service.loadProjectRepositories(projectId);
    expect(loaded?.checks[first.repositories[0]!.id!]).toEqual({ status: 'public', archived: false, renamedTo: 'AlexBall03/Portfolio' });

    REPOS['alexball03/portfolio'] = { ...REPOS['alexball03/portfolio']!, private: true };
    try {
      const after = await service.loadProjectRepositories(projectId);
      expect(after?.checks[first.repositories[0]!.id!]).toEqual({ status: 'private' });
    } finally {
      REPOS['alexball03/portfolio'] = { id: 101, full_name: 'AlexBall03/Portfolio' };
    }
  });
});
