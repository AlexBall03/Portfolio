import 'server-only';
import { and, asc, eq, inArray, max, ne, sql, type SQL } from 'drizzle-orm';
import {
  mediaAssets,
  mediaAssetTranslations,
  projectMedia,
  projectMilestones,
  projectMilestoneTranslations,
  projectRelations,
  projectRepositories,
  projects,
  projectSectionItems,
  projectSectionItemTranslations,
  projectSectionMedia,
  projectSections,
  projectSectionTranslations,
  projectSlugHistory,
  projectTechnologies,
  projectTranslations,
  technologies,
} from '@/db/schema';
import { deleteUnreferencedAssets, type StoredObject } from '@/db/media';
import type { Database } from '@/db/types';
import type { RepositoryLabel } from '@/features/github/types';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/config';
import { mapTranslated, pickTranslation } from '@/i18n/translations';
import { localeRecord, translationStatus } from '@/lib/cms/locale';
import { reconcileList, syncTranslations } from '@/lib/cms/write';
import { FieldValidationError, NotFoundError } from '@/lib/errors';
import { resolveMedia } from '@/lib/media';
import {
  projectTranslationInput,
  type ProjectEditorInput,
  type ProjectMediaInput,
  type ProjectMilestonesInput,
  type ProjectOrderInput,
  type ProjectRelationsInput,
  type ProjectSectionsInput,
} from './schema';
import type {
  CaseStudyValues,
  MilestonesValues,
  Project,
  ProjectCaseStudy,
  ProjectChoice,
  ProjectImageChoice,
  RelatedValues,
  ProjectListItem,
  ProjectLookup,
  ProjectMediaValues,
  ProjectOrderValues,
  ProjectValues,
  RepositoriesValues,
  Technology,
} from './types';

type ProjectRow = NonNullable<Awaited<ReturnType<typeof queryProjects>>>[number];

function queryProjects(db: Database, where: SQL | undefined) {
  return db.query.projects.findMany({
    where,
    orderBy: [asc(projects.sortOrder), asc(projects.createdAt)],
    with: {
      translations: true,
      technologies: { with: { technology: true } },
      repositories: true,
      media: { with: { asset: { with: { translations: true } } } },
    },
  });
}

const published = eq(projects.status, 'published');

function toProject(row: ProjectRow, t: ProjectRow['translations'][number], locale: Locale): Project {
  const media = [...row.media].sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    id: row.id,
    slug: row.slug,
    name: t.name,
    tagline: t.tagline,
    summary: t.summary,
    body: t.body,
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
        githubId: r.githubId,
        owner: r.owner,
        name: r.name,
        url: `https://github.com/${r.owner}/${r.name}`,
        label: r.label,
        isPrimary: r.isPrimary,
      })),
    githubAnalytics: row.githubAnalyticsVisible,
    cover: resolveMedia(media.find((m) => m.role === 'cover')?.asset, locale),
    gallery: media
      .filter((m) => m.role === 'gallery')
      .map((m) => resolveMedia(m.asset, locale))
      .filter((m) => m !== null),
  };
}

export async function listPublishedProjects(db: Database, locale: Locale): Promise<Project[]> {
  const rows = await queryProjects(db, published);
  return mapTranslated(rows, locale, (row, t) => toProject(row, t, locale));
}

export async function listPublishedProjectSlugs(db: Database): Promise<string[]> {
  const rows = await db
    .select({ slug: projects.slug })
    .from(projects)
    .where(published)
    .orderBy(asc(projects.sortOrder));
  return rows.map((r) => r.slug);
}

/**
 * Published projects for the sitemap: slug and the time its public page last
 * changed (the project row, which every editor save touches, or its newest
 * case-study section or milestone). Never a guessed timestamp.
 */
export async function listPublishedProjectSitemap(db: Database): Promise<{ slug: string; updatedAt: Date }[]> {
  const sectionsAt = db
    .select({ projectId: projectSections.projectId, at: max(projectSections.updatedAt).as('sections_at') })
    .from(projectSections)
    .groupBy(projectSections.projectId)
    .as('s');
  const milestonesAt = db
    .select({ projectId: projectMilestones.projectId, at: max(projectMilestones.updatedAt).as('milestones_at') })
    .from(projectMilestones)
    .groupBy(projectMilestones.projectId)
    .as('m');
  const rows = await db
    .select({
      slug: projects.slug,
      updatedAt: sql<Date | string>`greatest(${projects.updatedAt}, ${sectionsAt.at}, ${milestonesAt.at})`,
    })
    .from(projects)
    .leftJoin(sectionsAt, eq(sectionsAt.projectId, projects.id))
    .leftJoin(milestonesAt, eq(milestonesAt.projectId, projects.id))
    .where(published)
    .orderBy(asc(projects.sortOrder));
  // Raw SQL bypasses Drizzle's column mapping, so drivers may return a string.
  return rows.map((r) => ({ slug: r.slug, updatedAt: new Date(r.updatedAt) }));
}

