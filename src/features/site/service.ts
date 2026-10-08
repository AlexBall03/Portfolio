import 'server-only';
import { getDb, withTransaction } from '@/db/client';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/config';
import { translationCoverage, type TranslationCoverage } from '@/lib/cms/locale';
import { ContentMissingError } from '@/lib/errors';
import * as repo from './repository';
import {
  sectionTranslationInput,
  seoTranslationInput,
  type ContactCopyInput,
  type PageCopyInput,
  type SiteSettingsInput,
} from './schema';
import {
  editableSections,
  PAGE_KEYS,
  PAGES,
  type PageCopyValues,
  type PageKey,
  type SectionCopyEditorValues,
  type SiteSettings,
  type SiteSettingsValues,
} from './types';

/**
 * Site configuration administration. Validated input, authorized caller; no
 * React or HTTP here. A single-row update is atomic on its own, so it runs on
 * the regular HTTP client rather than opening a transaction.
 */

const toValues = (s: SiteSettings): SiteSettingsValues => ({ ...s, githubUsername: s.githubUsername ?? '' });

/** The stored settings, uncached (the admin edits exactly what is in the database). */
export async function loadSiteSettings(): Promise<SiteSettingsValues> {
  const settings = await repo.getSiteSettings(await getDb());
  if (!settings) throw new ContentMissingError('Site settings');
  return toValues(settings);
}

export async function saveSiteSettings(data: SiteSettingsInput, actor: { userId: string }): Promise<SiteSettingsValues> {
  return toValues(await repo.updateSiteSettings(await getDb(), data, actor.userId));
}

/* ── Page content ───────────────────────────────────────────────────────────
 * A page's SEO copy and the section headings its editor owns. The contact
 * section is owned by the Contact editor (one owner per piece of copy).
 */

export async function loadPageCopy(page: PageKey): Promise<PageCopyValues> {
  const db = await getDb();
  const [seo, sections] = await Promise.all([
    repo.getSeoValues(db, page),
    repo.getSectionCopyValues(db, editableSections(page)),
  ]);
  return { page, seo: { translations: seo }, sections };
}

export async function savePageCopy(data: PageCopyInput, actor: { userId: string }): Promise<PageCopyValues> {
  await withTransaction(async (tx) => {
    await repo.writeSeo(tx, data.page, data.seo.translations, actor.userId);
    for (const key of editableSections(data.page)) {
      const section = data.sections[key];
      if (section) await repo.writeSectionCopy(tx, key, section.translations, actor.userId);
    }
  });
  return loadPageCopy(data.page);
}

export async function loadContactCopy(): Promise<SectionCopyEditorValues> {
  const { contact } = await repo.getSectionCopyValues(await getDb(), ['contact']);
  return contact!;
}

export async function saveContactCopy(data: ContactCopyInput, actor: { userId: string }): Promise<SectionCopyEditorValues> {
  await withTransaction((tx) => repo.writeSectionCopy(tx, 'contact', data.translations, actor.userId));
  return loadContactCopy();
}

export interface PageCopyOverview {
  page: PageKey;
  label: string;
  path: string;
  /** Translation status of every entity this page's editor owns, per non-default locale. */
  coverage: Record<Exclude<Locale, 'en'>, TranslationCoverage>;
}

const sum = (a: TranslationCoverage, b: TranslationCoverage): TranslationCoverage => ({
  complete: a.complete + b.complete,
  partial: a.partial + b.partial,
  missing: a.missing + b.missing,
});

function copyCoverage(values: { seo: PageCopyValues['seo']; sections: PageCopyValues['sections'] }, locale: Locale) {
  return [
    translationCoverage(seoTranslationInput, [values.seo.translations], locale),
    translationCoverage(
      sectionTranslationInput,
      Object.values(values.sections).map((s) => s.translations),
      locale,
    ),
  ].reduce(sum);
}

const perLocale = (f: (locale: Locale) => TranslationCoverage) =>
  Object.fromEntries(LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((l) => [l, f(l)])) as Record<
    Exclude<Locale, 'en'>,
    TranslationCoverage
  >;

/** Every page with its editor's translation coverage (the Page content index). */
export async function listPageCopy(): Promise<PageCopyOverview[]> {
  const pages = await Promise.all(PAGE_KEYS.map(loadPageCopy));
  return pages.map((p) => ({
    page: p.page,
    label: PAGES[p.page].label,
    path: PAGES[p.page].path,
    coverage: perLocale((l) => copyCoverage(p, l)),
  }));
}

/** Coverage of all page and section copy, including the contact section (dashboard). */
export async function getSiteCopyTranslationCoverage(): Promise<Record<Exclude<Locale, 'en'>, TranslationCoverage>> {
  const [pages, contact] = await Promise.all([Promise.all(PAGE_KEYS.map(loadPageCopy)), loadContactCopy()]);
  return perLocale((l) =>
    [...pages.map((p) => copyCoverage(p, l)), translationCoverage(sectionTranslationInput, [contact.translations], l)].reduce(sum),
  );
}
