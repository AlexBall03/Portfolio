import { sql } from 'drizzle-orm';
import { boolean, check, integer, jsonb, pgEnum, pgTable, text } from 'drizzle-orm/pg-core';
import { authorship, timestamps } from './_shared';

export const sponsorSortEnum = pgEnum('sponsor_sort', ['newest', 'oldest', 'alphabetical']);

/**
 * GitHub Sponsors presentation settings. A single-row table (id pinned to 1),
 * like `site_settings`. The row is optional: until the first save, reads use
 * the defaults in `features/sponsorship/types.ts`.
 *
 * GitHub is the source of truth for who sponsors; nothing about a sponsorship
 * is stored here except the accounts the admin chose to hide.
 */
export const sponsorshipSettings = pgTable(
  'sponsorship_settings',
  {
    id: integer().primaryKey().default(1),
    /** Master switch: off removes the home section, the support page, and every sponsor list. */
    enabled: boolean().notNull().default(true),
    showHomeSection: boolean().notNull().default(true),
    supportPageEnabled: boolean().notNull().default(true),
    /** Home section copy. */
    heading: text().notNull(),
    description: text().notNull(),
    ctaLabel: text().notNull(),
    /** `https://github.com/sponsors/<login>`: the CTA destination, and the account sponsors are read for. */
    sponsorsUrl: text().notNull(),
    showSponsors: boolean().notNull().default(true),
    showSponsorCount: boolean().notNull().default(false),
    /** How many sponsors the home section previews. */
    homeSponsorLimit: integer().notNull().default(8),
    sponsorSort: sponsorSortEnum().notNull().default('newest'),
    /** Sponsors kept off the site, by GitHub's stable account id (the login is only a label for the admin). */
    hiddenSponsors: jsonb().$type<{ githubId: number; login: string }[]>().notNull().default([]),
    /** Support page copy. */
    supportTitle: text().notNull(),
    supportIntro: text().notNull(),
    supportItems: jsonb().$type<{ title: string; body: string }[]>().notNull().default([]),
    ...timestamps,
    ...authorship,
  },
  (t) => [check('sponsorship_settings_singleton', sql`${t.id} = 1`)],
);
