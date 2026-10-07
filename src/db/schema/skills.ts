import { relations } from 'drizzle-orm';
import { pgEnum, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { accentEnum, contentStatusEnum, localeEnum, sortOrder, timestamps } from './_shared';

/**
 * A technology is a language-neutral proper noun (React, C#, Neon…). It is the
 * shared vocabulary for both project stacks and the skills section.
 */
export const technologies = pgTable('technologies', {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  ...timestamps,
});

/** `stack` = what I work with today; `learning` = the "Looking Ahead" banner. */
export const skillCategoryKindEnum = pgEnum('skill_category_kind', ['stack', 'learning']);

export const skillCategories = pgTable('skill_categories', {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  kind: skillCategoryKindEnum().notNull().default('stack'),
  icon: text().notNull(),
  accent: accentEnum().notNull().default('blue'),
  status: contentStatusEnum().notNull().default('published'),
  sortOrder: sortOrder(),
  ...timestamps,
});

export const skillCategoryTranslations = pgTable(
  'skill_category_translations',
  {
    categoryId: uuid()
      .notNull()
      .references(() => skillCategories.id, { onDelete: 'cascade' }),
    locale: localeEnum().notNull(),
    name: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.categoryId, t.locale] })],
);

export const skillCategoryTechnologies = pgTable(
  'skill_category_technologies',
  {
    categoryId: uuid()
      .notNull()
      .references(() => skillCategories.id, { onDelete: 'cascade' }),
    technologyId: uuid()
      .notNull()
      .references(() => technologies.id, { onDelete: 'restrict' }),
    sortOrder: sortOrder(),
  },
  (t) => [primaryKey({ columns: [t.categoryId, t.technologyId] })],
);

export const skillCategoriesRelations = relations(skillCategories, ({ many }) => ({
  translations: many(skillCategoryTranslations),
  technologies: many(skillCategoryTechnologies),
}));

export const skillCategoryTranslationsRelations = relations(skillCategoryTranslations, ({ one }) => ({
  category: one(skillCategories, {
    fields: [skillCategoryTranslations.categoryId],
    references: [skillCategories.id],
  }),
}));

export const skillCategoryTechnologiesRelations = relations(skillCategoryTechnologies, ({ one }) => ({
  category: one(skillCategories, {
    fields: [skillCategoryTechnologies.categoryId],
    references: [skillCategories.id],
  }),
  technology: one(technologies, {
    fields: [skillCategoryTechnologies.technologyId],
    references: [technologies.id],
  }),
}));
