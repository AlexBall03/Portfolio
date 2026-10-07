import { integer, pgEnum, timestamp } from 'drizzle-orm/pg-core';
import { LOCALES } from '../../i18n/config';

/** Supported content locales. Adding one is an `ALTER TYPE ... ADD VALUE` migration. */
export const localeEnum = pgEnum('locale', LOCALES);

/**
 * Publication lifecycle for managed content. Public queries only ever return
 * `published`; `archived` is a soft delete that keeps history and URLs resolvable.
 */
export const contentStatusEnum = pgEnum('content_status', ['draft', 'published', 'archived']);

/** Visual accent used by the design system for a few content items. */
export const accentEnum = pgEnum('accent', ['blue', 'gold']);

export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Explicit display order. Ties fall back to creation order in queries. */
export const sortOrder = () => integer().notNull().default(0);
