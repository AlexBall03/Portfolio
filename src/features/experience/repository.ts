import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { experiences } from '@/db/schema';
import type { Database } from '@/db/types';
import type { Locale } from '@/i18n/config';
import { mapTranslated } from '@/i18n/translations';
import type { Experience } from './types';

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
