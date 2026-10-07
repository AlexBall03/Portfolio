import 'server-only';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { ConfigError, databaseEnv } from '@/config/env';
import * as schema from './schema';
import type { Database } from './types';

/**
 * Neon over HTTP: each query is a single stateless HTTPS round trip, which
 * suits Vercel Functions (no connection pool to exhaust or keep warm).
 *
 * When the Admin (Phase 4) needs interactive multi-statement transactions,
 * add a second client using `drizzle-orm/neon-serverless` with a Pool for
 * those write paths only — reads stay on HTTP.
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
