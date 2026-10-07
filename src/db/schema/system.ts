import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Records that this database has received its initial content. A single-row
 * table (id pinned to 1): once the row exists, the seed never writes content
 * again, whatever is later edited or deleted through the admin.
 *
 * `seed` means the content came from `db/seed/content.ts`; `adopted` means the
 * database already held content when the marker was introduced.
 */
export const contentBootstrap = pgTable(
  'content_bootstrap',
  {
    id: integer().primaryKey().default(1),
    source: text({ enum: ['seed', 'adopted'] }).notNull(),
    completedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('content_bootstrap_singleton', sql`${t.id} = 1`)],
);
