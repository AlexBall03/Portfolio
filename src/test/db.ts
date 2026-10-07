import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '@/db/schema';
import type { Database } from '@/db/types';

/**
 * A fresh in-process Postgres with the real committed migrations applied.
 * Tests exercise the same SQL the app runs against Neon.
 */
export async function createTestDb(): Promise<{ db: Database; close: () => Promise<void> }> {
  const client = new PGlite();
  const db: Database = drizzle({ client, schema, casing: 'snake_case' });
  await migrate(db as Parameters<typeof migrate>[0], { migrationsFolder: 'src/db/migrations' });
  return { db, close: () => client.close() };
}