/**
 * Resolves a public slug: the current slug renders the project, a retired slug
 * redirects to the current one, anything else (including drafts) is not found.
 */
export async function findProjectBySlug(db: Database, slug: string, locale: Locale): Promise<ProjectLookup> {
  const [row] = await queryProjects(db, and(published, eq(projects.slug, slug)));
  if (row) {
    const [project] = mapTranslated([row], locale, (r, t) => toProject(r, t, locale));
    if (!project) return { kind: 'not-found' };
    return { kind: 'found', project: { ...project, ...(await loadCaseStudy(db, project.id, locale, false)) } };
  }

  const [retired] = await db
    .select({ slug: projects.slug })
    .from(projectSlugHistory)
    .innerJoin(projects, eq(projects.id, projectSlugHistory.projectId))
    .where(and(eq(projectSlugHistory.slug, slug), published))
    .limit(1);
  return retired ? { kind: 'redirect', slug: retired.slug } : { kind: 'not-found' };
}

/* ── Admin editor reads ─────────────────────────────────────────────────────
 * Uncached and complete: drafts included, every locale's raw translation.
 */

/**
 * Any project, whatever its status, as the public page would render it (admin
 * preview), including hidden sections and milestones (flagged `hidden`).
 */
export async function findProjectForPreview(db: Database, id: string, locale: Locale): Promise<ProjectCaseStudy | null> {
  const [row] = await queryProjects(db, eq(projects.id, id));
  if (!row) return null;
  const project = mapTranslated([row], locale, (r, t) => toProject(r, t, locale))[0];
  return project ? { ...project, ...(await loadCaseStudy(db, id, locale, true)) } : null;
}

/**
 * A project's case study for one locale: sections in order, milestones
 * chronologically (same-day ties by list order), related project ids in
 * order. Public reads leave hidden content out; text falls back to English
 * per section, entry, and milestone.
 */
async function loadCaseStudy(
  db: Database,
  projectId: string,
  locale: Locale,
  includeHidden: boolean,
): Promise<Pick<ProjectCaseStudy, 'sections' | 'milestones' | 'relatedIds'>> {
  const [sectionRows, milestoneRows, related] = await Promise.all([
    db.query.projectSections.findMany({
      where: and(eq(projectSections.projectId, projectId), includeHidden ? undefined : eq(projectSections.visible, true)),
      orderBy: [asc(projectSections.sortOrder), asc(projectSections.createdAt)],
      with: {
        translations: true,
        items: { orderBy: [asc(projectSectionItems.sortOrder)], with: { translations: true } },
        media: { orderBy: [asc(projectSectionMedia.sortOrder)], with: { asset: { with: { translations: true } } } },
      },
    }),
    db.query.projectMilestones.findMany({
      where: and(eq(projectMilestones.projectId, projectId), includeHidden ? undefined : eq(projectMilestones.visible, true)),
      orderBy: [asc(projectMilestones.occurredOn), asc(projectMilestones.sortOrder)],
      with: { translations: true, asset: { with: { translations: true } } },
    }),
    db
      .select({ id: projectRelations.relatedProjectId })
      .from(projectRelations)
      .where(eq(projectRelations.projectId, projectId))
      .orderBy(asc(projectRelations.sortOrder)),
  ]);

  return {
    sections: mapTranslated(sectionRows, locale, (row, t) => ({
      id: row.id,
      kind: row.kind,
      heading: t.heading,
      body: t.body,
      items: mapTranslated(row.items, locale, (_, it) => ({ title: it.title, body: it.body })),
      media: row.media.map((m) => resolveMedia(m.asset, locale)).filter((m) => m !== null),
      videoUrl: row.videoUrl,
      hidden: !row.visible,
    })),
    milestones: mapTranslated(milestoneRows, locale, (row, t) => ({
      id: row.id,
      date: row.occurredOn,
      precision: row.datePrecision,
      kind: row.kind,
      title: t.title,
      description: t.description,
      url: row.url,
      image: resolveMedia(row.asset, locale),
      hidden: !row.visible,
    })),
    relatedIds: related.map((r) => r.id),
  };
}

const iso = (d: Date | null) => d?.toISOString() ?? null;

const blankTranslation = () => ({ name: '', tagline: '', summary: '', body: [] as string[] });

