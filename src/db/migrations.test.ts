import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * 0012 folds every translation table into its parent and drops Spanish. These
 * tests run the committed SQL on a database shaped by 0000–0011 with bilingual
 * content, so the data handling is checked, not just the final schema.
 */
const DIR = 'src/db/migrations';
const journal = JSON.parse(readFileSync(join(DIR, 'meta/_journal.json'), 'utf8')) as { entries: { tag: string }[] };

async function apply(client: PGlite, tag: string) {
  const sql = readFileSync(join(DIR, `${tag}.sql`), 'utf8');
  for (const statement of sql.split('--> statement-breakpoint')) {
    if (statement.trim()) await client.exec(statement);
  }
}

async function databaseBefore0012() {
  const client = new PGlite();
  for (const { tag } of journal.entries) {
    if (tag.startsWith('0012')) break;
    await apply(client, tag);
  }
  return client;
}

let client: PGlite | undefined;
afterEach(async () => {
  await client?.close();
  client = undefined;
});

describe('0012_english_only', () => {
  it('keeps English, falls back only where English is missing, and drops the translation structures', async () => {
    client = await databaseBefore0012();
    await client.exec(`
      INSERT INTO projects (id, slug, status) VALUES
        ('00000000-0000-0000-0000-000000000001', 'both', 'published'),
        ('00000000-0000-0000-0000-000000000002', 'spanish-only', 'draft');
      INSERT INTO project_translations (project_id, locale, name, tagline, summary, body) VALUES
        ('00000000-0000-0000-0000-000000000001', 'es', 'Nombre', 'Lema', 'Resumen', '{"Uno"}'),
        ('00000000-0000-0000-0000-000000000001', 'en', 'Name', 'Tagline', 'Summary', '{"One","Two"}'),
        ('00000000-0000-0000-0000-000000000002', 'es', 'Solo', 'Lema', 'Resumen', '{}');
      INSERT INTO media_assets (id, storage, src) VALUES ('00000000-0000-0000-0000-0000000000a1', 'static', '/a.png');
      INSERT INTO media_asset_translations (asset_id, locale, alt, caption) VALUES
        ('00000000-0000-0000-0000-0000000000a1', 'en', 'A photo', 'Caption'),
        ('00000000-0000-0000-0000-0000000000a1', 'es', 'Una foto', 'Leyenda');
      INSERT INTO profile (id, full_name, short_name, email) VALUES (1, 'Ada Lovelace', 'Ada', 'ada@example.com');
      INSERT INTO profile_translations (profile_id, locale, title, statement, availability_text, location_label, about, hero_focus, hero_stack_line, hero_chips) VALUES
        (1, 'en', 'Engineer', 'Builds things', 'Open', 'London', '{"Hi","Más"}', 'Focus', 'Stack', '{"A"}'),
        (1, 'es', 'Ingeniera', 'Construye', 'Disponible', 'Londres', '{"Hola"}', 'Foco', 'Pila', '{"B"}');
      INSERT INTO page_content (page_key, locale, seo_title, seo_description) VALUES
        ('home', 'en', 'Home', 'English home'), ('home', 'es', 'Inicio', 'Inicio en español'),
        ('about', 'es', NULL, 'Solo español');
      INSERT INTO section_content (section_key, locale, eyebrow, title) VALUES
        ('about', 'es', 'Sobre', 'Acerca'), ('about', 'en', 'About', 'About me');
    `);

    await apply(client, journal.entries.find((e) => e.tag.startsWith('0012'))!.tag);

    const projects = await client.query(`SELECT slug, name, tagline, summary, body FROM projects ORDER BY slug`);
    expect(projects.rows).toEqual([
      { slug: 'both', name: 'Name', tagline: 'Tagline', summary: 'Summary', body: ['One', 'Two'] },
      { slug: 'spanish-only', name: 'Solo', tagline: 'Lema', summary: 'Resumen', body: [] },
    ]);
    expect((await client.query(`SELECT alt, caption FROM media_assets`)).rows).toEqual([{ alt: 'A photo', caption: 'Caption' }]);
    expect((await client.query(`SELECT title, about, location_label FROM profile`)).rows).toEqual([
      { title: 'Engineer', about: ['Hi', 'Más'], location_label: 'London' },
    ]);
    expect((await client.query(`SELECT page_key, seo_description FROM page_content ORDER BY page_key`)).rows).toEqual([
      { page_key: 'home', seo_description: 'English home' },
      { page_key: 'about', seo_description: 'Solo español' },
    ]);
    expect((await client.query(`SELECT eyebrow, title FROM section_content`)).rows).toEqual([{ eyebrow: 'About', title: 'About me' }]);

    const leftovers = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%\\_translations' OR table_name LIKE '%translations'`,
    );
    expect(leftovers.rows).toEqual([]);
    expect((await client.query(`SELECT 1 FROM pg_type WHERE typname = 'locale'`)).rows).toEqual([]);
    // Temporary defaults are gone: a NOT NULL column without a value is an error again.
    await expect(client.exec(`INSERT INTO projects (slug) VALUES ('x')`)).rejects.toThrow();
  }, 60_000);
});
