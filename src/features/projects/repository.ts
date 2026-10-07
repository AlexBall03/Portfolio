import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { projects, projectSlugHistory } from '@/db/schema';
import type { Database } from '@/db/types';
import type { Locale } from '@/i18n/config';
import { mapTranslated } from '@/i18n/translations';
import { resolveMedia } from '@/lib/media';
import type { Project, ProjectLookup } from './types';

type ProjectRow = NonNullable<Awaited<ReturnType<typeof queryProjects>>>[number];

function queryProjects(db: Database, slug?: string) {
  return db.query.projects.findMany({
    where: slug
      ? and(eq(projects.status, 'published'), eq(projects.slug, slug))
      : eq(projects.status, 'published'),
    orderBy: [asc(projects.sortOrder), asc(projects.createdAt)],
    with: {
      translations: true,
      technologies: { with: { technology: true } },
      repositories: true,
      media: { with: { asset: { with: { translations: true } } } },
    },
  });
}

function toProject(row: ProjectRow, t: ProjectRow['translations'][number], locale: Locale): Project {
  const media = [...row.media].sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    id: row.id,
    slug: row.slug,
    name: t.name,
    tagline: t.tagline,
    summary: t.summary,
    featured: row.featured,
    isLive: row.isLive,
    links: { demo: row.demoUrl, source: row.sourceUrl, details: row.detailsUrl },
    technologies: [...row.technologies]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ technology }) => ({ slug: technology.slug, name: technology.name })),
    repositories: [...row.repositories]
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)
      .map((r) => ({
        provider: r.provider,
        owner: r.owner,
        name: r.name,
        url: `https://github.com/${r.owner}/${r.name}`,
        isPrimary: r.isPrimary,
      })),
    cover: resolveMedia(media.find((m) => m.role === 'cover')?.asset, locale),
    gallery: media
      .filter((m) => m.role === 'gallery')
      .map((m) => resolveMedia(m.asset, locale))
      .filter((m) => m !== null),
  };
}

export async function listPublishedProjects(db: Database, locale: Locale): Promise<Project[]> {
  const rows = await queryProjects(db);
  return mapTranslated(rows, locale, (row, t) => toProject(row, t, locale));
}

export async function listPublishedProjectSlugs(db: Database): Promise<string[]> {
  const rows = await db
    .select({ slug: projects.slug })
    .from(projects)
    .where(eq(projects.status, 'published'))
    .orderBy(asc(projects.sortOrder));
  return rows.map((r) => r.slug);
}

/**
 * Resolves a public slug: the current slug renders the project, a retired slug
 * redirects to the current one, anything else (including drafts) is not found.
 */
export async function findProjectBySlug(db: Database, slug: string, locale: Locale): Promise<ProjectLookup> {
  const [row] = await queryProjects(db, slug);
  if (row) {
    const [project] = mapTranslated([row], locale, (r, t) => toProject(r, t, locale));
    return project ? { kind: 'found', project } : { kind: 'not-found' };
  }

  const [retired] = await db
    .select({ slug: projects.slug })
    .from(projectSlugHistory)
    .innerJoin(projects, eq(projects.id, projectSlugHistory.projectId))
    .where(and(eq(projectSlugHistory.slug, slug), eq(projects.status, 'published')))
    .limit(1);
  return retired ? { kind: 'redirect', slug: retired.slug } : { kind: 'not-found' };
}
