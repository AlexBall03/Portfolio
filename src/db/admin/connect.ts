import { Client } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import type { ApplyMigrations } from '../prepare';
import * as schema from '../schema';
import type { Database } from '../types';

/**
 * Opens one dedicated session for schema and bootstrap work and always closes
 * it. A single WebSocket client (not the app's HTTP driver, not a pool) because
 * that work needs interactive transactions and a session-level advisory lock.
 */
export async function withAdminDatabase<T>(
  url: string,
  run: (db: Database, applyMigrations: ApplyMigrations) => Promise<T>,
): Promise<T> {
  const client = new Client(url);
  await client.connect();
  try {
    const db = drizzle({ client, schema, casing: 'snake_case' });
    return await run(db, (config) => migrate(db, config));
  } finally {
    await client.end();
  }
}