export async function listProjectsForAdmin(db: Database): Promise<ProjectListItem[]> {
  const rows = await db.query.projects.findMany({
    orderBy: [asc(projects.sortOrder), asc(projects.createdAt)],
    with: { translations: true, media: { with: { asset: { with: { translations: true } } } } },
  });
  return rows.map((row) => {
    const translations = localeRecord(row.translations, (t) => ({ ...t }), blankTranslation);
    const cover = resolveMedia(row.media.find((m) => m.role === 'cover')?.asset, DEFAULT_LOCALE);
    return {
      id: row.id,
      slug: row.slug,
      name: pickTranslation(row.translations, DEFAULT_LOCALE)?.name ?? row.slug,
      status: row.status,
      featured: row.featured,
      sortOrder: row.sortOrder,
      translation: Object.fromEntries(
        LOCALES.map((l) => [l, translationStatus(projectTranslationInput, translations[l])]),
      ) as ProjectListItem['translation'],
      cover: cover && { src: cover.src, alt: cover.alt },
      publishedAt: iso(row.publishedAt),
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

export async function getProjectValues(db: Database, id: string): Promise<ProjectValues | null> {
  const row = await db.query.projects.findFirst({
    where: eq(projects.id, id),
    with: { translations: true, technologies: { with: { technology: true } } },
  });
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    featured: row.featured,
    isLive: row.isLive,
    demoUrl: row.demoUrl ?? '',
    sourceUrl: row.sourceUrl ?? '',
    detailsUrl: row.detailsUrl ?? '',
    technologies: [...row.technologies]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ technology: t }) => ({ key: t.slug, slug: t.slug, name: t.name })),
    translations: localeRecord(
      row.translations,
      (t) => ({ name: t.name, tagline: t.tagline, summary: t.summary, body: t.body }),
      blankTranslation,
    ),
    publishedAt: iso(row.publishedAt),
  };
}

export async function listTechnologies(db: Database): Promise<Technology[]> {
  return db.select({ slug: technologies.slug, name: technologies.name }).from(technologies).orderBy(asc(technologies.name));
}

export async function getProjectOrderValues(db: Database): Promise<ProjectOrderValues> {
  const items = (await listProjectsForAdmin(db)).map((p) => ({
    key: p.id,
    id: p.id,
    name: p.name,
    slug: p.slug,
    status: p.status,
    featured: p.featured,
  }));
  const strip = ({ featured: _featured, ...item }: (typeof items)[number]) => item;
  return {
    featured: items.filter((p) => p.featured).map(strip),
    other: items.filter((p) => !p.featured).map(strip),
  };
}

export async function getProjectMediaValues(db: Database, projectId: string): Promise<ProjectMediaValues> {
  const rows = await db.query.projectMedia.findMany({
    where: eq(projectMedia.projectId, projectId),
    orderBy: [asc(projectMedia.sortOrder)],
    with: { asset: { with: { translations: true } } },
  });
  return {
    items: rows.map(({ asset, role }) => ({
      key: asset.id,
      assetId: asset.id,
      src: resolveMedia(asset, DEFAULT_LOCALE)!.src,
      width: asset.width,
      height: asset.height,
      isCover: role === 'cover',
      translations: localeRecord(
        asset.translations,
        (t) => ({ alt: t.alt, caption: t.caption ?? '' }),
        () => ({ alt: '', caption: '' }),
      ),
    })),
  };
}

export async function projectExists(db: Database, id: string): Promise<boolean> {
  const [row] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, id)).limit(1);
  return Boolean(row);
}

/* ── Admin writes ───────────────────────────────────────────────────────────
 * Run inside one transaction by the service. `actor` is the admin's Clerk
 * user ID, recorded in created_by / updated_by.
 */

export interface Actor {
  userId: string;
}

export type { StoredObject };

const SLUG_TAKEN = { slug: 'Another project uses (or used) this URL' };

async function assertSlugAvailable(db: Database, slug: string, projectId: string | null) {
  const own = projectId ? ne(projects.id, projectId) : undefined;
  const [current] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.slug, slug), own)).limit(1);
  const [retired] = await db
    .select({ id: projectSlugHistory.projectId })
    .from(projectSlugHistory)
    .where(and(eq(projectSlugHistory.slug, slug), projectId ? ne(projectSlugHistory.projectId, projectId) : undefined))
    .limit(1);
  if (current || retired) throw new FieldValidationError(SLUG_TAKEN);
}

const projectFields = (data: ProjectEditorInput) => ({
  slug: data.slug,
  status: data.status,
  featured: data.featured,
  isLive: data.isLive,
  demoUrl: data.demoUrl ?? null,
  sourceUrl: data.sourceUrl ?? null,
  detailsUrl: data.detailsUrl ?? null,
});

/** Creates a project at the end of the editorial order. Returns its id. */
export async function insertProject(db: Database, data: ProjectEditorInput, actor: Actor, now: Date): Promise<string> {
  await assertSlugAvailable(db, data.slug, null);
  const [{ last } = { last: null }] = await db.select({ last: max(projects.sortOrder) }).from(projects);
  const [row] = await db
    .insert(projects)
    .values({
      ...projectFields(data),
      sortOrder: (last ?? -1) + 1,
      publishedAt: data.status === 'published' ? now : null,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    })
    .returning({ id: projects.id });
  await writeProjectContent(db, row!.id, data);
  return row!.id;
}

