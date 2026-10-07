import { PGlite } from '@electric-sql/pglite';
import { count, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareDatabase, type ApplyMigrations } from './prepare';
import { queryRows } from './raw';
import * as schema from './schema';
import { content } from './seed/content';
import { seedContent } from './seed/seed';
import type { Database } from './types';

const { contentBootstrap, experiences, projects, projectTranslations, siteSettings, technologies } = schema;

const open: PGlite[] = [];

/** A blank in-process Postgres: no schema, no migration ledger. */
function blankDb(): { db: Database; applyMigrations: ApplyMigrations } {
  const client = new PGlite();
  open.push(client);
  const db = drizzle({ client, schema, casing: 'snake_case' });
  return { db, applyMigrations: (config) => migrate(db, config) };
}

async function snapshot(db: Database) {
  const total = async (table: typeof projects | typeof experiences | typeof technologies | typeof siteSettings) =>
    (await db.select({ n: count() }).from(table))[0]!.n;
  return {
    projects: await total(projects),
    experiences: await total(experiences),
    technologies: await total(technologies),
    settings: await total(siteSettings),
    names: (await db.select({ name: projectTranslations.name }).from(projectTranslations)).map((r) => r.name).sort(),
    marker: await db.select({ source: contentBootstrap.source }).from(contentBootstrap),
  };
}

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(open.splice(0).map((client) => client.close()));
});

describe('prepareDatabase', () => {
  it('migrates and bootstraps a brand-new database, then is a no-op', async () => {
    const { db, applyMigrations } = blankDb();

    const first = await prepareDatabase(db, applyMigrations);
    expect(first.migrationsApplied).toBeGreaterThan(0);
    expect(first.bootstrap).toEqual({ status: 'seeded' });

    const before = await snapshot(db);
    expect(before.projects).toBe(content.projects.length);
    expect(before.marker).toEqual([{ source: 'seed' }]);

    expect(await prepareDatabase(db, applyMigrations)).toEqual({
      migrationsApplied: 0,
      bootstrap: { status: 'skipped' },
    });
    expect(await snapshot(db)).toEqual(before);
  }, 60_000);

  it('never restores content that was edited or deleted after bootstrap', async () => {
    const { db, applyMigrations } = blankDb();
    await prepareDatabase(db, applyMigrations);

    await db.update(projectTranslations).set({ name: 'Edited in admin' }).where(eq(projectTranslations.locale, 'en'));
    await db.delete(projects).where(eq(projects.slug, 'portfolio'));
    await db.delete(experiences);
    const edited = await snapshot(db);

    expect((await prepareDatabase(db, applyMigrations)).bootstrap).toEqual({ status: 'skipped' });
    expect(await snapshot(db)).toEqual(edited);
    expect(edited.names).toContain('Edited in admin');
    expect(edited.experiences).toBe(0);
  }, 60_000);

  it('adopts a database that was seeded before the marker existed without writing content', async () => {
    const { db, applyMigrations } = blankDb();
    await prepareDatabase(db, applyMigrations);
    await db.delete(contentBootstrap);
    const { marker: _marker, ...before } = await snapshot(db);

    expect((await prepareDatabase(db, applyMigrations)).bootstrap).toEqual({ status: 'adopted' });
    const { marker, ...after } = await snapshot(db);
    expect(after).toEqual(before);
    expect(marker).toEqual([{ source: 'adopted' }]);

    expect((await prepareDatabase(db, applyMigrations)).bootstrap).toEqual({ status: 'skipped' });
  }, 60_000);

  it('does not seed on top of a partially populated database', async () => {
    const { db, applyMigrations } = blankDb();
    await prepareDatabase(db, applyMigrations, { bootstrap: false });
    await db.insert(technologies).values({ slug: 'only-row', name: 'Only row' });

    expect((await prepareDatabase(db, applyMigrations)).bootstrap).toEqual({ status: 'adopted' });
    const after = await snapshot(db);
    expect(after.technologies).toBe(1);
    expect(after.settings).toBe(0);
  }, 60_000);

  it('applies migrations only when bootstrap is disabled', async () => {
    const { db, applyMigrations } = blankDb();
    const result = await prepareDatabase(db, applyMigrations, { bootstrap: false });
    expect(result.bootstrap).toBeNull();
    expect((await snapshot(db)).marker).toEqual([]);
  }, 60_000);

  it('releases its lock when a step fails', async () => {
    const { db, applyMigrations } = blankDb();
    await expect(prepareDatabase(db, () => Promise.reject(new Error('migration failed')))).rejects.toThrow(
      'migration failed',
    );
    const held = await queryRows(db, sql`select count(*)::int as n from pg_locks where locktype = 'advisory'`);
    expect(held).toEqual([{ n: 0 }]);
    expect((await prepareDatabase(db, applyMigrations)).bootstrap).toEqual({ status: 'seeded' });
  }, 60_000);
});

describe('seedContent --force', () => {
  it('resets content locally but is refused in a deployment', async () => {
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('CI', '');
    const { db, applyMigrations } = blankDb();
    await prepareDatabase(db, applyMigrations);
    await db.delete(projects).where(eq(projects.slug, 'portfolio'));

    expect(await seedContent(db, content, { force: true })).toEqual({ status: 'seeded' });
    expect((await snapshot(db)).projects).toBe(content.projects.length);

    vi.stubEnv('VERCEL', '1');
    await expect(seedContent(db, content, { force: true })).rejects.toThrow(/Refusing to reset/);
    expect(await seedContent(db, content)).toEqual({ status: 'skipped' });
  }, 60_000);
});
