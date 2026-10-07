import 'server-only';
import { eq } from 'drizzle-orm';
import { pageContent, sectionContent, siteSettings } from '@/db/schema';
import type { Database } from '@/db/types';
import type { Locale } from '@/i18n/config';
import { pickTranslation } from '@/i18n/translations';
import type { PageContent, PageKey, SectionContent, SectionKey, SiteSettings } from './types';

export async function getSiteSettings(db: Database): Promise<SiteSettings | null> {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
  if (!row) return null;
  return {
    brandMark: row.brandMark,
    monogram: row.monogram,
    githubUsername: row.githubUsername,
    showGithubSection: row.showGithubSection,
    defaultTheme: row.defaultTheme,
  };
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
