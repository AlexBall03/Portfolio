import 'server-only';
import { eq } from 'drizzle-orm';
import { pageContent, sectionContent, siteSettings } from '@/db/schema';
import type { Database } from '@/db/types';
import type { Locale } from '@/i18n/config';
import { pickTranslation } from '@/i18n/translations';
import type { SiteSettingsInput } from './schema';
import type { PageContent, PageKey, SectionContent, SectionKey, SiteSettings } from './types';

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
    if (t) out[key] = { eyebrow: t.eyebrow, title: t.title, subtitle: t.subtitle, body: t.body };
  }
  return out;
}
