import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { accentEnum, authorship, localeEnum, sortOrder, timestamps } from './_shared';
import { mediaAssets } from './media';

/**
 * The site owner's profile. A single-row table (id is pinned to 1): the site
 * belongs to one person, but nothing in code hardcodes who that is.
 */
export const profile = pgTable(
  'profile',
  {
    id: integer().primaryKey().default(1),
    fullName: text().notNull(),
    /** Shorter/alternate name, e.g. for JSON-LD `alternateName`. */
    shortName: text().notNull(),
    email: text().notNull(),
    headshotAssetId: uuid().references(() => mediaAssets.id, { onDelete: 'set null' }),
    resumeAssetId: uuid().references(() => mediaAssets.id, { onDelete: 'set null' }),
    /** Drives the availability badge. */
    openToWork: boolean().notNull().default(true),
    /** IANA time zone for the hero's local-time readout. */
    timeZone: text().notNull().default('America/Phoenix'),
    /** Structured location for JSON-LD (display text is translated separately). */
    addressRegion: text(),
    addressCountry: text(),
    ...timestamps,
    ...authorship,
  },
  (t) => [check('profile_singleton', sql`${t.id} = 1`)],
);

export const profileTranslations = pgTable(
  'profile_translations',
  {
    profileId: integer()
      .notNull()
      .references(() => profile.id, { onDelete: 'cascade' }),
    locale: localeEnum().notNull(),
    title: text().notNull(),
    statement: text().notNull(),
    availabilityText: text().notNull(),
    locationLabel: text().notNull(),
    /** About section, one entry per paragraph. */
    about: text().array().notNull().default([]),
    heroFocus: text().notNull(),
    heroStackLine: text().notNull(),
    heroChips: text().array().notNull().default([]),
  },
  (t) => [primaryKey({ columns: [t.profileId, t.locale] })],
);

export const socialPlatformEnum = pgEnum('social_platform', [
  'github',
  'linkedin',
  'x',
  'youtube',
  'instagram',
  'website',
]);

/** Public profiles. Read by nav, footer, contact, the command palette, and JSON-LD `sameAs`. */
export const socialLinks = pgTable('social_links', {
  id: uuid().primaryKey().defaultRandom(),
  platform: socialPlatformEnum().notNull(),
  /** Display name, e.g. "GitHub". Proper noun, not translated. */
  label: text().notNull(),
  url: text().notNull(),
  /** Short handle shown next to the link, e.g. "@AlexBall03" or "in/alexball03". */
  handle: text(),
  visible: boolean().notNull().default(true),
  sortOrder: sortOrder(),
  ...timestamps,
});

/** The rotating "Software Engineer · Music Director · …" list on the About page. */
export const profileRoles = pgTable('profile_roles', {
  id: uuid().primaryKey().defaultRandom(),
  accent: accentEnum().notNull().default('blue'),
  visible: boolean().notNull().default(true),
  sortOrder: sortOrder(),
  ...timestamps,
  ...authorship,
});

export const profileRoleTranslations = pgTable(
  'profile_role_translations',
  {
    roleId: uuid()
      .notNull()
      .references(() => profileRoles.id, { onDelete: 'cascade' }),
    locale: localeEnum().notNull(),
    label: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.locale] })],
);

/** `differentiator` = About page cards; `resume` = Resume page highlights. */
export const highlightKindEnum = pgEnum('highlight_kind', ['differentiator', 'resume']);

export const profileHighlights = pgTable('profile_highlights', {
  id: uuid().primaryKey().defaultRandom(),
  kind: highlightKindEnum().notNull(),
  icon: text(),
  visible: boolean().notNull().default(true),
  sortOrder: sortOrder(),
  ...timestamps,
  ...authorship,
});

export const profileHighlightTranslations = pgTable(
  'profile_highlight_translations',
  {
    highlightId: uuid()
      .notNull()
      .references(() => profileHighlights.id, { onDelete: 'cascade' }),
    locale: localeEnum().notNull(),
    title: text().notNull(),
    body: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.highlightId, t.locale] })],
);

/**
 * Where a snapshot metric's number comes from. `static` uses the stored value;
 * the others are counted from published content at read time, so a visible
 * metric can never contradict the portfolio it sits beside.
 */
export const snapshotMetricSourceEnum = pgEnum('snapshot_metric_source', [
  'static',
  'published_projects',
  'technologies',
]);

/** The animated stat tiles in the About page snapshot. */
export const snapshotMetrics = pgTable('snapshot_metrics', {
  id: uuid().primaryKey().defaultRandom(),
  icon: text().notNull(),
  source: snapshotMetricSourceEnum().notNull().default('static'),
  /** Used when `source` is `static`; ignored for derived metrics. */
  value: doublePrecision().notNull(),
  suffix: text().notNull().default(''),
  accent: accentEnum().notNull().default('blue'),
  visible: boolean().notNull().default(true),
  sortOrder: sortOrder(),
  ...timestamps,
  ...authorship,
});

export const snapshotMetricTranslations = pgTable(
  'snapshot_metric_translations',
  {
    metricId: uuid()
      .notNull()
      .references(() => snapshotMetrics.id, { onDelete: 'cascade' }),
    locale: localeEnum().notNull(),
    label: text().notNull(),
    note: text().notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.metricId, t.locale] })],
);

export const profileRelations = relations(profile, ({ many, one }) => ({
  translations: many(profileTranslations),
  headshot: one(mediaAssets, {
    fields: [profile.headshotAssetId],
    references: [mediaAssets.id],
    relationName: 'profile_headshot',
  }),
  resume: one(mediaAssets, {
    fields: [profile.resumeAssetId],
    references: [mediaAssets.id],
    relationName: 'profile_resume',
  }),
}));

export const profileTranslationsRelations = relations(profileTranslations, ({ one }) => ({
  profile: one(profile, { fields: [profileTranslations.profileId], references: [profile.id] }),
}));

export const profileRolesRelations = relations(profileRoles, ({ many }) => ({
  translations: many(profileRoleTranslations),
}));

export const profileRoleTranslationsRelations = relations(profileRoleTranslations, ({ one }) => ({
  role: one(profileRoles, { fields: [profileRoleTranslations.roleId], references: [profileRoles.id] }),
}));

export const profileHighlightsRelations = relations(profileHighlights, ({ many }) => ({
  translations: many(profileHighlightTranslations),
}));

export const profileHighlightTranslationsRelations = relations(profileHighlightTranslations, ({ one }) => ({
  highlight: one(profileHighlights, {
    fields: [profileHighlightTranslations.highlightId],
    references: [profileHighlights.id],
  }),
}));

export const snapshotMetricsRelations = relations(snapshotMetrics, ({ many }) => ({
  translations: many(snapshotMetricTranslations),
}));

export const snapshotMetricTranslationsRelations = relations(snapshotMetricTranslations, ({ one }) => ({
  metric: one(snapshotMetrics, {
    fields: [snapshotMetricTranslations.metricId],
    references: [snapshotMetrics.id],
  }),
}));
