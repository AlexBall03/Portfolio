/**
 * CLI: `npm run db:seed [-- --force]`
 *
 * Bootstraps an empty database with the initial portfolio content. Uses the
 * WebSocket Pool driver (not HTTP) because seeding runs in one transaction.
 */
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../schema';
import type { Database } from '../types';
import { content } from './content';
import { seedContent } from './seed';

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (add it to .env.local).');

  const force = process.argv.includes('--force');
  const pool = new Pool({ connectionString: url });
  try {
    const db: Database = drizzle({ client: pool, schema, casing: 'snake_case' });
    const result = await seedContent(db, content, { force });
    console.info(result.status === 'seeded' ? 'Content seeded.' : `Skipped: ${result.reason}`);
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
