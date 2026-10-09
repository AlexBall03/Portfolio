import 'server-only';
import { asc, eq, inArray } from 'drizzle-orm';
import { experiences } from '@/db/schema';
import type { Database } from '@/db/types';
import { reconcileList } from '@/lib/cms/write';
import type { ExperiencesInput } from './schema';
import type { Experience, ExperienceKind, ExperiencesValues } from './types';

export async function listExperiences(db: Database): Promise<Experience[]> {
  const rows = await db.query.experiences.findMany({
    where: eq(experiences.status, 'published'),
    orderBy: [asc(experiences.sortOrder), asc(experiences.createdAt)],
  });

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    organization: row.organizationLabel ?? row.organization,
    role: row.role,
    employmentType: row.employmentType,
    location: row.location,
    startDate: row.startDate,
    endDate: row.endDate,
    datePrecision: row.datePrecision,
    isCurrent: row.isCurrent,
    summary: row.summary,
    tags: row.tags,
  }));
}

/* ── Admin editor ───────────────────────────────────────────────────────────
 * Uncached reads of every entry (hidden ones too), and writes run inside the
 * service's transaction. `actor` is the admin's Clerk user ID, recorded in
 * created_by / updated_by.
 */

export async function listExperienceValues(db: Database): Promise<ExperiencesValues> {
  const rows = await db.query.experiences.findMany({
    orderBy: [asc(experiences.sortOrder), asc(experiences.createdAt)],
  });
  const values = (kind: ExperienceKind) =>
    rows
      .filter((row) => row.kind === kind)
      .map((row) => ({
        key: row.id,
        id: row.id,
        organization: row.organization,
        organizationLabel: row.organizationLabel ?? '',
        role: row.role,
        employmentType: row.employmentType ?? '',
        location: row.location ?? '',
        summary: row.summary,
        tags: row.tags,
        startDate: row.startDate,
        endDate: row.endDate ?? '',
        datePrecision: row.datePrecision,
        isCurrent: row.isCurrent,
        // Legacy `archived` rows read as hidden; a save stores them as drafts.
        visible: row.status === 'published',
      }));
  return { career: values('career'), education: values('education') };
}

type ExperienceItem = ExperiencesInput[ExperienceKind][number];

/** Replaces one kind's list; the other kind is untouched. */
export async function replaceExperiences(
  db: Database,
  kind: ExperienceKind,
  items: ExperienceItem[],
  actor: { userId: string },
): Promise<void> {
  const existing = await db.select({ id: experiences.id }).from(experiences).where(eq(experiences.kind, kind));
  const fields = (item: ExperienceItem, sortOrder: number) => ({
    kind,
    organization: item.organization,
    organizationLabel: item.organizationLabel ?? null,
    role: item.role,
    employmentType: item.employmentType ?? null,
    location: item.location ?? null,
    summary: item.summary,
    tags: item.tags,
    startDate: item.startDate,
    endDate: item.endDate ?? null,
    datePrecision: item.datePrecision,
    isCurrent: item.isCurrent,
    status: item.visible ? ('published' as const) : ('draft' as const),
    sortOrder,
    updatedBy: actor.userId,
  });
  await reconcileList(
    existing.map((r) => r.id),
    items,
    {
      update: (id, item, sortOrder) => db.update(experiences).set(fields(item, sortOrder)).where(eq(experiences.id, id)),
      insert: async (item, sortOrder) => {
        const [row] = await db
          .insert(experiences)
          .values({ ...fields(item, sortOrder), createdBy: actor.userId })
          .returning({ id: experiences.id });
        return row!.id;
      },
      remove: (ids) => db.delete(experiences).where(inArray(experiences.id, ids)),
    },
  );
}
