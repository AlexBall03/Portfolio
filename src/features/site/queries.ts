import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { getDb } from '@/db/client';
import type { Locale } from '@/i18n/config';
import { CACHE_LIFE, CACHE_TAGS } from '@/lib/cache-tags';
import { ContentMissingError } from '@/lib/errors';
import * as repo from './repository';
import type { PageKey, SectionContent, SectionKey, SiteSettings } from './types';

export async function getSiteSettings(): Promise<SiteSettings> {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  cacheTag(CACHE_TAGS.site);
  const settings = await repo.getSiteSettings(await getDb());
  if (!settings) throw new ContentMissingError('Site settings');
  return settings;
}

export async function getPageContent(page: PageKey, locale: Locale) {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  cacheTag(CACHE_TAGS.site);
  return repo.getPageContent(await getDb(), page, locale);
}

const EMPTY_SECTION: SectionContent = { eyebrow: '', title: '', subtitle: null, body: null };

/** Heading copy for one section; renders empty rather than crashing if a row is missing. */
export async function getSection(key: SectionKey, locale: Locale): Promise<SectionContent> {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  cacheTag(CACHE_TAGS.site);
  const sections = await repo.getSectionContent(await getDb(), locale);
  return sections[key] ?? EMPTY_SECTION;
}
