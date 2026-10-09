import 'server-only';
import { getDb, withTransaction } from '@/db/client';
import { ContentMissingError } from '@/lib/errors';
import * as repo from './repository';
import type { ContactCopyInput, PageCopyInput, SiteSettingsInput } from './schema';
import {
  editableSections,
  PAGE_KEYS,
  PAGES,
  type PageCopyValues,
  type PageKey,
  type SectionCopyValues,
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
  return { page, seo, sections };
}

export async function savePageCopy(data: PageCopyInput, actor: { userId: string }): Promise<PageCopyValues> {
  await withTransaction(async (tx) => {
    await repo.writeSeo(tx, data.page, data.seo, actor.userId);
    for (const key of editableSections(data.page)) {
      const section = data.sections[key];
      if (section) await repo.writeSectionCopy(tx, key, section, actor.userId);
    }
  });
  return loadPageCopy(data.page);
}

export async function loadContactCopy(): Promise<SectionCopyValues> {
  const { contact } = await repo.getSectionCopyValues(await getDb(), ['contact']);
  return contact!;
}

export async function saveContactCopy(data: ContactCopyInput, actor: { userId: string }): Promise<SectionCopyValues> {
  await withTransaction((tx) => repo.writeSectionCopy(tx, 'contact', data, actor.userId));
  return loadContactCopy();
}

export interface PageCopyOverview {
  page: PageKey;
  label: string;
  path: string;
  /** The page's SEO description is filled in (it is required on save). */
  complete: boolean;
}

/** Every page with a note on whether its SEO copy exists yet (the Page content index). */
export async function listPageCopy(): Promise<PageCopyOverview[]> {
  const db = await getDb();
  const seo = await Promise.all(PAGE_KEYS.map((page) => repo.getSeoValues(db, page)));
  return PAGE_KEYS.map((page, i) => ({
    page,
    label: PAGES[page].label,
    path: PAGES[page].path,
    complete: Boolean(seo[i]!.seoDescription),
  }));
}
