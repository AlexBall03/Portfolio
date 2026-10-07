import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { getDb } from '@/db/client';
import type { Locale } from '@/i18n/config';
import { CACHE_LIFE, CACHE_TAGS } from '@/lib/cache-tags';
import { getSkillsOverview } from './repository';

export async function getSkills(locale: Locale) {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  cacheTag(CACHE_TAGS.skills, CACHE_TAGS.projects);
  return getSkillsOverview(await getDb(), locale);
}
