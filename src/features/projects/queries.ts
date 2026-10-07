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

export async function getProjectBySlug(slug: string, locale: Locale) {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  cacheTag(CACHE_TAGS.projects);
  return repo.findProjectBySlug(await getDb(), slug, locale);
}
