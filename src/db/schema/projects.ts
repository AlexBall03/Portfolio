import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { authorship, contentStatusEnum, localeEnum, sortOrder, timestamps } from './_shared';
import { mediaAssets } from './media';
import { technologies } from './skills';

/**
 * A portfolio project as the portfolio presents it. External systems (GitHub
 * today, SDLC Manager later) may enrich a project through their own tables but
 * never define its public representation.
 */
export const projects = pgTable(
  'projects',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Current public slug. Previous slugs live in project_slug_history. */
    slug: text().notNull().unique(),
    status: contentStatusEnum().notNull().default('draft'),
    featured: boolean().notNull().default(false),
    sortOrder: sortOrder(),
    /** Whether the project is currently deployed and reachable (drives the "Live" badge). */
    isLive: boolean().notNull().default(false),
    demoUrl: text(),
    sourceUrl: text(),
    /** Long-form write-up (README, case study…) until project pages carry their own. */
    detailsUrl: text(),
    publishedAt: timestamp({ withTimezone: true }),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps,
    ...authorship,
  },
  (t) => [index('projects_status_sort_idx').on(t.status, t.sortOrder)],
);

export const projectTranslations = pgTable(
  'project_translations',
  {
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    locale: localeEnum().notNull(),
    name: text().notNull(),
    tagline: text().notNull(),
    summary: text().notNull(),
    /** Further description paragraphs, shown below the summary on the project page. */
    body: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.locale] })],
);

/** Retired slugs. Requests for one permanently redirect to the project's current slug. */
export const projectSlugHistory = pgTable('project_slug_history', {
  slug: text().primaryKey(),
  projectId: uuid()
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  retiredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const projectTechnologies = pgTable(
  'project_technologies',
  {
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    technologyId: uuid()
      .notNull()
      .references(() => technologies.id, { onDelete: 'restrict' }),
    sortOrder: sortOrder(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.technologyId] })],
);

export const repositoryProviderEnum = pgEnum('repository_provider', ['github']);

/** Zero, one, or many source repositories per project. */
export const projectRepositories = pgTable(
  'project_repositories',
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    provider: repositoryProviderEnum().notNull().default('github'),
    owner: text().notNull(),
    name: text().notNull(),
    isPrimary: boolean().notNull().default(false),
    sortOrder: sortOrder(),
    ...timestamps,
  },
  (t) => [uniqueIndex('project_repositories_unique_idx').on(t.projectId, t.provider, t.owner, t.name)],
);

export const projectMediaRoleEnum = pgEnum('project_media_role', ['cover', 'gallery']);

export const projectMedia = pgTable(
  'project_media',
  {
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    assetId: uuid()
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'restrict' }),
    role: projectMediaRoleEnum().notNull().default('gallery'),
    sortOrder: sortOrder(),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.assetId] }),
    // One hero image per project.
    uniqueIndex('project_media_one_cover_idx').on(t.projectId).where(sql`${t.role} = 'cover'`),
  ],
);

export const projectsRelations = relations(projects, ({ many }) => ({
  translations: many(projectTranslations),
  technologies: many(projectTechnologies),
  repositories: many(projectRepositories),
  media: many(projectMedia),
  slugHistory: many(projectSlugHistory),
}));

export const projectTranslationsRelations = relations(projectTranslations, ({ one }) => ({
  project: one(projects, { fields: [projectTranslations.projectId], references: [projects.id] }),
}));

export const projectSlugHistoryRelations = relations(projectSlugHistory, ({ one }) => ({
  project: one(projects, { fields: [projectSlugHistory.projectId], references: [projects.id] }),
}));

export const projectTechnologiesRelations = relations(projectTechnologies, ({ one }) => ({
  project: one(projects, { fields: [projectTechnologies.projectId], references: [projects.id] }),
  technology: one(technologies, {
    fields: [projectTechnologies.technologyId],
    references: [technologies.id],
  }),
}));

export const projectRepositoriesRelations = relations(projectRepositories, ({ one }) => ({
  project: one(projects, { fields: [projectRepositories.projectId], references: [projects.id] }),
}));

export const projectMediaRelations = relations(projectMedia, ({ one }) => ({
  project: one(projects, { fields: [projectMedia.projectId], references: [projects.id] }),
  asset: one(mediaAssets, { fields: [projectMedia.assetId], references: [mediaAssets.id] }),
}));
