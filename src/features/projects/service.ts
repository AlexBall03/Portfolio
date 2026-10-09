import 'server-only';
import { getDb, withTransaction } from '@/db/client';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import { blobStore, type MediaStore } from '@/integrations/blob/store';
import { blankLocales } from '@/lib/cms/locale';
import { FieldValidationError, NotFoundError } from '@/lib/errors';
import { MAX_IMAGE_BYTES, sniffImage } from '@/lib/image-file';
import { createLogger } from '@/lib/logger';
import { githubConfigured, resolvePublicRepository, type RepositoryResolution } from '@/features/github/project';
import { loadRepoMetadata, repoKey } from '@/features/github/repo-data';
import type { RepositoryRef } from '@/lib/github-repository';
import * as repo from './repository';
import type {
  ProjectEditorInput,
  ProjectMediaInput,
  ProjectMilestonesInput,
  ProjectOrderInput,
  ProjectRelationsInput,
  ProjectRepositoriesInput,
  ProjectSectionsInput,
  UploadMetaInput,
} from './schema';
import type {
  CaseStudyValues,
  MilestonesValues,
  ProjectCaseStudy,
  ProjectMediaValues,
  ProjectValues,
  RelatedValues,
  RepositoriesValues,
  RepositoryCheck,
} from './types';

/**
 * Project administration: the domain operations behind the admin editors and
 * the media upload routes. Input is already validated and the caller already
 * authorized; nothing here knows about React, forms, or HTTP, so a future API
 * route or SDLC Manager sync can call the same functions.
 *
 * Storage consistency: files are written to object storage before the
 * database transaction (a failed transaction deletes the new file again), and
 * deleted only after the transaction commits (a failed delete is logged and
 * never undoes the save). The database never points at a missing file.
 */

const log = createLogger('projects');

export function blankProject(): ProjectValues {
  return {
    id: null,
    slug: '',
    status: 'draft',
    featured: false,
    isLive: false,
    demoUrl: '',
    sourceUrl: '',
    detailsUrl: '',
    technologies: [],
    translations: blankLocales(() => ({ name: '', tagline: '', summary: '', body: [] })),
    publishedAt: null,
  };
}

export async function loadProjectList() {
  return repo.listProjectsForAdmin(await getDb());
}

export async function loadProject(id: string): Promise<ProjectValues | null> {
  return repo.getProjectValues(await getDb(), id);
}

export async function loadTechnologies() {
  return repo.listTechnologies(await getDb());
}

/** A project as its public page would render it, whatever its status, with hidden content flagged. */
export async function loadProjectPreview(id: string, locale: Locale = DEFAULT_LOCALE): Promise<ProjectCaseStudy | null> {
  return repo.findProjectForPreview(await getDb(), id, locale);
}

/** Published projects, for the preview's related-projects section (the same set public pages use). */
export async function loadPublishedProjects(locale: Locale = DEFAULT_LOCALE) {
  return repo.listPublishedProjects(await getDb(), locale);
}

export async function loadProjectOrder() {
  return repo.getProjectOrderValues(await getDb());
}

export async function loadProjectMedia(projectId: string): Promise<ProjectMediaValues | null> {
  const db = await getDb();
  if (!(await repo.projectExists(db, projectId))) return null;
  return repo.getProjectMediaValues(db, projectId);
}

const reload = async (id: string) => {
  const values = await loadProject(id);
  if (!values) throw new NotFoundError('The project');
  return values;
};

export async function createProject(data: ProjectEditorInput, actor: repo.Actor): Promise<ProjectValues> {
  const id = await withTransaction((tx) => repo.insertProject(tx, data, actor, new Date()));
  return reload(id);
}

/** Saves a project; its status in `data` makes this a plain save, a publish, or an unpublish. */
export async function saveProject(data: ProjectEditorInput, actor: repo.Actor): Promise<ProjectValues> {
  const id = data.id;
  if (!id) throw new NotFoundError('The project');
  await withTransaction((tx) => repo.updateProject(tx, id, data, actor, new Date()));
  return reload(id);
}

/** Deletes a project once the caller repeats its slug (a guard against deleting the wrong one). */
export async function deleteProject(
  data: { id: string; confirmSlug: string },
  store: MediaStore = blobStore,
): Promise<{ id: string }> {
  const current = await loadProject(data.id);
  if (!current) throw new NotFoundError('The project');
  if (data.confirmSlug !== current.slug) {
    throw new FieldValidationError({ confirmSlug: `Type "${current.slug}" to confirm` });
  }
  const files = await withTransaction((tx) => repo.deleteProject(tx, data.id));
  await removeFiles(store, files);
  return { id: data.id };
}

export async function saveProjectOrder(data: ProjectOrderInput, actor: repo.Actor) {
  await withTransaction((tx) => repo.saveProjectOrder(tx, data, actor));
  return loadProjectOrder();
}

