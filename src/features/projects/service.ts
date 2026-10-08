import 'server-only';
import { getDb, withTransaction } from '@/db/client';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import { blobStore, type MediaStore } from '@/integrations/blob/store';
import { blankLocales } from '@/lib/cms/locale';
import { FieldValidationError, NotFoundError } from '@/lib/errors';
import { MAX_IMAGE_BYTES, sniffImage } from '@/lib/image-file';
import { createLogger } from '@/lib/logger';
import * as repo from './repository';
import type { ProjectEditorInput, ProjectMediaInput, ProjectOrderInput, UploadMetaInput } from './schema';
import type { Project, ProjectMediaValues, ProjectValues } from './types';

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
    repositories: [],
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

/** A project as its public page would render it, whatever its status. */
export async function loadProjectPreview(id: string, locale: Locale = DEFAULT_LOCALE): Promise<Project | null> {
  return repo.findProjectForPreview(await getDb(), id, locale);
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
