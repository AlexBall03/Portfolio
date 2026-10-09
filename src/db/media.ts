import 'server-only';
import { inArray, or } from 'drizzle-orm';
import { mediaAssets, profile, projectMedia } from '@/db/schema';
import type { Database } from '@/db/types';
import type { MediaStorage } from '@/lib/media';

/**
 * Media asset bookkeeping shared by every domain that owns images (projects,
 * the profile headshot). An asset can be referenced from several places, so
 * it is only deleted once nothing points at it any more.
 */

/** A stored file the caller must delete from object storage after the transaction commits. */
export interface StoredObject {
  storage: MediaStorage;
  src: string;
}

/** Deletes the given assets unless a project or the profile still uses them. Returns their files. */
export async function deleteUnreferencedAssets(db: Database, ids: readonly (string | null | undefined)[]): Promise<StoredObject[]> {
  const candidates = ids.filter((id): id is string => Boolean(id));
  if (!candidates.length) return [];
  const linked = await db
    .select({ id: projectMedia.assetId })
    .from(projectMedia)
    .where(inArray(projectMedia.assetId, candidates));
  const profileRefs = await db
    .select({ headshot: profile.headshotAssetId, resume: profile.resumeAssetId })
    .from(profile)
    .where(or(inArray(profile.headshotAssetId, candidates), inArray(profile.resumeAssetId, candidates)));
  const stillUsed = new Set([...linked.map((r) => r.id), ...profileRefs.flatMap((r) => [r.headshot, r.resume])]);
  const orphaned = candidates.filter((id) => !stillUsed.has(id));
  if (!orphaned.length) return [];
  return db
    .delete(mediaAssets)
    .where(inArray(mediaAssets.id, orphaned))
    .returning({ storage: mediaAssets.storage, src: mediaAssets.src });
}
