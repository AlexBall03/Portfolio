import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { authorship, contentStatusEnum, sortOrder, timestamps } from './_shared';
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
    name: text().notNull(),
    tagline: text().notNull(),
    summary: text().notNull(),
    /** Further description paragraphs, shown below the summary on the project page. */
    body: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    status: contentStatusEnum().notNull().default('draft'),
    featured: boolean().notNull().default(false),
    sortOrder: sortOrder(),
    /** Whether the project is currently deployed and reachable (drives the "Live" badge). */
    isLive: boolean().notNull().default(false),
    demoUrl: text(),
    sourceUrl: text(),
    /** An external long-form write-up (README, article…), linked from the project page. */
    detailsUrl: text(),
    /** Whether the project page shows its GitHub analytics. Starts off, so repositories can be checked in Preview first. */
    githubAnalyticsVisible: boolean().notNull().default(false),
    publishedAt: timestamp({ withTimezone: true }),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps,
    ...authorship,
  },
  (t) => [index('projects_status_sort_idx').on(t.status, t.sortOrder)],
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

/** What a repository is to its project (display labels live in the UI copy). */
export const repositoryLabelEnum = pgEnum('repository_label', [
  'frontend',
  'backend',
  'api',
  'infrastructure',
  'mobile',
  'library',
  'docs',
  'other',
]);

/**
 * Zero, one, or many source repositories per project. `github_id` is GitHub's
 * stable repository id, recorded when the admin saves (null only for rows that
 * predate Phase 5B and haven't been saved since); owner/name are the canonical
 * names at that time. A repository may belong to several projects.
 */
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
    githubId: bigint({ mode: 'number' }),
    label: repositoryLabelEnum(),
    isPrimary: boolean().notNull().default(false),
    sortOrder: sortOrder(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('project_repositories_unique_idx').on(t.projectId, t.provider, t.owner, t.name),
    uniqueIndex('project_repositories_github_id_idx')
      .on(t.projectId, t.githubId)
      .where(sql`${t.githubId} is not null`),
  ],
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

/* ── Case study ─────────────────────────────────────────────────────────────
 * Which fields a kind uses is a code
 * map (`features/projects/case-study.ts`), enforced by validation.
 */

export const projectSectionKindEnum = pgEnum('project_section_kind', [
  'narrative',
  'highlights',
  'architecture',
  'challenges',
  'lessons',
  'outcomes',
  'gallery',
  'video',
]);

/** One case-study section. New sections start hidden, so they can be drafted on a live project. */
export const projectSections = pgTable(
  'project_sections',
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    kind: projectSectionKindEnum().notNull(),
    heading: text().notNull(),
    /** Paragraphs with light inline markup (`lib/inline-markup.ts`), never HTML. */
    body: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    visible: boolean().notNull().default(false),
    sortOrder: sortOrder(),
    /** External video (kind `video`): an http(s) URL; YouTube and Vimeo are embedded. */
    videoUrl: text(),
    ...timestamps,
    ...authorship,
  },
  (t) => [index('project_sections_project_sort_idx').on(t.projectId, t.sortOrder)],
);

/** A list entry of a section: a highlight, a challenge and its solution, an outcome, a lesson. */
export const projectSectionItems = pgTable(
  'project_section_items',
  {
    id: uuid().primaryKey().defaultRandom(),
    sectionId: uuid()
      .notNull()
      .references(() => projectSections.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    body: text(),
    sortOrder: sortOrder(),
  },
  (t) => [index('project_section_items_section_idx').on(t.sectionId, t.sortOrder)],
);

/** Images a section shows, in order: always images of the section's own project (`project_media`). */
export const projectSectionMedia = pgTable(
  'project_section_media',
  {
    sectionId: uuid()
      .notNull()
      .references(() => projectSections.id, { onDelete: 'cascade' }),
    assetId: uuid()
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    sortOrder: sortOrder(),
  },
  (t) => [primaryKey({ columns: [t.sectionId, t.assetId] }), index('project_section_media_asset_idx').on(t.assetId)],
);

export const milestoneKindEnum = pgEnum('milestone_kind', ['started', 'feature', 'release', 'launch', 'refactor', 'other']);

/** How much of a milestone's date is shown: "Mar 4, 2026", "Mar 2026", or "2026". */
export const milestoneDatePrecisionEnum = pgEnum('milestone_date_precision', ['day', 'month', 'year']);

/** A curated point in a project's development story (never inferred from commits). */
export const projectMilestones = pgTable(
  'project_milestones',
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    occurredOn: date({ mode: 'string' }).notNull(),
    datePrecision: milestoneDatePrecisionEnum().notNull().default('month'),
    kind: milestoneKindEnum().notNull().default('other'),
    title: text().notNull(),
    description: text(),
    url: text(),
    /** Optional image: one of the project's own images. */
    assetId: uuid().references(() => mediaAssets.id, { onDelete: 'set null' }),
    visible: boolean().notNull().default(false),
    /** Tie-break among milestones on the same date. */
    sortOrder: sortOrder(),
    ...timestamps,
    ...authorship,
  },
  (t) => [index('project_milestones_project_date_idx').on(t.projectId, t.occurredOn)],
);

/** Explicit "related projects" picks, in order. Directional: A listing B doesn't make B list A. */
export const projectRelations = pgTable(
  'project_relations',
  {
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    relatedProjectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    sortOrder: sortOrder(),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.relatedProjectId] }),
    index('project_relations_related_idx').on(t.relatedProjectId),
    check('project_relations_not_self', sql`${t.projectId} <> ${t.relatedProjectId}`),
  ],
);

export const projectsRelations = relations(projects, ({ many }) => ({
  technologies: many(projectTechnologies),
  repositories: many(projectRepositories),
  media: many(projectMedia),
  slugHistory: many(projectSlugHistory),
  sections: many(projectSections),
  milestones: many(projectMilestones),
  related: many(projectRelations, { relationName: 'relatedFrom' }),
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

export const projectSectionsRelations = relations(projectSections, ({ one, many }) => ({
  project: one(projects, { fields: [projectSections.projectId], references: [projects.id] }),
  items: many(projectSectionItems),
  media: many(projectSectionMedia),
}));

export const projectSectionItemsRelations = relations(projectSectionItems, ({ one }) => ({
  section: one(projectSections, { fields: [projectSectionItems.sectionId], references: [projectSections.id] }),
}));

export const projectSectionMediaRelations = relations(projectSectionMedia, ({ one }) => ({
  section: one(projectSections, { fields: [projectSectionMedia.sectionId], references: [projectSections.id] }),
  asset: one(mediaAssets, { fields: [projectSectionMedia.assetId], references: [mediaAssets.id] }),
}));

export const projectMilestonesRelations = relations(projectMilestones, ({ one }) => ({
  project: one(projects, { fields: [projectMilestones.projectId], references: [projects.id] }),
  asset: one(mediaAssets, { fields: [projectMilestones.assetId], references: [mediaAssets.id] }),
}));

export const projectRelationsRelations = relations(projectRelations, ({ one }) => ({
  project: one(projects, {
    fields: [projectRelations.projectId],
    references: [projects.id],
    relationName: 'relatedFrom',
  }),
  related: one(projects, { fields: [projectRelations.relatedProjectId], references: [projects.id] }),
}));
