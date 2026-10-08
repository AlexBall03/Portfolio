import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { getDb } from '@/db/client';
import { CACHE_LIFE, CACHE_TAGS } from '@/lib/cache-tags';
import * as repo from './repository';
import { type PublishedResume, publicResumeHref } from './types';

/** The published resume for the public site (page, footer, palette), or null. */
export async function getPublishedResume(): Promise<PublishedResume | null> {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  cacheTag(CACHE_TAGS.resume);
  const row = await repo.findPublishedResume(await getDb());
  return row && { id: row.id, fileName: row.fileName, sizeBytes: row.sizeBytes, href: publicResumeHref(row.id) };
}
