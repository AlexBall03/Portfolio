import { relations } from 'drizzle-orm';
import { boolean, date, pgEnum, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { contentStatusEnum, localeEnum, sortOrder, timestamps } from './_shared';

export const experienceKindEnum = pgEnum('experience_kind', ['career', 'education']);

/** How much of a date is meaningful when displayed: month ("Mar 2026") or year ("2017"). */
export const datePrecisionEnum = pgEnum('date_precision', ['month', 'year']);

/**
 * A career position or an education entry. Dates are real dates, formatted per
 * locale at render time — no hand-written date strings per language.
 */
export const experiences = pgTable('experiences', {
  id: uuid().primaryKey().defaultRandom(),
  kind: experienceKindEnum().notNull(),
  /** Organization name; a proper noun shown identically in every locale. */
  organization: text().notNull(),
  startDate: date({ mode: 'string' }).notNull(),
  /** Null means ongoing ("Present"). A future date reads as an expected end. */
  endDate: date({ mode: 'string' }),
  datePrecision: datePrecisionEnum().notNull().default('month'),
  isCurrent: boolean().notNull().default(false),
  status: contentStatusEnum().notNull().default('published'),
  sortOrder: sortOrder(),
  ...timestamps,
});

export const experienceTranslations = pgTable(
  'experience_translations',
  {
    experienceId: uuid()
      .notNull()
      .references(() => experiences.id, { onDelete: 'cascade' }),
    locale: localeEnum().notNull(),
    /** Translated organization label for non-proper-noun entries ("Career break", "Homeschool"). */
    organizationLabel: text(),
    role: text().notNull(),
    employmentType: text(),
    location: text(),
    summary: text().array().notNull().default([]),
    tags: text().array().notNull().default([]),
  },
  (t) => [primaryKey({ columns: [t.experienceId, t.locale] })],
);

export const experiencesRelations = relations(experiences, ({ many }) => ({
  translations: many(experienceTranslations),
}));

export const experienceTranslationsRelations = relations(experienceTranslations, ({ one }) => ({
  experience: one(experiences, {
    fields: [experienceTranslations.experienceId],
    references: [experiences.id],
  }),
}));
