/**
 * CLI: `npm run db:seed [-- --force]`
 *
 * Loads the initial content into a database that has never had any. Without
 * `--force` it is the same safe bootstrap a deployment runs. `--force` clears
 * all content first and is refused on Vercel/CI: it is for a database you
 * intend to throw away, never Production.
 */
import { withAdminDatabase } from '../admin/connect';
import { isDeployment, resolveAdminTarget } from '../admin/env';
import { content } from '../seed/content';
import { seedContent, type SeedResult } from '../seed/seed';
import { loadLocalEnv } from './local-env';

const MESSAGES: Record<SeedResult['status'], string> = {
  seeded: 'Content seeded.',
  adopted: 'Skipped: the database already contains content. Recorded it as bootstrapped.',
  skipped: 'Skipped: the database is already bootstrapped (use --force to reset a disposable database).',
};

async function main() {
  loadLocalEnv();
  const force = process.argv.includes('--force');
  if (force && isDeployment()) throw new Error('--force is not allowed on Vercel or in CI.');

  const target = resolveAdminTarget();
  if (target.kind === 'local') {
    console.info('Local pglite: database is seeded automatically when the app connects; nothing to do.');
    return;
  }

  console.info(`${force ? 'Resetting and seeding' : 'Seeding'} ${target.label}`);
  const result = await withAdminDatabase(target.url, (db) => seedContent(db, content, { force }));
  console.info(MESSAGES[result.status]);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