/**
 * Updates a project. A slug change on a project that has ever been public
 * retires the old slug (it keeps redirecting); going live stamps `published_at`.
 */
export async function updateProject(
  db: Database,
  id: string,
  data: ProjectEditorInput,
  actor: Actor,
  now: Date,
): Promise<void> {
  const [current] = await db
    .select({ slug: projects.slug, status: projects.status, publishedAt: projects.publishedAt })
    .from(projects)
    .where(eq(projects.id, id))
    .for('update');
  if (!current) throw new NotFoundError('The project');

  if (data.slug !== current.slug) {
    await assertSlugAvailable(db, data.slug, id);
    await db.delete(projectSlugHistory).where(eq(projectSlugHistory.slug, data.slug));
    if (current.publishedAt) {
      await db.insert(projectSlugHistory).values({ slug: current.slug, projectId: id }).onConflictDoNothing();
    }
  }

  const goingLive = data.status === 'published' && current.status !== 'published';
  await db
    .update(projects)
    .set({
      ...projectFields(data),
      ...(goingLive ? { publishedAt: now } : {}),
      archivedAt: data.status === 'archived' ? (current.status === 'archived' ? undefined : now) : null,
      updatedBy: actor.userId,
    })
    .where(eq(projects.id, id));
  await writeProjectContent(db, id, data);
}

async function writeProjectContent(db: Database, projectId: string, data: ProjectEditorInput) {
  await syncTranslations(data.translations, {
    upsert: (locale, t) =>
      db
        .insert(projectTranslations)
        .values({ projectId, locale, ...t })
        .onConflictDoUpdate({ target: [projectTranslations.projectId, projectTranslations.locale], set: t }),
    remove: (locale) =>
      db
        .delete(projectTranslations)
        .where(and(eq(projectTranslations.projectId, projectId), eq(projectTranslations.locale, locale))),
  });

  // Technologies are a shared vocabulary: new ones are added, existing names are kept.
  await db.delete(projectTechnologies).where(eq(projectTechnologies.projectId, projectId));
  if (data.technologies.length) {
    await db.insert(technologies).values(data.technologies).onConflictDoNothing({ target: technologies.slug });
    const rows = await db
      .select({ id: technologies.id, slug: technologies.slug })
      .from(technologies)
      .where(inArray(technologies.slug, data.technologies.map((t) => t.slug)));
    const idOf = new Map(rows.map((r) => [r.slug, r.id]));
    await db
      .insert(projectTechnologies)
      .values(data.technologies.map((t, sortOrder) => ({ projectId, technologyId: idOf.get(t.slug)!, sortOrder })));
  }
}

/**
 * Applies the editorial order: featured projects first, then the rest, each
 * in list order. Projects missing from the input (created meanwhile) keep
 * their relative order after the listed ones.
 */
export async function saveProjectOrder(db: Database, input: ProjectOrderInput, actor: Actor): Promise<void> {
  const all = await db
    .select({ id: projects.id, featured: projects.featured })
    .from(projects)
    .orderBy(asc(projects.sortOrder), asc(projects.createdAt));
  const known = new Set(all.map((p) => p.id));
  const listed = [
    ...input.featured.map((p) => ({ id: p.id, featured: true })),
    ...input.other.map((p) => ({ id: p.id, featured: false })),
  ].filter((p) => known.has(p.id));
  const listedIds = new Set(listed.map((p) => p.id));
  const order = [...listed, ...all.filter((p) => !listedIds.has(p.id))];
  for (const [sortOrder, { id, featured }] of order.entries()) {
    await db.update(projects).set({ sortOrder, featured, updatedBy: actor.userId }).where(eq(projects.id, id));
  }
}

/** Deletes a project and the media only it used. Returns stored files to remove after commit. */
export async function deleteProject(db: Database, id: string): Promise<StoredObject[]> {
  const links = await db.select({ assetId: projectMedia.assetId }).from(projectMedia).where(eq(projectMedia.projectId, id));
  const deleted = await db.delete(projects).where(eq(projects.id, id)).returning({ id: projects.id });
  if (!deleted.length) throw new NotFoundError('The project');
  return deleteUnreferencedAssets(
    db,
    links.map((l) => l.assetId),
  );
}

export interface NewImage {
  src: string;
  mimeType: string;
  width: number | null;
  height: number | null;
}

type MediaTranslations = ProjectMediaInput['items'][number]['translations'];

const syncMediaTranslations = (db: Database, assetId: string, translations: MediaTranslations) =>
  syncTranslations(translations, {
    upsert: (locale, t) => {
      const values = { alt: t.alt, caption: t.caption ?? null };
      return db
        .insert(mediaAssetTranslations)
        .values({ assetId, locale, ...values })
        .onConflictDoUpdate({ target: [mediaAssetTranslations.assetId, mediaAssetTranslations.locale], set: values });
    },
    remove: (locale) =>
      db
        .delete(mediaAssetTranslations)
        .where(and(eq(mediaAssetTranslations.assetId, assetId), eq(mediaAssetTranslations.locale, locale))),
  });

