import 'server-only';
import { getDb, withTransaction } from '@/db/client';
import { type DocumentStore, privateStore } from '@/integrations/blob/private-store';
import { FieldValidationError, NotFoundError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';
import { isPdf, MAX_PDF_BYTES, PDF_MIME_TYPE, safePdfFileName } from '@/lib/pdf-file';
import * as repo from './repository';
import type { ResumeLabelInput, ResumeUploadMetaInput } from './schema';
import type { ResumeAdminValues } from './types';

/**
 * Resume administration: versioned PDFs in the private Blob store, one
 * explicitly published version. Input is already validated and the caller
 * already authorized; nothing here knows about React, forms, or HTTP, so a
 * future API route can call the same functions.
 *
 * Rules:
 * - An upload never publishes. Publishing is its own step, and any version
 *   (including an older one) can be published.
 * - The published version can't be deleted: publish another or unpublish first.
 * - Storage consistency: a file is written before its row (a failed insert
 *   deletes the file again) and deleted only after its row is gone (a failed
 *   delete is logged as an orphan, never a failed operation). The database
 *   never points at a missing file.
 */

const log = createLogger('resume');

export async function loadResumeAdmin(store: DocumentStore = privateStore): Promise<ResumeAdminValues> {
  return { versions: await repo.listResumeVersions(await getDb()), storageConfigured: store.configured() };
}

export async function uploadResume(
  data: { bytes: Uint8Array; fileName: string | null } & ResumeUploadMetaInput,
  actor: repo.Actor,
  store: DocumentStore = privateStore,
): Promise<ResumeAdminValues> {
  if (!store.configured()) {
    throw new FieldValidationError({ file: 'Resume storage is not configured (connect a private Vercel Blob store).' });
  }
  if (data.bytes.byteLength === 0) throw new FieldValidationError({ file: 'Choose a PDF to upload' });
  if (data.bytes.byteLength > MAX_PDF_BYTES) throw new FieldValidationError({ file: 'PDFs can be at most 4 MB' });
  if (!isPdf(data.bytes)) throw new FieldValidationError({ file: 'This file is not a complete PDF' });

  const pathname = `resumes/${crypto.randomUUID()}.pdf`;
  await store.put(pathname, data.bytes, PDF_MIME_TYPE);
  try {
    await repo.insertResumeVersion(
      await getDb(),
      { pathname, fileName: safePdfFileName(data.fileName), sizeBytes: data.bytes.byteLength, label: data.label },
      actor,
    );
  } catch (err) {
    await removeFiles(store, [pathname]);
    throw err;
  }
  return loadResumeAdmin(store);
}

export async function publishResume(id: string, actor: repo.Actor): Promise<ResumeAdminValues> {
  await withTransaction(async (tx) => {
    // Throwing rolls back the cleared pointer too: nothing changes for an unknown id.
    if (!(await repo.publishResumeVersion(tx, id, actor))) throw new NotFoundError('The resume version');
  });
  return loadResumeAdmin();
}

export async function unpublishResume(actor: repo.Actor): Promise<ResumeAdminValues> {
  await repo.unpublishResume(await getDb(), actor);
  return loadResumeAdmin();
}

export async function updateResumeLabel(data: ResumeLabelInput, actor: repo.Actor): Promise<ResumeAdminValues> {
  if (!(await repo.setResumeLabel(await getDb(), data.id, data.label, actor))) throw new NotFoundError('The resume version');
  return loadResumeAdmin();
}

export async function deleteResume(id: string, store: DocumentStore = privateStore): Promise<ResumeAdminValues> {
  const db = await getDb();
  const deleted = await repo.deleteUnpublishedResume(db, id);
  if (!deleted) {
    if (!(await repo.findResumeVersion(db, id))) throw new NotFoundError('The resume version');
    throw new FieldValidationError({ id: 'This is the published resume. Publish another version or unpublish it first.' });
  }
  await removeFiles(store, [deleted.pathname]);
  return loadResumeAdmin(store);
}

/** Best-effort removal of files the database no longer references. */
async function removeFiles(store: DocumentStore, pathnames: readonly string[]) {
  try {
    await store.remove(pathnames);
  } catch (err) {
    log.error('Could not delete stored resumes; they are orphaned', err, { pathnames });
  }
}
