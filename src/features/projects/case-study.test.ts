import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mediaAssets, projectMedia, projectMilestones, projectRelations, projectSections } from '@/db/schema';
import { content } from '@/db/seed/content';
import { seedContent } from '@/db/seed/seed';
import type { Database } from '@/db/types';
import { ADMIN_ID, OTHER_ID, stubAuthEnv } from '@/test/auth';
import { createTestDb } from '@/test/db';
import { pngBytes } from '@/test/images';
import { pickRelated, videoEmbed } from './case-study';
import { uploadMetaInput } from './schema';
import { formatMilestoneDate } from './format';
import { findProjectBySlug, listPublishedProjects } from './repository';
import type { CaseStudyValues, MilestoneValues, ProjectValues, SectionValues } from './types';

/**
 * Phase 5A on a real (PGlite) database: case-study sections, milestones, and
 * related projects through Server Action → requireAdmin → validation →
 * service transaction → repository → public read, with storage faked.
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
vi.mock('@/integrations/blob/store', () => ({
  blobStore: {
    configured: () => true,
    put: async (path: string) => `https://store1.public.blob.vercel-storage.com/${path}`,
    remove: async () => {},
  },
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

const admin = { userId: ADMIN_ID };

async function createProject(slug: string, status: ProjectValues['status'] = 'published') {
  const values = service.blankProject();
  values.slug = slug;
  values.status = status;
  values.translations.en = { name: `Project ${slug}`, tagline: 'Tagline', summary: 'Summary.', body: [] };
  values.translations.es = { name: `Proyecto ${slug}`, tagline: 'Lema', summary: 'Resumen.', body: [] };
  const result = await actions.createProject(values);
  if (!result.ok) throw new Error(JSON.stringify(result));
  tags.length = 0; // setup isn't under test
  return result.data.id!;
}

async function addImage(projectId: string, alt = 'Screenshot') {
  const media = await service.uploadProjectImage(
    { projectId, bytes: pngBytes(1600, 900), ...uploadMetaInput.parse({ translations: { en: { alt, caption: '' } } }) },
    admin,
  );
  return media.items.at(-1)!.assetId;
}

const text = (en: { heading: string; body?: string[] }, es?: { heading: string; body?: string[] }) => ({
  en: { heading: en.heading, body: en.body ?? [] },
  es: es ? { heading: es.heading, body: es.body ?? [] } : { heading: '', body: [] },
});

function section(kind: SectionValues['kind'], patch: Partial<SectionValues> = {}): SectionValues {
  return {
    key: `k-${Math.random()}`,
    kind,
    visible: true,
    videoUrl: '',
    translations: text({ heading: `${kind} heading`, body: ['A paragraph.'] }),
    items: [],
    media: [],
    ...patch,
  };
}

const item = (title: string, body = '', es?: { title: string; body: string }) => ({
  key: `i-${Math.random()}`,
  translations: { en: { title, body }, es: es ?? { title: '', body: '' } },
});

function milestone(occurredOn: string, title: string, patch: Partial<MilestoneValues> = {}): MilestoneValues {
  return {
    key: `m-${Math.random()}`,
    occurredOn,
    datePrecision: 'month',
    kind: 'feature',
    url: '',
    assetId: '',
    visible: true,
    translations: { en: { title, description: '' }, es: { title: '', description: '' } },
    ...patch,
  };
}

async function saveSections(projectId: string, sections: SectionValues[]) {
  return actions.saveProjectSections({ projectId, sections } satisfies { projectId: string } & CaseStudyValues);
}

async function publicCaseStudy(slug: string, locale: 'en' | 'es' = 'en') {
  const lookup = await findProjectBySlug(db, slug, locale);
  if (lookup.kind !== 'found') throw new Error(`not found: ${slug}`);
  return lookup.project;
}

describe('authorization', () => {
  it.each([
    ['signed out', null],
    ['another user', OTHER_ID],
  ])('rejects %s as a 404 before validating or writing', async (_case, userId) => {
    const projectId = await createProject(userId ? 'auth-other' : 'auth-anon');
    tags.length = 0;
    session.userId = userId;
    for (const call of [
      () => actions.saveProjectSections({ projectId, sections: [section('narrative')] }),
      () => actions.saveProjectMilestones({ projectId, milestones: [milestone('2025-01-01', 'Intrusion')] }),
      () => actions.saveProjectRelations({ projectId, related: [] }),
    ]) {
      await expect(call()).rejects.toThrow('404');
    }
    expect(await db.select().from(projectSections).where(eq(projectSections.projectId, projectId))).toEqual([]);
    expect(await db.select().from(projectMilestones).where(eq(projectMilestones.projectId, projectId))).toEqual([]);
    expect(tags).toEqual([]);
  });
});

describe('case-study sections', () => {
  it('saves ordered sections, shows only visible ones publicly, and flags hidden ones in preview', async () => {
    const id = await createProject('sections-order');
    const result = await saveSections(id, [
      section('narrative', { translations: text({ heading: 'Why', body: ['Because **reasons**.'] }) }),
      section('highlights', { visible: false, translations: text({ heading: 'Draft highlights' }), items: [item('Fast')] }),
      section('challenges', { translations: text({ heading: 'Hard parts' }), items: [item('Caching', 'Tags'), item('Auth', 'Layers')] }),
    ]);
    expect(result.ok).toBe(true);
    expect(tags).toEqual(['projects']);

    const live = await publicCaseStudy('sections-order');
    expect(live.sections.map((s) => s.heading)).toEqual(['Why', 'Hard parts']);
    expect(live.sections[1]!.items).toEqual([
      { title: 'Caching', body: 'Tags' },
      { title: 'Auth', body: 'Layers' },
    ]);
    expect(live.sections.every((s) => !s.hidden)).toBe(true);

    const preview = await service.loadProjectPreview(id);
    expect(preview!.sections.map((s) => [s.heading, s.hidden])).toEqual([
      ['Why', false],
      ['Draft highlights', true],
      ['Hard parts', false],
    ]);

    // Reorder and remove: list position is the order, missing sections are deleted.
    if (!result.ok) return;
    const [why, , hard] = result.data.sections;
    expect((await saveSections(id, [hard!, why!])).ok).toBe(true);
    expect((await publicCaseStudy('sections-order')).sections.map((s) => s.heading)).toEqual(['Hard parts', 'Why']);
    expect(await db.select().from(projectSections).where(eq(projectSections.projectId, id))).toHaveLength(2);
  });

  it('keeps a project without sections working (sections are optional)', async () => {
    await createProject('no-sections');
    const live = await publicCaseStudy('no-sections');
    expect(live).toMatchObject({ sections: [], milestones: [], relatedIds: [] });
  });

  it('never exposes a draft project’s case study', async () => {
    const id = await createProject('draft-case-study', 'draft');
    expect((await saveSections(id, [section('narrative')])).ok).toBe(true);
    expect(await findProjectBySlug(db, 'draft-case-study', 'es')).toEqual({ kind: 'not-found' });
  });

  it('keeps retired slugs redirecting after case-study edits', async () => {
    const id = await createProject('old-slug-cs');
    expect((await saveSections(id, [section('narrative')])).ok).toBe(true);
    const values = (await service.loadProject(id))!;
    expect((await actions.saveProject({ ...values, slug: 'new-slug-cs' })).ok).toBe(true);
    expect(await findProjectBySlug(db, 'old-slug-cs', 'en')).toEqual({ kind: 'redirect', slug: 'new-slug-cs' });
    expect((await publicCaseStudy('new-slug-cs')).sections).toHaveLength(1);
  });

  it('renders Spanish where translated and falls back to English per section and entry', async () => {
    const id = await createProject('bilingual-cs');
    await saveSections(id, [
      section('narrative', { translations: text({ heading: 'Story', body: ['English.'] }, { heading: 'Historia', body: ['Español.'] }) }),
      section('lessons', {
        translations: text({ heading: 'Lessons' }),
        items: [item('Test early', '', { title: 'Probar pronto', body: '' }), item('Ship small')],
      }),
    ]);
    const es = await publicCaseStudy('bilingual-cs', 'es');
    expect(es.sections.map((s) => s.heading)).toEqual(['Historia', 'Lessons']);
    expect(es.sections[0]!.body).toEqual(['Español.']);
    expect(es.sections[1]!.items.map((i) => i.title)).toEqual(['Probar pronto', 'Ship small']);
  });

  it('rejects a partly translated Spanish section and fields a kind does not use', async () => {
    const id = await createProject('invalid-cs');
    const partial = await saveSections(id, [section('narrative', { translations: text({ heading: 'Story', body: ['x'] }, { heading: 'Historia' }) })]);
    expect(partial).toMatchObject({ ok: false, fieldErrors: { 'sections.0.translations.es.body': 'Add at least one paragraph' } });

    const wrongShape = await saveSections(id, [
      section('video', { videoUrl: 'https://youtu.be/dQw4w9WgXcQ', items: [item('Nope')] }),
      section('gallery', { translations: text({ heading: 'Shots' }) }),
      section('highlights', { translations: text({ heading: 'Empty' }) }),
    ]);
    expect(wrongShape.ok).toBe(false);
    if (wrongShape.ok) return;
    expect(wrongShape.fieldErrors).toMatchObject({
      'sections.0.items': 'This section type has no entries',
      'sections.1.media': 'Choose at least one image',
      'sections.2.items': 'Add at least one highlight',
    });
    expect(await db.select().from(projectSections).where(eq(projectSections.projectId, id))).toEqual([]);
  });

  it('accepts only this project’s images, in the chosen order', async () => {
    const id = await createProject('gallery-cs');
    const other = await createProject('gallery-other');
    const [a, b] = [await addImage(id, 'First'), await addImage(id, 'Second')];
    const foreign = await addImage(other, 'Foreign');

    const bad = await saveSections(id, [section('gallery', { translations: text({ heading: 'Shots' }), media: [a, foreign] })]);
    expect(bad).toMatchObject({ ok: false, fieldErrors: { 'sections.0.media': 'Choose images from this project’s media' } });

    expect((await saveSections(id, [section('gallery', { translations: text({ heading: 'Shots' }), media: [b, a] })])).ok).toBe(true);
    expect((await publicCaseStudy('gallery-cs')).sections[0]!.media.map((m) => m.alt)).toEqual(['Second', 'First']);
  });
});

describe('media references', () => {
  it('detaches an image removed from the project, and keeps an asset another project still uses', async () => {
    const id = await createProject('media-detach');
    const other = await createProject('media-share');
    const shared = await addImage(id, 'Shared');
    const own = await addImage(id, 'Own');
    await db.insert(projectMedia).values({ projectId: other, assetId: shared, role: 'gallery', sortOrder: 5 });

    await saveSections(id, [section('gallery', { translations: text({ heading: 'Shots' }), media: [shared, own] })]);
    await actions.saveProjectMilestones({ projectId: id, milestones: [milestone('2025-02-01', 'Beta', { assetId: shared })] });

    const media = (await service.loadProjectMedia(id))!;
    const saved = await actions.saveProjectMedia({ projectId: id, items: media.items.filter((i) => i.assetId === own) });
    expect(saved.ok).toBe(true);

    const live = await publicCaseStudy('media-detach');
    expect(live.sections[0]!.media.map((m) => m.alt)).toEqual(['Own']);
    expect(live.milestones[0]!.image).toBeNull();
    // Still attached to the other project, so neither the row nor the file goes away.
    expect(await db.select().from(mediaAssets).where(eq(mediaAssets.id, shared))).toHaveLength(1);
  });
});

describe('milestones', () => {
  it('shows visible milestones chronologically, ties by list order, hidden ones only in preview', async () => {
    const id = await createProject('milestones-order');
    const result = await actions.saveProjectMilestones({
      projectId: id,
      milestones: [
        milestone('2025-06-01', 'Launch', { kind: 'launch', url: 'https://example.com/launch' }),
        milestone('2024-01-15', 'Kickoff', { kind: 'started', datePrecision: 'day' }),
        milestone('2025-06-01', 'Docs'),
        milestone('2025-03-01', 'Secret', { visible: false }),
      ],
    });
    expect(result.ok).toBe(true);
    expect(tags).toEqual(['projects']);

    const live = await publicCaseStudy('milestones-order');
    expect(live.milestones.map((m) => m.title)).toEqual(['Kickoff', 'Launch', 'Docs']);
    expect(live.milestones[1]).toMatchObject({ kind: 'launch', url: 'https://example.com/launch', precision: 'month' });

    const preview = await service.loadProjectPreview(id);
    expect(preview!.milestones.map((m) => [m.title, m.hidden])).toEqual([
      ['Kickoff', false],
      ['Secret', true],
      ['Launch', false],
      ['Docs', false],
    ]);
  });

  it('validates dates, links, and translations', async () => {
    const id = await createProject('milestones-invalid');
    const res = await actions.saveProjectMilestones({
      projectId: id,
      milestones: [
        milestone('not-a-date', 'Bad date'),
        milestone('2025-01-01', 'Bad link', { url: 'javascript:alert(1)' }),
        milestone('2025-01-01', 'Half Spanish', { translations: { en: { title: 'Half', description: '' }, es: { title: '', description: 'Solo descripción' } } }),
      ],
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(Object.keys(res.fieldErrors)).toEqual(
      expect.arrayContaining(['milestones.0.occurredOn', 'milestones.1.url', 'milestones.2.translations.es.title']),
    );
  });

  it('formats dates at their precision in each locale without shifting a day', () => {
    expect(formatMilestoneDate('2026-03-01', 'day', 'en')).toBe('Mar 1, 2026');
    expect(formatMilestoneDate('2026-03-01', 'month', 'en')).toBe('Mar 2026');
    expect(formatMilestoneDate('2026-01-01', 'year', 'es')).toBe('2026');
  });
});

describe('related projects', () => {
  it('saves explicit picks in order and rejects self-references and duplicates', async () => {
    const id = await createProject('related-main');
    const a = await createProject('related-a');
    const b = await createProject('related-b', 'draft');

    expect(await actions.saveProjectRelations({ projectId: id, related: [{ id }] })).toMatchObject({ ok: false });
    expect(await actions.saveProjectRelations({ projectId: id, related: [{ id: a }, { id: a }] })).toMatchObject({ ok: false });

    const saved = await actions.saveProjectRelations({ projectId: id, related: [{ id: b }, { id: a }] });
    expect(saved).toMatchObject({ ok: true, data: { related: [{ id: b }, { id: a }] } });
    expect(tags).toEqual(['projects']);

    // The page resolves picks against published projects only: the draft never surfaces.
    const live = await publicCaseStudy('related-main');
    expect(live.relatedIds).toEqual([b, a]);
    const shown = pickRelated(live.id, live.relatedIds, await listPublishedProjects(db, 'en'));
    expect(shown.map((p) => p.slug)).toEqual(['related-a']);
  });

  it('drops the relation when the related project is deleted', async () => {
    const id = await createProject('related-cascade');
    const gone = await createProject('related-gone');
    await actions.saveProjectRelations({ projectId: id, related: [{ id: gone }] });
    expect((await actions.deleteProject({ id: gone, confirmSlug: 'related-gone' })).ok).toBe(true);
    expect(await db.select().from(projectRelations).where(eq(projectRelations.projectId, id))).toEqual([]);
  });

  it('pickRelated keeps order, skips self and unknown ids, and caps the list', () => {
    const published = ['a', 'b', 'c', 'd', 'self'].map((id) => ({ id }));
    expect(pickRelated('self', ['self', 'x', 'd', 'a', 'a', 'b', 'c'], published).map((p) => p.id)).toEqual(['d', 'a', 'b']);
  });
});

describe('videoEmbed', () => {
  it('embeds YouTube and Vimeo from parsed ids, and links anything else', () => {
    expect(videoEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      kind: 'embed',
      provider: 'YouTube',
      src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    });
    expect(videoEmbed('https://youtu.be/dQw4w9WgXcQ').kind).toBe('embed');
    expect(videoEmbed('https://vimeo.com/76979871')).toMatchObject({ kind: 'embed', src: 'https://player.vimeo.com/video/76979871?dnt=1' });
    expect(videoEmbed('https://youtube.com/watch?v=<script>')).toEqual({ kind: 'link', href: 'https://youtube.com/watch?v=%3Cscript%3E' });
    expect(videoEmbed('https://example.com/demo.mp4')).toEqual({ kind: 'link', href: 'https://example.com/demo.mp4' });
  });
});