/** Adds an uploaded image at the end of the gallery; a project's first image becomes its hero. */
export async function insertProjectImage(
  db: Database,
  projectId: string,
  image: NewImage,
  translations: MediaTranslations,
  actor: Actor,
): Promise<string> {
  if (!(await projectExists(db, projectId))) throw new NotFoundError('The project');
  const [asset] = await db
    .insert(mediaAssets)
    .values({ storage: 'blob', ...image, createdBy: actor.userId, updatedBy: actor.userId })
    .returning({ id: mediaAssets.id });
  await syncMediaTranslations(db, asset!.id, translations);
  const links = await db
    .select({ role: projectMedia.role, sortOrder: projectMedia.sortOrder })
    .from(projectMedia)
    .where(eq(projectMedia.projectId, projectId));
  await db.insert(projectMedia).values({
    projectId,
    assetId: asset!.id,
    role: links.some((l) => l.role === 'cover') ? 'gallery' : 'cover',
    sortOrder: Math.max(-1, ...links.map((l) => l.sortOrder)) + 1,
  });
  return asset!.id;
}

/** Points an existing project image at new bytes (text and position kept). Returns the old file. */
export async function replaceProjectImage(
  db: Database,
  projectId: string,
  assetId: string,
  image: NewImage,
  actor: Actor,
): Promise<StoredObject> {
  const [old] = await db
    .select({ storage: mediaAssets.storage, src: mediaAssets.src })
    .from(projectMedia)
    .innerJoin(mediaAssets, eq(mediaAssets.id, projectMedia.assetId))
    .where(and(eq(projectMedia.projectId, projectId), eq(projectMedia.assetId, assetId)))
    .for('update');
  if (!old) throw new NotFoundError('The image');
  await db
    .update(mediaAssets)
    .set({ storage: 'blob', ...image, updatedBy: actor.userId })
    .where(eq(mediaAssets.id, assetId));
  return old;
}

/**
 * Saves a project's image list: order, hero, and text. Images left out are
 * detached (and deleted if nothing else uses them); ids that aren't this
 * project's images are ignored. Returns stored files to remove after commit.
 */
export async function saveProjectMedia(db: Database, input: ProjectMediaInput, actor: Actor): Promise<StoredObject[]> {
  if (!(await projectExists(db, input.projectId))) throw new NotFoundError('The project');
  const ofProject = eq(projectMedia.projectId, input.projectId);
  const existing = new Set(
    (await db.select({ id: projectMedia.assetId }).from(projectMedia).where(ofProject)).map((r) => r.id),
  );
  const items = input.items.filter((i) => existing.has(i.assetId));
  const keep = items.map((i) => i.assetId);

  const removed = [...existing].filter((id) => !keep.includes(id));
  if (removed.length) {
    await db.delete(projectMedia).where(and(ofProject, inArray(projectMedia.assetId, removed)));
    await detachFromCaseStudy(db, input.projectId, removed);
  }

  // Demote first: the one-hero index must hold after every statement.
  await db.update(projectMedia).set({ role: 'gallery' }).where(ofProject);
  for (const [sortOrder, item] of items.entries()) {
    await db
      .update(projectMedia)
      .set({ sortOrder, role: item.isCover ? 'cover' : 'gallery' })
      .where(and(ofProject, eq(projectMedia.assetId, item.assetId)));
    await db.update(mediaAssets).set({ updatedBy: actor.userId }).where(eq(mediaAssets.id, item.assetId));
    await syncMediaTranslations(db, item.assetId, item.translations);
  }
  return deleteUnreferencedAssets(db, removed);
}

/* ── Case study, milestones, related projects ─────────────────────────────── */

/** The project's images, for the editors that reference them (sections, milestones). */
export async function listProjectImages(db: Database, projectId: string): Promise<ProjectImageChoice[]> {
  const { items } = await getProjectMediaValues(db, projectId);
  return items.map((i) => ({ assetId: i.assetId, src: i.src, alt: i.translations.en.alt }));
}

