import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { prepareDatabase } from './prepare';
import * as schema from './schema';
import type { Database } from './types';

/**
 * Development-only database: PGlite (Postgres compiled to WASM) persisted to a
 * local directory. Runs the same prepare step as a deployment (committed
 * migrations, then initial content for a new database), so `npm run dev` works
 * without a Neon account.
 */
export async function connectLocal(dataDir: string): Promise<Database> {
  const client = new PGlite(dataDir);
  const db = drizzle({ client, schema, casing: 'snake_case' });
  await prepareDatabase(db, (config) => migrate(db, config));
  return db;
}