export async function saveProjectMedia(
  data: ProjectMediaInput,
  actor: repo.Actor,
  store: MediaStore = blobStore,
): Promise<ProjectMediaValues> {
  const files = await withTransaction((tx) => repo.saveProjectMedia(tx, data, actor));
  await removeFiles(store, files);
  return (await loadProjectMedia(data.projectId)) ?? { items: [] };
}

/* ── Case study, milestones, related projects ───────────────────────────────
 * Each save is one transaction, then a re-read (the editor's new baseline).
 * Like every project edit, it is public at once if the project is published;
 * new sections and milestones start hidden, so they can be drafted first.
 */

/** Everything the Case study editor needs, or null for an unknown project. */
export async function loadProjectCaseStudy(projectId: string) {
  const db = await getDb();
  if (!(await repo.projectExists(db, projectId))) return null;
  const [values, images] = await Promise.all([repo.getCaseStudyValues(db, projectId), repo.listProjectImages(db, projectId)]);
  return { values, images };
}

export async function loadProjectMilestones(projectId: string) {
  const db = await getDb();
  if (!(await repo.projectExists(db, projectId))) return null;
  const [values, images] = await Promise.all([repo.getMilestoneValues(db, projectId), repo.listProjectImages(db, projectId)]);
  return { values, images };
}

export async function loadProjectRelated(projectId: string) {
  const db = await getDb();
  if (!(await repo.projectExists(db, projectId))) return null;
  const [values, choices] = await Promise.all([repo.getRelatedValues(db, projectId), repo.listProjectChoices(db, projectId)]);
  return { values, choices };
}

export async function saveProjectSections(data: ProjectSectionsInput, actor: repo.Actor): Promise<CaseStudyValues> {
  await withTransaction((tx) => repo.saveProjectSections(tx, data, actor));
  return repo.getCaseStudyValues(await getDb(), data.projectId);
}

export async function saveProjectMilestones(data: ProjectMilestonesInput, actor: repo.Actor): Promise<MilestonesValues> {
  await withTransaction((tx) => repo.saveProjectMilestones(tx, data, actor));
  return repo.getMilestoneValues(await getDb(), data.projectId);
}

export async function saveProjectRelations(data: ProjectRelationsInput, actor: repo.Actor): Promise<RelatedValues> {
  await withTransaction((tx) => repo.saveProjectRelations(tx, data, actor));
  return repo.getRelatedValues(await getDb(), data.projectId);
}

/* ── GitHub repositories ─────────────────────────────────────────────────────
 * Associations are verified against GitHub when they're added or changed: only
 * public repositories, stored with GitHub's stable id and canonical name. The
 * analytics switch keeps the Phase 4 contract: saving is public at once on a
 * published project, and analytics start off so they can be checked in Preview.
 */

/** What GitHub currently says about each stored row (cached metadata; the same reads the public page uses). */
async function checkRepositories(rows: readonly repo.StoredRepository[]): Promise<Record<string, RepositoryCheck>> {
  if (!rows.length) return {};
  if (!githubConfigured()) return Object.fromEntries(rows.map((r) => [r.id, { status: 'unconfigured' } as const]));
  const results = await Promise.allSettled(rows.map((r) => loadRepoMetadata(repoKey(r))));
  return Object.fromEntries(
    rows.map((r, i): [string, RepositoryCheck] => {
      const result = results[i]!;
      if (result.status === 'rejected') return [r.id, { status: 'unreachable' }];
      const meta = result.value;
      if (meta.state !== 'public') return [r.id, { status: meta.state }];
      const stored = `${r.owner}/${r.name}`;
      const renamedTo = meta.repo.fullName.toLowerCase() === stored.toLowerCase() ? null : meta.repo.fullName;
      return [r.id, { status: 'public', archived: meta.repo.archived, renamedTo }];
    }),
  );
}

export async function loadProjectRepositories(projectId: string): Promise<RepositoriesValues | null> {
  const db = await getDb();
  const values = await repo.getRepositoriesValues(db, projectId);
  if (!values) return null;
  return { ...values, checks: await checkRepositories(await repo.listProjectRepositories(db, projectId)) };
}

const RESOLUTION_ERRORS: Record<Exclude<RepositoryResolution['status'], 'public'>, string> = {
  private: 'Only public repositories can be added',
  'not-found': 'Repository not found on GitHub (or not public)',
  unavailable: 'Couldn’t reach GitHub to verify this repository. Try again in a moment.',
  unconfigured: 'GitHub isn’t configured, so the repository can’t be verified',
};

const sameName = (a: RepositoryRef, b: RepositoryRef) =>
  a.owner.toLowerCase() === b.owner.toLowerCase() && a.name.toLowerCase() === b.name.toLowerCase();

/**
 * Saves the GitHub tab. New, changed, or never-verified rows are resolved
 * through GitHub (`resolve` is injectable for tests); a row whose name is
 * unchanged and already has an id is stored as it was. A never-verified row
 * whose name didn't change is kept unverified if GitHub can't be reached, so
 * an outage never blocks unrelated edits.
 */