export async function getCaseStudyValues(db: Database, projectId: string): Promise<CaseStudyValues> {
  const rows = await db.query.projectSections.findMany({
    where: eq(projectSections.projectId, projectId),
    orderBy: [asc(projectSections.sortOrder), asc(projectSections.createdAt)],
    with: {
      translations: true,
      items: { orderBy: [asc(projectSectionItems.sortOrder)], with: { translations: true } },
      media: { orderBy: [asc(projectSectionMedia.sortOrder)] },
    },
  });
  return {
    sections: rows.map((row) => ({
      key: row.id,
      id: row.id,
      kind: row.kind,
      visible: row.visible,
      videoUrl: row.videoUrl ?? '',
      translations: localeRecord(
        row.translations,
        (t) => ({ heading: t.heading, body: t.body }),
        () => ({ heading: '', body: [] as string[] }),
      ),
      items: row.items.map((item) => ({
        key: item.id,
        id: item.id,
        translations: localeRecord(
          item.translations,
          (t) => ({ title: t.title, body: t.body ?? '' }),
          () => ({ title: '', body: '' }),
        ),
      })),
      media: row.media.map((m) => m.assetId),
    })),
  };
}

export async function getMilestoneValues(db: Database, projectId: string): Promise<MilestonesValues> {
  const rows = await db.query.projectMilestones.findMany({
    where: eq(projectMilestones.projectId, projectId),
    orderBy: [asc(projectMilestones.sortOrder), asc(projectMilestones.createdAt)],
    with: { translations: true },
  });
  return {
    milestones: rows.map((row) => ({
      key: row.id,
      id: row.id,
      occurredOn: row.occurredOn,
      datePrecision: row.datePrecision,
      kind: row.kind,
      url: row.url ?? '',
      assetId: row.assetId ?? '',
      visible: row.visible,
      translations: localeRecord(
        row.translations,
        (t) => ({ title: t.title, description: t.description ?? '' }),
        () => ({ title: '', description: '' }),
      ),
    })),
  };
}

export async function getRelatedValues(db: Database, projectId: string): Promise<RelatedValues> {
  const rows = await db
    .select({ id: projectRelations.relatedProjectId })
    .from(projectRelations)
    .where(eq(projectRelations.projectId, projectId))
    .orderBy(asc(projectRelations.sortOrder));
  return { related: rows.map((r) => ({ key: r.id, id: r.id })) };
}

/** Every other project, whatever its status (the Related editor's options). */
export async function listProjectChoices(db: Database, exceptId: string): Promise<ProjectChoice[]> {
  return (await listProjectsForAdmin(db))
    .filter((p) => p.id !== exceptId)
    .map(({ id, name, slug, status }) => ({ id, name, slug, status }));
}

/** Locks the project row (so a concurrent delete can't interleave) and fails if it's gone. */
async function lockProject(db: Database, projectId: string) {
  const [row] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).for('update');
  if (!row) throw new NotFoundError('The project');
}

/** Rejects references to images that aren't this project's (one field error per offending path). */
async function assertProjectImages(db: Database, projectId: string, refs: { path: string; ids: readonly string[] }[]) {
  const wanted = refs.flatMap((r) => r.ids);
  if (!wanted.length) return;
  const own = new Set(
    (
      await db
        .select({ id: projectMedia.assetId })
        .from(projectMedia)
        .where(and(eq(projectMedia.projectId, projectId), inArray(projectMedia.assetId, wanted)))
    ).map((r) => r.id),
  );
  const errors = Object.fromEntries(
    refs.filter((r) => r.ids.some((id) => !own.has(id))).map((r) => [r.path, 'Choose images from this project’s media']),
  );
  if (Object.keys(errors).length) throw new FieldValidationError(errors);
}

/**
 * Saves a project's sections: list order is display order; each section's
 * text, entries, and images are replaced by the input's. Runs in the
 * caller's transaction.
 */
