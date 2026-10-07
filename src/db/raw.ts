import type { SQL } from 'drizzle-orm';
import type { Database } from './types';

/**
 * Runs raw SQL and returns its rows. Each driver types the result envelope
 * differently, but all of them (Neon, PGlite) expose `rows`, hence the cast.
 */
export async function queryRows<T>(db: Pick<Database, 'execute'>, query: SQL): Promise<T[]> {
  const result = (await db.execute(query)) as unknown as { rows: T[] };
  return result.rows;
}
