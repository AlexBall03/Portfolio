import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { getDb } from '@/db/client';
import type { Locale } from '@/i18n/config';
import { CACHE_LIFE, CACHE_TAGS } from '@/lib/cache-tags';
import { ContentMissingError } from '@/lib/errors';
import { getProjects } from '@/features/projects/queries';
import { getSkills } from '@/features/skills/queries';
import { countStackTechnologies, resolveSnapshotMetrics } from './metrics';
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

/** Snapshot metrics with derived values (published projects, stack size) counted from live content. */
export async function getSnapshotMetrics(locale: Locale) {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  // Derived values depend on projects and skills, so edits to either refresh them too.
  cacheTag(CACHE_TAGS.profile, CACHE_TAGS.projects, CACHE_TAGS.skills);
  const [metrics, projects, skills] = await Promise.all([
    repo.listSnapshotMetrics(await getDb(), locale),
    getProjects(locale),
    getSkills(locale),
  ]);
  return resolveSnapshotMetrics(metrics, {
    publishedProjects: projects.length,
    technologies: countStackTechnologies(skills),
  });
}