export async function saveProjectSections(db: Database, input: ProjectSectionsInput, actor: Actor): Promise<void> {
  const { projectId } = input;
  await lockProject(db, projectId);
  await assertProjectImages(
    db,
    projectId,
    input.sections.map((s, i) => ({ path: `sections.${i}.media`, ids: s.media })),
  );

  const existing = await db
    .select({ id: projectSections.id })
    .from(projectSections)
    .where(eq(projectSections.projectId, projectId));
  const fields = (s: ProjectSectionsInput['sections'][number]) => ({
    kind: s.kind,
    visible: s.visible,
    videoUrl: s.videoUrl ?? null,
    updatedBy: actor.userId,
  });
  const ids = await reconcileList(
    existing.map((r) => r.id),
    input.sections,
    {
      update: (id, s, sortOrder) =>
        db
          .update(projectSections)
          .set({ ...fields(s), sortOrder })
          .where(and(eq(projectSections.id, id), eq(projectSections.projectId, projectId))),
      insert: async (s, sortOrder) => {
        const [row] = await db
          .insert(projectSections)
          .values({ projectId, ...fields(s), sortOrder, createdBy: actor.userId })
          .returning({ id: projectSections.id });
        return row!.id;
      },
      remove: (stale) => db.delete(projectSections).where(inArray(projectSections.id, stale)),
    },
  );

  for (const [i, sectionId] of ids.entries()) {
    const section = input.sections[i]!;
    await syncTranslations(section.translations, {
      upsert: (locale, t) =>
        db
          .insert(projectSectionTranslations)
          .values({ sectionId, locale, ...t })
          .onConflictDoUpdate({ target: [projectSectionTranslations.sectionId, projectSectionTranslations.locale], set: t }),
      remove: (locale) =>
        db
          .delete(projectSectionTranslations)
          .where(and(eq(projectSectionTranslations.sectionId, sectionId), eq(projectSectionTranslations.locale, locale))),
    });

    const items = await db
      .select({ id: projectSectionItems.id })
      .from(projectSectionItems)
      .where(eq(projectSectionItems.sectionId, sectionId));
    const itemIds = await reconcileList(
      items.map((r) => r.id),
      section.items,
      {
        update: (id, _, sortOrder) =>
          db
            .update(projectSectionItems)
            .set({ sortOrder })
            .where(and(eq(projectSectionItems.id, id), eq(projectSectionItems.sectionId, sectionId))),
        insert: async (_, sortOrder) => {
          const [row] = await db
            .insert(projectSectionItems)
            .values({ sectionId, sortOrder })
            .returning({ id: projectSectionItems.id });
          return row!.id;
        },
        remove: (stale) => db.delete(projectSectionItems).where(inArray(projectSectionItems.id, stale)),
      },
    );
    for (const [j, itemId] of itemIds.entries()) {
      await syncTranslations(section.items[j]!.translations, {
        upsert: (locale, t) => {
          const values = { title: t.title, body: t.body ?? null };
          return db
            .insert(projectSectionItemTranslations)
            .values({ itemId, locale, ...values })
            .onConflictDoUpdate({
              target: [projectSectionItemTranslations.itemId, projectSectionItemTranslations.locale],
              set: values,
            });
        },
        remove: (locale) =>
          db
            .delete(projectSectionItemTranslations)
            .where(and(eq(projectSectionItemTranslations.itemId, itemId), eq(projectSectionItemTranslations.locale, locale))),
      });
    }

    await db.delete(projectSectionMedia).where(eq(projectSectionMedia.sectionId, sectionId));
    if (section.media.length) {
      await db
        .insert(projectSectionMedia)
        .values(section.media.map((assetId, sortOrder) => ({ sectionId, assetId, sortOrder })));
    }
  }
}

/** Saves a project's milestones. List position breaks same-date ties; public order is by date. */
export async function saveProjectMilestones(db: Database, input: ProjectMilestonesInput, actor: Actor): Promise<void> {
  const { projectId } = input;
  await lockProject(db, projectId);
  await assertProjectImages(
    db,
    projectId,
    input.milestones.flatMap((m, i) => (m.assetId ? [{ path: `milestones.${i}.assetId`, ids: [m.assetId] }] : [])),
  );

  const existing = await db
    .select({ id: projectMilestones.id })
    .from(projectMilestones)
    .where(eq(projectMilestones.projectId, projectId));
  const fields = (m: ProjectMilestonesInput['milestones'][number]) => ({
    occurredOn: m.occurredOn,
    datePrecision: m.datePrecision,
    kind: m.kind,
    url: m.url ?? null,
    assetId: m.assetId ?? null,
    visible: m.visible,
    updatedBy: actor.userId,
  });
  const ids = await reconcileList(
    existing.map((r) => r.id),
    input.milestones,
    {
      update: (id, m, sortOrder) =>
        db
          .update(projectMilestones)
          .set({ ...fields(m), sortOrder })
          .where(and(eq(projectMilestones.id, id), eq(projectMilestones.projectId, projectId))),
      insert: async (m, sortOrder) => {
        const [row] = await db
          .insert(projectMilestones)
          .values({ projectId, ...fields(m), sortOrder, createdBy: actor.userId })
          .returning({ id: projectMilestones.id });
        return row!.id;
      },
      remove: (stale) => db.delete(projectMilestones).where(inArray(projectMilestones.id, stale)),
    },
  );

  for (const [i, milestoneId] of ids.entries()) {
    await syncTranslations(input.milestones[i]!.translations, {
      upsert: (locale, t) => {
        const values = { title: t.title, description: t.description ?? null };
        return db
          .insert(projectMilestoneTranslations)
          .values({ milestoneId, locale, ...values })
          .onConflictDoUpdate({
            target: [projectMilestoneTranslations.milestoneId, projectMilestoneTranslations.locale],
            set: values,
          });
      },
      remove: (locale) =>
        db
          .delete(projectMilestoneTranslations)
          .where(
            and(eq(projectMilestoneTranslations.milestoneId, milestoneId), eq(projectMilestoneTranslations.locale, locale)),
          ),
    });
  }
}

/**
 * Replaces a project's related projects. Ids of projects that don't exist are
 * dropped (never trusted); validation already rejected self-references and
 * duplicates. Publication isn't checked here: public pages show only the
 * related projects that are published.
 */
