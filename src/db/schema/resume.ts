import { sql } from 'drizzle-orm';
import { boolean, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { authorship, timestamps } from './_shared';

/**
 * Uploaded resume PDFs. The bytes live in the private Vercel Blob store under
 * `pathname` (server-built, never a URL); this table is the version history.
 * Publication is an explicit flag, never "latest upload": the partial unique
 * index allows at most one published row, so there is no ambiguous pointer.
 */
export const resumeVersions = pgTable(
  'resume_versions',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Object pathname in the private store (`resumes/<uuid>.pdf`). */
    pathname: text().notNull().unique(),
    /** The uploaded file's name, sanitized; display and download name only. */
    fileName: text().notNull(),
    sizeBytes: integer().notNull(),
    /** Optional admin note ("Fall 2026, internship applications"). */
    label: text(),
    isPublished: boolean().notNull().default(false),
    /** When this version last went public. */
    publishedAt: timestamp({ withTimezone: true }),
    ...timestamps,
    ...authorship,
  },
  (t) => [uniqueIndex('resume_versions_one_published').on(t.isPublished).where(sql`${t.isPublished}`)],
);
