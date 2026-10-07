import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import type * as schema from './schema';

/**
 * Driver-agnostic database handle. Production uses Neon's HTTP driver; tests
 * use PGlite (in-process Postgres). Repository functions accept this type so
 * the same SQL runs in both.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Schema = typeof schema;
