import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { experiences, experienceTranslations } from '@/db/schema';
import type { Database } from '@/db/types';
import type { Locale } from '@/i18n/config';
import { mapTranslated } from '@/i18n/translations';
import { localeRecord } from '@/lib/cms/locale';
import { reconcileList, syncTranslations } from '@/lib/cms/write';
import type { ExperiencesInput } from './schema';
import type { Experience, ExperienceKind, ExperiencesValues } from './types';

export async function listExperiences(db: Database, locale: Locale): Promise<Experience[]> {
  const rows = await db.query.experiences.findMany({
    where: eq(experiences.status, 'published'),
    orderBy: [asc(experiences.sortOrder), asc(experiences.createdAt)],
    with: { translations: true },
  });

  return mapTranslated(rows, locale, (row, t) => ({
    id: row.id,
    kind: row.kind,
    organization: t.organizationLabel ?? row.organization,
    role: t.role,
    employmentType: t.employmentType,
    location: t.location,
    startDate: row.startDate,
    endDate: row.endDate,
    datePrecision: row.datePrecision,
    isCurrent: row.isCurrent,
    summary: t.summary,
    tags: t.tags,
  }));
}

/* ── Admin editor ───────────────────────────────────────────────────────────
 * Uncached reads of every entry (hidden ones too) with raw translations, and
 * writes run inside the service's transaction. `actor` is the admin's Clerk
 * user ID, recorded in created_by / updated_by.
 */

export async function listExperienceValues(db: Database): Promise<ExperiencesValues> {
  const rows = await db.query.experiences.findMany({
    orderBy: [asc(experiences.sortOrder), asc(experiences.createdAt)],
    with: { translations: true },
  });
  const values = (kind: ExperienceKind) =>
    rows
      .filter((row) => row.kind === kind)
      .map((row) => ({
        key: row.id,
        id: row.id,
        organization: row.organization,
        startDate: row.startDate,
        endDate: row.endDate ?? '',
        datePrecision: row.datePrecision,
        isCurrent: row.isCurrent,
        // Legacy `archived` rows read as hidden; a save stores them as drafts.
        visible: row.status === 'published',
        translations: localeRecord(
          row.translations,
          (t) => ({
            organizationLabel: t.organizationLabel ?? '',
            role: t.role,
            employmentType: t.employmentType ?? '',
            location: t.location ?? '',
            summary: t.summary,
            tags: t.tags,
          }),
          () => ({ organizationLabel: '', role: '', employmentType: '', location: '', summary: [], tags: [] }),
        ),
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
      update: async (id, item, sortOrder) => {
        await db.update(experiences).set(fields(item, sortOrder)).where(eq(experiences.id, id));
        await syncExperienceTranslations(db, id, item.translations);
      },
      insert: async (item, sortOrder) => {
        const [row] = await db
          .insert(experiences)
          .values({ ...fields(item, sortOrder), createdBy: actor.userId })
          .returning({ id: experiences.id });
        await syncExperienceTranslations(db, row!.id, item.translations);
        return row!.id;
      },
      remove: (ids) => db.delete(experiences).where(inArray(experiences.id, ids)),
    },
  );
}

const syncExperienceTranslations = (db: Database, experienceId: string, translations: ExperienceItem['translations']) =>
  syncTranslations(translations, {
    upsert: (locale, t) => {
      const set = {
        organizationLabel: t.organizationLabel ?? null,
        role: t.role,
        employmentType: t.employmentType ?? null,
        location: t.location ?? null,
        summary: t.summary,
        tags: t.tags,
      };
      return db
        .insert(experienceTranslations)
        .values({ experienceId, locale, ...set })
        .onConflictDoUpdate({ target: [experienceTranslations.experienceId, experienceTranslations.locale], set });
    },
    remove: (locale) =>
      db
        .delete(experienceTranslations)
        .where(and(eq(experienceTranslations.experienceId, experienceId), eq(experienceTranslations.locale, locale))),
  });
