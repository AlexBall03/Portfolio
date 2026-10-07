import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { getDb } from '@/db/client';
import type { Locale } from '@/i18n/config';
import { CACHE_LIFE, CACHE_TAGS } from '@/lib/cache-tags';
import { listExperiences } from './repository';

export async function getExperiences(locale: Locale) {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  cacheTag(CACHE_TAGS.experience);
  return listExperiences(await getDb(), locale);
}
