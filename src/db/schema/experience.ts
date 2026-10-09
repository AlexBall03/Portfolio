import { boolean, date, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { authorship, contentStatusEnum, sortOrder, timestamps } from './_shared';

export const experienceKindEnum = pgEnum('experience_kind', ['career', 'education']);

/** How much of a date is meaningful when displayed: month ("Mar 2026") or year ("2017"). */
export const datePrecisionEnum = pgEnum('date_precision', ['month', 'year']);

/**
 * A career position or an education entry. Dates are real dates, formatted at
 * render time, never stored as hand-written strings.
 */
export const experiences = pgTable('experiences', {
  id: uuid().primaryKey().defaultRandom(),
  kind: experienceKindEnum().notNull(),
  /** Organization name, a proper noun. */
  organization: text().notNull(),
  /** Replaces the organization for non-proper-noun entries ("Career break", "Homeschool"). */
  organizationLabel: text(),
  role: text().notNull(),
  employmentType: text(),
  location: text(),
  summary: text().array().notNull().default([]),
  tags: text().array().notNull().default([]),
  startDate: date({ mode: 'string' }).notNull(),
  /** Null means ongoing ("Present"). A future date reads as an expected end. */
  endDate: date({ mode: 'string' }),
  datePrecision: datePrecisionEnum().notNull().default('month'),
  isCurrent: boolean().notNull().default(false),
  status: contentStatusEnum().notNull().default('published'),
  sortOrder: sortOrder(),
  ...timestamps,
  ...authorship,
});
