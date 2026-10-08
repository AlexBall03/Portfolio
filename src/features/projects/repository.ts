import 'server-only';
import { and, asc, eq, inArray, max, ne, or, type SQL } from 'drizzle-orm';
import {
  mediaAssets,
  mediaAssetTranslations,
  profile,
  projectMedia,
  projectRepositories,
  projects,
  projectSlugHistory,
  projectTechnologies,
  projectTranslations,
  technologies,
} from '@/db/schema';
import type { Database } from '@/db/types';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/config';
import { mapTranslated, pickTranslation } from '@/i18n/translations';
import { localeRecord, translationStatus } from '@/lib/cms/locale';
import { reconcileList, syncTranslations } from '@/lib/cms/write';
import { FieldValidationError, NotFoundError } from '@/lib/errors';
import { type MediaStorage, resolveMedia } from '@/lib/media';
import { projectTranslationInput, type ProjectEditorInput, type ProjectMediaInput, type ProjectOrderInput } from './schema';
import type {
  Project,
  ProjectListItem,
  ProjectLookup,
  ProjectMediaValues,
  ProjectOrderValues,
  ProjectValues,
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
 * Resolves a public slug: the current slug renders the project, a retired slug
 * redirects to the current one, anything else (including drafts) is not found.
 */
export async function findProjectBySlug(db: Database, slug: string, locale: Locale): Promise<ProjectLookup> {
  const [row] = await queryProjects(db, and(published, eq(projects.slug, slug)));
  if (row) {
    const [project] = mapTranslated([row], locale, (r, t) => toProject(r, t, locale));
    return project ? { kind: 'found', project } : { kind: 'not-found' };
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

/** Any project, whatever its status, as the public page would render it (admin preview). */
export async function findProjectForPreview(db: Database, id: string, locale: Locale): Promise<Project | null> {
  const [row] = await queryProjects(db, eq(projects.id, id));
  if (!row) return null;
  return mapTranslated([row], locale, (r, t) => toProject(r, t, locale))[0] ?? null;
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
    with: { translations: true, technologies: { with: { technology: true } }, repositories: true },
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
    repositories: [...row.repositories]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((r) => ({ key: r.id, id: r.id, owner: r.owner, name: r.name, isPrimary: r.isPrimary })),
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

/** A stored file the caller must delete from object storage after the transaction commits. */
export interface StoredObject {
  storage: MediaStorage;
  src: string;
}

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

  const existing = await db
    .select({ id: projectRepositories.id })
    .from(projectRepositories)
    .where(eq(projectRepositories.projectId, projectId));
  await reconcileList(
    existing.map((r) => r.id),
    data.repositories,
    {
      update: (id, { owner, name, isPrimary }, sortOrder) =>
        db
          .update(projectRepositories)
          .set({ owner, name, isPrimary, sortOrder })
          .where(and(eq(projectRepositories.id, id), eq(projectRepositories.projectId, projectId))),
      insert: async ({ owner, name, isPrimary }, sortOrder) => {
        const [row] = await db
          .insert(projectRepositories)
          .values({ projectId, owner, name, isPrimary, sortOrder })
          .returning({ id: projectRepositories.id });
        return row!.id;
      },
      remove: (ids) => db.delete(projectRepositories).where(inArray(projectRepositories.id, ids)),
    },
  );
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

/** Deletes the given assets unless another project or the profile still uses them. */
async function deleteUnreferencedAssets(db: Database, ids: string[]): Promise<StoredObject[]> {
  if (!ids.length) return [];
  const linked = await db.select({ id: projectMedia.assetId }).from(projectMedia).where(inArray(projectMedia.assetId, ids));
  const profileRefs = await db
    .select({ headshot: profile.headshotAssetId, resume: profile.resumeAssetId })
    .from(profile)
    .where(or(inArray(profile.headshotAssetId, ids), inArray(profile.resumeAssetId, ids)));
  const stillUsed = new Set([...linked.map((r) => r.id), ...profileRefs.flatMap((r) => [r.headshot, r.resume])]);
  const orphaned = ids.filter((id) => !stillUsed.has(id));
  if (!orphaned.length) return [];
  return db
    .delete(mediaAssets)
    .where(inArray(mediaAssets.id, orphaned))
    .returning({ storage: mediaAssets.storage, src: mediaAssets.src });
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
  if (removed.length) await db.delete(projectMedia).where(and(ofProject, inArray(projectMedia.assetId, removed)));

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
