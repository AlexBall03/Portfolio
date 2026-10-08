import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { pageContent, sectionContent, siteSettings } from '@/db/schema';
import type { Database } from '@/db/types';
import type { Locale } from '@/i18n/config';
import { pickTranslation } from '@/i18n/translations';
import { localeRecord } from '@/lib/cms/locale';
import { syncTranslations } from '@/lib/cms/write';
import type { PageCopyInput, SiteSettingsInput } from './schema';
import type {
  PageContent,
  PageKey,
  SectionContent,
  SectionCopyEditorValues,
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

export async function getPageContent(db: Database, page: PageKey, locale: Locale): Promise<PageContent | null> {
  const rows = await db.select().from(pageContent).where(eq(pageContent.pageKey, page));
  const t = pickTranslation(rows, locale);
  return t ? { seoTitle: t.seoTitle, seoDescription: t.seoDescription } : null;
}

/** All section headings for a locale, keyed by section. Missing sections are omitted. */
export async function getSectionContent(
  db: Database,
  locale: Locale,
): Promise<Partial<Record<SectionKey, SectionContent>>> {
  const rows = await db.select().from(sectionContent);
  const bySection = Map.groupBy(rows, (r) => r.sectionKey);
  const out: Partial<Record<SectionKey, SectionContent>> = {};
  for (const [key, translations] of bySection) {
    const t = pickTranslation(translations, locale);
    if (t) out[key] = { eyebrow: t.eyebrow, title: t.title, subtitle: t.subtitle, body: t.body, aside: t.aside };
  }
  return out;
}

/* ── Admin editor reads ─────────────────────────────────────────────────────
 * Uncached and raw: every locale exactly as stored (no English fallback).
 */

const blankSeo = (): SeoValues => ({ seoTitle: '', seoDescription: '' });
const blankSection = (): SectionCopyValues => ({ eyebrow: '', title: '', subtitle: '', body: '', aside: '' });

export async function getSeoValues(db: Database, page: PageKey): Promise<Record<Locale, SeoValues>> {
  const rows = await db.select().from(pageContent).where(eq(pageContent.pageKey, page));
  return localeRecord(rows, (t) => ({ seoTitle: t.seoTitle ?? '', seoDescription: t.seoDescription }), blankSeo);
}

export async function getSectionCopyValues(
  db: Database,
  keys: readonly SectionKey[],
): Promise<Partial<Record<SectionKey, SectionCopyEditorValues>>> {
  if (!keys.length) return {};
  const rows = await db.select().from(sectionContent).where(inArray(sectionContent.sectionKey, [...keys]));
  return Object.fromEntries(
    keys.map((key) => [
      key,
      {
        translations: localeRecord(
          rows.filter((r) => r.sectionKey === key),
          (t) => ({
            eyebrow: t.eyebrow,
            title: t.title,
            subtitle: t.subtitle ?? '',
            body: t.body ?? '',
            aside: t.aside ?? '',
          }),
          blankSection,
        ),
      },
    ]),
  );
}

/* ── Admin writes ───────────────────────────────────────────────────────────
 * Each locale present is upserted, each absent one deleted (English fallback).
 * `actorId` is recorded as created_by (new rows) / updated_by.
 */

export async function writeSeo(
  db: Database,
  page: PageKey,
  translations: PageCopyInput['seo']['translations'],
  actorId: string,
): Promise<void> {
  await syncTranslations(translations, {
    upsert: (locale, t) => {
      const fields = { seoTitle: t.seoTitle ?? null, seoDescription: t.seoDescription, updatedBy: actorId };
      return db
        .insert(pageContent)
        .values({ pageKey: page, locale, ...fields, createdBy: actorId })
        .onConflictDoUpdate({ target: [pageContent.pageKey, pageContent.locale], set: fields });
    },
    remove: (locale) =>
      db.delete(pageContent).where(and(eq(pageContent.pageKey, page), eq(pageContent.locale, locale))),
  });
}

type SectionTranslations = NonNullable<PageCopyInput['sections'][SectionKey]>['translations'];

export async function writeSectionCopy(
  db: Database,
  key: SectionKey,
  translations: SectionTranslations,
  actorId: string,
): Promise<void> {
  await syncTranslations(translations, {
    upsert: (locale, t) => {
      const fields = {
        eyebrow: t.eyebrow,
        title: t.title,
        subtitle: t.subtitle ?? null,
        body: t.body ?? null,
        aside: t.aside ?? null,
        updatedBy: actorId,
      };
      return db
        .insert(sectionContent)
        .values({ sectionKey: key, locale, ...fields, createdBy: actorId })
        .onConflictDoUpdate({ target: [sectionContent.sectionKey, sectionContent.locale], set: fields });
    },
    remove: (locale) =>
      db.delete(sectionContent).where(and(eq(sectionContent.sectionKey, key), eq(sectionContent.locale, locale))),
  });
}
