import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { getDb } from '@/db/client';
import { CACHE_LIFE, CACHE_TAGS } from '@/lib/cache-tags';
import * as repo from './repository';
import { loadPublicSponsors } from './sponsor-data';
import { sortSponsors, sponsorLogin, sponsorshipVisibility, visibleSponsors } from './sponsors';
import { DEFAULT_SPONSORSHIP_SETTINGS, type SponsorList, type SponsorshipSettings } from './types';

export async function getSponsorshipSettings(): Promise<SponsorshipSettings> {
  'use cache';
  cacheLife(CACHE_LIFE.content);
  cacheTag(CACHE_TAGS.sponsorship);
  return (await repo.getSponsorshipSettings(await getDb())) ?? DEFAULT_SPONSORSHIP_SETTINGS;
}

/**
 * The sponsors the public site shows: GitHub's public sponsors, minus the ones
 * hidden in the admin, in the configured order. Both reads are cached, so this
 * costs no request of its own.
 */
export async function getSponsorList(): Promise<SponsorList> {
  const settings = await getSponsorshipSettings();
  if (!sponsorshipVisibility(settings).sponsors) return { state: 'disabled' };
  const login = sponsorLogin(settings.sponsorsUrl);
  if (!login) return { state: 'unavailable' };
  const result = await loadPublicSponsors(login);
  if (result.status !== 'ok') return { state: 'unavailable' };
  return {
    state: 'ok',
    sponsors: sortSponsors(visibleSponsors(result.sponsors, settings.hiddenSponsors), settings.sponsorSort),
  };
}
