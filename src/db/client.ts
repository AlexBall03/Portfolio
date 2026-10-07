import 'server-only';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { databaseEnv } from '@/config/env';
import * as schema from './schema';
import type { Database } from './types';

/**
 * Neon over HTTP: each query is a single stateless HTTPS round trip, which
 * suits Vercel Functions (no connection pool to exhaust or keep warm).
 *
 * When the Admin (Phase 4) needs interactive multi-statement transactions,
 * add a second client using `drizzle-orm/neon-serverless` with a Pool for
 * those write paths only — reads stay on HTTP.
 */
let instance: Database | undefined;

export function getDb(): Database {
  instance ??= drizzle({
    client: neon(databaseEnv().DATABASE_URL),
    schema,
    casing: 'snake_case',
  });
  return instance;
}
