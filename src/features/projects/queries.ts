import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { getDb } from '@/db/client';
import type { Locale } from '@/i18n/config';
import { CACHE_LIFE, CACHE_TAGS } from '@/lib/cache-tags';
import * as repo from './repository';

export async function getProjects(locale: Locale) {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  cacheTag(CACHE_TAGS.projects);
  return repo.listPublishedProjects(await getDb(), locale);
}

export async function getProjectSlugs() {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  cacheTag(CACHE_TAGS.projects);
  return repo.listPublishedProjectSlugs(await getDb());
}

/** Published projects' slugs and last-change times (ISO), for the sitemap. */
export async function getProjectSitemap() {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  cacheTag(CACHE_TAGS.projects);
  const rows = await repo.listPublishedProjectSitemap(await getDb());
  return rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt.toISOString() }));
}

export async function getProjectBySlug(slug: string, locale: Locale) {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  cacheTag(CACHE_TAGS.projects);
  return repo.findProjectBySlug(await getDb(), slug, locale);
}
