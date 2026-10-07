import { sql } from 'drizzle-orm';
import { readMigrationFiles, type MigrationConfig } from 'drizzle-orm/migrator';
import { queryRows } from './raw';
import { content } from './seed/content';
import { seedContent, type SeedResult } from './seed/seed';
import type { Database } from './types';

const MIGRATIONS_FOLDER = 'src/db/migrations';

/** Arbitrary constant identifying "preparing this database" to pg_advisory_lock. */
const PREPARE_LOCK = sql.raw('7426190531');

/** The driver-specific Drizzle migrator, bound to the same connection as `db`. */
export type ApplyMigrations = (config: MigrationConfig) => Promise<void>;

export interface PrepareResult {
  migrationsApplied: number;
  /** Null when bootstrap was not requested. */
  bootstrap: SeedResult | null;
}

/** Timestamps of the migrations recorded in Drizzle's ledger (empty before the first migration). */
async function recordedMigrations(db: Database): Promise<Set<number>> {
  const [ledger] = await queryRows<{ present: boolean }>(
    db,
    sql`select to_regclass('drizzle.__drizzle_migrations') is not null as present`,
  );
  if (!ledger?.present) return new Set();
  const rows = await queryRows<{ created_at: string | number | bigint }>(
    db,
    sql`select created_at from drizzle.__drizzle_migrations`,
  );
  return new Set(rows.map((r) => Number(r.created_at)));
}

/**
 * Brings a database to the state this build of the code expects:
 *
 *   1. apply every committed migration that is still pending;
 *   2. load the initial content if, and only if, the database has never had any.
 *
 * Safe to run on every deployment and from several deployments at once: a
 * session advisory lock serializes runs, and both steps are no-ops when there
 * is nothing to do. It never generates migrations, pushes schema, or resets
 * data. `db` must be a single session (not a pool) for the lock to hold.
 */
export async function prepareDatabase(
  db: Database,
  applyMigrations: ApplyMigrations,
  { bootstrap = true }: { bootstrap?: boolean } = {},
): Promise<PrepareResult> {
  await db.execute(sql`select pg_advisory_lock(${PREPARE_LOCK})`);
  try {
    const before = await recordedMigrations(db);
    await applyMigrations({ migrationsFolder: MIGRATIONS_FOLDER });
    const after = await recordedMigrations(db);

    // Drizzle only applies migrations newer than the last one recorded, so a
    // migration committed with an older timestamp would be skipped silently.
    const skipped = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER }).filter(
      (m) => !after.has(m.folderMillis),
    );
    if (skipped.length) {
      throw new Error(
        `${skipped.length} committed migration(s) were not applied because they are older than the latest ` +
          'migration already in this database. Regenerate them so they sort last in migrations/meta/_journal.json.',
      );
    }

    return {
      migrationsApplied: after.size - before.size,
      bootstrap: bootstrap ? await seedContent(db, content) : null,
    };
  } finally {
    // Best effort: the lock also ends with the session, and a failed unlock
    // must not mask the error that got us here.
    await db.execute(sql`select pg_advisory_unlock(${PREPARE_LOCK})`).catch(() => undefined);
  }
}
