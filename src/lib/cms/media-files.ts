import 'server-only';
import type { StoredObject } from '@/db/media';
import type { MediaStore } from '@/integrations/blob/store';
import type { Logger } from '@/lib/logger';

/**
 * Best-effort removal of uploaded files the database no longer references,
 * run after the transaction that dropped them commits. Static and external
 * assets are never deleted. A failure is logged (an orphaned file), never a
 * failed save.
 */
export async function removeStoredFiles(store: MediaStore, files: readonly StoredObject[], log: Logger): Promise<void> {
  const urls = files.filter((f) => f.storage === 'blob').map((f) => f.src);
  if (!urls.length) return;
  try {
    await store.remove(urls);
  } catch (err) {
    log.error('Could not delete stored images; they are orphaned', err, { urls });
  }
}
