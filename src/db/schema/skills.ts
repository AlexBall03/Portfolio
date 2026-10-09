import { relations } from 'drizzle-orm';
import { pgEnum, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { accentEnum, authorship, contentStatusEnum, sortOrder, timestamps } from './_shared';

/**
 * A technology is a proper noun (React, C#, Neon…). It is the shared
 * vocabulary for both project stacks and the skills section.
 */
export const technologies = pgTable('technologies', {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  ...timestamps,
  ...authorship,
});

/** `stack` = what I work with today; `learning` = the "Looking Ahead" banner. */
export const skillCategoryKindEnum = pgEnum('skill_category_kind', ['stack', 'learning']);

export const skillCategories = pgTable('skill_categories', {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  kind: skillCategoryKindEnum().notNull().default('stack'),
  icon: text().notNull(),
  accent: accentEnum().notNull().default('blue'),
  status: contentStatusEnum().notNull().default('published'),
  sortOrder: sortOrder(),
  ...timestamps,
  ...authorship,
});

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
  technologies: many(skillCategoryTechnologies),
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