export async function saveProjectRepositories(
  data: ProjectRepositoriesInput,
  actor: repo.Actor,
  resolve: (ref: RepositoryRef) => Promise<RepositoryResolution> = resolvePublicRepository,
): Promise<RepositoriesValues> {
  const db = await getDb();
  if (!(await repo.projectExists(db, data.projectId))) throw new NotFoundError('The project');
  const stored = new Map((await repo.listProjectRepositories(db, data.projectId)).map((r) => [r.id, r]));

  const errors: Record<string, string> = {};
  const rows = await Promise.all(
    data.repositories.map(async (r, i): Promise<repo.RepositoryWrite | null> => {
      const prev = r.id ? stored.get(r.id) : undefined;
      const unchanged = prev !== undefined && sameName(prev, r.input);
      const keep = { id: r.id, label: r.label ?? null, isPrimary: r.isPrimary };
      if (unchanged && prev.githubId) return { ...keep, owner: prev.owner, name: prev.name, githubId: prev.githubId };

      const resolved = await resolve(r.input);
      if (resolved.status === 'public') {
        return { ...keep, owner: resolved.owner, name: resolved.name, githubId: resolved.id };
      }
      if (unchanged && (resolved.status === 'unavailable' || resolved.status === 'unconfigured')) {
        return { ...keep, owner: prev.owner, name: prev.name, githubId: null };
      }
      errors[`repositories.${i}.input`] = RESOLUTION_ERRORS[resolved.status];
      return null;
    }),
  );

  // Two entries can name one repository (an old name and its new one): compare GitHub ids.
  const ids = new Map<number, number>();
  rows.forEach((r, i) => {
    if (!r?.githubId) return;
    if (ids.has(r.githubId)) errors[`repositories.${i}.input`] = 'This is the same repository as another entry (it may have been renamed)';
    else ids.set(r.githubId, i);
  });
  if (Object.keys(errors).length) throw new FieldValidationError(errors);

  await withTransaction((tx) =>
    repo.saveProjectRepositories(tx, data.projectId, data.analyticsVisible, rows as repo.RepositoryWrite[], actor),
  );
  return (await loadProjectRepositories(data.projectId))!;
}

/** Checks an uploaded file by its bytes (never its name or declared type). */
function checkImage(bytes: Uint8Array, store: MediaStore) {
  if (!store.configured()) {
    throw new FieldValidationError({ file: 'Image storage is not configured (connect a Vercel Blob store).' });
  }
  if (bytes.byteLength === 0) throw new FieldValidationError({ file: 'Choose an image to upload' });
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new FieldValidationError({ file: 'Images can be at most 4 MB' });
  const image = sniffImage(bytes);
  if (!image) throw new FieldValidationError({ file: 'Use a JPEG, PNG, WebP, or AVIF image' });
  return image;
}

/** Writes a file under a server-chosen, unguessable path, then runs `write`; undoes the file if `write` fails. */
async function storeThen<T>(
  store: MediaStore,
  projectId: string,
  bytes: Uint8Array,
  write: (image: repo.NewImage) => Promise<T>,
): Promise<T> {
  const sniffed = checkImage(bytes, store);
  const src = await store.put(`projects/${projectId}/${crypto.randomUUID()}.${sniffed.ext}`, bytes, sniffed.mimeType);
  try {
    return await write({ src, mimeType: sniffed.mimeType, width: sniffed.width, height: sniffed.height });
  } catch (err) {
    await removeFiles(store, [{ storage: 'blob', src }]);
    throw err;
  }
}

export async function uploadProjectImage(
  data: { projectId: string; bytes: Uint8Array } & UploadMetaInput,
  actor: repo.Actor,
  store: MediaStore = blobStore,
): Promise<ProjectMediaValues> {
  if (!(await repo.projectExists(await getDb(), data.projectId))) throw new NotFoundError('The project');
  await storeThen(store, data.projectId, data.bytes, (image) =>
    withTransaction((tx) => repo.insertProjectImage(tx, data.projectId, image, data.translations, actor)),
  );
  return (await loadProjectMedia(data.projectId)) ?? { items: [] };
}

export async function replaceProjectImage(
  data: { projectId: string; assetId: string; bytes: Uint8Array },
  actor: repo.Actor,
  store: MediaStore = blobStore,
): Promise<ProjectMediaValues> {
  const current = await loadProjectMedia(data.projectId);
  if (!current?.items.some((i) => i.assetId === data.assetId)) throw new NotFoundError('The image');
  const old = await storeThen(store, data.projectId, data.bytes, (image) =>
    withTransaction((tx) => repo.replaceProjectImage(tx, data.projectId, data.assetId, image, actor)),
  );
  await removeFiles(store, [old]);
  return (await loadProjectMedia(data.projectId)) ?? { items: [] };
}

/** Best-effort removal of uploaded files the database no longer references. */
async function removeFiles(store: MediaStore, files: readonly repo.StoredObject[]) {
  const urls = files.filter((f) => f.storage === 'blob').map((f) => f.src);
  if (!urls.length) return;
  try {
    await store.remove(urls);
  } catch (err) {
    log.error('Could not delete stored images; they are orphaned', err, { urls });
  }
}
