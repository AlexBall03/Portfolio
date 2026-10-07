import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listExperiences } from '@/features/experience/repository';
import {
  getProfile,
  listHighlights,
  listProfileRoles,
  listSnapshotMetrics,
  listSocialLinks,
} from '@/features/profile/repository';
import { findProjectBySlug, listPublishedProjects, listPublishedProjectSlugs } from '@/features/projects/repository';
import { getPageContent, getSectionContent, getSiteSettings } from '@/features/site/repository';
import { getSkillsOverview } from '@/features/skills/repository';
import { createTestDb } from '@/test/db';
import { projects, projectSlugHistory, projectTranslations } from './schema';
import { content } from './seed/content';
import { seedContent } from './seed/seed';
import type { Database } from './types';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  expect(await seedContent(db, content)).toEqual({ status: 'seeded' });
}, 60_000);

afterAll(() => close());

describe('seed', () => {
  it('refuses to overwrite existing content without --force', async () => {
    const result = await seedContent(db, content);
    expect(result.status).toBe('skipped');
  });

  it('rejects a document that references an unknown technology', async () => {
    const broken = {
      ...content,
      projects: [{ ...content.projects[0]!, technologies: ['does-not-exist'] }],
    };
    await expect(seedContent(db, broken)).rejects.toThrow(/Unknown technology/);
  });
});

describe('content repositories', () => {
  it('returns settings and profile in each locale', async () => {
    expect((await getSiteSettings(db))?.githubUsername).toBe('AlexBall03');

    const en = await getProfile(db, 'en');
    const es = await getProfile(db, 'es');
    expect(en?.title).toBe('Software Engineer');
    expect(es?.title).toBe('Ingeniero de Software');
    expect(en?.resume?.src).toBe('/assets/Alexander-Ball-Resume.pdf');
    expect(es?.about).toHaveLength(en!.about.length);
  });

  it('lists ordered profile collections', async () => {
    expect((await listSocialLinks(db)).map((l) => l.platform)).toEqual(['github', 'linkedin']);
    expect((await listProfileRoles(db, 'es'))[0]?.label).toBe('Ingeniero de Software');
    expect(await listHighlights(db, 'en', 'resume')).toHaveLength(3);
    expect(await listHighlights(db, 'en', 'differentiator')).toHaveLength(6);
    expect((await listSnapshotMetrics(db, 'en')).map((m) => m.value)).toEqual([60, 2, 12, 10]);
  });

  it('returns page and section copy', async () => {
    expect((await getPageContent(db, 'contact', 'es'))?.seoDescription).toMatch(/^Escríbeme/);
    const sections = await getSectionContent(db, 'en');
    expect(sections.contact?.title).toBe("Let's talk.");
    expect(Object.keys(sections)).toHaveLength(8);
  });

  it('groups skills by kind and shares technologies across locales', async () => {
    const en = await getSkillsOverview(db, 'en');
    const es = await getSkillsOverview(db, 'es');
    expect(en.stack.map((c) => c.slug)).toEqual(['frontend', 'backend', 'data']);
    expect(en.learning.map((c) => c.slug)).toEqual(['cloud-infrastructure']);
    expect(es.stack[2]?.name).toBe('Datos');
    // The old site's Spanish stack had silently drifted; now both read the same rows.
    expect(es.stack.flatMap((c) => c.technologies)).toEqual(en.stack.flatMap((c) => c.technologies));
  });

  it('lists experience with organization labels and real dates', async () => {
    const es = await listExperiences(db, 'es');
    expect(es).toHaveLength(8);
    expect(es.find((e) => e.organization === 'Pausa profesional')?.endDate).toBe('2023-05-01');
    expect(es.filter((e) => e.kind === 'education').map((e) => e.organization)).toEqual([
      'Western Governors University',
      'Educación en Casa',
    ]);
  });
});

describe('projects', () => {
  it('lists published projects with technologies and repositories', async () => {
    const list = await listPublishedProjects(db, 'en');
    expect(list.map((p) => p.slug)).toEqual(['weather', 'portfolio']);
    expect(list[0]?.technologies[0]).toEqual({ slug: 'nextjs', name: 'Next.js' });
    expect(list[0]?.repositories[0]?.url).toBe('https://github.com/AlexBall03/Weather');
  });

  it('hides drafts and archived projects', async () => {
    await db.update(projects).set({ status: 'draft' }).where(eq(projects.slug, 'portfolio'));
    expect(await listPublishedProjectSlugs(db)).toEqual(['weather']);
    expect((await findProjectBySlug(db, 'portfolio', 'en')).kind).toBe('not-found');
    await db.update(projects).set({ status: 'published' }).where(eq(projects.slug, 'portfolio'));
  });

  it('redirects retired slugs to the current slug', async () => {
    const [weather] = await db.select().from(projects).where(eq(projects.slug, 'weather'));
    await db.insert(projectSlugHistory).values({ slug: 'nws-weather', projectId: weather!.id });
    expect(await findProjectBySlug(db, 'nws-weather', 'en')).toEqual({ kind: 'redirect', slug: 'weather' });
    expect((await findProjectBySlug(db, 'unknown', 'en')).kind).toBe('not-found');
  });

  it('falls back to English when a translation is missing', async () => {
    const [weather] = await db.select().from(projects).where(eq(projects.slug, 'weather'));
    await db.delete(projectTranslations).where(eq(projectTranslations.projectId, weather!.id));
    await db.insert(projectTranslations).values({
      projectId: weather!.id,
      locale: 'en',
      name: 'Weather EN',
      tagline: 't',
      summary: 's',
    });
    const lookup = await findProjectBySlug(db, 'weather', 'es');
    expect(lookup.kind === 'found' && lookup.project.name).toBe('Weather EN');
  });
});
