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
import { countStackTechnologies, resolveSnapshotMetrics } from '@/features/profile/metrics';
import { findProjectBySlug, listPublishedProjects, listPublishedProjectSlugs } from '@/features/projects/repository';
import { getPageContent, getSectionContent, getSiteSettings } from '@/features/site/repository';
import { getSkillsOverview } from '@/features/skills/repository';
import { createTestDb } from '@/test/db';
import { projects, projectSlugHistory } from './schema';
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
  it('does not touch a database that is already bootstrapped', async () => {
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
  it('returns settings and the profile', async () => {
    expect((await getSiteSettings(db))?.githubUsername).toBe('AlexBall03');

    const profile = await getProfile(db);
    expect(profile?.title).toBe('Software Engineer');
    expect(profile?.about).toHaveLength(6);
    expect(profile?.headshot?.alt).toBe('Alexander D. Ball');
  });

  it('lists ordered profile collections', async () => {
    expect((await listSocialLinks(db)).map((l) => l.platform)).toEqual(['github', 'linkedin']);
    expect((await listProfileRoles(db))[0]?.label).toBe('Software Engineer');
    expect(await listHighlights(db, 'resume')).toHaveLength(3);
    expect(await listHighlights(db, 'differentiator')).toHaveLength(6);
    expect((await listSnapshotMetrics(db)).map((m) => m.source)).toEqual([
      'static',
      'static',
      'published_projects',
      'technologies',
    ]);
  });

  it('derives snapshot metrics from published content instead of stored numbers', async () => {
    const [metrics, published, skills] = await Promise.all([
      listSnapshotMetrics(db),
      listPublishedProjects(db),
      getSkillsOverview(db),
    ]);
    const resolved = resolveSnapshotMetrics(metrics, {
      publishedProjects: published.length,
      technologies: countStackTechnologies(skills),
    });
    expect(resolved.map((m) => m.value)).toEqual([60, 2, published.length, 15]);
    expect(published).toHaveLength(2);
  });

  it('returns page and section copy', async () => {
    expect((await getPageContent(db, 'contact'))?.seoDescription).toMatch(/^Get in touch/);
    const sections = await getSectionContent(db);
    expect(sections.contact?.title).toBe("Let's talk.");
    expect(Object.keys(sections)).toHaveLength(11);
  });

  it('groups skills by kind', async () => {
    const skills = await getSkillsOverview(db);
    expect(skills.stack.map((c) => c.slug)).toEqual(['frontend', 'backend', 'data']);
    expect(skills.learning.map((c) => c.slug)).toEqual(['cloud-infrastructure']);
    expect(skills.stack[2]?.name).toBe('Data');
  });

  it('lists experience with organization labels and real dates', async () => {
    const list = await listExperiences(db);
    expect(list).toHaveLength(8);
    expect(list.find((e) => e.organization === 'Career break')?.endDate).toBe('2023-05-01');
    expect(list.filter((e) => e.kind === 'education').map((e) => e.organization)).toEqual([
      'Western Governors University',
      'Homeschool',
    ]);
  });
});

describe('projects', () => {
  it('lists published projects with technologies and repositories', async () => {
    const list = await listPublishedProjects(db);
    expect(list.map((p) => p.slug)).toEqual(['weather', 'portfolio']);
    expect(list[0]?.technologies[0]).toEqual({ slug: 'nextjs', name: 'Next.js' });
    expect(list[0]?.repositories[0]?.url).toBe('https://github.com/AlexBall03/Weather');
  });

  it('hides drafts and archived projects', async () => {
    await db.update(projects).set({ status: 'draft' }).where(eq(projects.slug, 'portfolio'));
    expect(await listPublishedProjectSlugs(db)).toEqual(['weather']);
    expect((await findProjectBySlug(db, 'portfolio')).kind).toBe('not-found');
    await db.update(projects).set({ status: 'published' }).where(eq(projects.slug, 'portfolio'));
  });

  it('redirects retired slugs to the current slug', async () => {
    const [weather] = await db.select().from(projects).where(eq(projects.slug, 'weather'));
    await db.insert(projectSlugHistory).values({ slug: 'nws-weather', projectId: weather!.id });
    expect(await findProjectBySlug(db, 'nws-weather')).toEqual({ kind: 'redirect', slug: 'weather' });
    expect((await findProjectBySlug(db, 'unknown')).kind).toBe('not-found');
  });
});
