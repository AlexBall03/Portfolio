import 'server-only';
import { eq, inArray } from 'drizzle-orm';
import { pageContent, sectionContent, siteSettings } from '@/db/schema';
import type { Database } from '@/db/types';
import type { PageCopyInput, SiteSettingsInput } from './schema';
import type {
  PageContent,
  PageKey,
  SectionContent,
  SectionCopyValues,
  SectionKey,
  SeoValues,
  SiteSettings,
} from './types';

export async function getSiteSettings(db: Database): Promise<SiteSettings | null> {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
  return row ? toSiteSettings(row) : null;
}

function toSiteSettings(row: typeof siteSettings.$inferSelect): SiteSettings {
  return {
    brandMark: row.brandMark,
    monogram: row.monogram,
    githubUsername: row.githubUsername,
    showGithubSection: row.showGithubSection,
    defaultTheme: row.defaultTheme,
  };
}

/** Admin write; `actorId` (the admin's Clerk user ID) is recorded as updated_by. */
export async function updateSiteSettings(db: Database, data: SiteSettingsInput, actorId: string): Promise<SiteSettings> {
  const [row] = await db
    .update(siteSettings)
    .set({ ...data, githubUsername: data.githubUsername ?? null, updatedBy: actorId })
    .where(eq(siteSettings.id, 1))
    .returning();
  if (!row) throw new Error('The site settings row is missing');
  return toSiteSettings(row);
}

export async function getPageContent(db: Database, page: PageKey): Promise<PageContent | null> {
  const [row] = await db.select().from(pageContent).where(eq(pageContent.pageKey, page)).limit(1);
  return row ? { seoTitle: row.seoTitle, seoDescription: row.seoDescription } : null;
}

/** All section headings, keyed by section. Missing sections are omitted. */
export async function getSectionContent(db: Database): Promise<Partial<Record<SectionKey, SectionContent>>> {
  const rows = await db.select().from(sectionContent);
  return Object.fromEntries(
    rows.map((r) => [r.sectionKey, { eyebrow: r.eyebrow, title: r.title, subtitle: r.subtitle, body: r.body, aside: r.aside }]),
  );
}

/* ── Admin editor reads ─────────────────────────────────────────────────────
 * Uncached and raw: exactly as stored, blank when a row doesn't exist yet.
 */

export async function getSeoValues(db: Database, page: PageKey): Promise<SeoValues> {
  const [row] = await db.select().from(pageContent).where(eq(pageContent.pageKey, page)).limit(1);
  return { seoTitle: row?.seoTitle ?? '', seoDescription: row?.seoDescription ?? '' };
}

export async function getSectionCopyValues(
  db: Database,
  keys: readonly SectionKey[],
): Promise<Partial<Record<SectionKey, SectionCopyValues>>> {
  if (!keys.length) return {};
  const rows = await db.select().from(sectionContent).where(inArray(sectionContent.sectionKey, [...keys]));
  return Object.fromEntries(
    keys.map((key) => {
      const row = rows.find((r) => r.sectionKey === key);
      return [
        key,
        {
          eyebrow: row?.eyebrow ?? '',
          title: row?.title ?? '',
          subtitle: row?.subtitle ?? '',
          body: row?.body ?? '',
          aside: row?.aside ?? '',
        },
      ];
    }),
  );
}

/* ── Admin writes ───────────────────────────────────────────────────────────
 * Upserts; `actorId` is recorded as created_by (new rows) / updated_by.
 */

export async function writeSeo(db: Database, page: PageKey, seo: PageCopyInput['seo'], actorId: string): Promise<void> {
  const fields = { seoTitle: seo.seoTitle ?? null, seoDescription: seo.seoDescription, updatedBy: actorId };
  await db
    .insert(pageContent)
    .values({ pageKey: page, ...fields, createdBy: actorId })
    .onConflictDoUpdate({ target: pageContent.pageKey, set: fields });
}

type SectionCopy = NonNullable<PageCopyInput['sections'][SectionKey]>;

export async function writeSectionCopy(db: Database, key: SectionKey, copy: SectionCopy, actorId: string): Promise<void> {
  const fields = {
    eyebrow: copy.eyebrow,
    title: copy.title,
    subtitle: copy.subtitle ?? null,
    body: copy.body ?? null,
    aside: copy.aside ?? null,
    updatedBy: actorId,
  };
  await db
    .insert(sectionContent)
    .values({ sectionKey: key, ...fields, createdBy: actorId })
    .onConflictDoUpdate({ target: sectionContent.sectionKey, set: fields });
}
