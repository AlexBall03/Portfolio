import 'server-only';
import { neon, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePool } from 'drizzle-orm/neon-serverless';
import { ConfigError, databaseEnv } from '@/config/env';
import * as schema from './schema';
import type { Database } from './types';

/**
 * Neon over HTTP: each query is a single stateless HTTPS round trip, which
 * suits Vercel Functions (no connection pool to exhaust or keep warm).
 *
 * Admin writes that must be atomic go through `withTransaction()`, which
 * opens a short-lived WebSocket Pool for that one transaction; reads stay on
 * HTTP.
 *
 * Local development without Neon: set DATABASE_URL=pglite:.pglite (persisted)
 * or pglite:memory:// (ephemeral; safe for a local `next build`) to use an
 * in-process Postgres that is migrated and seeded automatically.
 */
let instance: Promise<Database> | undefined;

export function getDb(): Promise<Database> {
  instance ??= connect();
  return instance;
}

async function connect(): Promise<Database> {
  const url = databaseEnv().DATABASE_URL;
  if (url.startsWith('pglite:')) {
    if (process.env.VERCEL) {
      throw new ConfigError('pglite: database URLs are for local use only; configure Neon on Vercel.');
    }
    const { connectLocal } = await import('./local');
    return connectLocal(url.slice('pglite:'.length) || '.pglite');
  }
  return drizzle({ client: neon(url), schema, casing: 'snake_case' });
}

/**
 * Runs `run` in one interactive transaction: all of it commits or none of it
 * does. The HTTP driver can't hold a transaction open, so on Neon this opens a
 * WebSocket Pool scoped to the call (Neon's guidance for serverless: create,
 * use, and close it within the request). PGlite runs it on the shared instance.
 */
export async function withTransaction<T>(run: (tx: Database) => Promise<T>): Promise<T> {
  const url = databaseEnv().DATABASE_URL;
  if (url.startsWith('pglite:')) return (await getDb()).transaction(run);

  const pool = new Pool({ connectionString: url });
  try {
    return await drizzlePool({ client: pool, schema, casing: 'snake_case' }).transaction(run);
  } finally {
    await pool.end();
  }
}
