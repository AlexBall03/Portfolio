import 'server-only';
import { getDb } from '@/db/client';
import { type DocumentStore, privateStore, type StoredDocument } from '@/integrations/blob/private-store';
import { createLogger } from '@/lib/logger';
import { PDF_MIME_TYPE } from '@/lib/pdf-file';
import * as repo from './repository';

/**
 * Reading stored resumes for the two delivery routes: the public one
 * (published version only) and the admin one (any version). Read-only, so
 * the public route never imports the write service. Bytes are streamed
 * through the function, never redirected, so no Blob URL reaches a browser.
 */

const log = createLogger('resume');

export interface OpenedResume {
  fileName: string;
  file: StoredDocument;
}

/** Any version's file, for the admin route. Null when the version or its file is gone. */
export async function openResumeVersion(id: string, store: DocumentStore = privateStore): Promise<OpenedResume | null> {
  const version = await repo.findResumeVersion(await getDb(), id);
  return version && openFile(version, store);
}

/** The published version's file only, for public delivery. Null when nothing is published. */
export async function openPublishedResume(store: DocumentStore = privateStore): Promise<OpenedResume | null> {
  const version = await repo.findPublishedResume(await getDb());
  return version && openFile(version, store);
}

async function openFile(version: repo.StoredResume, store: DocumentStore): Promise<OpenedResume | null> {
  if (!store.configured()) return null;
  try {
    const file = await store.get(version.pathname);
    if (!file) log.warn('A resume version has no stored file', { id: version.id });
    return file && { fileName: version.fileName, file };
  } catch (err) {
    log.error('Could not read a stored resume', err, { id: version.id });
    return null;
  }
}

export function pdfResponse(
  { fileName, file }: OpenedResume,
  { disposition, cacheControl }: { disposition: 'inline' | 'attachment'; cacheControl: string },
): Response {
  return new Response(file.stream, {
    headers: {
      'Content-Type': PDF_MIME_TYPE,
      'Content-Length': String(file.size),
      // `fileName` is sanitized to [A-Za-z0-9._-] on upload, so it is safe to quote.
      'Content-Disposition': `${disposition}; filename="${fileName}"`,
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
