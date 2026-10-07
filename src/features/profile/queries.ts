import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { getDb } from '@/db/client';
import type { Locale } from '@/i18n/config';
import { CACHE_LIFE, CACHE_TAGS } from '@/lib/cache-tags';
import { ContentMissingError } from '@/lib/errors';
import * as repo from './repository';
import type { Profile } from './types';

export async function getProfile(locale: Locale): Promise<Profile> {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  cacheTag(CACHE_TAGS.profile);
  const profile = await repo.getProfile(await getDb(), locale);
  if (!profile) throw new ContentMissingError('The site profile');
  return profile;
}

export async function getSocialLinks() {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  cacheTag(CACHE_TAGS.profile);
  return repo.listSocialLinks(await getDb());
}

export async function getProfileRoles(locale: Locale) {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  cacheTag(CACHE_TAGS.profile);
  return repo.listProfileRoles(await getDb(), locale);
}

export async function getHighlights(locale: Locale, kind: 'differentiator' | 'resume') {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  cacheTag(CACHE_TAGS.profile);
  return repo.listHighlights(await getDb(), locale, kind);
}

export async function getSnapshotMetrics(locale: Locale) {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  cacheTag(CACHE_TAGS.profile);
  return repo.listSnapshotMetrics(await getDb(), locale);
}
