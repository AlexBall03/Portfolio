import 'server-only';
import { and, desc, eq, not } from 'drizzle-orm';
import { resumeVersions } from '@/db/schema';
import type { Database } from '@/db/types';
import type { ResumeVersion } from './types';

export interface Actor {
  userId: string;
}

/** A version's storage details: server-side only, never sent to a client. */
export interface StoredResume {
  id: string;
  pathname: string;
  fileName: string;
  sizeBytes: number;
  isPublished: boolean;
}

const stored = {
  id: resumeVersions.id,
  pathname: resumeVersions.pathname,
  fileName: resumeVersions.fileName,
  sizeBytes: resumeVersions.sizeBytes,
  isPublished: resumeVersions.isPublished,
};

type Row = typeof resumeVersions.$inferSelect;

const toVersion = (row: Row): ResumeVersion => ({
  id: row.id,
  label: row.label,
  fileName: row.fileName,
  sizeBytes: row.sizeBytes,
  isPublished: row.isPublished,
  uploadedAt: row.createdAt.toISOString(),
  publishedAt: row.publishedAt?.toISOString() ?? null,
  uploadedBy: row.createdBy,
});

/** Every version, newest upload first. */
export async function listResumeVersions(db: Database): Promise<ResumeVersion[]> {
  const rows = await db.select().from(resumeVersions).orderBy(desc(resumeVersions.createdAt), desc(resumeVersions.id));
  return rows.map(toVersion);
}

export async function findResumeVersion(db: Database, id: string): Promise<StoredResume | null> {
  const [row] = await db.select(stored).from(resumeVersions).where(eq(resumeVersions.id, id));
  return row ?? null;
}

/** The one published version, if any (the partial unique index allows at most one). */
export async function findPublishedResume(db: Database): Promise<StoredResume | null> {
  const [row] = await db.select(stored).from(resumeVersions).where(eq(resumeVersions.isPublished, true));
  return row ?? null;
}

export async function insertResumeVersion(
  db: Database,
  data: { pathname: string; fileName: string; sizeBytes: number; label: string | null },
  actor: Actor,
): Promise<string> {
  const [row] = await db
    .insert(resumeVersions)
    .values({ ...data, isPublished: false, createdBy: actor.userId, updatedBy: actor.userId })
    .returning({ id: resumeVersions.id });
  return row!.id;
}

/** False when the version doesn't exist. */
export async function setResumeLabel(db: Database, id: string, label: string | null, actor: Actor): Promise<boolean> {
  const rows = await db
    .update(resumeVersions)
    .set({ label, updatedBy: actor.userId })
    .where(eq(resumeVersions.id, id))
    .returning({ id: resumeVersions.id });
  return rows.length > 0;
}

/**
 * Makes `id` the published version. Run in a transaction: the current one is
 * cleared first so the one-published index never sees two. False (and
 * nothing changed, once the transaction rolls back) when `id` doesn't exist.
 */
export async function publishResumeVersion(tx: Database, id: string, actor: Actor): Promise<boolean> {
  await tx
    .update(resumeVersions)
    .set({ isPublished: false, updatedBy: actor.userId })
    .where(and(eq(resumeVersions.isPublished, true), not(eq(resumeVersions.id, id))));
  const rows = await tx
    .update(resumeVersions)
    .set({ isPublished: true, publishedAt: new Date(), updatedBy: actor.userId })
    .where(eq(resumeVersions.id, id))
    .returning({ id: resumeVersions.id });
  return rows.length > 0;
}

/** Takes the published version down, leaving none published. One statement. */
export async function unpublishResume(db: Database, actor: Actor): Promise<void> {
  await db
    .update(resumeVersions)
    .set({ isPublished: false, updatedBy: actor.userId })
    .where(eq(resumeVersions.isPublished, true));
}

/**
 * Deletes a version only if it isn't published, in one statement (no window
 * in which it could be published in between). Returns the deleted row's
 * storage details, or null when nothing was deleted.
 */
export async function deleteUnpublishedResume(db: Database, id: string): Promise<StoredResume | null> {
  const [row] = await db
    .delete(resumeVersions)
    .where(and(eq(resumeVersions.id, id), eq(resumeVersions.isPublished, false)))
    .returning(stored);
  return row ?? null;
}
