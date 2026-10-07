/**
 * CLI: `npm run db:prepare` (also `npm run db:migrate`, which passes `--migrate-only`)
 *
 * Applies pending committed migrations, then bootstraps initial content if the
 * database has never had any. Runs before `next build` on every Vercel
 * deployment (`build:deploy`), against the database that deployment's
 * environment selects. See "Database lifecycle" in ARCHITECTURE.md.
 */
import { withAdminDatabase } from '../admin/connect';
import { isDeployment, resolveAdminTarget } from '../admin/env';
import { prepareDatabase } from '../prepare';
import type { SeedResult } from '../seed/seed';
import { loadLocalEnv } from './local-env';

const BOOTSTRAP: Record<SeedResult['status'], string> = {
  seeded: 'new database, initial content loaded',
  adopted: 'existing content found, recorded as bootstrapped (nothing written)',
  skipped: 'already bootstrapped (nothing written)',
};

async function main() {
  loadLocalEnv();
  const target = resolveAdminTarget();

  if (target.kind === 'local') {
    if (isDeployment()) throw new Error('pglite: database URLs are for local use only; configure Neon on Vercel.');
    console.info('Local pglite: database is prepared automatically when the app connects; nothing to do.');
    return;
  }

  const environment = process.env.VERCEL_ENV ? `Vercel ${process.env.VERCEL_ENV}` : 'local';
  console.info(`[db:prepare] target ${target.label} (${environment})`);

  const bootstrap = !process.argv.includes('--migrate-only');
  const result = await withAdminDatabase(target.url, (db, applyMigrations) =>
    prepareDatabase(db, applyMigrations, { bootstrap }),
  );

  console.info(
    `[db:prepare] migrations: ${result.migrationsApplied ? `${result.migrationsApplied} applied` : 'none pending'}`,
  );
  if (result.bootstrap) console.info(`[db:prepare] bootstrap: ${BOOTSTRAP[result.bootstrap.status]}`);
}

main().catch((err: unknown) => {
  console.error('[db:prepare] failed');
  console.error(err);
  process.exitCode = 1;
});
