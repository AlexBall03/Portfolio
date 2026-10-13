import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { fetchPublicSponsorships, GithubError } from '@/integrations/github/client';
import { CACHE_LIFE, CACHE_TAGS } from '@/lib/cache-tags';
import { createLogger } from '@/lib/logger';
import { normalizeSponsors } from './sponsors';
import type { SponsorsResult } from './types';

const log = createLogger('sponsorship');

/**
 * An account's public sponsors, straight from GitHub and cached for half an
 * hour (the admin's Refresh expires the tag). Nothing is copied into Postgres:
 * GitHub stays the record of who sponsors.
 *
 * Never throws (the `repo-data.ts` contract: an error inside `'use cache'`
 * would fail a prerender). A failure is a value, cached for a minute so it
 * retries soon, and it says why, so "GitHub is down" is never shown as "no
 * sponsors". Only the error kind is logged, never sponsor data.
 */
export async function loadPublicSponsors(login: string): Promise<SponsorsResult> {
  'use cache';
  cacheTag(CACHE_TAGS.sponsorship);
  try {
    const sponsors = normalizeSponsors(await fetchPublicSponsorships(login));
    cacheLife(CACHE_LIFE.githubSponsors);
    return { status: 'ok', sponsors, fetchedAt: new Date().toISOString() };
  } catch (err) {
    cacheLife(CACHE_LIFE.githubDegraded);
    const kind = err instanceof GithubError ? err.kind : 'upstream';
    log.warn('GitHub sponsors unavailable', { kind });
    if (kind === 'config') return { status: 'unconfigured' };
    if (kind === 'unauthorized' || kind === 'forbidden') return { status: 'unauthorized' };
    return { status: 'unavailable', reason: kind };
  }
}
