import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from './schema';
import { content } from './seed/content';
import { seedContent } from './seed/seed';
import type { Database } from './types';

/**
 * Development-only database: PGlite (Postgres compiled to WASM) persisted to a
 * local directory. Applies the committed migrations and seeds an empty database,
 * so `npm run dev` works without a Neon account.
 */
export async function connectLocal(dataDir: string): Promise<Database> {
  const client = new PGlite(dataDir);
  const db = drizzle({ client, schema, casing: 'snake_case' });
  await migrate(db, { migrationsFolder: 'src/db/migrations' });
  await seedContent(db, content);
  return db;
}
