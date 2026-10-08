import { sql } from 'drizzle-orm';
import { boolean, check, integer, pgEnum, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { authorship, localeEnum, timestamps } from './_shared';

export const themeEnum = pgEnum('theme', ['dark', 'light']);

/**
 * Site-wide, admin-editable settings. A single-row table (id pinned to 1).
 * Typed columns rather than a key/value bag, so every setting is validated by
 * the database and visible in the generated types.
 */
export const siteSettings = pgTable(
  'site_settings',
  {
    id: integer().primaryKey().default(1),
    /** Wordmark shown in the nav and footer, e.g. `</Alex-Ball\>`. */
    brandMark: text().notNull(),
    /** Short monogram used on the headshot card, e.g. `</AB\>`. */
    monogram: text().notNull(),
    /** GitHub account the live GitHub section reports on. Null hides the section. */
    githubUsername: text(),
    showGithubSection: boolean().notNull().default(true),
    /** Theme for first-time visitors (their own choice is remembered in the browser). */
    defaultTheme: themeEnum().notNull().default('dark'),
    ...timestamps,
    ...authorship,
  },
  (t) => [check('site_settings_singleton', sql`${t.id} = 1`)],
);

/** Top-level public pages. Mirrors the route structure in src/config/navigation.ts. */
export const pageKeyEnum = pgEnum('page_key', [
  'home',
  'about',
  'projects',
  'experience',
  'resume',
  'contact',
]);

/** Per-page, per-locale SEO copy. */
export const pageContent = pgTable(
  'page_content',
  {
    pageKey: pageKeyEnum().notNull(),
    locale: localeEnum().notNull(),
    /** Overrides the default "<Page> — <Name>" title when set. */
    seoTitle: text(),
    seoDescription: text().notNull(),
    ...timestamps,
    ...authorship,
  },
  (t) => [primaryKey({ columns: [t.pageKey, t.locale] })],
);

/** Content sections that carry an editable heading block. */
export const sectionKeyEnum = pgEnum('section_key', [
  'snapshot',
  'about',
  'stack',
  'projects',
  'github',
  'experience',
  'resume',
  'contact',
]);

/** Per-section, per-locale heading copy (eyebrow, title, subtitle, optional lead, optional secondary heading). */
export const sectionContent = pgTable(
  'section_content',
  {
    sectionKey: sectionKeyEnum().notNull(),
    locale: localeEnum().notNull(),
    eyebrow: text().notNull(),
    title: text().notNull(),
    subtitle: text(),
    body: text(),
    /** Secondary heading inside the section (About: differentiators; Stack: learning banner). */
    aside: text(),
    ...timestamps,
    ...authorship,
  },
  (t) => [primaryKey({ columns: [t.sectionKey, t.locale] })],
);