export async function saveProjectRelations(db: Database, input: ProjectRelationsInput, actor: Actor): Promise<void> {
  const { projectId } = input;
  await lockProject(db, projectId);
  const wanted = [...new Set(input.related.map((r) => r.id))].filter((id) => id !== projectId);
  const known = new Set(
    wanted.length
      ? (await db.select({ id: projects.id }).from(projects).where(inArray(projects.id, wanted))).map((r) => r.id)
      : [],
  );
  await db.delete(projectRelations).where(eq(projectRelations.projectId, projectId));
  const rows = wanted
    .filter((id) => known.has(id))
    .map((relatedProjectId, sortOrder) => ({ projectId, relatedProjectId, sortOrder }));
  if (rows.length) await db.insert(projectRelations).values(rows);
  await db.update(projects).set({ updatedBy: actor.userId }).where(eq(projects.id, projectId));
}

/** Drops a project's section and milestone references to images it no longer has. */
async function detachFromCaseStudy(db: Database, projectId: string, assetIds: string[]) {
  const sections = db.select({ id: projectSections.id }).from(projectSections).where(eq(projectSections.projectId, projectId));
  await db
    .delete(projectSectionMedia)
    .where(and(inArray(projectSectionMedia.sectionId, sections), inArray(projectSectionMedia.assetId, assetIds)));
  await db
    .update(projectMilestones)
    .set({ assetId: null })
    .where(and(eq(projectMilestones.projectId, projectId), inArray(projectMilestones.assetId, assetIds)));
}

/* ── GitHub repositories (the GitHub tab) ────────────────────────────────── */

export interface StoredRepository {
  id: string;
  owner: string;
  name: string;
  githubId: number | null;
  label: RepositoryLabel | null;
  isPrimary: boolean;
}

export async function listProjectRepositories(db: Database, projectId: string): Promise<StoredRepository[]> {
  return db
    .select({
      id: projectRepositories.id,
      owner: projectRepositories.owner,
      name: projectRepositories.name,
      githubId: projectRepositories.githubId,
      label: projectRepositories.label,
      isPrimary: projectRepositories.isPrimary,
    })
    .from(projectRepositories)
    .where(eq(projectRepositories.projectId, projectId))
    .orderBy(asc(projectRepositories.sortOrder), asc(projectRepositories.createdAt));
}

export async function getRepositoriesValues(db: Database, projectId: string): Promise<Omit<RepositoriesValues, 'checks'> | null> {
  const [project] = await db
    .select({ visible: projects.githubAnalyticsVisible })
    .from(projects)
    .where(eq(projects.id, projectId));
  if (!project) return null;
  const rows = await listProjectRepositories(db, projectId);
  return {
    analyticsVisible: project.visible,
    repositories: rows.map((r) => ({
      key: r.id,
      id: r.id,
      input: `${r.owner}/${r.name}`,
      label: r.label ?? '',
      isPrimary: r.isPrimary,
    })),
  };
}

/** An association ready to store: verified against GitHub by the service (or kept as it was). */
export interface RepositoryWrite {
  id?: string;
  owner: string;
  name: string;
  githubId: number | null;
  label: RepositoryLabel | null;
  isPrimary: boolean;
}

/**
 * Replaces a project's repositories (list position is display order) and its
 * analytics switch. Every row is first parked on a name nobody can use (its
 * own id), so renames and swaps never trip the unique indexes mid-transaction.
 */
export async function saveProjectRepositories(
  db: Database,
  projectId: string,
  analyticsVisible: boolean,
  rows: readonly RepositoryWrite[],
  actor: Actor,
): Promise<void> {
  await lockProject(db, projectId);
  const ofProject = eq(projectRepositories.projectId, projectId);
  const existing = await db.select({ id: projectRepositories.id }).from(projectRepositories).where(ofProject);
  await db
    .update(projectRepositories)
    .set({ name: sql`${projectRepositories.id}::text`, githubId: null })
    .where(ofProject);

  const fields = ({ owner, name, githubId, label, isPrimary }: RepositoryWrite) => ({ owner, name, githubId, label, isPrimary });
  await reconcileList(
    existing.map((r) => r.id),
    rows,
    {
      update: (id, r, sortOrder) =>
        db
          .update(projectRepositories)
          .set({ ...fields(r), sortOrder })
          .where(and(eq(projectRepositories.id, id), ofProject)),
      insert: async (r, sortOrder) => {
        const [row] = await db
          .insert(projectRepositories)
          .values({ projectId, ...fields(r), sortOrder })
          .returning({ id: projectRepositories.id });
        return row!.id;
      },
      remove: (ids) => db.delete(projectRepositories).where(inArray(projectRepositories.id, ids)),
    },
  );
  await db
    .update(projects)
    .set({ githubAnalyticsVisible: analyticsVisible, updatedBy: actor.userId })
    .where(eq(projects.id, projectId));
}
